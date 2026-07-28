import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth';
import { torrentService } from '../services/torrentService';

const router = Router();

// Zod validation schema for comment payload
const createCommentSchema = z.object({
    content: z.string().trim().min(1, "Le commentaire ne peut pas être vide").max(1000, "Le commentaire ne doit pas dépasser 1000 caractères")
});

/**
 * Route: GET /api/movies/stream/:torrentHash
 * Description: Streams movie video file progressively using HTTP 206 Range Requests.
 * Supports instant streaming if complete file is cached, or background non-blocking torrent streaming.
 * Access: Public / Authenticated
 */
router.get("/stream/:torrentHash", async (req: Request, res: Response) => {
    try {
        const rawTorrentHash = Array.isArray(req.params.torrentHash) ? req.params.torrentHash[0] : req.params.torrentHash;
        const rawImdbId = req.query.imdbId;
        const imdbId = Array.isArray(rawImdbId) ? (rawImdbId[0] as string) : (rawImdbId as string | undefined);

        if (!rawTorrentHash) {
            res.status(400).json({ success: false, message: "Hash de torrent manquant" });
            return;
        }

        const torrentHash = rawTorrentHash.toLowerCase();

        // 1. Update lastWatchedAt timestamp in DB asynchronously
        torrentService.updateLastWatched(torrentHash, imdbId).catch((err) => {
            console.error("Erreur lors de la mise à jour de lastWatchedAt:", err);
        });

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

        // 3. Internet Archive instant progressive stream & background disk caching
        if (torrentService.isArchiveIdentifier(torrentHash)) {
            const userAgent = req.headers['user-agent'];
            await torrentService.streamArchiveMovie(torrentHash, req.headers.range, res, userAgent);
            return;
        }

        // 4. Movie is not fully cached: stream live via TorrentService
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

    } catch (error: any) {
        console.error("Stream route error:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message || "Erreur lors du streaming de la vidéo" });
        }
    }
});

/**
 * Route: GET /api/movies/:imdbId/comments
 * Description: Retrieves list of comments for a given movie, including author details.
 * Access: Authenticated users only
 */
router.get("/:imdbId/comments", authenticateToken, async (req: Request, res: Response) => {
    try {
        const imdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;

        if (!imdbId) {
            res.status(400).json({ success: false, message: "Identifiant IMDb manquant" });
            return;
        }

        const comments = await prisma.comment.findMany({
            where: { imdbId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                content: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        photo: true
                    }
                }
            }
        });

        res.json({ success: true, comments });
    } catch (error) {
        console.error("Fetch comments error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération des commentaires" });
    }
});

/**
 * Route: POST /api/movies/:imdbId/comments
 * Description: Creates a new comment for a movie by imdbId.
 * Access: Authenticated users only
 */
router.post("/:imdbId/comments", authenticateToken, async (req: Request, res: Response) => {
    try {
        const imdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;
        const rawUserId = (req as any).user?.userId || (req as any).user?.id;
        const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : Number(rawUserId);

        if (!imdbId) {
            res.status(400).json({ success: false, message: "Identifiant IMDb manquant" });
            return;
        }

        if (!userId || isNaN(userId)) {
            res.status(401).json({ success: false, message: "Utilisateur non identifié" });
            return;
        }

        // Verify user exists in DB (in case of stale token / DB reset)
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) {
            res.status(401).json({ success: false, message: "Session expirée ou utilisateur inexistant. Veuillez vous reconnecter." });
            return;
        }

        // Validate incoming request body with Zod
        const validation = createCommentSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: validation.error.issues[0]?.message || "Données invalides"
            });
            return;
        }

        const { content } = validation.data;

        // Persist comment in database
        const comment = await prisma.comment.create({
            data: {
                imdbId,
                content,
                userId
            },
            select: {
                id: true,
                content: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        photo: true
                    }
                }
            }
        });

        res.status(201).json({ success: true, comment });
    } catch (error) {
        console.error("Create comment error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la création du commentaire" });
    }
});

export default router;

