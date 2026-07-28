import path from 'path';
import fs from 'fs';
import { movieDbService } from './movieDbService';

const torrentStream = require('torrent-stream');

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

export class BitTorrentService {
  private activeEngines = new Map<string, ActiveTorrentEngine>();
  private downloadsBaseDir: string;

  constructor(downloadsBaseDir: string) {
    this.downloadsBaseDir = downloadsBaseDir;
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
      const iaTorrentUrl = `https://archive.org/download/${normalizedHash}/${normalizedHash}_archive.torrent`;
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

    // Timeout protection for 0-seeder BitTorrent swarms
    const metadataTimer = setTimeout(() => {
      if (!activeEngine.isReady) {
        this.activeEngines.delete(normalizedHash);
        rejectReady(new Error("Aucun seeder actif trouvé pour ce torrent. Le film ne peut pas être téléchargé."));
      }
    }, 15000);

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
      clearTimeout(metadataTimer);

      const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v'];
      const videoFiles = (engine.files as TorrentStreamFile[]).filter((f) => {
        const ext = path.extname(f.name).toLowerCase();
        return videoExtensions.includes(ext);
      });

      let mainVideoFile: TorrentStreamFile;

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
        const err = new Error(`[BitTorrentService] No video file found in torrent ${normalizedHash}`);
        rejectReady(err);
        return;
      }

      engine.files.forEach((f: TorrentStreamFile) => f.deselect());
      mainVideoFile.select();

      activeEngine.videoFile = mainVideoFile;
      activeEngine.isReady = true;

      resolveReady({ engine, videoFile: mainVideoFile });
    });

    engine.on('idle', async () => {
      if (activeEngine.videoFile) {
        const fullFilePath = path.join(downloadFolder, activeEngine.videoFile.path);
        const identifier = imdbId || normalizedHash;
        await movieDbService.markMovieCompleted(identifier, normalizedHash, fullFilePath, BigInt(activeEngine.videoFile.length));
      }
    });

    engine.on('error', (err: any) => {
      console.error(`[BitTorrentService] Torrent engine error (${normalizedHash}):`, err);
      if (!activeEngine.isReady) {
        rejectReady(err);
      }
    });

    return readyPromise;
  }
}
