import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../prisma';
import { authenticateToken } from '../../middlewares/auth';
import { SubtitleService, normalizeImdbId } from '../../services/subtitle';
import { HttpError } from '../../errors';

const router = Router();

// Zod validation schema for comment payload
const createCommentSchema = z.object({
    content: z.string().trim().min(1, "Le commentaire ne peut pas être vide").max(1000, "Le commentaire ne doit pas dépasser 1000 caractères")
});

/**
 * Route: GET /api/movies/comments/:imdbId
 * Description: Retrieves list of comments for a given movie, including author details.
 * Access: Authenticated users only
 */
router.get("/:imdbId", authenticateToken, async (req: Request, res: Response) => {
    const imdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;

    if (!imdbId) {
        throw new HttpError(400, "Identifiant IMDb manquant");
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
});

/**
 * Route: POST /api/movies/comments/:imdbId
 * Description: Creates a new comment for a movie by imdbId.
 * Access: Authenticated users only
 */
router.post("/:imdbId", authenticateToken, async (req: Request, res: Response) => {
    const imdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;
    const rawUserId = (req as any).user?.userId || (req as any).user?.id;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : Number(rawUserId);

    if (!imdbId) {
        throw new HttpError(400, "Identifiant IMDb manquant");
    }

    if (!userId || isNaN(userId)) {
        throw new HttpError(401, "Utilisateur non identifié");
    }

    // Verify user exists in DB (in case of stale token / DB reset)
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
        throw new HttpError(401, "Session expirée ou utilisateur inexistant. Veuillez vous reconnecter.");
    }

    // Validate incoming request body with Zod
    const validation = createCommentSchema.safeParse(req.body);
    if (!validation.success) {
        throw new HttpError(400, validation.error.issues[0]?.message || "Données invalides");
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
});

/**
 * Route: GET /api/movies/:imdbId/subtitles/:lang
 * Description: Serves the WebVTT subtitle file for a given movie IMDb ID and language.
 * Access: Authenticated users only
 */
router.get("/:imdbId/subtitles/:lang", authenticateToken, async (req: Request, res: Response) => {
    const rawImdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;
    const rawLang = Array.isArray(req.params.lang) ? req.params.lang[0] : req.params.lang;

    if (!rawImdbId || !rawLang) {
        throw new HttpError(400, "IMDb ID et langue requis");
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
        throw new HttpError(404, `Sous-titres indisponibles en ${lang} pour ce film`);
    }

    // 3. Set headers for WebVTT format
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.resolve(filePath));
});

/**
 * Route: GET /api/movies/:imdbId/subtitles
 * Description: Triggers background download of English + user's preferred language subtitles, and lists available languages.
 * Access: Authenticated users only
 */
router.get("/:imdbId/subtitles", authenticateToken, async (req: Request, res: Response) => {
    const rawImdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!rawImdbId) {
        throw new HttpError(400, "Identifiant IMDb manquant");
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
});

export default router;
