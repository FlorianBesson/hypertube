import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth';

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

export default router;
