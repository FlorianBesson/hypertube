import { prisma } from '../../prisma';

export type MovieRecord = Awaited<ReturnType<typeof prisma.movie.findFirst>>;

/**
 * Finds a movie record by imdbId or torrent hash.
 */
export async function findMovieRecord(torrentHash: string, imdbId?: string): Promise<MovieRecord> {
  const normalizedHash = torrentHash.toLowerCase();
  const identifier = imdbId || normalizedHash;

  return prisma.movie.findFirst({
    where: {
      OR: [{ imdbId: identifier }, { hash: normalizedHash }],
    },
  });
}

/**
 * Updates or creates lastWatchedAt timestamp in DB for a given movie.
 */
export async function updateLastWatched(torrentHash: string, imdbId?: string): Promise<void> {
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
    console.error(`[movieRepository] Error updating lastWatchedAt for ${torrentHash}:`, error);
  }
}

/**
 * Upserts movie record on completion.
 */
export async function markMovieCompleted(identifier: string, hash: string, targetPath: string, fileSize: bigint): Promise<void> {
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
    console.warn(`[movieRepository] DB upsert warning for ${identifier}:`, dbErr);
  }
}
