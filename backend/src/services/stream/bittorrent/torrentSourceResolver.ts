export class TorrentSourceResolver {
  /**
   * Resolves a torrent hash, URL, or magnet link into a format compatible with torrent-stream (string or Buffer).
   */
  public static async resolveSource(torrentHash: string): Promise<string | Buffer> {
    const normalizedHash = torrentHash.toLowerCase();

    if (normalizedHash.startsWith('magnet:')) {
      return torrentHash;
    }

    if (normalizedHash.startsWith('http://') || normalizedHash.startsWith('https://')) {
      const res = await fetch(torrentHash);
      if (!res.ok) throw new Error(`HTTP ${res.status} trying to fetch torrent URL`);
      return Buffer.from(await res.arrayBuffer());
    }

    if (/^[a-fA-F0-9]{40}$/.test(normalizedHash)) {
      return `magnet:?xt=urn:btih:${normalizedHash}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.leechers-paradise.org:6969`;
    }

    const iaTorrentUrl = `https://archive.org/download/${normalizedHash}/${normalizedHash}_archive.torrent`;
    const res = await fetch(iaTorrentUrl);
    if (!res.ok) {
      throw new Error(`Internet Archive torrent download failed: HTTP ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
