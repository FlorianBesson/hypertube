import path from 'path';
import fs from 'fs';
import { getMimeType, getVideoFormat, needsConversion } from './mimeService';
import { movieDbService } from '../movies/movieDbService';
import { getArchiveIdentifier } from './archive/archiveUtils';
import * as bittorrentService from './bittorrentService';
import { TorrentEngine, TorrentStreamFile } from './bittorrent/engine/torrentEngine';
import * as hlsTranscodeService from './hls/hlsTranscodeService';

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
export async function getOrStartTorrent(torrentHash: string, imdbId?: string): Promise<{ engine: TorrentEngine; videoFile: TorrentStreamFile }> {
  return bittorrentService.getOrStartTorrent(torrentHash, imdbId, downloadsBaseDir);
}

/**
 * Starts (or reuses) the HLS remux session for a torrent hash: from the completed file on
 * disk if one exists, otherwise from the live P2P stream. Safe to call on every stats poll —
 * both the torrent engine and the HLS session dedupe by hash internally.
 */
export async function ensureHlsConversion(torrentHash: string, imdbId?: string): Promise<void> {
  const downloadFolder = bittorrentService.resolveDownloadFolder(torrentHash, downloadsBaseDir);
  const completedMovie = await getCompletedMovie(torrentHash, imdbId);

  if (completedMovie) {
    hlsTranscodeService.getOrStartHlsSession(
      torrentHash,
      () => fs.createReadStream(completedMovie.filePath),
      downloadFolder
    );
    return;
  }

  const { videoFile } = await getOrStartTorrent(torrentHash, imdbId);
  hlsTranscodeService.getOrStartHlsSession(torrentHash, () => videoFile.createReadStream(), downloadFolder);
}

export function getHlsConversionStatus(torrentHash: string): hlsTranscodeService.ConversionStatus | null {
  return hlsTranscodeService.getConversionStatus(torrentHash);
}

export function getHlsPlaylistPath(torrentHash: string): string {
  return hlsTranscodeService.getPlaylistPath(bittorrentService.resolveDownloadFolder(torrentHash, downloadsBaseDir));
}

export function getHlsSegmentPath(torrentHash: string, segment: string): string {
  return hlsTranscodeService.getSegmentPath(bittorrentService.resolveDownloadFolder(torrentHash, downloadsBaseDir), segment);
}

/**
 * Facade object for callers importing torrentService object (e.g. routes/movies/stream.ts)
 */
export const torrentService = {
  getMimeType: getTorrentMimeType,
  getVideoFormat,
  needsConversion,
  updateLastWatched,
  getCompletedMovie,
  getArchiveIdentifier,
  getOrStartTorrent,
  getTorrentStats: bittorrentService.getTorrentStats,
  ensureHlsConversion,
  getHlsConversionStatus,
  getHlsPlaylistPath,
  getHlsSegmentPath,
};
