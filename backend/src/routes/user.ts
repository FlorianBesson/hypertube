import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth';
import { upload, uploadDirectory } from '../config/multer';

const router = Router();

// Photo upload endpoint (will be mounted at /api/user/avatar)
router.post("/avatar", authenticateToken, (req: Request, res: Response) => {
    upload.single('avatar')(req, res, async (err) => {
        if (err) {
            res.status(400).json({ success: false, message: err.message || "Erreur lors du téléversement" });
            return;
        }

        if (!req.file) {
            res.status(400).json({ success: false, message: "Aucun fichier téléversé" });
            return;
        }

        try {
            const userId = (req as any).user.userId;
            const photoUrl = `/uploads/avatars/${req.file.filename}`;

            // Update user in DB
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { photo: photoUrl }
            });

            res.json({
                success: true,
                message: "Photo de profil mise à jour avec succès",
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    name: updatedUser.name,
                    photo: updatedUser.photo
                }
            });
        } catch (error) {
            console.error("Avatar update error:", error);
            res.status(500).json({ success: false, message: "Erreur serveur lors de la mise à jour" });
        }
    });
});

// Delete photo/avatar endpoint (will be mounted at /api/user/avatar)
router.delete("/avatar", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;

        // Find user to check if they have a photo
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
            return;
        }

        if (user.photo) {
            // Check if photo is a local upload and exists, then delete it
            if (user.photo.startsWith('/uploads/avatars/')) {
                const fileName = user.photo.replace('/uploads/avatars/', '');
                const filePath = path.join(uploadDirectory, fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }

        // Update user photo field in DB to null
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { photo: null }
        });

        res.json({
            success: true,
            message: "Photo de profil supprimée avec succès",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                photo: updatedUser.photo
            }
        });
    } catch (error) {
        console.error("Avatar delete error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression de la photo de profil" });
    }
});

// Update profile details (will be mounted at /api/user/profile)
router.put("/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { name, email, bio } = req.body;

        if (email) {
            const cleanEmail = email.toLowerCase().trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                res.status(400).json({ success: false, message: "Format d'adresse email invalide" });
                return;
            }

            const existingUser = await prisma.user.findUnique({
                where: { email: cleanEmail }
            });
            if (existingUser && existingUser.id !== userId) {
                res.status(400).json({ success: false, message: "Cette adresse email est déjà utilisée" });
                return;
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: name !== undefined ? name : undefined,
                email: email !== undefined ? email.toLowerCase().trim() : undefined,
                bio: bio !== undefined ? bio : undefined,
            }
        });

        res.json({
            success: true,
            message: "Profil mis à jour avec succès",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                photo: updatedUser.photo,
                bio: updatedUser.bio,
                lastLogin: updatedUser.lastLogin
            }
        });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la mise à jour" });
    }
});

// Update password (will be mounted at /api/user/password)
router.put("/password", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, message: "Veuillez renseigner l'ancien et le nouveau mot de passe" });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ success: false, message: "Le nouveau mot de passe doit faire au moins 6 caractères" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
            return;
        }

        if (user.password !== currentPassword) {
            res.status(400).json({ success: false, message: "L'ancien mot de passe est incorrect" });
            return;
        }

        await prisma.user.update({
            where: { id: userId },
            data: { password: newPassword }
        });

        res.json({
            success: true,
            message: "Mot de passe modifié avec succès"
        });
    } catch (error) {
        console.error("Password update error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors du changement de mot de passe" });
    }
});

export default router;
