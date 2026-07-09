import express, { Application, Request, Response } from 'express';

import jwt from 'jsonwebtoken';

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
                name: user.name
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
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
        console.log()
    }
})

app.get('/api/ping', (req: Request, res: Response) => {
  res.send('Hello, TypeScript + Express!');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});