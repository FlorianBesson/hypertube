import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma';

const torrentStream = require('torrent-stream');
const DEFAULT_USER_AGENT = 'Hypertube/1.0 (Node.js Video Streaming)';

export interface TorrentStreamFile {
  name: string;
  path: string;
  length: number;
  select: () => void;
  deselect: () => void;
  createReadStream: (options?: { start?: number; end?: number }) => any;
}

export interface ActiveTorrentEngine {
  engine: any;
  torrentHash: string;
  imdbId?: string;
  videoFile: TorrentStreamFile | null;
  downloadsDir: string;
  isReady: boolean;
  readyPromise: Promise<{ engine: any; videoFile: TorrentStreamFile }>;
}

class TorrentService {
  private activeEngines = new Map<string, ActiveTorrentEngine>();
  private downloadsBaseDir = path.join(process.cwd(), 'downloads');

  constructor() {
    if (!fs.existsSync(this.downloadsBaseDir)) {
      fs.mkdirSync(this.downloadsBaseDir, { recursive: true });
    }
  }

  /**
   * Helper function to return MIME type based on video file extension.
   */
  public getMimeType(filename?: string): string {
    if (!filename) return 'video/mp4';
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.mp4':
        return 'video/mp4';
      case '.mkv':
        return 'video/x-matroska';
      case '.webm':
        return 'video/webm';
      case '.avi':
        return 'video/x-msvideo';
      case '.mov':
        return 'video/quicktime';
      case '.ogv':
        return 'video/ogg';
      default:
        return 'video/mp4';
    }
  }

  /**
   * Updates or creates lastWatchedAt timestamp in BDD for a given movie.
   */
  public async updateLastWatched(torrentHash: string, imdbId?: string): Promise<void> {
    const identifier = imdbId || torrentHash;
    try {
      const existing = await prisma.movie.findFirst({
        where: {
          OR: [{ imdbId: identifier }, { hash: torrentHash }],
        },
      });

      if (existing) {
        await prisma.movie.update({
          where: { id: existing.id },
          data: { lastWatchedAt: new Date() },
        });
      } else {
        await prisma.movie.create({
          data: {
            imdbId: identifier,
            hash: torrentHash,
            lastWatchedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(`[TorrentService] Error updating lastWatchedAt for ${torrentHash}:`, error);
    }
  }

  /**
   * Helper to check if a hash string is an Internet Archive item identifier
   */
  public isArchiveIdentifier(torrentHash: string): boolean {
    const norm = torrentHash.toLowerCase();
    if (norm.startsWith('magnet:') || norm.startsWith('http://') || norm.startsWith('https://')) {
      return false;
    }
    if (/^[a-fA-F0-9]{40}$/.test(norm)) {
      return false;
    }
    return true;
  }

  /**
   * Helper function to perform fetch with timeout.
   */
  private async fetchWithTimeout(url: string, options: any = {}, timeoutMs = 6000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Streams an Internet Archive movie using HTTP 206 Partial Content directly from Archive.org CDN,
   * with candidate fallback loop, timeout protection, and background disk caching.
   */
  public async streamArchiveMovie(identifier: string, rangeHeader: string | undefined, res: any, clientUserAgent?: string): Promise<void> {
    const activeUserAgent = clientUserAgent || DEFAULT_USER_AGENT;
    const downloadFolder = path.join(this.downloadsBaseDir, identifier.toLowerCase());
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }

    // 1. Fetch metadata with timeout
    let data: any = null;
    try {
      const metaRes = await this.fetchWithTimeout(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
        headers: { 'User-Agent': activeUserAgent }
      }, 7000);
      if (metaRes.ok) {
        data = await metaRes.json();
      }
    } catch (metaErr) {
      console.warn(`[TorrentService] Metadata lookup warning for ${identifier}:`, metaErr);
    }

    const files = data?.files || [];
    // Filter and prioritize candidate files: web-friendly formats first
    const candidateFiles: any[] = files.filter((f: any) => typeof f.name === 'string' && (
      f.name.toLowerCase().endsWith('.mp4') ||
      f.name.toLowerCase().endsWith('.webm') ||
      f.name.toLowerCase().endsWith('.ogv') ||
      f.name.toLowerCase().endsWith('.mkv')
    )).sort((a: any, b: any) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      // Prioritize .mp4 over .webm/.ogv, and derivative 512kb/256kb if primary HD times out
      const isMp4A = nameA.endsWith('.mp4') ? 2 : 0;
      const isMp4B = nameB.endsWith('.mp4') ? 2 : 0;
      return isMp4B - isMp4A;
    });

    if (candidateFiles.length === 0) {
      // Fallback filename guess if metadata had no listed video files
      candidateFiles.push({ name: `${identifier}.mp4` });
      candidateFiles.push({ name: `${identifier}_512kb.mp4` });
    }

    let activeRes: Response | null = null;
    let selectedFilename: string = candidateFiles[0].name;
    let selectedFileSize: bigint | null = candidateFiles[0].size ? BigInt(candidateFiles[0].size) : null;
    let selectedDirectUrl: string = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(selectedFilename)}`;

    // 2. Iterate through candidates until an accessible stream is reached
    for (const candidate of candidateFiles) {
      const targetFilePath = path.join(downloadFolder, candidate.name);

      // If already downloaded locally, serve from disk immediately
      if (fs.existsSync(targetFilePath) && candidate.size && Number(candidate.size) > 0 && fs.statSync(targetFilePath).size >= Number(candidate.size)) {
        console.log(`[TorrentService] Serving IA movie ${identifier} from local disk cache (${targetFilePath})`);
        this.streamLocalFile(targetFilePath, rangeHeader, res, candidate.name);
        return;
      }

      const candidateUrls = [
        `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(candidate.name)}`,
        `http://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(candidate.name)}`
      ];

      for (const archiveDirectUrl of candidateUrls) {
        const headers: Record<string, string> = { 'User-Agent': activeUserAgent };
        if (rangeHeader) {
          headers['Range'] = rangeHeader;
        }

        try {
          console.log(`[TorrentService] Testing IA candidate stream URL: ${archiveDirectUrl}`);
          const cdnRes = await this.fetchWithTimeout(archiveDirectUrl, { headers, redirect: 'follow' }, 4000);
          if (cdnRes.ok || cdnRes.status === 206) {
            activeRes = cdnRes;
            selectedFilename = candidate.name;
            selectedFileSize = candidate.size ? BigInt(candidate.size) : null;
            selectedDirectUrl = archiveDirectUrl;
            console.log(`[TorrentService] Successfully connected to candidate: ${candidate.name} via ${archiveDirectUrl} (Status ${cdnRes.status})`);
            break;
          }
        } catch (err: any) {
          console.warn(`[TorrentService] Candidate ${archiveDirectUrl} connection failed (${err.message}). Trying next...`);
        }
      }

      if (activeRes) break;
    }

    if (!activeRes) {
      const serverInfo = data?.server ? ` (Serveur ${data.server})` : '';
      console.warn(`[TorrentService] Storage server offline for ${identifier}${serverInfo}`);
      throw new Error(`Le serveur de stockage Internet Archive pour ce film${serverInfo} est actuellement indisponible ou hors-ligne. Veuillez réessayer ultérieurement.`);
    }

    const targetFilePath = path.join(downloadFolder, selectedFilename);
    const archiveDirectUrl = selectedDirectUrl;

    const resHeaders: Record<string, string> = {
      'Content-Type': activeRes.headers.get('content-type') || this.getMimeType(selectedFilename),
      'Accept-Ranges': 'bytes',
    };
    if (activeRes.headers.get('content-range')) {
      resHeaders['Content-Range'] = activeRes.headers.get('content-range')!;
    }
    if (activeRes.headers.get('content-length')) {
      resHeaders['Content-Length'] = activeRes.headers.get('content-length')!;
    }

    res.writeHead(activeRes.status, resHeaders);

    if (activeRes.body) {
      const reader = activeRes.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (res.writableEnded || res.closed) break;
          res.write(value);
        }
      } catch (pipeErr) {
        console.warn(`[TorrentService] Stream piping interrupted for ${identifier}:`, pipeErr);
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    } else {
      res.end();
    }

    // Trigger non-blocking background download to local disk
    this.backgroundDownloadArchiveMovie(identifier, archiveDirectUrl, targetFilePath, selectedFileSize, activeUserAgent).catch((err) => {
      console.error(`[TorrentService] Background download error for ${identifier}:`, err);
    });
  }

  private streamLocalFile(filePath: string, rangeHeader: string | undefined, res: any, filename: string): void {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = this.getMimeType(filename);

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }

  private async backgroundDownloadArchiveMovie(identifier: string, directUrl: string, targetPath: string, fileSize: bigint | null, userAgent?: string): Promise<void> {
    if (fs.existsSync(targetPath) && fileSize && BigInt(fs.statSync(targetPath).size) >= fileSize) {
      return;
    }
    try {
      console.log(`[TorrentService] Starting background download for IA movie ${identifier}...`);
      const res = await fetch(directUrl, {
        headers: { 'User-Agent': userAgent || DEFAULT_USER_AGENT },
        redirect: 'follow'
      });
      if (!res.ok || !res.body) return;

      const fileStream = fs.createWriteStream(targetPath);
      const reader = res.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fileStream.write(value);
      }
      fileStream.end();

      const finalSize = fs.existsSync(targetPath) ? BigInt(fs.statSync(targetPath).size) : fileSize;
      console.log(`[TorrentService] IA Movie background download finished: ${targetPath}`);

      try {
        await prisma.movie.upsert({
          where: { imdbId: identifier },
          update: {
            hash: identifier,
            filePath: targetPath,
            fileSize: finalSize,
            isCompleted: true,
            lastWatchedAt: new Date(),
          },
          create: {
            imdbId: identifier,
            hash: identifier,
            filePath: targetPath,
            fileSize: finalSize,
            isCompleted: true,
            lastWatchedAt: new Date(),
          },
        });
      } catch (dbErr) {
        console.warn(`[TorrentService] DB upsert warning for ${identifier}:`, dbErr);
      }
    } catch (err) {
      console.error(`[TorrentService] Failed background save for ${identifier}:`, err);
    }
  }

  /**
   * Checks if a movie is already downloaded and completed on disk.
   */
  public async getCompletedMovie(torrentHash: string, imdbId?: string): Promise<{ filePath: string; fileSize: bigint } | null> {
    const normalizedHash = torrentHash.toLowerCase();
    const identifier = imdbId || normalizedHash;

    try {
      const existing = await prisma.movie.findFirst({
        where: {
          OR: [{ imdbId: identifier }, { hash: normalizedHash }],
        },
      });

      if (existing && existing.isCompleted && existing.filePath) {
        if (fs.existsSync(existing.filePath)) {
          return {
            filePath: existing.filePath,
            fileSize: existing.fileSize || BigInt(fs.statSync(existing.filePath).size),
          };
        }
      }
    } catch (err) {
      console.warn(`[TorrentService] DB check warning for ${torrentHash}:`, err);
    }

    // Disk fallback check in case DB is offline or file was pre-placed on disk
    const downloadFolder = path.join(this.downloadsBaseDir, normalizedHash);
    if (fs.existsSync(downloadFolder)) {
      const findVideoInDir = (dir: string): string | null => {
        const files = fs.readdirSync(dir);
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v'];
        for (const file of files) {
          const full = path.join(dir, file);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            const sub = findVideoInDir(full);
            if (sub) return sub;
          } else if (videoExtensions.includes(path.extname(file).toLowerCase()) && stat.size > 0) {
            return full;
          }
        }
        return null;
      };

      const found = findVideoInDir(downloadFolder);
      if (found) {
        const stat = fs.statSync(found);
        return {
          filePath: found,
          fileSize: BigInt(stat.size),
        };
      }
    }

    return null;
  }

  /**
   * Initializes or returns an active non-blocking torrent stream engine.
   */
  public async getOrStartTorrent(torrentHash: string, imdbId?: string): Promise<{ engine: any; videoFile: TorrentStreamFile }> {
    const normalizedHash = torrentHash.toLowerCase();

    if (this.activeEngines.has(normalizedHash)) {
      const active = this.activeEngines.get(normalizedHash)!;
      return active.readyPromise;
    }

    const downloadFolder = path.join(this.downloadsBaseDir, normalizedHash);
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }

    let torrentSource: string | Buffer;

    if (normalizedHash.startsWith('magnet:')) {
      torrentSource = torrentHash;
    } else if (normalizedHash.startsWith('http://') || normalizedHash.startsWith('https://')) {
      const res = await fetch(torrentHash);
      if (!res.ok) throw new Error(`HTTP ${res.status} trying to fetch torrent URL`);
      torrentSource = Buffer.from(await res.arrayBuffer());
    } else if (/^[a-fA-F0-9]{40}$/.test(normalizedHash)) {
      torrentSource = `magnet:?xt=urn:btih:${normalizedHash}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.leechers-paradise.org:6969`;
    } else {
      // Internet Archive item identifier (e.g., "sex_madness")
      const iaTorrentUrl = `https://archive.org/download/${normalizedHash}/${normalizedHash}_archive.torrent`;
      console.log(`[TorrentService] Fetching Internet Archive torrent file from ${iaTorrentUrl}`);
      const res = await fetch(iaTorrentUrl);
      if (!res.ok) {
        throw new Error(`Internet Archive torrent download failed: HTTP ${res.status}`);
      }
      torrentSource = Buffer.from(await res.arrayBuffer());
    }

    let resolveReady!: (val: { engine: any; videoFile: TorrentStreamFile }) => void;
    let rejectReady!: (err: any) => void;

    const readyPromise = new Promise<{ engine: any; videoFile: TorrentStreamFile }>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    const engine = torrentStream(torrentSource, {
      path: downloadFolder,
      verify: false,
    });

    const activeEngine: ActiveTorrentEngine = {
      engine,
      torrentHash: normalizedHash,
      imdbId,
      videoFile: null,
      downloadsDir: downloadFolder,
      isReady: false,
      readyPromise,
    };

    this.activeEngines.set(normalizedHash, activeEngine);

    engine.on('ready', () => {
      console.log(`[TorrentService] Torrent engine metadata ready for ${normalizedHash}`);

      const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v'];
      const videoFiles = (engine.files as TorrentStreamFile[]).filter((f) => {
        const ext = path.extname(f.name).toLowerCase();
        return videoExtensions.includes(ext);
      });

      let mainVideoFile: TorrentStreamFile;

      // Prefer native web-supported formats (.mp4, .webm) first
      const webFiles = videoFiles.filter((f) => {
        const ext = path.extname(f.name).toLowerCase();
        return ext === '.mp4' || ext === '.webm';
      });

      if (webFiles.length > 0) {
        mainVideoFile = webFiles.sort((a, b) => b.length - a.length)[0];
      } else if (videoFiles.length > 0) {
        mainVideoFile = videoFiles.sort((a, b) => b.length - a.length)[0];
      } else {
        mainVideoFile = (engine.files as TorrentStreamFile[]).sort((a, b) => b.length - a.length)[0];
      }

      if (!mainVideoFile) {
        const err = new Error(`[TorrentService] No video file found in torrent ${normalizedHash}`);
        rejectReady(err);
        return;
      }

      // Deselect all files first, then select the main video file for sequential background download
      engine.files.forEach((f: TorrentStreamFile) => f.deselect());
      mainVideoFile.select();

      activeEngine.videoFile = mainVideoFile;
      activeEngine.isReady = true;

      resolveReady({ engine, videoFile: mainVideoFile });
    });

    engine.on('idle', async () => {
      console.log(`[TorrentService] Torrent download 100% completed for ${normalizedHash}`);
      if (activeEngine.videoFile) {
        const fullFilePath = path.join(downloadFolder, activeEngine.videoFile.path);
        const identifier = imdbId || normalizedHash;

        try {
          const existing = await prisma.movie.findFirst({
            where: {
              OR: [{ imdbId: identifier }, { hash: normalizedHash }],
            },
          });

          if (existing) {
            await prisma.movie.update({
              where: { id: existing.id },
              data: {
                hash: normalizedHash,
                filePath: fullFilePath,
                fileSize: BigInt(activeEngine.videoFile.length),
                isCompleted: true,
                lastWatchedAt: new Date(),
              },
            });
          } else {
            await prisma.movie.create({
              data: {
                imdbId: identifier,
                hash: normalizedHash,
                filePath: fullFilePath,
                fileSize: BigInt(activeEngine.videoFile.length),
                isCompleted: true,
                lastWatchedAt: new Date(),
              },
            });
          }
          console.log(`[TorrentService] Movie saved in DB as completed: ${fullFilePath}`);
        } catch (dbErr) {
          console.error(`[TorrentService] DB Save error on completion:`, dbErr);
        }
      }
    });

    engine.on('error', (err: any) => {
      console.error(`[TorrentService] Torrent engine error (${normalizedHash}):`, err);
      if (!activeEngine.isReady) {
        rejectReady(err);
      }
    });

    return readyPromise;
  }
}

export const torrentService = new TorrentService();
