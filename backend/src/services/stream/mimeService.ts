import path from 'path';

export class MimeService {
  /**
   * Helper function to return MIME type based on video file extension.
   */
  public static getMimeType(filename?: string): string {
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
}
