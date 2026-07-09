import express, { Application, Request, Response } from 'express';
import path from 'path';
import { prisma } from './prisma';

// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import usersRoutes from './routes/users';

const app: Application = express();
const PORT = 3000;

app.use(express.json());

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes registration
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', usersRoutes);

// Health check endpoint
app.get("/api/db-check", async (req, res) => {
    try {
        await prisma.user.count();
        res.json({ success: true, message: "Database connected to Express !" });
    } catch (error) {
        console.error("DB Check error:", error);
        res.status(500).json({ success: false, message: "DB Error" });
    }
});

// Ping endpoint
app.get('/api/ping', (req: Request, res: Response) => {
    res.send('Hello, TypeScript + Express!');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});