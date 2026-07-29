import path from 'path';
import fs from 'fs';
import { TorrentSourceResolver } from './bittorrent/torrentSourceResolver';
import { TorrentEngineManager, ActiveTorrentEngine } from './bittorrent/torrentEngineManager';

export interface TorrentStreamFile {
  name: string;
  path: string;
  length: number;
  select: () => void;
  deselect: () => void;
  createReadStream: (options?: { start?: number; end?: number }) => any;
}

export type { ActiveTorrentEngine };

export class BitTorrentService {
  private engineManager = new TorrentEngineManager();
  private downloadsBaseDir: string;

  constructor(downloadsBaseDir: string) {
    this.downloadsBaseDir = downloadsBaseDir;
  }

  /**
   * Initializes or returns an active non-blocking torrent stream engine.
   */
  public async getOrStartTorrent(torrentHash: string, imdbId?: string): Promise<{ engine: any; videoFile: TorrentStreamFile }> {
    const normalizedHash = torrentHash.toLowerCase();

    const active = this.engineManager.getActiveEngine(normalizedHash);
    if (active) {
      return active.readyPromise;
    }

    const downloadFolder = path.join(this.downloadsBaseDir, normalizedHash);
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }

    const torrentSource = await TorrentSourceResolver.resolveSource(normalizedHash);
    return this.engineManager.createEngine(normalizedHash, torrentSource, downloadFolder, imdbId);
  }
}
