import * as repository from './movieRepository';
import * as scanner from './movieFileScanner';
import { CompletedMovieFile } from './movieFileScanner';

/**
 * Updates or creates lastWatchedAt timestamp in DB for a given movie.
 */
export async function updateLastWatched(torrentHash: string, imdbId?: string): Promise<void> {
  return repository.updateLastWatched(torrentHash, imdbId);
}

/**
 * Checks if a movie is already downloaded and completed on disk.
 */
export async function getCompletedMovie(
  torrentHash: string,
  imdbId?: string,
  downloadsBaseDir?: string
): Promise<CompletedMovieFile | null> {
  try {
    const existing = await repository.findMovieRecord(torrentHash, imdbId);
    if (existing && existing.isCompleted && existing.filePath) {
      const completedFile = scanner.checkExistingPath(existing.filePath, existing.fileSize);
      if (completedFile) {
        return completedFile;
      }
    }
  } catch (err) {
    console.warn(`[movieDbService] DB check warning for ${torrentHash}:`, err);
  }

  if (downloadsBaseDir) {
    return scanner.scanDownloadsDir(downloadsBaseDir, torrentHash);
  }

  return null;
}

/**
 * Upserts movie record on completion.
 */
export async function markMovieCompleted(
  identifier: string,
  hash: string,
  targetPath: string,
  fileSize: bigint
): Promise<void> {
  return repository.markMovieCompleted(identifier, hash, targetPath, fileSize);
}

/**
 * Object export for backward compatibility with existing imports like:
 * import { movieDbService } from '../movies/movieDbService';
 */
export const movieDbService = {
  updateLastWatched,
  getCompletedMovie,
  markMovieCompleted,
};
