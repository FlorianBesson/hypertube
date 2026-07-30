/**
 * Resolves a torrent hash, URL, or magnet link into a format compatible with torrent-stream (string or Buffer).
 */
export async function resolveSource(torrentHash: string): Promise<string | Buffer> {
  const isHexHash = /^[a-fA-F0-9]{40}$/.test(torrentHash);
  const normalizedHash = isHexHash ? torrentHash.toLowerCase() : torrentHash;

  if (normalizedHash.startsWith('magnet:')) {
    return torrentHash;
  }

  if (normalizedHash.startsWith('http://') || normalizedHash.startsWith('https://')) {
    const res = await fetch(torrentHash, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} trying to fetch torrent URL`);
    return Buffer.from(await res.arrayBuffer());
  }

  if (isHexHash) {
    const trackers = [
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://open.stealth.si:80/announce',
      'udp://tracker.torrent.eu.org:451/announce',
      'udp://explodie.org:6969/announce',
      'udp://tracker.openbittorrent.com:80/announce',
      'udp://tracker.tiny-vps.com:6969/announce',
      'udp://open.demonii.com:1337/announce',
      'udp://tracker.cyberia.is:6969/announce'
    ].map(t => `tr=${encodeURIComponent(t)}`).join('&');

    return `magnet:?xt=urn:btih:${normalizedHash}&${trackers}`;
  }

  const iaTorrentUrl = `https://archive.org/download/${normalizedHash}/${normalizedHash}_archive.torrent`;
  const res = await fetch(iaTorrentUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) {
    throw new Error(`Internet Archive torrent download failed: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export const TorrentSourceResolver = {
  resolveSource,
};
