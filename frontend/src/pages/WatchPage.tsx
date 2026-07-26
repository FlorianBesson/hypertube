import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Film } from 'lucide-react'
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
  const navigate = useNavigate()
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
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-red-500" />
          {t.backToCatalog}
        </button>

        {movie && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-neutral-400 bg-neutral-900/60 px-3 py-1.5 rounded-xl border border-white/5">
            <Film className="w-3.5 h-3.5 text-red-500" />
            <span>{movie.title}</span>
          </div>
        )}
      </div>

      {/* Main Watch Layout Container */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <span className="w-10 h-10 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-neutral-400">Chargement de la vidéo...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: Video Player */}
          <div className="flex-1 w-full min-w-0">
            <VideoPlayer movie={movie} t={t} />
          </div>

          {/* Right Column: Comments Section (Collapsible) */}
          <CommentsSection
            isCollapsed={isCommentsCollapsed}
            onToggleCollapse={() => setIsCommentsCollapsed(!isCommentsCollapsed)}
            t={t}
            user={user}
          />
        </div>
      )}
    </div>
  )
}
