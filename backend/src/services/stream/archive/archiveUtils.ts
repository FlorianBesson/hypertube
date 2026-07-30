/**
 * Default User-Agent for Internet Archive requests.
 */
export const DEFAULT_USER_AGENT = 'Hypertube/1.0 (Node.js Video Streaming)';

/**
 * Helper to check if a hash string is an Internet Archive item identifier
 */
export function isArchiveIdentifier(torrentHash: string): boolean {
  const norm = torrentHash.toLowerCase();
  if (norm.startsWith('magnet:') || norm.startsWith('http://') || norm.startsWith('https://')) {
    return false;
  }
  if (/^[a-fA-F0-9]{40}$/.test(norm)) {
    return false;
  }
  return true;
}

/**
 * Helper to extract Internet Archive identifier from a torrent URL or check if it's already an identifier.
 */
export function getArchiveIdentifier(torrentHash: string): string | null {
  const norm = torrentHash.toLowerCase();
  if (norm.startsWith('magnet:')) {
    return null;
  }
  if (norm.startsWith('http://') || norm.startsWith('https://')) {
    const match = torrentHash.match(/https?:\/\/(?:www\.)?archive\.org\/(?:download|details)\/([^\/]+)/i);
    return match ? match[1] : null;
  }
  if (/^[a-fA-F0-9]{40}$/.test(norm)) {
    return null;
  }
  return torrentHash;
}

/**
 * Helper function to perform fetch with timeout protection.
 */
export async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
