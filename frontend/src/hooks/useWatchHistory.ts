import { useState, useEffect } from 'react'
import type { Movie } from '../types/movie'
import { resolveMovieById } from '../services/internetArchiveMetadata'

export interface WatchHistoryEntry {
  movie: Movie
  watchedAt: string
}

interface WatchHistoryRecord {
  imdbId: string
  watchedAt: string
}

const HISTORY_LIMIT = 6

/** Loads the user's last watched movies and resolves their metadata for display. */
export function useWatchHistory(lang: 'en' | 'fr') {
  const [historyEntries, setHistoryEntries] = useState<WatchHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [errorHistory, setErrorHistory] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchHistory = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        if (isMounted) setLoadingHistory(false)
        return
      }

      setLoadingHistory(true)
      setErrorHistory(false)

      try {
        const response = await fetch(`/api/movies/watched/history?limit=${HISTORY_LIMIT}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error(`History request failed with status ${response.status}`)

        const data = await response.json()
        const records: WatchHistoryRecord[] = data.success && Array.isArray(data.history) ? data.history : []

        const resolved = await Promise.all(
          records.map(async (record) => {
            try {
              const movie = await resolveMovieById(record.imdbId, lang)
              return movie ? { movie, watchedAt: record.watchedAt } : null
            } catch (err) {
              console.error(`Error resolving watched movie ${record.imdbId}:`, err)
              return null
            }
          })
        )

        if (isMounted) {
          setHistoryEntries(resolved.filter((entry): entry is WatchHistoryEntry => entry !== null))
        }
      } catch (err) {
        console.error('Error fetching watch history:', err)
        if (isMounted) setErrorHistory(true)
      } finally {
        if (isMounted) setLoadingHistory(false)
      }
    }

    fetchHistory()

    return () => {
      isMounted = false
    }
  }, [lang])

  return { historyEntries, loadingHistory, errorHistory }
}
