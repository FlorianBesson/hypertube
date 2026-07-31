import { Router, Request, Response } from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { torrentService } from '../../services/stream';
import { prisma } from '../../prisma';
import { HttpError } from '../../errors';
import { JWT_SECRET } from '../../config/jwt';

const router = Router();

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
        throw new HttpError(400, "Hash de torrent manquant");
    }

    const archiveId = torrentService.getArchiveIdentifier(rawTorrentHash);
    const isHexHash = /^[a-fA-F0-9]{40}$/.test(rawTorrentHash);
    const torrentHash = archiveId || (isHexHash ? rawTorrentHash.toLowerCase() : rawTorrentHash);

    // 1. Update lastWatchedAt timestamp in DB asynchronously
    torrentService.updateLastWatched(torrentHash, imdbId).catch((err) => {
        console.error("Erreur lors de la mise à jour de lastWatchedAt:", err);
    });

    // If authenticated user token is provided in Header or Query, mark movie as watched by user in BDD
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || (req.query.token as string | undefined);
    if (token && imdbId) {
        try {
            const decoded: any = jwt.verify(token, JWT_SECRET);
            const userId = decoded?.userId || decoded?.id;
            if (userId) {
                const parsedUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId);
                if (!isNaN(parsedUserId)) {
                    prisma.watchedMovie.upsert({
                        where: { userId_imdbId: { userId: parsedUserId, imdbId } },
                        update: { watchedAt: new Date() },
                        create: { userId: parsedUserId, imdbId },
                    }).catch((err) => console.error("Erreur upsert WatchedMovie:", err));
                }
            }
        } catch {
            // Ignore invalid token on stream route
        }
    }

    // 2. Check if movie is already fully downloaded on disk
    const completedMovie = await torrentService.getCompletedMovie(torrentHash, imdbId);

    if (completedMovie) {
        const filePath = completedMovie.filePath;
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        const mimeType = torrentService.getMimeType(filePath);

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': mimeType,
            };

            res.writeHead(206, head);
            const fileStream = fs.createReadStream(filePath, { start, end });
            fileStream.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
        return;
    }

    // 3. Movie is not fully cached: stream live via TorrentService P2P engine
    const { videoFile } = await torrentService.getOrStartTorrent(torrentHash, imdbId);
    const fileSize = videoFile.length;
    const range = req.headers.range;
    const mimeType = torrentService.getMimeType(videoFile.name);

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': mimeType,
        };

        res.writeHead(206, head);
        const videoStream = videoFile.createReadStream({ start, end });
        videoStream.pipe(res);

        res.on('close', () => {
            if (videoStream && typeof videoStream.destroy === 'function') {
                videoStream.destroy();
            }
        });
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': mimeType,
        };
        res.writeHead(200, head);
        const videoStream = videoFile.createReadStream();
        videoStream.pipe(res);

        res.on('close', () => {
            if (videoStream && typeof videoStream.destroy === 'function') {
                videoStream.destroy();
            }
        });
    }
});

router.get("/:torrentHash/stats", async (req: Request, res: Response) => {
    const rawTorrentHash = Array.isArray(req.params.torrentHash) ? req.params.torrentHash[0] : req.params.torrentHash;
    if (!rawTorrentHash) {
        throw new HttpError(400, "Hash de torrent manquant");
    }

    const archiveId = torrentService.getArchiveIdentifier(rawTorrentHash);
    const isHexHash = /^[a-fA-F0-9]{40}$/.test(rawTorrentHash);
    const torrentHash = archiveId || (isHexHash ? rawTorrentHash.toLowerCase() : rawTorrentHash);

    const stats = torrentService.getTorrentStats(torrentHash);
    res.json({ success: true, ...stats });
});

export default router;
