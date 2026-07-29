import path from 'path';
import { MimeService } from './mimeService';
import { movieDbService } from '../movies/movieDbService';
import { ArchiveService } from './archiveService';
import { BitTorrentService, TorrentStreamFile } from './bittorrentService';

export type { TorrentStreamFile };

class TorrentService {
  private downloadsBaseDir = path.join(process.cwd(), 'downloads');
  private archiveService: ArchiveService;
  private bittorrentService: BitTorrentService;

  constructor() {
    this.archiveService = new ArchiveService(this.downloadsBaseDir);
    this.bittorrentService = new BitTorrentService(this.downloadsBaseDir);
  }

  /**
   * Delegates MIME type resolution.
   */
  public getMimeType(filename?: string): string {
    return MimeService.getMimeType(filename);
  }

  /**
   * Delegates BDD lastWatchedAt timestamp updates.
   */
  public async updateLastWatched(torrentHash: string, imdbId?: string): Promise<void> {
    return movieDbService.updateLastWatched(torrentHash, imdbId);
  }

  /**
   * Delegates completed movie check from disk / DB.
   */
  public async getCompletedMovie(torrentHash: string, imdbId?: string): Promise<{ filePath: string; fileSize: bigint } | null> {
    return movieDbService.getCompletedMovie(torrentHash, imdbId, this.downloadsBaseDir);
  }

  /**
   * Delegates Archive identifier check.
   */
  public isArchiveIdentifier(torrentHash: string): boolean {
    return this.archiveService.isArchiveIdentifier(torrentHash);
  }

  /**
   * Delegates Internet Archive CDN progressive streaming.
   */
  public async streamArchiveMovie(identifier: string, rangeHeader: string | undefined, res: any, clientUserAgent?: string): Promise<void> {
    return this.archiveService.streamArchiveMovie(identifier, rangeHeader, res, clientUserAgent);
  }

  /**
   * Delegates BitTorrent live stream engine initialization.
   */
  public async getOrStartTorrent(torrentHash: string, imdbId?: string): Promise<{ engine: any; videoFile: TorrentStreamFile }> {
    return this.bittorrentService.getOrStartTorrent(torrentHash, imdbId);
  }
}

export const torrentService = new TorrentService();
