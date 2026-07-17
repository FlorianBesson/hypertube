import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth';
import { upload, uploadDirectory } from '../config/multer';

const router = Router();

/**
 * Route: POST /api/user/avatar
 * Description: Uploads and sets a new profile avatar image for the authenticated user.
 * Authenticated: Yes
 */
router.post("/avatar", authenticateToken, (req: Request, res: Response) => {
    // Process single file upload under key 'avatar'
    upload.single('avatar')(req, res, async (err) => {
        // Handle upload errors (size limit exceeded, wrong file type)
        if (err) {
            res.status(400).json({ success: false, message: err.message || "Erreur lors du téléversement" });
            return;
        }

        // Verify if a file was actually sent
        if (!req.file) {
            res.status(400).json({ success: false, message: "Aucun fichier téléversé" });
            return;
        }

        try {
            const userId = (req as any).user.userId;
            const photoUrl = `/uploads/avatars/${req.file.filename}`;

            // Save the relative file URL to the user profile in the database
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
                    username: updatedUser.username,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    photo: updatedUser.photo,
                    bio: updatedUser.bio,
                    lastLogin: updatedUser.lastLogin
                }
            });
        } catch (error) {
            console.error("Avatar update error:", error);
            res.status(500).json({ success: false, message: "Erreur serveur lors de la mise à jour" });
        }
    });
});

/**
 * Route: DELETE /api/user/avatar
 * Description: Deletes the profile avatar image from the server filesystem and sets it to null in the database.
 * Authenticated: Yes
 */
router.delete("/avatar", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;

        // Fetch current user details to check for an existing photo
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
            return;
        }

        if (user.photo) {
            // Delete the physical file from the disk if it resides in our avatars folder
            if (user.photo.startsWith('/uploads/avatars/')) {
                const fileName = user.photo.replace('/uploads/avatars/', '');
                const filePath = path.join(uploadDirectory, fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // Sync delete operation
                }
            }
        }

        // Remove the avatar reference in the database
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
                username: updatedUser.username,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                photo: updatedUser.photo,
                bio: updatedUser.bio,
                lastLogin: updatedUser.lastLogin
            }
        });
    } catch (error) {
        console.error("Avatar delete error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression de la photo de profil" });
    }
});

/**
 * Route: PUT /api/user/profile
 * Description: Updates the first name, last name, email, or biography for the authenticated user.
 * Authenticated: Yes
 */
router.put("/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { firstName, lastName, email, bio } = req.body;

        if (firstName !== undefined && !firstName.trim()) {
            res.status(400).json({ success: false, message: "Le prénom est requis" });
            return;
        }
        if (lastName !== undefined && !lastName.trim()) {
            res.status(400).json({ success: false, message: "Le nom est requis" });
            return;
        }

        // Validate the email format if provided
        if (email) {
            const cleanEmail = email.toLowerCase().trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                res.status(400).json({ success: false, message: "Format d'adresse email invalide" });
                return;
            }

            // Ensure the new email is not already taken by another registered user
            const existingUser = await prisma.user.findUnique({
                where: { email: cleanEmail }
            });
            if (existingUser && existingUser.id !== userId) {
                res.status(400).json({ success: false, message: "Cette adresse email est déjà utilisée" });
                return;
            }
        }

        // Update the user properties in Postgres via Prisma
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: firstName !== undefined ? firstName.trim() : undefined,
                lastName: lastName !== undefined ? lastName.trim() : undefined,
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
                username: updatedUser.username,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
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

/**
 * Route: PUT /api/user/password
 * Description: Updates the password of the authenticated user after checking their current password.
 * Authenticated: Yes
 */
router.put("/password", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { currentPassword, newPassword } = req.body;

        // Ensure both fields are provided
        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, message: "Veuillez renseigner l'ancien et le nouveau mot de passe" });
            return;
        }

        // Enforce password length requirements
        if (newPassword.length < 8) {
            res.status(400).json({ success: false, message: "Le nouveau mot de passe doit faire au moins 8 caractères" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
            return;
        }

        // Validate password match
        if (user.password !== currentPassword) {
            res.status(400).json({ success: false, message: "L'ancien mot de passe est incorrect" });
            return;
        }

        // Update password in DB
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
