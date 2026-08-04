import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';

export type ConversionStatus = 'converting' | 'ready';

export type HlsSource =
  // A fully downloaded file: ffmpeg can seek it accurately and cheaply via -ss on a real,
  // seekable input instead of reading/decoding everything before the target offset.
  | { type: 'file'; path: string }
  // A still-downloading torrent: the caller has already opened a read stream starting at
  // the byte offset estimated for the requested time (see torrentService.ensureHlsConversion).
  | { type: 'stream'; open: () => Readable };

interface HlsSession {
  offsetSeconds: number;
  hlsDir: string;
  playlistPath: string;
  status: ConversionStatus;
  command: FfmpegCommand;
}

const activeSessions = new Map<string, HlsSession>();

function getHlsDir(downloadFolder: string, offsetSeconds: number): string {
  return path.join(downloadFolder, 'hls', String(offsetSeconds));
}

export function getPlaylistPath(downloadFolder: string, offsetSeconds: number): string {
  return path.join(getHlsDir(downloadFolder, offsetSeconds), 'playlist.m3u8');
}

export function getSegmentPath(downloadFolder: string, offsetSeconds: number, segment: string): string {
  return path.join(getHlsDir(downloadFolder, offsetSeconds), segment);
}

function isPlaylistReady(playlistPath: string): boolean {
  if (!fs.existsSync(playlistPath)) return false;
  return fs.readFileSync(playlistPath, 'utf8').includes('#EXTINF');
}

/**
 * Starts an HLS transcode session seeked to `offsetSeconds`, or returns the already-running
 * one if it's already at that offset. A request for a different offset (the user scrubbed
 * the progress bar) kills the previous ffmpeg process and starts a fresh one there — a
 * "growing" HLS playlist has no way to jump ahead of what it's converted so far, so seeking
 * past that point means re-pointing the encoder instead.
 *
 * Always re-encodes (never -c copy): most public-domain sources this app streams predate
 * H.264 (MPEG-2, Theora, ...), so a plain remux would produce segments no browser can
 * decode. libx264/aac is the only combination guaranteed to play back everywhere.
 */
export function getOrStartHlsSession(
  torrentHash: string,
  offsetSeconds: number,
  source: HlsSource,
  downloadFolder: string
): HlsSession {
  const existing = activeSessions.get(torrentHash);
  if (existing) {
    if (existing.offsetSeconds === offsetSeconds) {
      return existing;
    }
    existing.command.kill('SIGKILL');
    activeSessions.delete(torrentHash);
  }

  const hlsDir = getHlsDir(downloadFolder, offsetSeconds);
  fs.mkdirSync(hlsDir, { recursive: true });
  const playlistPath = getPlaylistPath(downloadFolder, offsetSeconds);

  const outputOptions = [
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', '6',
    '-hls_playlist_type', 'event',
    '-hls_segment_filename', path.join(hlsDir, 'seg%05d.ts'),
  ];

  let command: FfmpegCommand;
  if (source.type === 'file') {
    command = ffmpeg(source.path).inputOptions(['-ss', String(offsetSeconds)]);
  } else {
    const stream = source.open();
    // Surfaces the torrent read stream's own errors (e.g. a piece that failed verification)
    // separately from ffmpeg's, since a broken pipe alone doesn't say which side caused it.
    stream.on('error', (err: Error) => console.error(`[hlsTranscodeService] Source stream error for ${torrentHash}:`, err.message));
    command = ffmpeg(stream);
  }

  const session: HlsSession = { offsetSeconds, hlsDir, playlistPath, status: 'converting', command };
  activeSessions.set(torrentHash, session);

  command
    .outputOptions(outputOptions)
    .on('error', (err: Error, _stdout, stderr) => {
      // A kill() to start a newer-offset session also lands here as an "error" — only log
      // and clear the map entry when this session is still the active one.
      if (activeSessions.get(torrentHash) === session) {
        console.error(`[hlsTranscodeService] ffmpeg error for ${torrentHash}:`, err.message, stderr);
        activeSessions.delete(torrentHash);
      }
    })
    .save(playlistPath);

  return session;
}

/**
 * Returns null when no session is running for this exact offset (either never started, or
 * the active session is for a different offset — e.g. mid-restart after a seek), so the
 * caller knows to (re)start one.
 */
export function getConversionStatus(torrentHash: string, offsetSeconds: number): ConversionStatus | null {
  const session = activeSessions.get(torrentHash);
  if (!session || session.offsetSeconds !== offsetSeconds) {
    return null;
  }
  if (session.status !== 'ready' && isPlaylistReady(session.playlistPath)) {
    session.status = 'ready';
  }
  return session.status;
}
