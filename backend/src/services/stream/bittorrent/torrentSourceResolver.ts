import { fetchTorrentFile } from './torrentSourceFetcher';

/**
 * Resolves a torrent hash, URL, or Internet Archive identifier into a magnet link or a
 * raw .torrent file the torrent engine can start from.
 */
export async function resolveSource(torrentHash: string): Promise<string | Buffer> {
  const isHexHash = /^[a-fA-F0-9]{40}$/.test(torrentHash);
  const normalizedHash = isHexHash ? torrentHash.toLowerCase() : torrentHash;

  if (normalizedHash.startsWith('magnet:')) {
    return torrentHash;
  }

  if (normalizedHash.startsWith('http://') || normalizedHash.startsWith('https://')) {
    return fetchTorrentFile(torrentHash);
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

  return fetchTorrentFile(`https://archive.org/download/${normalizedHash}/${normalizedHash}_archive.torrent`);
}

export const TorrentSourceResolver = {
  resolveSource,
};
