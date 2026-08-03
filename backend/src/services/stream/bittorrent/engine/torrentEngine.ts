import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { parseMagnetUri } from '../protocol/magnetUri';
import { parseInfoDictionary, parseTorrentFile, TorrentFileEntry, TorrentMetainfo } from '../protocol/metainfo';
import { PeerConnection } from '../protocol/peerConnection';
import { announceToTrackers, PeerAddress } from '../protocol/trackerClient';
import { DownloadScheduler } from './downloadScheduler';
import { MetadataFetcher } from './metadataFetcher';
import { PieceStorage } from './pieceStorage';
import { TorrentFileReadStream } from './torrentFileReadStream';

const MAX_ACTIVE_PEERS = 30;
const REANNOUNCE_INTERVAL_MS = 120000;
const LISTEN_PORT = 6881;
const PEER_ID_PREFIX = '-HT0001-';

export interface TorrentStreamFile {
  name: string;
  path: string;
  length: number;
  select: () => void;
  deselect: () => void;
  createReadStream: (options?: { start?: number; end?: number }) => Readable;
}

export interface TorrentEngineOptions {
  path: string;
}

/**
 * A minimal BitTorrent client: it announces to the torrent's trackers, connects to the
 * returned peers over the peer wire protocol and downloads pieces on demand so an HTTP
 * range request can be served while the file is still downloading.
 */
export class TorrentEngine extends EventEmitter {
  public readonly swarm = { wires: [] as PeerConnection[] };
  public files: TorrentStreamFile[] = [];

  private readonly peerId = Buffer.concat([Buffer.from(PEER_ID_PREFIX, 'ascii'), crypto.randomBytes(12)]);
  private readonly connections = new Set<PeerConnection>();
  private readonly knownAddresses = new Map<string, PeerAddress>();
  private readonly dialedAddressKeys = new Set<string>();
  private readonly selectedFilePaths = new Set<string>();

  private infoHash: Buffer | null = null;
  private trackers: string[] = [];
  private metainfo: TorrentMetainfo | null = null;
  private storage: PieceStorage | null = null;
  private scheduler: DownloadScheduler | null = null;
  private metadataFetcher: MetadataFetcher | null = null;
  private reannounceTimer: NodeJS.Timeout | null = null;
  private destroyed = false;

  constructor(source: string | Buffer, private readonly options: TorrentEngineOptions) {
    super();
    this.start(source).catch((error: Error) => {
      if (!this.destroyed) {
        this.emit('error', error);
      }
    });
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    if (this.reannounceTimer) {
      clearInterval(this.reannounceTimer);
    }
    for (const peer of this.connections) {
      peer.destroy();
    }
    this.connections.clear();
    this.swarm.wires.length = 0;
    this.scheduler?.destroy();
    void this.storage?.close();
  }

  private async start(source: string | Buffer): Promise<void> {
    if (Buffer.isBuffer(source)) {
      const metainfo = parseTorrentFile(source);
      this.infoHash = metainfo.infoHash;
      this.trackers = metainfo.trackers;
      await this.startAnnouncing();
      this.activate(metainfo);
      return;
    }

    const magnet = parseMagnetUri(source);
    this.infoHash = magnet.infoHash;
    this.trackers = magnet.trackers;
    this.metadataFetcher = new MetadataFetcher(magnet.infoHash);

    await this.startAnnouncing();
    const rawInfoDictionary = await this.metadataFetcher.rawInfoDictionary;
    if (this.destroyed) {
      return;
    }
    this.activate(parseInfoDictionary(rawInfoDictionary, magnet.trackers));
  }

  private activate(metainfo: TorrentMetainfo): void {
    this.metainfo = metainfo;
    this.metadataFetcher = null;
    this.storage = new PieceStorage(this.options.path, metainfo.files);
    this.scheduler = new DownloadScheduler(metainfo, this.storage);
    this.scheduler.on('selectionComplete', () => this.emit('idle'));
    this.scheduler.on('storageError', (error: Error) => this.emit('error', error));

    this.files = metainfo.files.map((entry) => this.createEngineFile(entry));
    for (const entry of metainfo.files) {
      this.selectedFilePaths.add(entry.path);
    }

    for (const peer of this.swarm.wires) {
      this.scheduler.addPeer(peer);
    }

    this.emit('ready');
  }

  private createEngineFile(entry: TorrentFileEntry): TorrentStreamFile {
    return {
      name: entry.name,
      path: entry.path,
      length: entry.length,
      select: () => {
        this.selectedFilePaths.add(entry.path);
        this.applySelection();
      },
      deselect: () => {
        this.selectedFilePaths.delete(entry.path);
        this.applySelection();
      },
      createReadStream: (options) => {
        if (!this.metainfo || !this.scheduler || !this.storage) {
          throw new Error('Torrent engine is not ready yet');
        }
        return new TorrentFileReadStream({
          pieceLength: this.metainfo.pieceLength,
          file: entry,
          scheduler: this.scheduler,
          storage: this.storage,
          start: options?.start ?? 0,
          end: options?.end ?? entry.length - 1,
        });
      },
    };
  }

  private applySelection(): void {
    if (!this.metainfo || !this.scheduler) {
      return;
    }
    this.scheduler.setSelectedFiles(
      this.metainfo.files.filter((entry) => this.selectedFilePaths.has(entry.path))
    );
  }

  private async startAnnouncing(): Promise<void> {
    await this.announce();
    this.reannounceTimer = setInterval(() => {
      this.announce().catch((error: Error) => {
        console.warn('[torrentEngine] Re-announce failed:', error.message);
      });
    }, REANNOUNCE_INTERVAL_MS);
  }

  private async announce(): Promise<void> {
    if (this.destroyed || !this.infoHash) {
      return;
    }

    const addresses = await announceToTrackers(this.trackers, {
      infoHash: this.infoHash,
      peerId: this.peerId,
      port: LISTEN_PORT,
      bytesLeft: this.metainfo?.totalLength ?? 0,
    });

    for (const address of addresses) {
      this.knownAddresses.set(`${address.host}:${address.port}`, address);
    }
    this.connectToKnownPeers();
  }

  private connectToKnownPeers(): void {
    for (const [addressKey, address] of this.knownAddresses) {
      if (this.destroyed || this.connections.size >= MAX_ACTIVE_PEERS) {
        return;
      }
      if (this.dialedAddressKeys.has(addressKey)) {
        continue;
      }
      this.dialedAddressKeys.add(addressKey);
      this.connectToPeer(addressKey, address);
    }
  }

  private connectToPeer(addressKey: string, address: PeerAddress): void {
    const peer = new PeerConnection(address, this.infoHash as Buffer, this.peerId);
    this.connections.add(peer);

    peer.on('connectionError', () => undefined);

    peer.on('ready', () => {
      if (this.destroyed) {
        peer.destroy();
        return;
      }
      this.swarm.wires.push(peer);
      this.metadataFetcher?.addPeer(peer);
      this.scheduler?.addPeer(peer);
    });

    peer.on('close', () => {
      this.connections.delete(peer);
      const wireIndex = this.swarm.wires.indexOf(peer);
      if (wireIndex !== -1) {
        this.swarm.wires.splice(wireIndex, 1);
      }
      // Forgetting the address lets a later announce hand it back instead of
      // permanently shrinking the pool after a transient failure.
      this.dialedAddressKeys.delete(addressKey);
      this.knownAddresses.delete(addressKey);
      this.connectToKnownPeers();
    });
  }
}

export function createTorrentEngine(source: string | Buffer, options: TorrentEngineOptions): TorrentEngine {
  return new TorrentEngine(source, options);
}
