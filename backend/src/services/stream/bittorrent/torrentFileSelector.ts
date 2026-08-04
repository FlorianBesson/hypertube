import path from 'path';
import { TorrentStreamFile } from './engine/torrentEngine';

// TEMP (testing HLS conversion): added .ogv/.mpeg so a real archive.org item (e.g.
// his_girl_friday, which ships an .ogv alongside its .mp4) is recognized as a candidate.
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.ogv', '.mpeg'];

/**
 * Filters and selects the primary video file from a torrent engine's files list.
 * Priority is given to browser-compatible formats (.mp4, .webm), sorted by size.
 * Unselects all other files in the torrent engine to optimize bandwidth.
 */
export function selectMainVideoFile(files: TorrentStreamFile[]): TorrentStreamFile {
  const videoFiles = files.filter((f) => {
    const ext = path.extname(f.name).toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
  });

  let mainVideoFile: TorrentStreamFile;

  // TEMP (testing HLS conversion): prefer non-native containers so a real torrent forces
  // the conversion path. Revert to ext === '.mp4' || ext === '.webm' once done testing.
  const webFiles = videoFiles.filter((f) => {
    const ext = path.extname(f.name).toLowerCase();
    return ext !== '.mp4' && ext !== '.webm';
  });

  if (webFiles.length > 0) {
    mainVideoFile = webFiles.sort((a, b) => b.length - a.length)[0];
  } else if (videoFiles.length > 0) {
    mainVideoFile = videoFiles.sort((a, b) => b.length - a.length)[0];
  } else {
    mainVideoFile = files.sort((a, b) => b.length - a.length)[0];
  }

  if (!mainVideoFile) {
    throw new Error('No video file found in torrent');
  }

  files.forEach((f: TorrentStreamFile) => f.deselect());
  mainVideoFile.select();

  return mainVideoFile;
}

export const TorrentFileSelector = {
  selectMainVideoFile,
};
