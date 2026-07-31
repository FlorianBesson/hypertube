import type { Movie } from '../types/movie'

export function resolveStreamIdentifier(movie: Movie | null): string {
  return movie?.torrents?.[0]?.hash || movie?.hash || movie?.torrentUrl || movie?.id || 'sample'
}

export function buildStreamUrl(streamIdentifier: string, movieId: string | undefined, token: string | null): string {
  const params = new URLSearchParams()
  if (movieId) params.set('imdbId', movieId)
  if (token) params.set('token', token)

  const query = params.toString()
  return `/api/movies/stream/${encodeURIComponent(streamIdentifier)}${query ? `?${query}` : ''}`
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
