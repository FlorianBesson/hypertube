import dgram from 'dgram';
import crypto from 'crypto';
import { decode, expectDictionary } from './bencode';

const ANNOUNCE_TIMEOUT_MS = 8000;
const PROTOCOL_ID_HIGH = 0x417;
const PROTOCOL_ID_LOW = 0x27101980;
const ACTION_CONNECT = 0;
const ACTION_ANNOUNCE = 1;
const EVENT_STARTED = 2;
const COMPACT_PEER_LENGTH = 6;
const COMPACT_PEER_V6_LENGTH = 18;

export interface PeerAddress {
  host: string;
  port: number;
}

export interface AnnounceRequest {
  infoHash: Buffer;
  peerId: Buffer;
  port: number;
  bytesLeft: number;
}

function writeUnsigned64(buffer: Buffer, value: number, offset: number): void {
  buffer.writeUInt32BE(Math.floor(value / 0x100000000), offset);
  buffer.writeUInt32BE(value >>> 0, offset + 4);
}

function percentEncodeBinary(bytes: Buffer): string {
  let encoded = '';
  for (const byte of bytes) {
    const character = String.fromCharCode(byte);
    encoded += /[A-Za-z0-9.\-_~]/.test(character) ? character : `%${byte.toString(16).padStart(2, '0')}`;
  }
  return encoded;
}

function parseCompactPeers(peers: Buffer, entryLength: number): PeerAddress[] {
  const addresses: PeerAddress[] = [];
  const addressLength = entryLength - 2;

  for (let offset = 0; offset + entryLength <= peers.length; offset += entryLength) {
    const rawAddress = peers.subarray(offset, offset + addressLength);
    const port = peers.readUInt16BE(offset + addressLength);
    if (port === 0) {
      continue;
    }

    const host =
      addressLength === 4
        ? Array.from(rawAddress).join('.')
        : Array.from({ length: 8 }, (_unused, group) => rawAddress.readUInt16BE(group * 2).toString(16)).join(':');
    addresses.push({ host, port });
  }

  return addresses;
}

async function announceOverHttp(trackerUrl: string, request: AnnounceRequest): Promise<PeerAddress[]> {
  const query = [
    `info_hash=${percentEncodeBinary(request.infoHash)}`,
    `peer_id=${percentEncodeBinary(request.peerId)}`,
    `port=${request.port}`,
    'uploaded=0',
    'downloaded=0',
    `left=${request.bytesLeft}`,
    'compact=1',
    `event=started`,
  ].join('&');

  const separator = trackerUrl.includes('?') ? '&' : '?';
  const response = await fetch(`${trackerUrl}${separator}${query}`, {
    signal: AbortSignal.timeout(ANNOUNCE_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Tracker responded with HTTP ${response.status}`);
  }

  const body = expectDictionary(decode(Buffer.from(await response.arrayBuffer())), 'tracker response');
  const failureReason = body['failure reason'];
  if (Buffer.isBuffer(failureReason)) {
    throw new Error(`Tracker refused announce: ${failureReason.toString('utf8')}`);
  }

  const addresses: PeerAddress[] = [];
  if (Buffer.isBuffer(body['peers'])) {
    addresses.push(...parseCompactPeers(body['peers'], COMPACT_PEER_LENGTH));
  }
  if (Buffer.isBuffer(body['peers6'])) {
    addresses.push(...parseCompactPeers(body['peers6'], COMPACT_PEER_V6_LENGTH));
  }
  return addresses;
}

function announceOverUdp(trackerUrl: string, request: AnnounceRequest): Promise<PeerAddress[]> {
  const { hostname, port } = new URL(trackerUrl);
  const trackerPort = Number(port) || 80;

  return new Promise<PeerAddress[]>((resolve, reject) => {
    const socket = dgram.createSocket(hostname.includes(':') ? 'udp6' : 'udp4');
    const connectTransactionId = crypto.randomBytes(4);
    const announceTransactionId = crypto.randomBytes(4);

    const timer = setTimeout(() => finish(new Error('Tracker announce timed out')), ANNOUNCE_TIMEOUT_MS);

    function finish(error: Error | null, addresses: PeerAddress[] = []): void {
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.close();
      if (error) {
        reject(error);
      } else {
        resolve(addresses);
      }
    }

    function send(packet: Buffer): void {
      socket.send(packet, 0, packet.length, trackerPort, hostname, (error) => {
        if (error) {
          finish(error);
        }
      });
    }

    socket.on('error', (error) => finish(error));

    socket.on('message', (message) => {
      if (message.length < 8) {
        return;
      }
      const action = message.readUInt32BE(0);
      const transactionId = message.subarray(4, 8);

      if (action === ACTION_CONNECT && transactionId.equals(connectTransactionId) && message.length >= 16) {
        send(buildAnnouncePacket(message.subarray(8, 16), announceTransactionId, request));
        return;
      }
      if (action === ACTION_ANNOUNCE && transactionId.equals(announceTransactionId) && message.length >= 20) {
        finish(null, parseCompactPeers(message.subarray(20), COMPACT_PEER_LENGTH));
      }
    });

    const connectPacket = Buffer.alloc(16);
    connectPacket.writeUInt32BE(PROTOCOL_ID_HIGH, 0);
    connectPacket.writeUInt32BE(PROTOCOL_ID_LOW, 4);
    connectPacket.writeUInt32BE(ACTION_CONNECT, 8);
    connectTransactionId.copy(connectPacket, 12);
    send(connectPacket);
  });
}

function buildAnnouncePacket(connectionId: Buffer, transactionId: Buffer, request: AnnounceRequest): Buffer {
  const packet = Buffer.alloc(98);
  connectionId.copy(packet, 0);
  packet.writeUInt32BE(ACTION_ANNOUNCE, 8);
  transactionId.copy(packet, 12);
  request.infoHash.copy(packet, 16);
  request.peerId.copy(packet, 36);
  writeUnsigned64(packet, 0, 56);
  writeUnsigned64(packet, request.bytesLeft, 64);
  writeUnsigned64(packet, 0, 72);
  packet.writeUInt32BE(EVENT_STARTED, 80);
  packet.writeUInt32BE(0, 84);
  crypto.randomBytes(4).copy(packet, 88);
  packet.writeInt32BE(-1, 92);
  packet.writeUInt16BE(request.port, 96);
  return packet;
}

/**
 * Announces to every tracker in parallel and merges the peers they return; a tracker
 * that fails or times out is logged and skipped rather than failing the whole announce.
 */
export async function announceToTrackers(trackers: string[], request: AnnounceRequest): Promise<PeerAddress[]> {
  const results = await Promise.allSettled(
    trackers.map((tracker) => {
      if (tracker.startsWith('udp://')) {
        return announceOverUdp(tracker, request);
      }
      if (tracker.startsWith('http://') || tracker.startsWith('https://')) {
        return announceOverHttp(tracker, request);
      }
      return Promise.reject(new Error(`Unsupported tracker protocol: ${tracker}`));
    })
  );

  const addressesByKey = new Map<string, PeerAddress>();
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`[trackerClient] Announce failed for ${trackers[index]}:`, result.reason?.message ?? result.reason);
      return;
    }
    for (const address of result.value) {
      addressesByKey.set(`${address.host}:${address.port}`, address);
    }
  });

  return Array.from(addressesByKey.values());
}
