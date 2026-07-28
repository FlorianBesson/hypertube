import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth';
import { SubtitleService, normalizeImdbId } from '../services/subtitle';

const router = Router();

// Zod validation schema for comment payload
const createCommentSchema = z.object({
    content: z.string().trim().min(1, "Le commentaire ne peut pas être vide").max(1000, "Le commentaire ne doit pas dépasser 1000 caractères")
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

/**
 * Route: GET /api/movies/:imdbId/subtitles/:lang
 * Description: Serves the WebVTT subtitle file for a given movie IMDb ID and language.
 * Access: Authenticated users only
 */
router.get("/:imdbId/subtitles/:lang", authenticateToken, async (req: Request, res: Response) => {
    try {
        const rawImdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;
        const rawLang = Array.isArray(req.params.lang) ? req.params.lang[0] : req.params.lang;

        if (!rawImdbId || !rawLang) {
            res.status(400).json({ success: false, message: "IMDb ID et langue requis" });
            return;
        }

        const imdbId = normalizeImdbId(rawImdbId);
        const lang = rawLang.toLowerCase().trim();

        // 1. If file already exists, serve it immediately
        let filePath = SubtitleService.getSubtitleFilePath(imdbId, lang);

        if (!fs.existsSync(filePath)) {
            // 2. Fetch/convert on the fly if not cached yet
            const savedPath = await SubtitleService.fetchAndSaveSubtitle(imdbId, lang);
            if (savedPath && fs.existsSync(savedPath)) {
                filePath = savedPath;
            }
        }

        if (!fs.existsSync(filePath)) {
            res.status(404).json({ success: false, message: `Sous-titres indisponibles en ${lang} pour ce film` });
            return;
        }

        // 3. Set headers for WebVTT format
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error("Fetch subtitle file error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération des sous-titres" });
    }
});

/**
 * Route: GET /api/movies/:imdbId/subtitles
 * Description: Triggers background download of English + user's preferred language subtitles, and lists available languages.
 * Access: Authenticated users only
 */
router.get("/:imdbId/subtitles", authenticateToken, async (req: Request, res: Response) => {
    try {
        const rawImdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;
        const userId = (req as any).user?.userId || (req as any).user?.id;

        if (!rawImdbId) {
            res.status(400).json({ success: false, message: "Identifiant IMDb manquant" });
            return;
        }

        const imdbId = normalizeImdbId(rawImdbId);

        // Fetch user's preferred language from DB
        let userLang = 'en';
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: Number(userId) },
                select: { preferredLanguage: true }
            });
            if (user?.preferredLanguage) {
                userLang = user.preferredLanguage;
            }
        }

        // Trigger background download (non-blocking)
        SubtitleService.downloadSubtitlesForMovie(imdbId, userLang).catch((err) => {
            console.error(`Background subtitle download failed for ${imdbId}:`, err);
        });

        // List existing local subtitle languages
        const subDir = path.join(process.cwd(), 'uploads', 'subtitles', imdbId);
        let availableLanguages: string[] = [];

        if (fs.existsSync(subDir)) {
            const files = fs.readdirSync(subDir);
            availableLanguages = files
                .filter(f => f.endsWith('.vtt'))
                .map(f => f.replace('.vtt', ''));
        }

        res.json({
            success: true,
            imdbId,
            userPreferredLanguage: userLang,
            availableLanguages,
            subtitlesUrls: availableLanguages.map(l => ({
                lang: l,
                url: `/api/movies/${imdbId}/subtitles/${l}`
            }))
        });
    } catch (error) {
        console.error("List subtitles error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors du listing des sous-titres" });
    }
});

export default router;
