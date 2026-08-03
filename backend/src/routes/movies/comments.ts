import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma';
import { authenticateToken } from '../../middlewares/auth';
import { HttpError } from '../../errors';

const router = Router();

const createCommentSchema = z.object({
    content: z.string().trim().min(1, "Comment cannot be empty").max(1000, "Comment cannot exceed 1000 characters")
});

router.get("/", authenticateToken, async (req: Request, res: Response) => {
    const comments = await prisma.comment.findMany({
        orderBy: { createdAt: 'desc'},
        select: {
            id : true,
            content: true,
            createdAt: true,
            user: {
                select: {
                    username: true
                }
            }
        }
    });

    res.json({ success: true, comments});
});

router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
    const rawParam = req.params.id || req.params.imdbId;
    const idParam = Array.isArray(rawParam) ? rawParam[0] : rawParam;

    if (!idParam) {
        throw new HttpError(400, "Missing identifier");
    }

    // If param is a pure integer number, return single comment by comment ID (GET /comments/:id)
    const numericId = parseInt(idParam, 10);
    if (!isNaN(numericId) && numericId.toString() === idParam) {
        const comment = await prisma.comment.findUnique({
            where: { id: numericId },
            select: {
                id: true,
                content: true,
                createdAt: true,
                user: {
                    select: {
                        username: true
                    }
                }
            }
        });

        if (!comment) {
            throw new HttpError(404, "Comment not found");
        }

        res.json({
            success: true,
            comment: {
                id: comment.id,
                comment: comment.content,
                username: comment.user.username,
                date: comment.createdAt
            }
        });
        return;
    }

    const comments = await prisma.comment.findMany({
        where: { imdbId: idParam },
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


router.post("/:id", authenticateToken, async (req: Request, res: Response) => {
    const rawParam = req.params.id || req.params.imdbId;
    const imdbId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    const rawUserId = (req as any).user?.userId || (req as any).user?.id;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : Number(rawUserId);

    if (!imdbId) {
        throw new HttpError(400, "Missing IMDb identifier");
    }

    if (!userId || isNaN(userId)) {
        throw new HttpError(401, "Unauthenticated user");
    }

    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
        throw new HttpError(401, "Session expired or user no longer exists. Please log in again.");
    }

    const validation = createCommentSchema.safeParse(req.body);
    if (!validation.success) {
        throw new HttpError(400, validation.error.issues[0]?.message || "Invalid data");
    }

    const { content } = validation.data;

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

router.patch("/:id", authenticateToken, async (req: Request, res: Response) => {
    const rawUserId = (req as any).user?.userId || (req as any).user?.id;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : Number(rawUserId);
    const commentId = parseInt(req.params.id as string, 10);

    if (isNaN(commentId)) {
        throw new HttpError(400, "Invalid comment ID");
    }

    if (!userId || isNaN(userId)) {
        throw new HttpError(401, "Unauthenticated user");
    }

    const existingComment = await prisma.comment.findUnique({
        where: { id: commentId }
    });

    if (!existingComment) {
        throw new HttpError(404, "Comment not found");
    }

    if (existingComment.userId !== userId) {
        throw new HttpError(403, "Access denied. You can only modify your own comments.");
    }

    const validation = createCommentSchema.safeParse(req.body);
    if (!validation.success) {
        throw new HttpError(400, validation.error.issues[0]?.message || "Invalid data");
    }

    const { content } = validation.data;

    const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: { content },
        select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
                select: {
                    username: true
                }
            }
        }
    });

    res.json({
        success: true,
        comment: {
            id: updatedComment.id,
            comment: updatedComment.content,
            username: updatedComment.user.username,
            date: updatedComment.createdAt
        }
    });
});

router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
    const rawUserId = (req as any).user?.userId || (req as any).user?.id;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : Number(rawUserId);
    const commentId = parseInt(req.params.id as string, 10);

    if (isNaN(commentId)) {
        throw new HttpError(400, "Invalid comment ID");
    }

    if (!userId || isNaN(userId)) {
        throw new HttpError(401, "Unauthenticated user");
    }

    const existingComment = await prisma.comment.findUnique({
        where: { id: commentId }
    });

    if (!existingComment) {
        throw new HttpError(404, "Comment not found");
    }

    if (existingComment.userId !== userId) {
        throw new HttpError(403, "Access denied. You can only delete your own comments.");
    }

    await prisma.comment.delete({
        where: { id: commentId }
    });

    res.json({ success: true, message: "Comment deleted successfully" });
});

export default router;
