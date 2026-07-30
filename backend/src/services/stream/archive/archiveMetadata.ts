import { fetchWithTimeout } from './archiveUtils';

export interface ArchiveCandidateFile {
  name: string;
  size?: number | bigint;
}

/**
 * Fetches metadata for an Internet Archive item with timeout.
 */
export async function fetchArchiveMetadata(identifier: string, activeUserAgent: string): Promise<any> {
  try {
    const metaRes = await fetchWithTimeout(
      `https://archive.org/metadata/${encodeURIComponent(identifier)}`,
      { headers: { 'User-Agent': activeUserAgent } },
      7000
    );
    if (metaRes.ok) {
      return await metaRes.json();
    }
  } catch (metaErr) {
    console.warn(`[archiveService] Metadata lookup warning for ${identifier}:`, metaErr);
  }
  return null;
}

/**
 * Filters and prioritizes web-friendly candidate video files from metadata files list.
 */
export function getArchiveCandidateFiles(files: any[], identifier: string): ArchiveCandidateFile[] {
  const candidateFiles: ArchiveCandidateFile[] = files
    .filter((f: any) => typeof f.name === 'string' && (
      f.name.toLowerCase().endsWith('.mp4') ||
      f.name.toLowerCase().endsWith('.webm') ||
      f.name.toLowerCase().endsWith('.ogv') ||
      f.name.toLowerCase().endsWith('.mkv')
    ))
    .sort((a: any, b: any) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      const isMp4A = nameA.endsWith('.mp4') ? 2 : 0;
      const isMp4B = nameB.endsWith('.mp4') ? 2 : 0;
      return isMp4B - isMp4A;
    });

  if (candidateFiles.length === 0) {
    candidateFiles.push({ name: `${identifier}.mp4` });
    candidateFiles.push({ name: `${identifier}_512kb.mp4` });
  }

  return candidateFiles;
}
