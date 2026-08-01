import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../prisma';

/**
 * Cleans up video files and associated subtitles for movies not watched in over 30 days.
 * - Deletes the physical file (or folder) from disk if it exists.
 * - Resets the DB fields `filePath`, `isCompleted` and `fileSize`.
 * - Logs the number of movies purged and the space freed.
 */
export async function cleanupOldMovies(): Promise<{ purgedCount: number; freedBytes: number }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let purgedCount = 0;
    let freedBytes = 0;

    try {
        const expiredMovies = await prisma.movie.findMany({
            where: {
                filePath: { not: null },
                lastWatchedAt: { lt: thirtyDaysAgo },
            },
        });

        if (expiredMovies.length === 0) {
            return { purgedCount: 0, freedBytes: 0 };
        }

        for (const movie of expiredMovies) {
            if (!movie.filePath) continue;

            let fileFreed = 0;

            try {
                if (fs.existsSync(movie.filePath)) {
                    const stats = fs.statSync(movie.filePath);
                    fileFreed = stats.size;

                    if (stats.isDirectory()) {
                        await fs.promises.rm(movie.filePath, { recursive: true, force: true });
                    } else {
                        await fs.promises.unlink(movie.filePath);

                        // Also clean up associated subtitles if they share the same base name or folder
                        const dir = path.dirname(movie.filePath);
                        const ext = path.extname(movie.filePath);
                        const baseName = path.basename(movie.filePath, ext);

                        if (fs.existsSync(dir)) {
                            const dirFiles = await fs.promises.readdir(dir);
                            for (const file of dirFiles) {
                                if (file.startsWith(baseName) && (file.endsWith('.vtt') || file.endsWith('.srt'))) {
                                    const subPath = path.join(dir, file);
                                    if (fs.existsSync(subPath)) {
                                        const subStats = fs.statSync(subPath);
                                        fileFreed += subStats.size;
                                        await fs.promises.unlink(subPath);
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`[CRON] Error deleting file for movie ID ${movie.id} (${movie.filePath}):`, err);
            }

            // Reset the database fields
            await prisma.movie.update({
                where: { id: movie.id },
                data: {
                    filePath: null,
                    isCompleted: false,
                    fileSize: null,
                },
            });

            purgedCount++;
            freedBytes += fileFreed;
        }

    } catch (error) {
        console.error('[CRON] Global error while cleaning up inactive videos:', error);
    }

    return { purgedCount, freedBytes };
}

/**
 * Initializes the Cron scheduler to run the daily cleanup at 3:00 AM.
 */
export function initCronJobs(): void {
    // Runs every day at 3:00 AM ('0 3 * * *')
    cron.schedule('0 3 * * *', async () => {
        await cleanupOldMovies();
    });
}
