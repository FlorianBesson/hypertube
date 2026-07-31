import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../prisma';
import { authenticateToken } from '../../middlewares/auth';
import { upload, uploadDirectory } from '../../config/multer';
import * as z from "zod";
import bcrypt from "bcrypt";
import { fromFile as fileTypeFromFile } from 'file-type';
import { HttpError } from '../../errors';

const router = Router();

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Route: POST /api/user/avatar
 * Description: Uploads and sets a new profile avatar image for the authenticated user.
 * Authenticated: Yes
 */
router.post("/avatar", authenticateToken, (req: Request, res: Response, next: NextFunction) => {
    // Process single file upload under key 'avatar'. multer invokes this callback
    // outside of Express's own call stack, so errors must go through next()
    // rather than being thrown, to reach the centralized error handler.
    upload.single('avatar')(req, res, async (err) => {
        // Handle upload errors (size limit exceeded, wrong file type)
        if (err) {
            return next(new HttpError(400, err.message || "Error while uploading file"));
        }

        // Verify if a file was actually sent
        if (!req.file) {
            return next(new HttpError(400, "No file uploaded"));
        }

        // Verify the actual file content (magic bytes) matches an allowed image type,
        // since the extension/mimetype checked by multer's fileFilter are client-supplied and spoofable
        const detectedType = await fileTypeFromFile(req.file.path);
        if (!detectedType || !ALLOWED_AVATAR_MIME_TYPES.includes(detectedType.mime)) {
            fs.unlinkSync(req.file.path);
            return next(new HttpError(400, "Uploaded file content does not match an allowed image type"));
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
                message: "Profile photo updated successfully",
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
            next(error);
        }
    });
});

/**
 * Route: DELETE /api/user/avatar
 * Description: Deletes the profile avatar image from the server filesystem and sets it to null in the database.
 * Authenticated: Yes
 */
router.delete("/avatar", authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    // Fetch current user details to check for an existing photo
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new HttpError(404, "User not found");
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
        message: "Profile photo deleted successfully",
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
});

/**
 * Route: PUT /api/user/profile
 * Description: Updates the first name, last name, email, or biography for the authenticated user.
 * Authenticated: Yes
 */
router.put("/profile", authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const { firstName, lastName, email, bio, preferredLanguage } = req.body;

    if (firstName !== undefined && !firstName.trim()) {
        throw new HttpError(400, "First name is required");
    }
    if (lastName !== undefined && !lastName.trim()) {
        throw new HttpError(400, "Last name is required");
    }

    // Validate the email format if provided
    if (email) {
        const cleanEmail = email.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            throw new HttpError(400, "Invalid email address format");
        }

        // Ensure the new email is not already taken by another registered user
        const existingUser = await prisma.user.findUnique({
            where: { email: cleanEmail }
        });
        if (existingUser && existingUser.id !== userId) {
            throw new HttpError(400, "This email address is already in use");
        }
    }

    // Validate preferred language code format if provided (e.g. 2-letter ISO code)
    if (preferredLanguage !== undefined) {
        if (typeof preferredLanguage !== 'string' || !/^[a-z]{2,3}$/i.test(preferredLanguage.trim())) {
            throw new HttpError(400, "Invalid preferred language code (e.g. 'fr', 'en', 'es')");
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
            preferredLanguage: preferredLanguage !== undefined ? preferredLanguage.trim().toLowerCase() : undefined,
        }
    });

    res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            photo: updatedUser.photo,
            bio: updatedUser.bio,
            preferredLanguage: updatedUser.preferredLanguage,
            lastLogin: updatedUser.lastLogin
        }
    });
});

/**
 * Route: PUT /api/user/password
 * Description: Updates the password of the authenticated user after checking their current password.
 * Authenticated: Yes
 */
const PasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters long")
        .regex(/[0-9]/, "Password must contain at least one digit")
        .regex(/[\p{P}\p{S}]/u, "Password must contain at least one special character")
});

router.put("/password", authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    const result = PasswordSchema.safeParse(req.body);
    if (!result.success) {
        throw new HttpError(400, result.error.issues[0].message);
    }
    const { currentPassword, newPassword } = result.data;

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new HttpError(404, "User not found");
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
        throw new HttpError(400, "Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    await prisma.user.update({
        where: { id: userId },
        data: { password: newPasswordHash }
    });

    res.json({
        success: true,
        message: "Password changed successfully"
    });
});

export default router;
