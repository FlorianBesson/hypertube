import fs from 'fs';
import { movieDbService } from '../../movies/movieDbService';
import { DEFAULT_USER_AGENT } from './archiveUtils';

/**
 * Downloads an Internet Archive video stream in the background to local disk
 * and registers the completed movie download in the database.
 */
export async function backgroundDownloadArchiveMovie(
  identifier: string,
  directUrl: string,
  targetPath: string,
  fileSize: bigint | null,
  userAgent?: string
): Promise<void> {
  if (fs.existsSync(targetPath) && fileSize && BigInt(fs.statSync(targetPath).size) >= fileSize) {
    return;
  }
  try {
    const res = await fetch(directUrl, {
      headers: { 'User-Agent': userAgent || DEFAULT_USER_AGENT },
      redirect: 'follow'
    });
    if (!res.ok || !res.body) return;

    const fileStream = fs.createWriteStream(targetPath);
    const reader = res.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(value);
    }
    fileStream.end();

    const finalSize = fs.existsSync(targetPath) ? BigInt(fs.statSync(targetPath).size) : (fileSize || BigInt(0));

    await movieDbService.markMovieCompleted(identifier, identifier, targetPath, finalSize);
  } catch (err) {
    console.error(`[archiveService] Failed background save for ${identifier}:`, err);
  }
}
