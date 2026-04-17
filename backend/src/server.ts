import express, { Application, Request, Response } from 'express';

// Database + Prisma imports
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import "dotenv/config";

const DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres_db:5432/${process.env.POSTGRES_DB}?schema=public`;

const adapter = new PrismaPg({
    connectionString: DATABASE_URL
})

const prisma = new PrismaClient({
    adapter,
})

const app: Application = express();
const PORT = 3000;

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

app.get('/api/welcome', (req: Request, res: Response) => {
  res.send('Hello, TypeScript + Express!');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});