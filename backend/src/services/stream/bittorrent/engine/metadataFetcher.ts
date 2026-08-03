import crypto from 'crypto';
import { PeerConnection } from '../protocol/peerConnection';

const METADATA_PIECE_LENGTH = 16 * 1024;
const MAX_METADATA_SIZE = 8 * 1024 * 1024;

/**
 * Downloads the `info` dictionary from peers (BEP 9) when the torrent was started from
 * a magnet link, where no .torrent file is available up front.
 */
export class MetadataFetcher {
  public readonly rawInfoDictionary: Promise<Buffer>;

  private resolveMetadata!: (rawInfoDictionary: Buffer) => void;
  private readonly receivedPieces = new Map<number, Buffer>();
  private totalSize = 0;
  private settled = false;

  constructor(private readonly infoHash: Buffer) {
    this.rawInfoDictionary = new Promise<Buffer>((resolve) => {
      this.resolveMetadata = resolve;
    });
  }

  public addPeer(peer: PeerConnection): void {
    peer.on('extensions', () => this.requestMissingPieces(peer));
    peer.on('metadataPiece', (pieceIndex: number, data: Buffer) => this.onPieceReceived(pieceIndex, data));
    this.requestMissingPieces(peer);
  }

  private get pieceCount(): number {
    return Math.ceil(this.totalSize / METADATA_PIECE_LENGTH);
  }

  private requestMissingPieces(peer: PeerConnection): void {
    if (this.settled || !peer.supportsMetadataExtension) {
      return;
    }
    if (this.totalSize === 0) {
      if (peer.metadataSize <= 0 || peer.metadataSize > MAX_METADATA_SIZE) {
        return;
      }
      this.totalSize = peer.metadataSize;
    }

    for (let pieceIndex = 0; pieceIndex < this.pieceCount; pieceIndex += 1) {
      if (!this.receivedPieces.has(pieceIndex)) {
        peer.requestMetadataPiece(pieceIndex);
      }
    }
  }

  private onPieceReceived(pieceIndex: number, data: Buffer): void {
    if (this.settled || this.totalSize === 0 || pieceIndex >= this.pieceCount) {
      return;
    }
    this.receivedPieces.set(pieceIndex, data);
    if (this.receivedPieces.size !== this.pieceCount) {
      return;
    }

    const assembled = Buffer.concat(
      Array.from({ length: this.pieceCount }, (_unused, index) => this.receivedPieces.get(index) as Buffer),
      this.totalSize
    );

    if (!crypto.createHash('sha1').update(assembled).digest().equals(this.infoHash)) {
      console.warn('[metadataFetcher] Assembled metadata did not match the info hash, restarting');
      this.receivedPieces.clear();
      return;
    }

    this.settled = true;
    this.resolveMetadata(assembled);
  }
}
