import path from 'path';

/**
 * Helper function to return MIME type based on video file extension.
 */
export function getMimeType(filename?: string): string {
  if (!filename) return 'video/mp4';
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.mkv':
      return 'video/x-matroska';
    case '.webm':
      return 'video/webm';
    case '.avi':
      return 'video/x-msvideo';
    case '.mov':
      return 'video/quicktime';
    case '.ogv':
      return 'video/ogg';
    default:
      return 'video/mp4';
  }
}

/**
 * Returns the container format of a video file ("mkv", "mp4", ...), or null when unknown.
 */
export function getVideoFormat(filename?: string): string | null {
  if (!filename) return null;
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  return ext || null;
}

export const MimeService = {
  getMimeType,
  getVideoFormat,
};
