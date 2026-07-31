import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { authenticateToken } from '../../middlewares/auth';
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

export default router;
