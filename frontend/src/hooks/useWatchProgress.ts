import { useState, useEffect, useRef, useCallback } from 'react'
import { isResumable } from '../utils/watchProgress'

const SAVE_INTERVAL_SECONDS = 10

/** Loads the saved playback position of a movie and persists it while it plays. */
export function useWatchProgress(movieId: string | undefined) {
  const [loadedProgress, setLoadedProgress] = useState<{ movieId: string; resumeAtSeconds: number } | null>(null)
  const lastSavedSecondsRef = useRef(0)

  useEffect(() => {
    if (!movieId) return

    let isMounted = true

    const fetchProgress = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        if (isMounted) setLoadedProgress({ movieId, resumeAtSeconds: 0 })
        return
      }

      let resumeAtSeconds = 0
      try {
        const response = await fetch(`/api/movies/watched/${encodeURIComponent(movieId)}/progress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error(`Progress request failed with status ${response.status}`)

        const data = await response.json()
        if (data.success && isResumable(data.progressSeconds, data.durationSeconds)) {
          resumeAtSeconds = data.progressSeconds
        }
      } catch (err) {
        console.error('Error fetching playback position:', err)
      }

      if (isMounted) setLoadedProgress({ movieId, resumeAtSeconds })
    }

    fetchProgress()

    return () => {
      isMounted = false
    }
  }, [movieId])

  const isProgressLoaded = loadedProgress !== null && loadedProgress.movieId === movieId
  const resumeAtSeconds = isProgressLoaded ? loadedProgress.resumeAtSeconds : 0

  /** Persists the position at most once per SAVE_INTERVAL_SECONDS unless forced (pause, unmount). */
  const saveProgress = useCallback((currentSeconds: number, durationSeconds: number, force = false) => {
    const token = localStorage.getItem('token')
    if (!movieId || !token || currentSeconds <= 0) return
    if (!force && Math.abs(currentSeconds - lastSavedSecondsRef.current) < SAVE_INTERVAL_SECONDS) return

    lastSavedSecondsRef.current = currentSeconds

    fetch(`/api/movies/watched/${encodeURIComponent(movieId)}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        progressSeconds: Math.floor(currentSeconds),
        durationSeconds: durationSeconds > 0 ? Math.floor(durationSeconds) : undefined
      }),
      keepalive: true
    }).catch(err => console.error('Error saving playback position:', err))
  }, [movieId])

  return { resumeAtSeconds, isProgressLoaded, saveProgress }
}
