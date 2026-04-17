import express, { Application, Request, Response } from 'express';

// Database + Prisma imports
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
})

const prisma = new PrismaClient({
    adapter,
})

const app: Application = express();
const PORT = 3000;

app.get("/db-check", async (req, res) => {
    const userCount = await prisma.user.count();
    res.json(userCount == 0 ? "No users have been added yet." : "Some users have been added to the database.")
})

app.get('/api', (req: Request, res: Response) => {
  res.send('Hello, TypeScript + Express!');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});