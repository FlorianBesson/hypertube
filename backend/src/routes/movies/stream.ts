import { Router, Request, Response } from 'express';
import fs from 'fs';
import { torrentService } from '../../services/stream';
import { HttpError } from '../../errors';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from environment variables");
}
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
 * Route: GET /api/movies/stream/:torrentHash
 * Description: Streams movie video file progressively using HTTP 206 Range Requests.
 * Supports instant streaming if complete file is cached, or background non-blocking torrent streaming.
 * Access: Public / Authenticated
 */
router.get("/:torrentHash", async (req: Request, res: Response) => {
    const rawTorrentHash = Array.isArray(req.params.torrentHash) ? req.params.torrentHash[0] : req.params.torrentHash;
    const rawImdbId = req.query.imdbId;
    const imdbId = Array.isArray(rawImdbId) ? (rawImdbId[0] as string) : (rawImdbId as string | undefined);

    if (!rawTorrentHash) {
        throw new HttpError(400, "Missing torrent hash");
    }

    const archiveId = torrentService.getArchiveIdentifier(rawTorrentHash);
    const isHexHash = /^[a-fA-F0-9]{40}$/.test(rawTorrentHash);
    const torrentHash = archiveId || (isHexHash ? rawTorrentHash.toLowerCase() : rawTorrentHash);

    // 1. Update lastWatchedAt timestamp in DB asynchronously
    torrentService.updateLastWatched(torrentHash, imdbId).catch((err) => {
        console.error("Error updating lastWatchedAt:", err);
    });

    // 2. Check if movie is already fully downloaded on disk
    const completedMovie = await torrentService.getCompletedMovie(torrentHash, imdbId);

    if (completedMovie) {
        const filePath = completedMovie.filePath;
        const fileSize = Number(completedMovie.fileSize);

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
    const rawTorrentHash = Array.isArray(req.params.torrentHash) ? req.params.torrentHash[0] : req.params.torrentHash;
    if (!rawTorrentHash) {
        throw new HttpError(400, "Missing torrent hash");
    }

    const archiveId = torrentService.getArchiveIdentifier(rawTorrentHash);
    const isHexHash = /^[a-fA-F0-9]{40}$/.test(rawTorrentHash);
    const torrentHash = archiveId || (isHexHash ? rawTorrentHash.toLowerCase() : rawTorrentHash);

    const { fileName, ...stats } = torrentService.getTorrentStats(torrentHash);

    // A fully downloaded movie is served from disk without any engine, so its name only
    // comes from the DB record.
    const completedMovie = fileName ? null : await torrentService.getCompletedMovie(torrentHash);

    res.json({
        success: true,
        ...stats,
        format: torrentService.getVideoFormat(fileName ?? completedMovie?.filePath),
    });
});

export default router;
