import fs from 'fs/promises';
import path from 'path';
import { TorrentFileEntry } from '../protocol/metainfo';

interface FileSegment {
  file: TorrentFileEntry;
  positionInFile: number;
  bufferOffset: number;
  length: number;
}

/**
 * Maps the torrent's flat byte space onto the individual files on disk, so callers can
 * read and write by absolute torrent offset without knowing the file layout.
 */
export class PieceStorage {
  private readonly handles = new Map<string, Promise<fs.FileHandle>>();

  constructor(private readonly rootDirectory: string, private readonly files: TorrentFileEntry[]) {}

  public async write(offset: number, data: Buffer): Promise<void> {
    for (const segment of this.segmentsFor(offset, data.length)) {
      const handle = await this.openFile(segment.file);
      await handle.write(data, segment.bufferOffset, segment.length, segment.positionInFile);
    }
  }

  public async read(offset: number, length: number): Promise<Buffer> {
    const data = Buffer.alloc(length);
    for (const segment of this.segmentsFor(offset, length)) {
      const handle = await this.openFile(segment.file);
      await handle.read(data, segment.bufferOffset, segment.length, segment.positionInFile);
    }
    return data;
  }

  public async close(): Promise<void> {
    const handles = Array.from(this.handles.values());
    this.handles.clear();
    await Promise.all(handles.map((handle) => handle.then((opened) => opened.close()).catch(() => undefined)));
  }

  private segmentsFor(offset: number, length: number): FileSegment[] {
    const segments: FileSegment[] = [];
    const end = offset + length;

    for (const file of this.files) {
      const fileEnd = file.offset + file.length;
      if (offset >= fileEnd || end <= file.offset) {
        continue;
      }
      const segmentStart = Math.max(offset, file.offset);
      const segmentEnd = Math.min(end, fileEnd);
      segments.push({
        file,
        positionInFile: segmentStart - file.offset,
        bufferOffset: segmentStart - offset,
        length: segmentEnd - segmentStart,
      });
    }

    return segments;
  }

  private openFile(file: TorrentFileEntry): Promise<fs.FileHandle> {
    const cached = this.handles.get(file.path);
    if (cached) {
      return cached;
    }

    const fullPath = path.join(this.rootDirectory, file.path);
    const opening = fs
      .mkdir(path.dirname(fullPath), { recursive: true })
      .then(() => fs.open(fullPath, 'r+').catch(() => fs.open(fullPath, 'w+')));

    this.handles.set(file.path, opening);
    return opening;
  }
}
