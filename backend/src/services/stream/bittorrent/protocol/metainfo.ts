import crypto from 'crypto';
import {
  BencodeDictionary,
  BencodeValue,
  decode,
  decodeDictionaryWithRawValues,
  expectBuffer,
  expectDictionary,
  expectInteger,
} from './bencode';

export const PIECE_HASH_LENGTH = 20;

export interface TorrentFileEntry {
  name: string;
  path: string;
  length: number;
  offset: number;
}

export interface TorrentMetainfo {
  infoHash: Buffer;
  name: string;
  pieceLength: number;
  pieceHashes: Buffer[];
  totalLength: number;
  files: TorrentFileEntry[];
  trackers: string[];
}

/**
 * Rejects separators and traversal segments so a hostile torrent cannot write outside
 * its own download folder.
 */
function sanitizePathSegment(segment: string): string {
  const cleaned = segment.replace(/[/\\]/g, '_').trim();
  if (cleaned === '' || cleaned === '.' || cleaned === '..') {
    throw new Error('Malformed torrent data: unsafe file path');
  }
  return cleaned;
}

function readTrackers(root: BencodeDictionary): string[] {
  const trackers: string[] = [];

  const announce = root['announce'];
  if (Buffer.isBuffer(announce)) {
    trackers.push(announce.toString('utf8'));
  }

  const announceList = root['announce-list'];
  if (Array.isArray(announceList)) {
    for (const tier of announceList) {
      if (!Array.isArray(tier)) {
        continue;
      }
      for (const entry of tier) {
        if (Buffer.isBuffer(entry)) {
          trackers.push(entry.toString('utf8'));
        }
      }
    }
  }

  return Array.from(new Set(trackers));
}

function readFileEntries(info: BencodeDictionary, torrentName: string): TorrentFileEntry[] {
  const multiFileEntries = info['files'];

  if (!Array.isArray(multiFileEntries)) {
    return [
      {
        name: torrentName,
        path: sanitizePathSegment(torrentName),
        length: expectInteger(info['length'], 'info.length'),
        offset: 0,
      },
    ];
  }

  const rootDirectory = sanitizePathSegment(torrentName);
  let offset = 0;

  return multiFileEntries.map((entry: BencodeValue) => {
    const fileDictionary = expectDictionary(entry, 'info.files[]');
    const rawSegments = fileDictionary['path'];
    if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
      throw new Error('Malformed torrent data: "info.files[].path" is not a list');
    }

    const segments = rawSegments.map((segment) =>
      sanitizePathSegment(expectBuffer(segment, 'info.files[].path[]').toString('utf8'))
    );
    const length = expectInteger(fileDictionary['length'], 'info.files[].length');
    const file: TorrentFileEntry = {
      name: segments[segments.length - 1],
      path: [rootDirectory, ...segments].join('/'),
      length,
      offset,
    };
    offset += length;
    return file;
  });
}

function splitPieceHashes(pieces: Buffer): Buffer[] {
  if (pieces.length % PIECE_HASH_LENGTH !== 0) {
    throw new Error('Malformed torrent data: "info.pieces" length is not a multiple of 20');
  }

  const hashes: Buffer[] = [];
  for (let offset = 0; offset < pieces.length; offset += PIECE_HASH_LENGTH) {
    hashes.push(pieces.subarray(offset, offset + PIECE_HASH_LENGTH));
  }
  return hashes;
}

export function parseInfoDictionary(rawInfoDictionary: Buffer, trackers: string[]): TorrentMetainfo {
  const info = expectDictionary(decode(rawInfoDictionary), 'info');
  const name = expectBuffer(info['name'], 'info.name').toString('utf8');
  const files = readFileEntries(info, name);

  return {
    infoHash: crypto.createHash('sha1').update(rawInfoDictionary).digest(),
    name,
    pieceLength: expectInteger(info['piece length'], 'info.piece length'),
    pieceHashes: splitPieceHashes(expectBuffer(info['pieces'], 'info.pieces')),
    totalLength: files.reduce((total, file) => total + file.length, 0),
    files,
    trackers,
  };
}

export function parseTorrentFile(torrentFile: Buffer): TorrentMetainfo {
  const { dictionary, rawValuesByKey } = decodeDictionaryWithRawValues(torrentFile);
  const rawInfoDictionary = rawValuesByKey.get('info');
  if (!rawInfoDictionary) {
    throw new Error('Malformed torrent data: missing "info" dictionary');
  }
  return parseInfoDictionary(rawInfoDictionary, readTrackers(dictionary));
}
