import path from 'path';
import fs from 'fs';
import { movieDbService } from '../../movies/movieDbService';
import { TorrentFileSelector } from './torrentFileSelector';
import { createTorrentEngine, TorrentEngine, TorrentStreamFile } from './engine/torrentEngine';

export interface ActiveTorrentEngine {
  engine: TorrentEngine;
  torrentHash: string;
  imdbId?: string;
  videoFile: TorrentStreamFile | null;
  downloadsDir: string;
  isReady: boolean;
  readyPromise: Promise<{ engine: TorrentEngine; videoFile: TorrentStreamFile }>;
}

export class TorrentEngineManager {
  private activeEngines = new Map<string, ActiveTorrentEngine>();

  /**
   * Returns an active engine promise if already registered for the given torrent hash.
   */
  public getActiveEngine(hash: string): ActiveTorrentEngine | undefined {
    return this.activeEngines.get(hash);
  }

  /**
   * Returns active engine stats (seeds/peers wires length and streamed file name).
   */
  public getEngineStats(hash: string): { seeds: number; peers: number; fileName: string | null } {
    const active = this.activeEngines.get(hash);
    if (!active || !active.engine) {
      return { seeds: 0, peers: 0, fileName: null };
    }
    const wires = active.engine.swarm?.wires || [];
    return {
      seeds: wires.length,
      peers: wires.length,
      fileName: active.videoFile?.name ?? null
    };
  }

  /**
   * Spawns and manages a torrent engine instance with timeout protection,
   * video file selection on ready, and completion tracking on idle.
   */
  public createEngine(
    torrentHash: string,
    torrentSource: string | Buffer,
    downloadFolder: string,
    imdbId?: string
  ): Promise<{ engine: TorrentEngine; videoFile: TorrentStreamFile }> {
    let resolveReady!: (val: { engine: TorrentEngine; videoFile: TorrentStreamFile }) => void;
    let rejectReady!: (err: any) => void;

    const readyPromise = new Promise<{ engine: TorrentEngine; videoFile: TorrentStreamFile }>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    // Timeout protection for 0-seeder BitTorrent swarms
    const metadataTimer = setTimeout(() => {
      if (!activeEngine.isReady) {
        this.activeEngines.delete(torrentHash);
        engine.destroy();
        rejectReady(new Error("No active seeder found for this torrent. The movie cannot be downloaded."));
      }
    }, 15000);

    const engine = createTorrentEngine(torrentSource, { path: downloadFolder });

    const activeEngine: ActiveTorrentEngine = {
      engine,
      torrentHash,
      imdbId,
      videoFile: null,
      downloadsDir: downloadFolder,
      isReady: false,
      readyPromise,
    };

    this.activeEngines.set(torrentHash, activeEngine);

    engine.on('ready', () => {
      clearTimeout(metadataTimer);

      try {
        const mainVideoFile = TorrentFileSelector.selectMainVideoFile(engine.files);
        activeEngine.videoFile = mainVideoFile;
        activeEngine.isReady = true;

        resolveReady({ engine, videoFile: mainVideoFile });
      } catch (err: any) {
        console.error(`[TorrentEngineManager] File selection error for ${torrentHash}:`, err);
        rejectReady(err);
      }
    });

    engine.on('idle', async () => {
      if (!activeEngine.videoFile) {
        return;
      }

      const fullFilePath = path.join(downloadFolder, activeEngine.videoFile.path);
      const expectedLength = activeEngine.videoFile.length;

      // 'idle' only means no piece is currently selected, which also happens when a reader
      // finishes a partial range; marking that as completed would cap later seeks to the
      // bytes already on disk.
      if (!fs.existsSync(fullFilePath) || fs.statSync(fullFilePath).size !== expectedLength) {
        return;
      }

      const identifier = imdbId || torrentHash;
      await movieDbService.markMovieCompleted(identifier, torrentHash, fullFilePath, BigInt(expectedLength));
    });

    engine.on('error', (err: any) => {
      console.error(`[TorrentEngineManager] Torrent engine error (${torrentHash}):`, err);
      if (!activeEngine.isReady) {
        this.activeEngines.delete(torrentHash);
        clearTimeout(metadataTimer);
        rejectReady(err);
      }
    });

    return readyPromise;
  }
}
