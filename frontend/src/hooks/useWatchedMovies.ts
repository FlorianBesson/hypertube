import { useState, useEffect } from 'react'

export function useWatchedMovies() {
  const [watchedMovies, setWatchedMovies] = useState<string[]>([])

  useEffect(() => {
    let isMounted = true

    const fetchWatched = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const response = await fetch('/api/movies/watched', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) return
        const data = await response.json()
        if (isMounted && data.success && Array.isArray(data.watched)) {
          setWatchedMovies(data.watched)
        }
      } catch (err) {
        console.error('Error fetching watched movies from BDD:', err)
      }
    }

    fetchWatched()

    return () => {
      isMounted = false
    }
  }, [])

  return { watchedMovies, setWatchedMovies }
}
