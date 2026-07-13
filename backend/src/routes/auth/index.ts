import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { registerHandler } from './register';
import oauthRouter from './oauth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'magneto_super_secret_key';

// Login Endpoint (mounted at /api/auth/login)
router.post("/login", async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // Basic payload validation
        if (!username || !password) {
            res.status(400).json({ success: false, message: "Nom d'utilisateur et mot de passe requis" });
            return;
        }

        // Search for user in database by normalized username
        const user = await prisma.user.findUnique({
            where: { username: username.toLowerCase().trim() }
        });

        // Fail if user is not found
        if (!user) {
            res.status(401).json({ success: false, message: "Identifiants incorrects" });
            return;
        }

        // Verify plain-text password match (simplified authentication for project 42)
        if (user.password !== password) {
            res.status(401).json({ success: false, message: "Identifiants incorrects" });
            return;
        }

        // Update last login timestamp in the database
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        // Sign a new JWT token containing user details, valid for 1 day
        const token = jwt.sign(
            { userId: updatedUser.id, email: updatedUser.email, name: updatedUser.name },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Send successful response with signed token and user profile details
        res.json({
            success: true,
            message: "Connexion réussie",
            token,
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
        if (process.env.NODE_ENV === 'dev')
            console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// Register Endpoint (mounted at /api/auth/register)
router.post("/register", registerHandler);

// OAuth Endpoints (mounted under /api/auth/42, /api/auth/google, etc.)
router.use("/", oauthRouter);

export default router;
