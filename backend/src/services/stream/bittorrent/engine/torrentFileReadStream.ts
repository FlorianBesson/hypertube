import { Readable } from 'stream';
import { TorrentFileEntry } from '../protocol/metainfo';
import { DownloadScheduler, ReaderCursor } from './downloadScheduler';
import { PieceStorage } from './pieceStorage';

const CHUNK_LENGTH = 64 * 1024;

export interface TorrentFileReadStreamOptions {
  pieceLength: number;
  file: TorrentFileEntry;
  scheduler: DownloadScheduler;
  storage: PieceStorage;
  start: number;
  end: number;
}

/**
 * Serves a byte range of a torrent file, blocking until each piece it needs has been
 * downloaded and verified. Its position also drives the scheduler's download priority,
 * which is what makes playback start before the file is complete.
 */
export class TorrentFileReadStream extends Readable {
  private readonly cursor: ReaderCursor;
  private position: number;
  private readonly lastByte: number;
  private pumping = false;

  constructor(private readonly options: TorrentFileReadStreamOptions) {
    super();
    this.position = options.file.offset + options.start;
    this.lastByte = options.file.offset + options.end;
    this.cursor = options.scheduler.registerReader();
  }

  public _read(): void {
    if (this.pumping) {
      return;
    }
    this.pumping = true;
    this.pump().catch((error: Error) => this.destroy(error));
  }

  public _destroy(error: Error | null, callback: (error: Error | null) => void): void {
    this.cursor.release();
    callback(error);
  }

  private async pump(): Promise<void> {
    const { pieceLength, scheduler, storage } = this.options;

    while (this.position <= this.lastByte) {
      const pieceIndex = Math.floor(this.position / pieceLength);
      this.cursor.pieceIndex = pieceIndex;

      if (!scheduler.hasPiece(pieceIndex)) {
        await scheduler.whenPieceAvailable(pieceIndex);
        if (this.destroyed) {
          return;
        }
      }

      const pieceLastByte = (pieceIndex + 1) * pieceLength - 1;
      const chunkLastByte = Math.min(this.lastByte, pieceLastByte, this.position + CHUNK_LENGTH - 1);
      const data = await storage.read(this.position, chunkLastByte - this.position + 1);
      if (this.destroyed) {
        return;
      }
      this.position = chunkLastByte + 1;

      if (!this.push(data)) {
        this.pumping = false;
        return;
      }
    }

    this.push(null);
  }
}
