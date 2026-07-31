import { useEffect, useState } from 'react'
import type { Movie } from '../types/movie'
import { resolveMovieById } from '../services/internetArchiveMetadata'

/** Recovers the movie for a WatchPage opened directly by URL (no router navigation state). */
export function useMovieFallback(id: string | undefined, initialMovie: Movie | null, lang: 'en' | 'fr') {
  const [movie, setMovie] = useState<Movie | null>(initialMovie)
  const [isLoading, setIsLoading] = useState(!initialMovie)
  const [loadingSeconds, setLoadingSeconds] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      queueMicrotask(() => setLoadingSeconds(0))
      return
    }
    const interval = setInterval(() => setLoadingSeconds(prev => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [isLoading])

  useEffect(() => {
    if (movie || !id) return

    let isMounted = true

    const fetchMovieFallback = async () => {
      setIsLoading(true)
      try {
        const resolved = await resolveMovieById(id, lang)
        if (isMounted && resolved) setMovie(resolved)
      } catch (err) {
        console.error('Error fetching movie metadata fallback:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchMovieFallback()

    return () => {
      isMounted = false
    }
  }, [id, movie, lang])

  return { movie, isLoading, loadingSeconds }
}
