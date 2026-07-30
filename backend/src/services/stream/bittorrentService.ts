import path from 'path';
import fs from 'fs';
import { resolveSource } from './bittorrent/torrentSourceResolver';
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

const defaultEngineManager = new TorrentEngineManager();

/**
 * Initializes or returns an active non-blocking torrent stream engine.
 */
export async function getOrStartTorrent(
  torrentHash: string,
  imdbId?: string,
  downloadsBaseDir: string = path.join(process.cwd(), 'downloads'),
  engineManager: TorrentEngineManager = defaultEngineManager
): Promise<{ engine: any; videoFile: TorrentStreamFile }> {
  const normalizedHash = torrentHash.toLowerCase();

  const active = engineManager.getActiveEngine(normalizedHash);
  if (active) {
    return active.readyPromise;
  }

  const downloadFolder = path.join(downloadsBaseDir, normalizedHash);
  if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder, { recursive: true });
  }

  const torrentSource = await resolveSource(normalizedHash);
  return engineManager.createEngine(normalizedHash, torrentSource, downloadFolder, imdbId);
}

export function getTorrentStats(
  torrentHash: string,
  engineManager: TorrentEngineManager = defaultEngineManager
): { seeds: number; peers: number } {
  return engineManager.getEngineStats(torrentHash.toLowerCase());
}

export const bitTorrentService = {
  getOrStartTorrent,
  getTorrentStats,
};
