import fs from 'fs';
import path from 'path';

export interface CompletedMovieFile {
  filePath: string;
  fileSize: bigint;
}

/**
 * Checks if a fully downloaded file exists on disk at the given path.
 */
export function checkExistingPath(existingPath?: string | null, expectedFileSize?: bigint | null): CompletedMovieFile | null {
  if (!existingPath || !fs.existsSync(existingPath)) {
    return null;
  }

  const actualFileSize = BigInt(fs.statSync(existingPath).size);

  // A torrent writes each piece at its own offset, so a partially downloaded file already
  // exists at a smaller size. Serving it would cap seeking to whatever landed on disk,
  // so fall back to P2P streaming, which knows the real length and fetches on demand.
  if (expectedFileSize && actualFileSize !== expectedFileSize) {
    console.warn(`[movieFileScanner] ${existingPath} is incomplete (${actualFileSize}/${expectedFileSize} bytes), ignoring cached copy`);
    return null;
  }

  return {
    filePath: existingPath,
    fileSize: actualFileSize,
  };
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
