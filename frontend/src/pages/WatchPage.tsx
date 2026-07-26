import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import VideoPlayer from '../components/watch/VideoPlayer'
import CommentsSection from '../components/watch/CommentsSection'
import { translations } from '../locales/translations'
import type { LoggedUser } from '../App'
import type { Movie } from '../components/dashboard/DashboardMovies'

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
    if (location.state && (location.state as any).movie) {
      return (location.state as any).movie as Movie
    }
    return null
  })

  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(!movie)

  // Fetch movie details if accessed directly by URL
  useEffect(() => {
    if (movie || !id) return

    const fetchMovieFallback = async () => {
      setIsLoading(true)
      try {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY
        if (apiKey) {
          const res = await fetch(
            `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=${lang}`
          )
          if (res.ok) {
            const data = await res.json()
            setMovie({
              id: data.id.toString(),
              title: data.title || data.original_title,
              genre: data.genres?.[0]?.name || 'Film',
              year: data.release_date ? data.release_date.split('-')[0] : '2024',
              rating: data.vote_average || 7.5,
              image: data.poster_path
                ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
                : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
              source: 'TMDB'
            })
            setIsLoading(false)
            return
          }
        }
        // Fallback default mock movie object
        setMovie({
          id: id,
          title: `Film #${id}`,
          genre: 'Action',
          year: 2024,
          rating: 8.2,
          image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
          source: 'BitTorrent'
        })
      } catch (err) {
        console.error('Error fetching movie details for watch page:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMovieFallback()
  }, [id, movie, lang])

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden flex flex-row">
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center h-full w-full bg-black">
          <span className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-neutral-400">Chargement du lecteur vidéo...</p>
        </div>
      ) : (
        <>
          {/* Main Full-Screen Video Player Area */}
          <div className="flex-1 h-full min-w-0 relative">
            <VideoPlayer movie={movie} t={t} />
          </div>

          {/* Right Side Comments Section (Full Window Height) */}
          <CommentsSection
            isCollapsed={isCommentsCollapsed}
            onToggleCollapse={() => setIsCommentsCollapsed(!isCommentsCollapsed)}
            t={t}
            user={user}
          />
        </>
      )}
    </div>
  )
}
