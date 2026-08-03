import path from 'path';
import { getMimeType, getVideoFormat } from './mimeService';
import { movieDbService } from '../movies/movieDbService';
import { getArchiveIdentifier } from './archive/archiveUtils';
import * as bittorrentService from './bittorrentService';
import { TorrentStreamFile } from './bittorrentService';

export type { TorrentStreamFile };

const downloadsBaseDir = path.join(process.cwd(), 'downloads');

/**
 * Delegates MIME type resolution.
 */
export function getTorrentMimeType(filename?: string): string {
  return getMimeType(filename);
}

/**
 * Delegates BDD lastWatchedAt timestamp updates.
 */
export async function updateLastWatched(torrentHash: string, imdbId?: string): Promise<void> {
  return movieDbService.updateLastWatched(torrentHash, imdbId);
}

/**
 * Delegates completed movie check from disk / DB.
 */
export async function getCompletedMovie(torrentHash: string, imdbId?: string): Promise<{ filePath: string; fileSize: bigint } | null> {
  return movieDbService.getCompletedMovie(torrentHash, imdbId, downloadsBaseDir);
}

/**
 * Delegates BitTorrent live stream engine initialization.
 */
export async function getOrStartTorrent(torrentHash: string, imdbId?: string): Promise<{ engine: any; videoFile: TorrentStreamFile }> {
  return bittorrentService.getOrStartTorrent(torrentHash, imdbId, downloadsBaseDir);
}

/**
 * Facade object for callers importing torrentService object (e.g. routes/movies/stream.ts)
 */
export const torrentService = {
  getMimeType: getTorrentMimeType,
  getVideoFormat,
  updateLastWatched,
  getCompletedMovie,
  getArchiveIdentifier,
  getOrStartTorrent,
  getTorrentStats: bittorrentService.getTorrentStats,
};
