import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import ffmpeg from 'fluent-ffmpeg';

export type ConversionStatus = 'converting' | 'ready';

interface HlsSession {
  playlistPath: string;
  status: ConversionStatus;
}

const activeSessions = new Map<string, HlsSession>();

function getHlsDir(downloadFolder: string): string {
  return path.join(downloadFolder, 'hls');
}

export function getPlaylistPath(downloadFolder: string): string {
  return path.join(getHlsDir(downloadFolder), 'playlist.m3u8');
}

export function getSegmentPath(downloadFolder: string, segment: string): string {
  return path.join(getHlsDir(downloadFolder), segment);
}

function isPlaylistReady(playlistPath: string): boolean {
  if (!fs.existsSync(playlistPath)) return false;
  return fs.readFileSync(playlistPath, 'utf8').includes('#EXTINF');
}

/**
 * Starts an HLS remux session for a torrent hash, or returns the already-running one.
 * `openSource` is only invoked on first start: a second call for the same hash must not
 * open a competing read against the same (possibly still-downloading) torrent file.
 */
export function getOrStartHlsSession(
  torrentHash: string,
  openSource: () => Readable,
  downloadFolder: string
): HlsSession {
  const existing = activeSessions.get(torrentHash);
  if (existing) {
    return existing;
  }

  const hlsDir = getHlsDir(downloadFolder);
  fs.mkdirSync(hlsDir, { recursive: true });
  const playlistPath = getPlaylistPath(downloadFolder);

  const session: HlsSession = { playlistPath, status: 'converting' };
  activeSessions.set(torrentHash, session);

  ffmpeg(openSource())
    .outputOptions([
      '-c', 'copy',
      '-f', 'hls',
      '-hls_time', '6',
      '-hls_playlist_type', 'event',
      '-hls_segment_filename', path.join(hlsDir, 'seg%05d.ts'),
    ])
    .on('error', (err: Error) => {
      console.error(`[hlsTranscodeService] ffmpeg error for ${torrentHash}:`, err.message);
      activeSessions.delete(torrentHash);
    })
    .save(playlistPath);

  return session;
}

/**
 * Returns null when no session has been started yet, so the caller knows to trigger one.
 */
export function getConversionStatus(torrentHash: string): ConversionStatus | null {
  const session = activeSessions.get(torrentHash);
  if (!session) {
    return null;
  }
  if (session.status !== 'ready' && isPlaylistReady(session.playlistPath)) {
    session.status = 'ready';
  }
  return session.status;
}
