import { Router, Request, Response } from 'express';
import fs from 'fs';
import { torrentService } from '../../services/stream';
import { HttpError } from '../../errors';
import { extractRequestToken } from '../../middlewares/auth';

const router = Router();

interface ByteRange {
    start: number;
    end: number;
}

/**
 * Parses a single-range `Range` header against the file size.
 * Returns null when the header is malformed (caller then serves the whole file),
 * or 'unsatisfiable' when it is well-formed but falls outside the file bounds.
 */
function parseRangeHeader(rangeHeader: string, fileSize: number): ByteRange | 'unsatisfiable' | null {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
        return null;
    }

    const [, rawStart, rawEnd] = match;
    if (!rawStart && !rawEnd) {
        return null;
    }

    // Suffix form ("bytes=-500") asks for the final N bytes; Safari uses it to probe metadata.
    if (!rawStart) {
        const suffixLength = parseInt(rawEnd, 10);
        if (suffixLength <= 0) {
            return 'unsatisfiable';
        }
        return { start: Math.max(0, fileSize - suffixLength), end: fileSize - 1 };
    }

    const start = parseInt(rawStart, 10);
    const end = rawEnd ? Math.min(parseInt(rawEnd, 10), fileSize - 1) : fileSize - 1;

    if (start >= fileSize || start > end) {
        return 'unsatisfiable';
    }
    return { start, end };
}

type CreateVideoStream = (range: ByteRange | null) => NodeJS.ReadableStream;

/**
 * Writes a video body as either a full 200 or a 206 partial response.
 * The stream is opened before any header is sent so an invalid range fails cleanly
 * instead of tearing down a response that already claimed success.
 */
function sendVideoResponse(
    req: Request,
    res: Response,
    fileSize: number,
    mimeType: string,
    createStream: CreateVideoStream,
    torrentHash: string
) {
    const rangeHeader = req.headers.range;
    const range = rangeHeader ? parseRangeHeader(rangeHeader, fileSize) : null;

    if (range === 'unsatisfiable') {
        res.writeHead(416, {
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes',
        });
        res.end();
        return;
    }

    // Every response advertises range support: a 200 without Accept-Ranges makes browsers
    // treat the media as non-seekable, silently ignoring currentTime and restarting at 0.
    const headers: Record<string, string | number> = {
        'Accept-Ranges': 'bytes',
        'Content-Type': mimeType,
        'Content-Length': range ? range.end - range.start + 1 : fileSize,
    };
    if (range) {
        headers['Content-Range'] = `bytes ${range.start}-${range.end}/${fileSize}`;
    }

    const videoStream = createStream(range);

    res.writeHead(range ? 206 : 200, headers);

    videoStream.on('error', (err: Error) => {
        console.error(`[stream] Video stream error for ${torrentHash}:`, err);
        res.destroy();
    });
    videoStream.pipe(res);

    res.on('close', () => {
        if (typeof (videoStream as any).destroy === 'function') {
            (videoStream as any).destroy();
        }
    });
}

/**
 * Normalizes a raw route param into the canonical torrent hash used to key engines,
 * DB records and on-disk folders (archive.org id, lowercased infohash, or passthrough).
 */
function normalizeTorrentHash(rawTorrentHash: string | string[] | undefined): string {
    const value = Array.isArray(rawTorrentHash) ? rawTorrentHash[0] : rawTorrentHash;
    if (!value) {
        throw new HttpError(400, "Missing torrent hash");
    }

    const archiveId = torrentService.getArchiveIdentifier(value);
    const isHexHash = /^[a-fA-F0-9]{40}$/.test(value);
    return archiveId || (isHexHash ? value.toLowerCase() : value);
}

function parseImdbId(rawImdbId: unknown): string | undefined {
    return Array.isArray(rawImdbId) ? (rawImdbId[0] as string) : (rawImdbId as string | undefined);
}

/**
 * Route: GET /api/movies/stream/:torrentHash
 * Description: Streams movie video file progressively using HTTP 206 Range Requests.
 * Supports instant streaming if complete file is cached, or background non-blocking torrent streaming.
 * Access: Authenticated
 */
router.get("/:torrentHash", async (req: Request, res: Response) => {
    const torrentHash = normalizeTorrentHash(req.params.torrentHash);
    const imdbId = parseImdbId(req.query.imdbId);

    // 1. Update lastWatchedAt timestamp in DB asynchronously
    torrentService.updateLastWatched(torrentHash, imdbId).catch((err) => {
        console.error("Error updating lastWatchedAt:", err);
    });

    // 2. Check if movie is already fully downloaded on disk
    const completedMovie = await torrentService.getCompletedMovie(torrentHash, imdbId);

    if (completedMovie) {
        const filePath = completedMovie.filePath;
        const fileSize = Number(completedMovie.fileSize);

        // Bytes here are only correct for containers the browser already plays; anything
        // else must go through the HLS routes below instead of being piped raw.
        if (torrentService.needsConversion(filePath)) {
            throw new HttpError(409, "This video requires conversion; use the HLS stream endpoint");
        }

        sendVideoResponse(
            req,
            res,
            fileSize,
            torrentService.getMimeType(filePath),
            (range) => range
                ? fs.createReadStream(filePath, { start: range.start, end: range.end })
                : fs.createReadStream(filePath),
            torrentHash
        );
        return;
    }

    // 3. Movie is not fully cached: stream live via TorrentService P2P engine
    const { videoFile } = await torrentService.getOrStartTorrent(torrentHash, imdbId);

    if (torrentService.needsConversion(videoFile.name)) {
        throw new HttpError(409, "This video requires conversion; use the HLS stream endpoint");
    }

    sendVideoResponse(
        req,
        res,
        videoFile.length,
        torrentService.getMimeType(videoFile.name),
        (range) => range
            ? videoFile.createReadStream({ start: range.start, end: range.end })
            : videoFile.createReadStream(),
        torrentHash
    );
});

router.get("/:torrentHash/stats", async (req: Request, res: Response) => {
    const torrentHash = normalizeTorrentHash(req.params.torrentHash);
    const imdbId = parseImdbId(req.query.imdbId);

    // The engine's selected file (and therefore the format/conversion decision) is only
    // known once it's started, so resolve it here rather than trusting getTorrentStats
    // alone — on the very first poll no engine is active yet and its fileName is null,
    // which would otherwise default the format decision to "native" and mislead the player.
    const completedMovie = await torrentService.getCompletedMovie(torrentHash, imdbId);
    const sourceName = completedMovie?.filePath ?? (await torrentService.getOrStartTorrent(torrentHash, imdbId)).videoFile.name;

    const { fileName: _fileName, ...stats } = torrentService.getTorrentStats(torrentHash);
    const format = torrentService.getVideoFormat(sourceName);

    let conversionStatus: 'not_needed' | 'converting' | 'ready' = 'not_needed';
    let convertedSeconds = 0;
    if (torrentService.needsConversion(sourceName)) {
        const status = torrentService.getHlsConversionStatus(torrentHash);
        if (status) {
            conversionStatus = status;
        } else {
            // Nothing else triggers the download/conversion for non-native containers, since
            // the frontend deliberately never points a bare <video src> at them.
            torrentService.ensureHlsConversion(torrentHash, imdbId).catch((err) => {
                console.error(`[stream] Error starting HLS conversion for ${torrentHash}:`, err);
            });
            conversionStatus = 'converting';
        }
        convertedSeconds = torrentService.getHlsConvertedSeconds(torrentHash);
    }

    res.json({
        success: true,
        ...stats,
        format,
        conversionStatus,
        convertedSeconds,
    });
});

/**
 * Route: GET /api/movies/stream/:torrentHash/hls/playlist.m3u8
 * Serves the growing HLS playlist once the conversion session (started via /stats) has
 * produced at least one segment.
 */
router.get("/:torrentHash/hls/playlist.m3u8", async (req: Request, res: Response) => {
    const torrentHash = normalizeTorrentHash(req.params.torrentHash);
    const playlistPath = torrentService.getHlsPlaylistPath(torrentHash);

    if (!fs.existsSync(playlistPath)) {
        throw new HttpError(404, "HLS playlist not ready yet");
    }

    // hls.js/Safari resolve each segment URI relative to this playlist's own URL, which
    // drops the query string — reattach the token so segment requests stay authenticated.
    const token = extractRequestToken(req);
    const rawPlaylist = fs.readFileSync(playlistPath, 'utf8');
    const playlist = token
        ? rawPlaylist.replace(/^(seg\d{5}\.ts)$/gm, `$1?token=${encodeURIComponent(token)}`)
        : rawPlaylist;

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(playlist);
});

/**
 * Route: GET /api/movies/stream/:torrentHash/hls/:segment
 * Serves an individual HLS segment file. The segment name is restricted to ffmpeg's own
 * "seg00000.ts" naming pattern so it can't be used to read arbitrary paths.
 */
router.get("/:torrentHash/hls/:segment", async (req: Request, res: Response) => {
    const torrentHash = normalizeTorrentHash(req.params.torrentHash);
    const segment = Array.isArray(req.params.segment) ? req.params.segment[0] : req.params.segment;

    if (!segment || !/^seg\d{5}\.ts$/.test(segment)) {
        throw new HttpError(400, "Invalid segment name");
    }

    const segmentPath = torrentService.getHlsSegmentPath(torrentHash, segment);
    if (!fs.existsSync(segmentPath)) {
        throw new HttpError(404, "Segment not found");
    }

    res.setHeader('Content-Type', 'video/mp2t');
    fs.createReadStream(segmentPath).pipe(res);
});

export default router;
