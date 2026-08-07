import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import { HttpError } from './errors';
import { checkDbConnection } from './db/utils';

// Import modular router packages for each domain
import authRoutes from './routes/auth';
import { oauthTokenHandler } from './routes/auth/oauth';
import { communityRouter } from './routes/users';
import movieRoutes from './routes/movies';
import commentsRouter from './routes/movies/comments';

import { initCronJobs } from './services/maintenance';

const PORT = 3000;
export const app: Application = express();

// Enable JSON body parsing middleware for processing incoming requests
app.use(express.json());

// Serve uploaded user files/avatars statically from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register main API endpoints with their mount paths
app.post('/oauth/token', oauthTokenHandler);
app.use('/api/auth', authRoutes);
app.use('/api/users', communityRouter);
app.use('/users', communityRouter);
app.use('/api/comments', commentsRouter);
app.use('/comments', commentsRouter);
app.use('/api/movies', movieRoutes);
app.use('/movies', movieRoutes);
app.use('/api/movie', movieRoutes);
app.use('/movie', movieRoutes);

// 404 Catch-all handler for unhandled API endpoints
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'dev') {
        console.error(err);
    }

    // Streaming routes may have already started writing the response body;
    // delegate to Express's default handler so it just closes the connection.
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof HttpError) {
        return res.status(err.status).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
});

// Start the Express HTTP listener
app.listen(PORT, async () => {
    await checkDbConnection();
    initCronJobs();
});
