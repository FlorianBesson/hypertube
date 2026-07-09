import express, { Application, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Database + Prisma imports
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import "dotenv/config";

const DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres_db:5432/${process.env.POSTGRES_DB}?schema=public`;
const JWT_SECRET = process.env.JWT_SECRET || 'hypertube_super_secret_key';

const adapter = new PrismaPg({
    connectionString: DATABASE_URL
})

const prisma = new PrismaClient({
    adapter,
})

const app: Application = express();
const PORT = 3000;

app.use(express.json());

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware to authenticate JWT
const authenticateToken = (req: Request, res: Response, next: () => void) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ success: false, message: "Token d'authentification manquant" });
        return;
    }

    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
        if (err) {
            res.status(403).json({ success: false, message: "Token invalide ou expiré" });
            return;
        }
        (req as any).user = decoded;
        next();
    });
};

// Multer Storage Configuration
const uploadDirectory = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        const userId = (req as any).user?.userId || 'unknown';
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${userId}-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error("Seules les images (jpeg, jpg, png, webp) sont autorisées"));
        }
    }
});

// Login Endpoint
app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ success: false, message: "Nom d'utilisateur et mot de passe requis" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email: username.toLowerCase().trim() }
        });

        if (!user) {
            res.status(401).json({ success: false, message: "Identifiants incorrects" });
            return;
        }

        if (user.password !== password) {
            res.status(401).json({ success: false, message: "Identifiants incorrects" });
            return;
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            message: "Connexion réussie",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                photo: user.photo
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// Photo upload endpoint
app.post("/api/user/avatar", authenticateToken, (req: Request, res: Response) => {
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

// Update profile details
app.put("/api/user/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { name, email } = req.body;

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
            }
        });

        res.json({
            success: true,
            message: "Profil mis à jour avec succès",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                photo: updatedUser.photo
            }
        });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la mise à jour" });
    }
});

// Update password
app.put("/api/user/password", authenticateToken, async (req: Request, res: Response) => {
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

app.get("/api/db-check", async (req, res) => {
    try
    {
        const userCount = await prisma.user.count();
        res.json({ success: true, message: "Database connected to Express !" })        
    }
    catch(error)
    {
        res.status(500).json({ success: false, message: "DB Error" });
    }
})

app.get('/api/ping', (req: Request, res: Response) => {
  res.send('Hello, TypeScript + Express!');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});