import path from 'path';
import { getMimeType } from './mimeService';
import { movieDbService } from '../movies/movieDbService';
import * as archiveService from './archiveService';
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
 * Delegates Archive identifier check.
 */
export function isArchiveIdentifier(torrentHash: string): boolean {
  return archiveService.isArchiveIdentifier(torrentHash);
}

/**
 * Delegates Internet Archive CDN progressive streaming.
 */
export async function streamArchiveMovie(identifier: string, rangeHeader: string | undefined, res: any, clientUserAgent?: string): Promise<void> {
  return archiveService.streamArchiveMovie(identifier, rangeHeader, res, clientUserAgent, downloadsBaseDir);
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
  updateLastWatched,
  getCompletedMovie,
  isArchiveIdentifier,
  getArchiveIdentifier: archiveService.getArchiveIdentifier,
  streamArchiveMovie,
  getOrStartTorrent,
  getTorrentStats: bittorrentService.getTorrentStats,
};
