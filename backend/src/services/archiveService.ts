import path from 'path';
import fs from 'fs';
import { MimeService } from './mimeService';
import { movieDbService } from './movieDbService';

const DEFAULT_USER_AGENT = 'Hypertube/1.0 (Node.js Video Streaming)';

export class ArchiveService {
  private downloadsBaseDir: string;

  constructor(downloadsBaseDir: string) {
    this.downloadsBaseDir = downloadsBaseDir;
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
      console.warn(`[ArchiveService] Metadata lookup warning for ${identifier}:`, metaErr);
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
      const isMp4A = nameA.endsWith('.mp4') ? 2 : 0;
      const isMp4B = nameB.endsWith('.mp4') ? 2 : 0;
      return isMp4B - isMp4A;
    });

    if (candidateFiles.length === 0) {
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

      if (fs.existsSync(targetFilePath) && candidate.size && Number(candidate.size) > 0 && fs.statSync(targetFilePath).size >= Number(candidate.size)) {
        console.log(`[ArchiveService] Serving IA movie ${identifier} from local disk cache (${targetFilePath})`);
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
          console.log(`[ArchiveService] Testing IA candidate stream URL: ${archiveDirectUrl}`);
          const cdnRes = await this.fetchWithTimeout(archiveDirectUrl, { headers, redirect: 'follow' }, 4000);
          if (cdnRes.ok || cdnRes.status === 206) {
            activeRes = cdnRes;
            selectedFilename = candidate.name;
            selectedFileSize = candidate.size ? BigInt(candidate.size) : null;
            selectedDirectUrl = archiveDirectUrl;
            console.log(`[ArchiveService] Connected to candidate: ${candidate.name} via ${archiveDirectUrl} (Status ${cdnRes.status})`);
            break;
          }
        } catch (err: any) {
          console.warn(`[ArchiveService] Candidate ${archiveDirectUrl} failed (${err.message}). Trying next...`);
        }
      }

      if (activeRes) break;
    }

    if (!activeRes) {
      const serverInfo = data?.server ? ` (Serveur ${data.server})` : '';
      console.warn(`[ArchiveService] Storage server offline for ${identifier}${serverInfo}`);
      throw new Error(`Le serveur de stockage Internet Archive pour ce film${serverInfo} est actuellement indisponible ou hors-ligne. Veuillez réessayer ultérieurement.`);
    }

    const targetFilePath = path.join(downloadFolder, selectedFilename);
    const archiveDirectUrl = selectedDirectUrl;

    const resHeaders: Record<string, string> = {
      'Content-Type': activeRes.headers.get('content-type') || MimeService.getMimeType(selectedFilename),
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
        console.warn(`[ArchiveService] Stream piping interrupted for ${identifier}:`, pipeErr);
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
      console.error(`[ArchiveService] Background download error for ${identifier}:`, err);
    });
  }

  private streamLocalFile(filePath: string, rangeHeader: string | undefined, res: any, filename: string): void {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = MimeService.getMimeType(filename);

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
      console.log(`[ArchiveService] Starting background download for IA movie ${identifier}...`);
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

      const finalSize = fs.existsSync(targetPath) ? BigInt(fs.statSync(targetPath).size) : (fileSize || BigInt(0));
      console.log(`[ArchiveService] IA Movie background download finished: ${targetPath}`);

      await movieDbService.markMovieCompleted(identifier, identifier, targetPath, finalSize);
    } catch (err) {
      console.error(`[ArchiveService] Failed background save for ${identifier}:`, err);
    }
  }
}
