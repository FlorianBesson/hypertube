import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Bitfield } from '../protocol/bitfield';
import { PeerConnection } from '../protocol/peerConnection';
import { TorrentFileEntry, TorrentMetainfo } from '../protocol/metainfo';
import { PieceStorage } from './pieceStorage';

const BLOCK_LENGTH = 16 * 1024;
const MAX_REQUESTS_PER_PEER = 8;
const MAX_PENDING_PIECES = 16;
const MAX_PIECE_SCAN = 64;
const PRIORITY_WINDOW_PIECES = 8;
const REQUEST_TIMEOUT_MS = 25000;
const REQUEST_SWEEP_INTERVAL_MS = 5000;

interface PendingPiece {
  data: Buffer;
  receivedBlocks: Set<number>;
  blockCount: number;
}

interface BlockRequest {
  pieceIndex: number;
  blockIndex: number;
  peer: PeerConnection;
  sentAt: number;
}

export interface ReaderCursor {
  pieceIndex: number;
  release(): void;
}

/**
 * Decides which blocks to request from which peers, verifies completed pieces against
 * their SHA-1 hash and hands them to storage. Pieces near an active reader are
 * requested first so playback can start before the whole file is downloaded.
 */
export class DownloadScheduler extends EventEmitter {
  private readonly have: Bitfield;
  private readonly pieceCount: number;
  private readonly pendingPieces = new Map<number, PendingPiece>();
  private readonly inFlightRequests = new Map<string, BlockRequest>();
  private readonly requestCountByPeer = new Map<PeerConnection, number>();
  private readonly pieceWaiters = new Map<number, Array<() => void>>();
  private readonly readers = new Set<ReaderCursor>();
  private readonly peers = new Set<PeerConnection>();
  private readonly sweepTimer: NodeJS.Timeout;

  private firstSelectedPiece: number;
  private lastSelectedPiece: number;
  private firstMissingPiece: number;
  private selectionComplete = false;
  private destroyed = false;

  constructor(private readonly metainfo: TorrentMetainfo, private readonly storage: PieceStorage) {
    super();
    this.pieceCount = metainfo.pieceHashes.length;
    this.have = new Bitfield(this.pieceCount);
    this.firstSelectedPiece = 0;
    this.lastSelectedPiece = this.pieceCount - 1;
    this.firstMissingPiece = 0;

    this.sweepTimer = setInterval(() => this.expireStaleRequests(), REQUEST_SWEEP_INTERVAL_MS);
  }

  public hasPiece(pieceIndex: number): boolean {
    return this.have.get(pieceIndex);
  }

  public whenPieceAvailable(pieceIndex: number): Promise<void> {
    if (this.have.get(pieceIndex)) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const waiters = this.pieceWaiters.get(pieceIndex);
      if (waiters) {
        waiters.push(resolve);
      } else {
        this.pieceWaiters.set(pieceIndex, [resolve]);
      }
    });
  }

  public registerReader(): ReaderCursor {
    const cursor: ReaderCursor = {
      pieceIndex: this.firstSelectedPiece,
      release: () => {
        this.readers.delete(cursor);
      },
    };
    this.readers.add(cursor);
    return cursor;
  }

  public setSelectedFiles(files: TorrentFileEntry[]): void {
    const selected = files.length > 0 ? files : this.metainfo.files;
    const firstByte = Math.min(...selected.map((file) => file.offset));
    const lastByte = Math.max(...selected.map((file) => file.offset + file.length)) - 1;

    this.firstSelectedPiece = Math.floor(firstByte / this.metainfo.pieceLength);
    this.lastSelectedPiece = Math.floor(Math.max(firstByte, lastByte) / this.metainfo.pieceLength);
    this.firstMissingPiece = this.firstSelectedPiece;
    this.selectionComplete = false;
    this.fillAllPeers();
  }

  public addPeer(peer: PeerConnection): void {
    this.peers.add(peer);
    this.requestCountByPeer.set(peer, 0);

    peer.setInterested();
    peer.on('unchoke', () => this.fillRequests(peer));
    peer.on('pieces', () => this.fillRequests(peer));
    peer.on('choke', () => this.releaseRequestsOf(peer));
    peer.on('block', (pieceIndex: number, begin: number, block: Buffer) => {
      this.onBlockReceived(peer, pieceIndex, begin, block);
    });
    peer.on('close', () => this.removePeer(peer));

    this.fillRequests(peer);
  }

  public removePeer(peer: PeerConnection): void {
    if (!this.peers.delete(peer)) {
      return;
    }
    this.releaseRequestsOf(peer);
    this.requestCountByPeer.delete(peer);
  }

  public destroy(): void {
    this.destroyed = true;
    clearInterval(this.sweepTimer);
    this.pendingPieces.clear();
    this.inFlightRequests.clear();
    this.pieceWaiters.clear();
  }

  private pieceLengthAt(pieceIndex: number): number {
    const isLastPiece = pieceIndex === this.pieceCount - 1;
    return isLastPiece
      ? this.metainfo.totalLength - pieceIndex * this.metainfo.pieceLength
      : this.metainfo.pieceLength;
  }

  private blockCountAt(pieceIndex: number): number {
    return Math.ceil(this.pieceLengthAt(pieceIndex) / BLOCK_LENGTH);
  }

  private candidatePieces(): number[] {
    const candidates: number[] = [];

    const cursors = Array.from(this.readers)
      .map((reader) => reader.pieceIndex)
      .sort((left, right) => left - right);

    for (const cursor of cursors) {
      const windowEnd = Math.min(cursor + PRIORITY_WINDOW_PIECES, this.lastSelectedPiece);
      for (let pieceIndex = cursor; pieceIndex <= windowEnd; pieceIndex += 1) {
        candidates.push(pieceIndex);
      }
    }

    const scanEnd = Math.min(this.firstMissingPiece + MAX_PIECE_SCAN, this.lastSelectedPiece);
    for (let pieceIndex = this.firstMissingPiece; pieceIndex <= scanEnd; pieceIndex += 1) {
      candidates.push(pieceIndex);
    }

    return candidates;
  }

  private pickBlockFor(peer: PeerConnection): { pieceIndex: number; blockIndex: number } | null {
    for (const pieceIndex of this.candidatePieces()) {
      if (this.have.get(pieceIndex) || !peer.pieces.get(pieceIndex)) {
        continue;
      }

      const pending = this.pendingPieces.get(pieceIndex);
      if (!pending && this.pendingPieces.size >= MAX_PENDING_PIECES) {
        continue;
      }

      const blockCount = this.blockCountAt(pieceIndex);
      for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
        if (pending?.receivedBlocks.has(blockIndex)) {
          continue;
        }
        if (this.inFlightRequests.has(`${pieceIndex}:${blockIndex}`)) {
          continue;
        }
        return { pieceIndex, blockIndex };
      }
    }

    return null;
  }

  private fillRequests(peer: PeerConnection): void {
    if (this.destroyed || peer.peerChoking) {
      return;
    }

    while ((this.requestCountByPeer.get(peer) ?? 0) < MAX_REQUESTS_PER_PEER) {
      const next = this.pickBlockFor(peer);
      if (!next) {
        return;
      }

      const begin = next.blockIndex * BLOCK_LENGTH;
      const length = Math.min(BLOCK_LENGTH, this.pieceLengthAt(next.pieceIndex) - begin);
      this.inFlightRequests.set(`${next.pieceIndex}:${next.blockIndex}`, {
        ...next,
        peer,
        sentAt: Date.now(),
      });
      this.requestCountByPeer.set(peer, (this.requestCountByPeer.get(peer) ?? 0) + 1);
      peer.requestBlock(next.pieceIndex, begin, length);
    }
  }

  private fillAllPeers(): void {
    for (const peer of this.peers) {
      this.fillRequests(peer);
    }
  }

  private forgetRequest(key: string, request: BlockRequest): void {
    this.inFlightRequests.delete(key);
    const count = this.requestCountByPeer.get(request.peer);
    if (count !== undefined) {
      this.requestCountByPeer.set(request.peer, Math.max(0, count - 1));
    }
  }

  private releaseRequestsOf(peer: PeerConnection): void {
    for (const [key, request] of this.inFlightRequests) {
      if (request.peer === peer) {
        this.forgetRequest(key, request);
      }
    }
    this.fillAllPeers();
  }

  private expireStaleRequests(): void {
    const expiredAt = Date.now() - REQUEST_TIMEOUT_MS;
    for (const [key, request] of this.inFlightRequests) {
      if (request.sentAt <= expiredAt) {
        this.forgetRequest(key, request);
      }
    }
    this.fillAllPeers();
  }

  private onBlockReceived(peer: PeerConnection, pieceIndex: number, begin: number, block: Buffer): void {
    if (this.destroyed || begin % BLOCK_LENGTH !== 0) {
      return;
    }

    const blockIndex = begin / BLOCK_LENGTH;
    const key = `${pieceIndex}:${blockIndex}`;
    const request = this.inFlightRequests.get(key);
    if (request) {
      this.forgetRequest(key, request);
    }

    if (this.have.get(pieceIndex)) {
      this.fillRequests(peer);
      return;
    }

    let pending = this.pendingPieces.get(pieceIndex);
    if (!pending) {
      pending = {
        data: Buffer.alloc(this.pieceLengthAt(pieceIndex)),
        receivedBlocks: new Set<number>(),
        blockCount: this.blockCountAt(pieceIndex),
      };
      this.pendingPieces.set(pieceIndex, pending);
    }

    block.copy(pending.data, begin);
    pending.receivedBlocks.add(blockIndex);

    if (pending.receivedBlocks.size === pending.blockCount) {
      this.pendingPieces.delete(pieceIndex);
      void this.storeVerifiedPiece(pieceIndex, pending.data);
    }

    this.fillRequests(peer);
  }

  private async storeVerifiedPiece(pieceIndex: number, data: Buffer): Promise<void> {
    const digest = crypto.createHash('sha1').update(data).digest();
    if (!digest.equals(this.metainfo.pieceHashes[pieceIndex])) {
      console.warn(`[downloadScheduler] Piece ${pieceIndex} failed hash verification, re-downloading`);
      this.fillAllPeers();
      return;
    }

    try {
      await this.storage.write(pieceIndex * this.metainfo.pieceLength, data);
    } catch (error) {
      this.emit('storageError', error);
      return;
    }
    if (this.destroyed) {
      return;
    }

    this.have.set(pieceIndex);
    this.resolvePieceWaiters(pieceIndex);
    this.advanceFirstMissingPiece();
    this.notifyWhenSelectionComplete();
    this.fillAllPeers();
  }

  private resolvePieceWaiters(pieceIndex: number): void {
    const waiters = this.pieceWaiters.get(pieceIndex);
    if (!waiters) {
      return;
    }
    this.pieceWaiters.delete(pieceIndex);
    for (const resolve of waiters) {
      resolve();
    }
  }

  private advanceFirstMissingPiece(): void {
    while (this.firstMissingPiece <= this.lastSelectedPiece && this.have.get(this.firstMissingPiece)) {
      this.firstMissingPiece += 1;
    }
  }

  private notifyWhenSelectionComplete(): void {
    if (this.selectionComplete || this.firstMissingPiece <= this.lastSelectedPiece) {
      return;
    }
    this.selectionComplete = true;
    this.emit('selectionComplete');
  }
}
