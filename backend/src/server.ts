import express, { Application, Request, Response } from 'express';

import { checkDbConnection } from './db/utils';
// Database + Prisma imports
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import "dotenv/config";

// Database connection
const DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@postgres_db:5432/${process.env.POSTGRES_DB}?schema=public`;

const adapter = new PrismaPg({
    connectionString: DATABASE_URL
})

export const prisma = new PrismaClient({
    adapter,
})

// Routes
import authRouter from './routes/auth';


const PORT = 3000;
export const app: Application = express();

app.use(express.json());
app.use("/api/auth", authRouter);

app.get('/api/ping', (req: Request, res: Response) => {
  res.send('Hello, TypeScript + Express!');
});

app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    await checkDbConnection();
});