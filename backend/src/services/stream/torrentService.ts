import path from 'path';
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
 * Starts (or restarts, if a different offset is already running) the HLS transcode session
 * for a torrent hash, seeked to `offsetSeconds`: from the completed file on disk if one
 * exists (fast, accurate -ss seek), otherwise from the live P2P stream (byte offset
 * estimated from `totalDurationSeconds`, assuming a roughly constant bitrate). Safe to call
 * on every stats poll — both the torrent engine and the HLS session dedupe internally when
 * the requested offset matches what's already running.
 *
 * Returns the offset the session actually ended up at, which can differ from the request:
 * without a known total duration there is no way to map a time to a byte offset in a
 * still-downloading source, so that case falls back to 0 (the start).
 */
export async function ensureHlsConversion(
  torrentHash: string,
  imdbId: string | undefined,
  offsetSeconds: number,
  totalDurationSeconds: number | undefined
): Promise<number> {
  const downloadFolder = bittorrentService.resolveDownloadFolder(torrentHash, downloadsBaseDir);
  const completedMovie = await getCompletedMovie(torrentHash, imdbId);

  if (completedMovie) {
    const session = hlsTranscodeService.getOrStartHlsSession(
      torrentHash,
      offsetSeconds,
      { type: 'file', path: completedMovie.filePath },
      downloadFolder
    );
    return session.offsetSeconds;
  }

  const { videoFile } = await getOrStartTorrent(torrentHash, imdbId);
  const effectiveOffset = totalDurationSeconds ? offsetSeconds : 0;
  const byteOffset = totalDurationSeconds
    ? Math.floor((effectiveOffset / totalDurationSeconds) * videoFile.length)
    : 0;

  const session = hlsTranscodeService.getOrStartHlsSession(
    torrentHash,
    effectiveOffset,
    { type: 'stream', open: () => videoFile.createReadStream({ start: byteOffset }) },
    downloadFolder
  );
  return session.offsetSeconds;
}

export function getHlsConversionStatus(torrentHash: string, offsetSeconds: number): hlsTranscodeService.ConversionStatus | null {
  return hlsTranscodeService.getConversionStatus(torrentHash, offsetSeconds);
}

export function getHlsPlaylistPath(torrentHash: string, offsetSeconds: number): string {
  return hlsTranscodeService.getPlaylistPath(bittorrentService.resolveDownloadFolder(torrentHash, downloadsBaseDir), offsetSeconds);
}

export function getHlsSegmentPath(torrentHash: string, offsetSeconds: number, segment: string): string {
  return hlsTranscodeService.getSegmentPath(bittorrentService.resolveDownloadFolder(torrentHash, downloadsBaseDir), offsetSeconds, segment);
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
