import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../prisma';
import { authenticateToken } from '../../middlewares/auth';
import { upload, uploadDirectory } from '../../config/multer';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

const router = Router();

const checkProfileOwner = (req: Request, res: Response, next: NextFunction) => {
    const idParam = req.params.id;
    if (!idParam) {
        res.status(400).json({ success: false, message: "Missing user ID" });
        return;
    }
    const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
    const targetId = parseInt(idStr, 10);
    if (isNaN(targetId)) {
        res.status(400).json({ success: false, message: "Invalid user ID" });
        return;
    }

    const rawUserId = (req as any).user?.userId;
    if (!rawUserId) {
        res.status(401).json({ success: false, message: "Unauthenticated" });
        return;
    }

    const requesterId = Number(rawUserId);
    if (requesterId !== targetId) {
        res.status(403).json({ success: false, message: "Access denied. You can only modify your own profile." });
        return;
    }

    (req as any).targetId = targetId;
    next();
};

router.get("/", authenticateToken, async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching users" });
    }
});

router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        if (!idParam) {
            res.status(400).json({ success: false, message: "Missing user ID" });
            return;
        }
        // Normalize parameter if array, parse to integer ID
        const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
        const targetId = parseInt(idStr, 10);
        if (isNaN(targetId)) {
            res.status(400).json({ success: false, message: "Invalid user ID" });
            return;
        }

        const rawUserId = (req as any).user?.userId;
        const requesterId = rawUserId ? Number(rawUserId) : undefined;

        const isOwner = requesterId === targetId;

        // Fetch limited set of fields for public safety (no password, no raw email unless owner)
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
                lastLogin: true,
                email: true
            }
        });

        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                photo: user.photo,
                profile_picture_url: user.photo,
                createdAt: user.createdAt,
                bio: user.bio,
                lastLogin: user.lastLogin,
                ...(isOwner && { email: user.email })
            }
        });
    } catch (error) {
        console.error("Fetch user details error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching user profile" });
    }
});

/**
 * Security Flow:
 * 1. authenticateToken -> verifies JWT validity (401 if invalid/missing)
 * 2. checkProfileOwner -> verifies targetId == requesterId (403 if modifying another profile) BEFORE Multer touches files
 * 3. upload.single('avatar') -> handles file upload ONLY AFTER authorization is confirmed
 * 4. updateHandler -> validates payload, cleans up old disk files, hashes passwords, updates Prisma
 */
router.patch("/:id", authenticateToken, checkProfileOwner, (req: Request, res: Response) => {
    upload.single('avatar')(req, res, async (err) => {
        if (err) {
            res.status(400).json({ success: false, message: err.message || "Error uploading avatar photo" });
            return;
        }

        try {
            const targetId = (req as any).targetId;

            // Fetch current user details from DB to check old photo & password
            const currentUser = await prisma.user.findUnique({ where: { id: targetId } });
            if (!currentUser) {
                res.status(404).json({ success: false, message: "User not found" });
                return;
            }

            const { username, email, password, photo, profile_picture_url, firstName, lastName, bio, preferredLanguage, currentPassword } = req.body;
            const updateData: any = {};

            // 1. Handle Avatar File / Photo URL Update & Cleanup of old disk files
            const isDeletingPhoto = photo === '' || photo === null || profile_picture_url === '' || profile_picture_url === null;

            if (req.file || isDeletingPhoto || photo !== undefined || profile_picture_url !== undefined) {
                // Delete old disk file if it exists in local avatars directory
                if (currentUser.photo && currentUser.photo.startsWith('/uploads/avatars/')) {
                    const oldFileName = currentUser.photo.replace('/uploads/avatars/', '');
                    const oldFilePath = path.join(uploadDirectory, oldFileName);
                    if (fs.existsSync(oldFilePath)) {
                        try {
                            fs.unlinkSync(oldFilePath);
                        } catch (e) {
                            console.error("Failed to delete old avatar file:", e);
                        }
                    }
                }

                if (req.file) {
                    updateData.photo = `/uploads/avatars/${req.file.filename}`;
                } else if (isDeletingPhoto) {
                    updateData.photo = null;
                } else {
                    updateData.photo = photo || profile_picture_url;
                }
            }

            // 2. Validate & Update Username
            if (username !== undefined) {
                const cleanUsername = username.trim();
                if (cleanUsername.length < 3) {
                    res.status(400).json({ success: false, message: "Username must be at least 3 characters long" });
                    return;
                }
                const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
                if (existing && existing.id !== targetId) {
                    res.status(400).json({ success: false, message: "Username is already taken" });
                    return;
                }
                updateData.username = cleanUsername;
            }

            // 3. Validate & Update Email
            if (email !== undefined) {
                const cleanEmail = email.toLowerCase().trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                    res.status(400).json({ success: false, message: "Invalid email address format" });
                    return;
                }
                const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
                if (existing && existing.id !== targetId) {
                    res.status(400).json({ success: false, message: "Email address is already in use" });
                    return;
                }
                updateData.email = cleanEmail;
            }

            // 4. Validate & Update Password (Requires currentPassword verification)
            if (password !== undefined && password !== "") {
                if (password.length < 8) {
                    res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
                    return;
                }
                if (!currentPassword) {
                    res.status(400).json({ success: false, message: "Current password is required to change password" });
                    return;
                }
                const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
                if (!isPasswordValid) {
                    res.status(400).json({ success: false, message: "Incorrect current password" });
                    return;
                }
                updateData.password = await bcrypt.hash(password, 10);
            }

            // 5. Update optional text fields
            if (firstName !== undefined) updateData.firstName = firstName.trim();
            if (lastName !== undefined) updateData.lastName = lastName.trim();
            if (bio !== undefined) updateData.bio = bio;
            if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage.trim().toLowerCase();

            const updatedUser = await prisma.user.update({
                where: { id: targetId },
                data: updateData
            });

            res.json({
                success: true,
                message: "Profile updated successfully",
                user: {
                    id: updatedUser.id,
                    username: updatedUser.username,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    photo: updatedUser.photo,
                    profile_picture_url: updatedUser.photo,
                    bio: updatedUser.bio,
                    preferredLanguage: updatedUser.preferredLanguage,
                    lastLogin: updatedUser.lastLogin
                }
            });
        } catch (error) {
            console.error("PATCH user profile error:", error);
            res.status(500).json({ success: false, message: "Server error while updating profile" });
        }
    });
});

export default router;
