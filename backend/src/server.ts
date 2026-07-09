import express, { Application, Request, Response } from 'express';
import path from 'path';
import { prisma } from './prisma';

// Import router modules for authentication and profile management
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import usersRoutes from './routes/users';

const app: Application = express();
const PORT = 3000;

// Enable JSON body parsing middleware for processing incoming requests
app.use(express.json());

// Serve uploaded user files/avatars statically from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register main API endpoints with their mount paths
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', usersRoutes);

/**
 * Health check endpoint for testing database connectivity.
 * Verifies that the Prisma Client can establish a connection and read from the Postgres database.
 */
app.get("/api/db-check", async (req, res) => {
    try {
        await prisma.user.count();
        res.json({ success: true, message: "Database connected to Express !" });
    } catch (error) {
        console.error("DB Check error:", error);
        res.status(500).json({ success: false, message: "DB Error" });
    }
});

// Basic server test ping endpoint
app.get('/api/ping', (req: Request, res: Response) => {
    res.send('Hello, TypeScript + Express!');
});

// Start the Express HTTP listener
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});