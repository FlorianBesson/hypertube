import fs from 'fs';
import { getMimeType } from '../mimeService';

/**
 * Streams a local file to the Express response object with HTTP 206 Partial Content (Range) support.
 */
export function streamLocalFile(
  filePath: string,
  rangeHeader: string | undefined,
  res: any,
  filename: string
): void {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = getMimeType(filename);

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
    });
    fs.createReadStream(filePath).pipe(res);
  }
}
