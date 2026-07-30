import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import VideoPlayer from '../components/watch/VideoPlayer'
import CommentsSection from '../components/watch/CommentsSection'
import { translations } from '../locales/translations'
import type { LoggedUser } from '../App'
import { enrichInternetArchiveMoviesWithTmdb } from '../services/internetArchiveTmdb'
import type { Movie } from '../types/movie'

import { PUBLIC_DOMAIN_TORRENTS_DATABASE } from '../services/sources/publicDomainTorrentsSourceProvider'

interface WatchPageProps {
  lang: 'en' | 'fr'
  user: LoggedUser | null
}

export default function WatchPage({ lang, user }: WatchPageProps) {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const t = translations[lang].watch

  const [movie, setMovie] = useState<Movie | null>(() => {
    // If movie passed via location state from MovieDetailsModal
    const state = location.state as { movie?: Movie } | null
    if (state?.movie) {
      return state.movie
    }
    return null
  })

  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(true)
  const [isLoading, setIsLoading] = useState(!movie)
  const [loadingSeconds, setLoadingSeconds] = useState(0)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingSeconds(prev => prev + 1)
      }, 1000)
    } else {
      queueMicrotask(() => setLoadingSeconds(0))
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLoading])

  // Recover movie item if page is opened directly by URL
  useEffect(() => {
    if (movie || !id) return

    const fetchMovieFallback = async () => {
      setIsLoading(true)
      try {
        if (id.startsWith('pdt-')) {
          const found = PUBLIC_DOMAIN_TORRENTS_DATABASE.find(m => m.id === id)
          if (found) {
            const [enriched] = await enrichInternetArchiveMoviesWithTmdb([found], {
              apiKey: import.meta.env.VITE_TMDB_API_KEY,
              lang,
            })
            setMovie(enriched || found)
            return
          }
        }

        const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`)
        if (!response.ok) {
          throw new Error(`Internet Archive returned ${response.status}`)
        }

        const data = await response.json()
        const metadata = data.metadata || {}
        const text = (value: unknown): string => {
          const values = Array.isArray(value) ? value : value == null ? [] : [value]
          return values.map(String).join(', ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        }
        const date = text(metadata.year) || text(metadata.date)
        const year = date.match(/\b(?:18|19|20)\d{2}\b/)?.[0] || 'N/A'

        const baseMovie: Movie = {
          id,
          title: text(metadata.title) || id,
          genre: text(metadata.subject) || 'Movie',
          year,
          rating: Math.min(10, Math.max(0, Number(metadata.avg_rating || 0) * 2)),
          image: `https://archive.org/services/img/${encodeURIComponent(id)}`,
          source: 'Internet Archive',
          description: text(metadata.description),
          creator: text(metadata.creator),
          language: text(metadata.language),
          torrentUrl: `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(id)}_archive.torrent`,
          detailsUrl: `https://archive.org/details/${encodeURIComponent(id)}`
        }

        const [enriched] = await enrichInternetArchiveMoviesWithTmdb([baseMovie], {
          apiKey: import.meta.env.VITE_TMDB_API_KEY,
          lang,
        })

        setMovie(enriched || baseMovie)
      } catch (err) {
        console.error('Error fetching movie metadata fallback:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMovieFallback()
  }, [id, movie, lang])

  // Automatically mark movie as watched in BDD when user opens WatchPage
  useEffect(() => {
    const targetId = id || movie?.id
    if (!targetId) return
    const token = localStorage.getItem('token')
    if (!token) return

    fetch(`/api/movies/watched/${encodeURIComponent(targetId)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).catch(err => console.error('Error marking movie as watched in BDD:', err))
  }, [id, movie?.id])

  const [showControls, setShowControls] = useState(true)

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden relative">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full w-full bg-black">
          <span className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-4" />
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-neutral-400">Chargement du lecteur vidéo...</p>
            <span className="text-sm font-bold text-red-500 font-mono">({loadingSeconds}s)</span>
          </div>
        </div>
      ) : (
        <>
          {/* Main Full-Screen Video Player Area */}
          <div className="w-full h-full">
            <VideoPlayer movie={movie} t={t} onControlsVisibilityChange={setShowControls} />
          </div>

          {/* Right Side Overlay Comments Section */}
          <CommentsSection
            isCollapsed={isCommentsCollapsed}
            onToggleCollapse={() => setIsCommentsCollapsed(!isCommentsCollapsed)}
            t={t}
            user={user}
            imdbId={movie?.imdbId || id || movie?.id}
            showControls={showControls}
          />
        </>
      )}
    </div>
  )
}
