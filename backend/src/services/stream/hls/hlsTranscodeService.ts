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
 * Sums the #EXTINF durations already written to the playlist: how much of the movie has
 * been converted so far, in seconds. Used to cap seeking at what's actually playable.
 */
export function getConvertedSeconds(playlistPath: string): number {
  if (!fs.existsSync(playlistPath)) return 0;
  const contents = fs.readFileSync(playlistPath, 'utf8');
  let total = 0;
  for (const match of contents.matchAll(/^#EXTINF:([\d.]+),/gm)) {
    total += parseFloat(match[1]);
  }
  return total;
}

/**
 * Starts an HLS transcode session for a torrent hash, or returns the already-running one.
 * `openSource` is only invoked on first start: a second call for the same hash must not
 * open a competing read against the same (possibly still-downloading) torrent file.
 *
 * Always re-encodes (never -c copy): most public-domain sources this app streams predate
 * H.264 (MPEG-2, Theora, ...), so a plain remux would produce segments no browser can
 * decode. libx264/aac is the only combination guaranteed to play back everywhere.
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

  const source = openSource();
  // Surfaces the torrent read stream's own errors (e.g. a piece that failed verification)
  // separately from ffmpeg's, since a broken pipe alone doesn't say which side caused it.
  source.on('error', (err: Error) => console.error(`[hlsTranscodeService] Source stream error for ${torrentHash}:`, err.message));

  ffmpeg(source)
    .outputOptions([
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', '6',
      '-hls_playlist_type', 'event',
      '-hls_segment_filename', path.join(hlsDir, 'seg%05d.ts'),
    ])
    .on('error', (err: Error, _stdout, stderr) => {
      console.error(`[hlsTranscodeService] ffmpeg error for ${torrentHash}:`, err.message, stderr);
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
