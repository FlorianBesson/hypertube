import type { Movie } from '../types/movie'

export function resolveStreamIdentifier(movie: Movie | null): string {
  return movie?.torrents?.[0]?.hash || movie?.hash || movie?.torrentUrl || movie?.id || 'sample'
}

// The media endpoints are authenticated, and <video>/<track> cannot send an
// Authorization header, so the token travels as a query parameter instead.
function buildTokenQuery(token: string | null, extraParams?: Record<string, string>): string {
  const params = new URLSearchParams(extraParams)
  if (token) params.set('token', token)

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function buildStreamUrl(streamIdentifier: string, movieId: string | undefined, token: string | null): string {
  const query = buildTokenQuery(token, movieId ? { imdbId: movieId } : undefined)
  return `/api/movies/stream/${encodeURIComponent(streamIdentifier)}${query}`
}

export function buildStreamStatsUrl(streamIdentifier: string, token: string | null): string {
  return `/api/movies/stream/${encodeURIComponent(streamIdentifier)}/stats${buildTokenQuery(token)}`
}

export function buildHlsPlaylistUrl(streamIdentifier: string, token: string | null): string {
  return `/api/movies/stream/${encodeURIComponent(streamIdentifier)}/hls/playlist.m3u8${buildTokenQuery(token)}`
}

export function buildSubtitleUrl(imdbId: string, langCode: string, token: string | null): string {
  return `/api/movies/subtitles/${encodeURIComponent(imdbId)}/${langCode}${buildTokenQuery(token)}`
}

export async function fetchStreamErrorMessage(streamUrl: string, fallback: string): Promise<string> {
  try {
    const errRes = await fetch(streamUrl)
    if (!errRes.ok) {
      const errData = await errRes.json()
      if (errData && errData.message) return errData.message
    }
  } catch (err) {
    console.error('Error fetching stream details:', err)
  }
  return fallback
}
