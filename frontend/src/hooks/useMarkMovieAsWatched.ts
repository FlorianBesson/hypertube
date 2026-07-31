import { useEffect } from 'react'

/** Automatically records a movie as watched in the DB once the player opens for it. */
export function useMarkMovieAsWatched(movieId: string | undefined) {
  useEffect(() => {
    if (!movieId) return
    const token = localStorage.getItem('token')
    if (!token) return

    fetch(`/api/movies/watched/${encodeURIComponent(movieId)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(err => console.error('Error marking movie as watched in BDD:', err))
  }, [movieId])
}
