import net from 'net';
import { EventEmitter } from 'events';
import { Bitfield } from './bitfield';
import { PeerAddress } from './trackerClient';
import { BencodeDictionary, decodeWithLength, encode, expectDictionary } from './bencode';

const PROTOCOL_NAME = 'BitTorrent protocol';
const HANDSHAKE_LENGTH = 68;
const EXTENSION_PROTOCOL_RESERVED_BYTE = 5;
const EXTENSION_PROTOCOL_FLAG = 0x10;
const CONNECT_TIMEOUT_MS = 10000;
const IDLE_TIMEOUT_MS = 60000;
const KEEP_ALIVE_INTERVAL_MS = 90000;
const MAX_MESSAGE_LENGTH = 1024 * 1024 * 2;

const MESSAGE_ID = {
  choke: 0,
  unchoke: 1,
  interested: 2,
  notInterested: 3,
  have: 4,
  bitfield: 5,
  request: 6,
  piece: 7,
  cancel: 8,
  extended: 20,
};

const EXTENSION_HANDSHAKE_ID = 0;
const UT_METADATA_LOCAL_ID = 1;

const METADATA_MESSAGE_TYPE = {
  request: 0,
  data: 1,
  reject: 2,
};

/**
 * A single TCP connection to a peer, speaking the BitTorrent peer wire protocol
 * (BEP 3) plus the extension protocol (BEP 10) and metadata exchange (BEP 9).
 */
export class PeerConnection extends EventEmitter {
  public peerChoking = true;
  public readonly pieces = new Bitfield();
  public metadataSize = 0;

  private readonly socket: net.Socket;
  private receiveBuffer = Buffer.alloc(0);
  private handshakeReceived = false;
  private amInterested = false;
  private peerMetadataExtensionId = 0;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private destroyed = false;

  constructor(
    public readonly address: PeerAddress,
    private readonly infoHash: Buffer,
    private readonly peerId: Buffer
  ) {
    super();
    this.socket = net.connect({ host: address.host, port: address.port });
    this.socket.setTimeout(CONNECT_TIMEOUT_MS);

    this.socket.on('connect', () => {
      this.socket.setTimeout(IDLE_TIMEOUT_MS);
      this.socket.write(this.buildHandshake());
      this.keepAliveTimer = setInterval(() => this.sendMessage(), KEEP_ALIVE_INTERVAL_MS);
    });
    this.socket.on('data', (chunk: Buffer) => this.onData(chunk));
    this.socket.on('timeout', () => this.destroy(new Error('Peer connection timed out')));
    this.socket.on('error', (error) => this.destroy(error));
    this.socket.on('close', () => this.destroy());
  }

  public get supportsMetadataExtension(): boolean {
    return this.peerMetadataExtensionId !== 0;
  }

  public setInterested(): void {
    if (this.amInterested) {
      return;
    }
    this.amInterested = true;
    this.sendMessage(MESSAGE_ID.interested);
  }

  public requestBlock(pieceIndex: number, begin: number, length: number): void {
    const payload = Buffer.alloc(12);
    payload.writeUInt32BE(pieceIndex, 0);
    payload.writeUInt32BE(begin, 4);
    payload.writeUInt32BE(length, 8);
    this.sendMessage(MESSAGE_ID.request, payload);
  }

  public cancelBlock(pieceIndex: number, begin: number, length: number): void {
    const payload = Buffer.alloc(12);
    payload.writeUInt32BE(pieceIndex, 0);
    payload.writeUInt32BE(begin, 4);
    payload.writeUInt32BE(length, 8);
    this.sendMessage(MESSAGE_ID.cancel, payload);
  }

  public requestMetadataPiece(pieceIndex: number): void {
    if (!this.supportsMetadataExtension) {
      return;
    }
    this.sendExtendedMessage(
      this.peerMetadataExtensionId,
      encode({ msg_type: METADATA_MESSAGE_TYPE.request, piece: pieceIndex })
    );
  }

  public destroy(error?: Error): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }
    this.socket.destroy();
    if (error) {
      this.emit('connectionError', error);
    }
    this.emit('close');
  }

  private buildHandshake(): Buffer {
    const handshake = Buffer.alloc(HANDSHAKE_LENGTH);
    handshake.writeUInt8(PROTOCOL_NAME.length, 0);
    handshake.write(PROTOCOL_NAME, 1, 'ascii');
    handshake[20 + EXTENSION_PROTOCOL_RESERVED_BYTE] = EXTENSION_PROTOCOL_FLAG;
    this.infoHash.copy(handshake, 28);
    this.peerId.copy(handshake, 48);
    return handshake;
  }

  private sendMessage(messageId?: number, payload: Buffer = Buffer.alloc(0)): void {
    if (this.destroyed || this.socket.destroyed) {
      return;
    }
    if (messageId === undefined) {
      this.socket.write(Buffer.alloc(4));
      return;
    }
    const message = Buffer.alloc(5 + payload.length);
    message.writeUInt32BE(payload.length + 1, 0);
    message.writeUInt8(messageId, 4);
    payload.copy(message, 5);
    this.socket.write(message);
  }

  private sendExtendedMessage(extensionId: number, payload: Buffer): void {
    this.sendMessage(MESSAGE_ID.extended, Buffer.concat([Buffer.from([extensionId]), payload]));
  }

  private onData(chunk: Buffer): void {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);

    if (!this.handshakeReceived) {
      if (this.receiveBuffer.length < HANDSHAKE_LENGTH) {
        return;
      }
      this.consumeHandshake();
      if (this.destroyed) {
        return;
      }
    }

    while (this.receiveBuffer.length >= 4) {
      const messageLength = this.receiveBuffer.readUInt32BE(0);
      if (messageLength > MAX_MESSAGE_LENGTH) {
        this.destroy(new Error('Peer sent an oversized message'));
        return;
      }
      if (this.receiveBuffer.length < 4 + messageLength) {
        return;
      }

      const message = this.receiveBuffer.subarray(4, 4 + messageLength);
      this.receiveBuffer = this.receiveBuffer.subarray(4 + messageLength);
      if (messageLength > 0) {
        this.handleMessage(message[0], message.subarray(1));
      }
    }
  }

  private consumeHandshake(): void {
    const handshake = this.receiveBuffer.subarray(0, HANDSHAKE_LENGTH);
    this.receiveBuffer = this.receiveBuffer.subarray(HANDSHAKE_LENGTH);

    if (handshake.readUInt8(0) !== PROTOCOL_NAME.length || handshake.toString('ascii', 1, 20) !== PROTOCOL_NAME) {
      this.destroy(new Error('Peer sent an invalid handshake'));
      return;
    }
    if (!handshake.subarray(28, 48).equals(this.infoHash)) {
      this.destroy(new Error('Peer announced a different info hash'));
      return;
    }

    this.handshakeReceived = true;

    const peerSupportsExtensions = (handshake[20 + EXTENSION_PROTOCOL_RESERVED_BYTE] & EXTENSION_PROTOCOL_FLAG) !== 0;
    if (peerSupportsExtensions) {
      this.sendExtendedMessage(
        EXTENSION_HANDSHAKE_ID,
        encode({ m: { ut_metadata: UT_METADATA_LOCAL_ID } })
      );
    }

    this.emit('ready');
  }

  private handleMessage(messageId: number, payload: Buffer): void {
    switch (messageId) {
      case MESSAGE_ID.choke:
        this.peerChoking = true;
        this.emit('choke');
        return;
      case MESSAGE_ID.unchoke:
        this.peerChoking = false;
        this.emit('unchoke');
        return;
      case MESSAGE_ID.have:
        if (payload.length >= 4) {
          this.pieces.set(payload.readUInt32BE(0));
          this.emit('pieces');
        }
        return;
      case MESSAGE_ID.bitfield:
        for (let index = 0; index < payload.length * 8; index += 1) {
          if ((payload[index >> 3] & (0x80 >> (index & 7))) !== 0) {
            this.pieces.set(index);
          }
        }
        this.emit('pieces');
        return;
      case MESSAGE_ID.piece:
        if (payload.length > 8) {
          this.emit('block', payload.readUInt32BE(0), payload.readUInt32BE(4), payload.subarray(8));
        }
        return;
      case MESSAGE_ID.extended:
        this.handleExtendedMessage(payload);
        return;
      default:
        return;
    }
  }

  private handleExtendedMessage(payload: Buffer): void {
    if (payload.length < 1) {
      return;
    }
    const extensionId = payload[0];
    const body = payload.subarray(1);

    try {
      if (extensionId === EXTENSION_HANDSHAKE_ID) {
        this.applyExtensionHandshake(expectDictionary(decodeWithLength(body).value, 'extension handshake'));
        return;
      }
      if (extensionId === UT_METADATA_LOCAL_ID) {
        this.handleMetadataMessage(body);
      }
    } catch (error) {
      this.destroy(error instanceof Error ? error : new Error('Malformed extension message'));
    }
  }

  private applyExtensionHandshake(handshake: BencodeDictionary): void {
    const supportedExtensions = handshake['m'];
    if (typeof supportedExtensions === 'object' && supportedExtensions !== null && !Array.isArray(supportedExtensions) && !Buffer.isBuffer(supportedExtensions)) {
      const metadataExtensionId = supportedExtensions['ut_metadata'];
      if (typeof metadataExtensionId === 'number') {
        this.peerMetadataExtensionId = metadataExtensionId;
      }
    }
    if (typeof handshake['metadata_size'] === 'number') {
      this.metadataSize = handshake['metadata_size'];
    }
    this.emit('extensions');
  }

  private handleMetadataMessage(body: Buffer): void {
    const { value, length } = decodeWithLength(body);
    const header = expectDictionary(value, 'metadata message');
    if (header['msg_type'] !== METADATA_MESSAGE_TYPE.data || typeof header['piece'] !== 'number') {
      return;
    }
    this.emit('metadataPiece', header['piece'], body.subarray(length));
  }
}
