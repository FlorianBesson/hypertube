import path from 'path';
import fs from 'fs';
import { getMimeType } from './mimeService';
import { DEFAULT_USER_AGENT, isArchiveIdentifier, fetchWithTimeout } from './archive/archiveUtils';
import { fetchArchiveMetadata, getArchiveCandidateFiles } from './archive/archiveMetadata';
import { backgroundDownloadArchiveMovie } from './archive/archiveDownloader';
import { streamLocalFile } from './archive/archiveStreamer';

export { isArchiveIdentifier, getArchiveIdentifier } from './archive/archiveUtils';

/**
 * Streams an Internet Archive movie using HTTP 206 Partial Content directly from Archive.org CDN,
 * with candidate fallback loop, timeout protection, and background disk caching.
 */
export async function streamArchiveMovie(
  identifier: string,
  rangeHeader: string | undefined,
  res: any,
  clientUserAgent?: string,
  downloadsBaseDir: string = path.join(process.cwd(), 'downloads')
): Promise<void> {
  const activeUserAgent = clientUserAgent || DEFAULT_USER_AGENT;
  const downloadFolder = path.join(downloadsBaseDir, identifier.toLowerCase());
  if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder, { recursive: true });
  }

  // 1. Fetch metadata with timeout
  const data = await fetchArchiveMetadata(identifier, activeUserAgent);
  const files = data?.files || [];
  const candidateFiles = getArchiveCandidateFiles(files, identifier);

  let activeRes: Response | null = null;
  let selectedFilename: string = candidateFiles[0].name;
  let selectedFileSize: bigint | null = candidateFiles[0].size ? BigInt(candidateFiles[0].size) : null;
  let selectedDirectUrl: string = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(selectedFilename)}`;

  // 2. Iterate through candidates until an accessible stream is reached
  for (const candidate of candidateFiles) {
    const targetFilePath = path.join(downloadFolder, candidate.name);

    if (fs.existsSync(targetFilePath) && candidate.size && Number(candidate.size) > 0 && fs.statSync(targetFilePath).size >= Number(candidate.size)) {
      streamLocalFile(targetFilePath, rangeHeader, res, candidate.name);
      return;
    }

    const candidateUrls = [
      `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(candidate.name)}`,
      `http://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(candidate.name)}`
    ];

    for (const archiveDirectUrl of candidateUrls) {
      const headers: Record<string, string> = { 'User-Agent': activeUserAgent };
      if (rangeHeader) {
        headers['Range'] = rangeHeader;
      }

      try {
        const cdnRes = await fetchWithTimeout(archiveDirectUrl, { headers, redirect: 'follow' }, 4000);
        if (cdnRes.ok || cdnRes.status === 206) {
          activeRes = cdnRes;
          selectedFilename = candidate.name;
          selectedFileSize = candidate.size ? BigInt(candidate.size) : null;
          selectedDirectUrl = archiveDirectUrl;
          break;
        }
      } catch (err: any) {
        console.warn(`[archiveService] Candidate ${archiveDirectUrl} failed (${err.message}). Trying next...`);
      }
    }

    if (activeRes) break;
  }

  if (!activeRes) {
    const serverInfo = data?.server ? ` (Server ${data.server})` : '';
    console.warn(`[archiveService] Storage server offline for ${identifier}${serverInfo}`);
    throw new Error(`The Internet Archive storage server for this movie${serverInfo} is currently unavailable or offline. Please try again later.`);
  }

  const targetFilePath = path.join(downloadFolder, selectedFilename);
  const archiveDirectUrl = selectedDirectUrl;

  const resHeaders: Record<string, string> = {
    'Content-Type': activeRes.headers.get('content-type') || getMimeType(selectedFilename),
    'Accept-Ranges': 'bytes',
  };
  if (activeRes.headers.get('content-range')) {
    resHeaders['Content-Range'] = activeRes.headers.get('content-range')!;
  }
  if (activeRes.headers.get('content-length')) {
    resHeaders['Content-Length'] = activeRes.headers.get('content-length')!;
  }

  res.writeHead(activeRes.status, resHeaders);

  if (activeRes.body) {
    const reader = activeRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (res.writableEnded || res.closed) break;
        res.write(value);
      }
    } catch (pipeErr) {
      console.warn(`[archiveService] Stream piping interrupted for ${identifier}:`, pipeErr);
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  } else {
    res.end();
  }

  // Trigger non-blocking background download to local disk
  backgroundDownloadArchiveMovie(identifier, archiveDirectUrl, targetFilePath, selectedFileSize, activeUserAgent).catch((err) => {
    console.error(`[archiveService] Background download error for ${identifier}:`, err);
  });
}

export const archiveService = {
  isArchiveIdentifier,
  streamArchiveMovie,
};
