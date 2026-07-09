import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

const router = Router();
// Secret key used to sign the JWT token on login success
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

        // Search for user in database by normalized email
        const user = await prisma.user.findUnique({
            where: { email: username.toLowerCase().trim() }
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
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

export default router;
