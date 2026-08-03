import path from 'path';
import fs from 'fs';
import { resolveSource } from './bittorrent/torrentSourceResolver';
import { TorrentEngineManager, ActiveTorrentEngine } from './bittorrent/torrentEngineManager';
import { TorrentEngine, TorrentStreamFile } from './bittorrent/engine/torrentEngine';

export type { ActiveTorrentEngine, TorrentStreamFile };

const defaultEngineManager = new TorrentEngineManager();

/**
 * Initializes or returns an active non-blocking torrent stream engine.
 */
export async function getOrStartTorrent(
  torrentHash: string,
  imdbId?: string,
  downloadsBaseDir: string = path.join(process.cwd(), 'downloads'),
  engineManager: TorrentEngineManager = defaultEngineManager
): Promise<{ engine: TorrentEngine; videoFile: TorrentStreamFile }> {
  const isHexHash = /^[a-fA-F0-9]{40}$/.test(torrentHash);
  const normalizedHash = isHexHash ? torrentHash.toLowerCase() : torrentHash;

  const active = engineManager.getActiveEngine(normalizedHash);
  if (active) {
    return active.readyPromise;
  }

  // Sanitize folder name for safe filesystem storage
  const folderName = isHexHash ? normalizedHash : encodeURIComponent(normalizedHash).replace(/%/g, '_').substring(0, 100);
  const downloadFolder = path.join(downloadsBaseDir, folderName);
  if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder, { recursive: true });
  }

  const torrentSource = await resolveSource(normalizedHash);
  return engineManager.createEngine(normalizedHash, torrentSource, downloadFolder, imdbId);
}

export function getTorrentStats(
  torrentHash: string,
  engineManager: TorrentEngineManager = defaultEngineManager
): { seeds: number; peers: number; fileName: string | null } {
  return engineManager.getEngineStats(torrentHash.toLowerCase());
}

export const bitTorrentService = {
  getOrStartTorrent,
  getTorrentStats,
};
