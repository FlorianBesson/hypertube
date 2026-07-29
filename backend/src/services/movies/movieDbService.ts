import fs from 'fs';
import path from 'path';
import { prisma } from '../../prisma';

export class MovieDbService {
  /**
   * Updates or creates lastWatchedAt timestamp in BDD for a given movie.
   */
  public async updateLastWatched(torrentHash: string, imdbId?: string): Promise<void> {
    const identifier = imdbId || torrentHash;
    try {
      const existing = await prisma.movie.findFirst({
        where: {
          OR: [{ imdbId: identifier }, { hash: torrentHash }],
        },
      });

      if (existing) {
        await prisma.movie.update({
          where: { id: existing.id },
          data: { lastWatchedAt: new Date() },
        });
      } else {
        await prisma.movie.create({
          data: {
            imdbId: identifier,
            hash: torrentHash,
            lastWatchedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(`[MovieDbService] Error updating lastWatchedAt for ${torrentHash}:`, error);
    }
  }

  /**
   * Checks if a movie is already downloaded and completed on disk.
   */
  public async getCompletedMovie(torrentHash: string, imdbId?: string, downloadsBaseDir?: string): Promise<{ filePath: string; fileSize: bigint } | null> {
    const normalizedHash = torrentHash.toLowerCase();
    const identifier = imdbId || normalizedHash;

    try {
      const existing = await prisma.movie.findFirst({
        where: {
          OR: [{ imdbId: identifier }, { hash: normalizedHash }],
        },
      });

      if (existing && existing.isCompleted && existing.filePath) {
        if (fs.existsSync(existing.filePath)) {
          return {
            filePath: existing.filePath,
            fileSize: existing.fileSize || BigInt(fs.statSync(existing.filePath).size),
          };
        }
      }
    } catch (err) {
      console.warn(`[MovieDbService] DB check warning for ${torrentHash}:`, err);
    }

    if (downloadsBaseDir) {
      const downloadFolder = path.join(downloadsBaseDir, normalizedHash);
      if (fs.existsSync(downloadFolder)) {
        const findVideoInDir = (dir: string): string | null => {
          const files = fs.readdirSync(dir);
          const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v'];
          for (const file of files) {
            const full = path.join(dir, file);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
              const sub = findVideoInDir(full);
              if (sub) return sub;
            } else if (videoExtensions.includes(path.extname(file).toLowerCase()) && stat.size > 0) {
              return full;
            }
          }
          return null;
        };

        const found = findVideoInDir(downloadFolder);
        if (found) {
          const stat = fs.statSync(found);
          return {
            filePath: found,
            fileSize: BigInt(stat.size),
          };
        }
      }
    }

    return null;
  }

  /**
   * Upserts movie record on completion.
   */
  public async markMovieCompleted(identifier: string, hash: string, targetPath: string, fileSize: bigint): Promise<void> {
    try {
      await prisma.movie.upsert({
        where: { imdbId: identifier },
        update: {
          hash,
          filePath: targetPath,
          fileSize,
          isCompleted: true,
          lastWatchedAt: new Date(),
        },
        create: {
          imdbId: identifier,
          hash,
          filePath: targetPath,
          fileSize,
          isCompleted: true,
          lastWatchedAt: new Date(),
        },
      });
    } catch (dbErr) {
      console.warn(`[MovieDbService] DB upsert warning for ${identifier}:`, dbErr);
    }
  }
}

export const movieDbService = new MovieDbService();
