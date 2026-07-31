import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import { authenticateToken } from '../../middlewares/auth';
import { HttpError } from '../../errors';

const router = Router();

/**
 * Route: GET /api/users
 * Description: Retrieves list of all community members (limited public fields).
 * Authenticated: Yes
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            photo: true
        }
    });

    res.json({ success: true, users });
});

/**
 * Route: GET /api/users/:id
 * Description: Retrieves public details of a specific community user by their unique database ID.
 * Authenticated: Yes
 */
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
    const idParam = req.params.id;
    if (!idParam) {
        throw new HttpError(400, "Missing identifier");
    }
    // Normalize parameter if array, parse to integer ID
    const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
    const targetId = parseInt(idStr, 10);
    if (isNaN(targetId)) {
        throw new HttpError(400, "Invalid identifier");
    }

    // Fetch limited set of fields for public safety (no password, no raw email)
    const user = await prisma.user.findUnique({
        where: { id: targetId },
        select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            photo: true,
            createdAt: true,
            bio: true,
            lastLogin: true
        }
    });

    if (!user) {
        throw new HttpError(404, "User not found");
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            photo: user.photo,
            createdAt: user.createdAt,
            bio: user.bio,
            lastLogin: user.lastLogin
        }
    });
});

export default router;
