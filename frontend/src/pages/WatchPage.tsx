import { useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import VideoPlayer from '../components/watch/VideoPlayer'
import CommentsSection from '../components/watch/CommentsSection'
import { translations } from '../locales/translations'
import type { LoggedUser } from '../App'
import type { Movie } from '../types/movie'
import { useMovieFallback } from '../hooks/useMovieFallback'
import { useMarkMovieAsWatched } from '../hooks/useMarkMovieAsWatched'

interface WatchPageProps {
  lang: 'en' | 'fr'
  user: LoggedUser | null
}

export default function WatchPage({ lang, user }: WatchPageProps) {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const t = translations[lang].watch

  // If movie was passed via location state from MovieDetailsModal, use it directly
  const initialMovie = (location.state as { movie?: Movie } | null)?.movie || null
  const { movie, isLoading, loadingSeconds } = useMovieFallback(id, initialMovie, lang)

  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(true)
  const [showControls, setShowControls] = useState(true)

  useMarkMovieAsWatched(id || movie?.id)

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden">
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
