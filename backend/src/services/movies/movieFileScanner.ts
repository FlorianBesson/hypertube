import fs from 'fs';
import path from 'path';

export interface CompletedMovieFile {
  filePath: string;
  fileSize: bigint;
}

/**
 * Checks if a file exists on disk at the given path.
 */
export function checkExistingPath(existingPath?: string | null, fallbackFileSize?: bigint | null): CompletedMovieFile | null {
  if (existingPath && fs.existsSync(existingPath)) {
    const fileSize = fallbackFileSize || BigInt(fs.statSync(existingPath).size);
    return {
      filePath: existingPath,
      fileSize,
    };
  }
  return null;
}

/**
 * Recursively finds the first non-empty video file in a directory.
 */
export function findVideoInFolder(dir: string): string | null {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v'];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        const sub = findVideoInFolder(full);
        if (sub) return sub;
      } else if (videoExtensions.includes(path.extname(file).toLowerCase()) && stat.size > 0) {
        return full;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Checks the downloads base directory for a torrent folder matching torrentHash.
 */
export function scanDownloadsDir(downloadsBaseDir: string, torrentHash: string): CompletedMovieFile | null {
  const normalizedHash = torrentHash.toLowerCase();
  const downloadFolder = path.join(downloadsBaseDir, normalizedHash);
  if (fs.existsSync(downloadFolder)) {
    const found = findVideoInFolder(downloadFolder);
    if (found) {
      const stat = fs.statSync(found);
      return {
        filePath: found,
        fileSize: BigInt(stat.size),
      };
    }
  }
  return null;
}
