import { HttpError } from '../../../errors';

const ALLOWED_TORRENT_HOSTS = ['archive.org', 'publicdomaintorrents.info', 'publicdomaintorrents.com'];
const TORRENT_FETCH_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return ALLOWED_TORRENT_HOSTS.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
}

/**
 * Fetches a .torrent file, restricted to the hosts we source movies from so a user-supplied
 * URL cannot make the server request arbitrary targets.
 */
export async function fetchTorrentFile(rawUrl: string): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpError(400, 'Invalid torrent source URL');
  }

  if (!isAllowedHost(url.hostname)) {
    throw new HttpError(403, 'Torrent source host is not allowed');
  }

  const response = await fetch(url, { headers: { 'User-Agent': TORRENT_FETCH_USER_AGENT } });
  if (!response.ok) {
    throw new HttpError(502, `Torrent source responded with HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
