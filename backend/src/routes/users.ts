import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Helper to mask emails for other users' profiles (retained for compatibility/future use)
function maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    if (username.length <= 2) {
        return `${username[0]}*@${domain}`;
    }
    return `${username[0]}${'*'.repeat(username.length - 2)}${username[username.length - 1]}@${domain}`;
}

// Get all users (will be mounted at /api/users)
router.get("/", authenticateToken, async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                photo: true
            }
        });

        res.json({ success: true, users });
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération des utilisateurs" });
    }
});

// Get target user details by ID (will be mounted at /api/users/:id)
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        if (!idParam) {
            res.status(400).json({ success: false, message: "Identifiant manquant" });
            return;
        }
        const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
        const targetId = parseInt(idStr, 10);
        if (isNaN(targetId)) {
            res.status(400).json({ success: false, message: "Identifiant invalide" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: targetId },
            select: {
                id: true,
                name: true,
                photo: true,
                createdAt: true,
                bio: true,
                lastLogin: true
            }
        });

        if (!user) {
            res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
            return;
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                photo: user.photo,
                createdAt: user.createdAt,
                bio: user.bio,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error("Fetch user details error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération du profil" });
    }
});

export default router;
