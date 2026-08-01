import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TranslationType } from '../../../locales/translations'
import type { Movie } from '../../../types/movie'

export interface MovieCardProps {
  movie: Movie
  isWatched: boolean
  onSelectMovie: (movie: Movie) => void
  t: TranslationType['dashboard']
}

const GENRE_BADGE_GAP = 4

export default function MovieCard({ movie, isWatched, onSelectMovie, t }: MovieCardProps) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()

  const genres = useMemo(
    () =>
      (movie.genres?.length ? movie.genres : (movie.genre || '').split(','))
        .map(genre => genre.trim())
        .filter(Boolean),
    [movie.genres, movie.genre]
  )

  const genreListRef = useRef<HTMLDivElement>(null)
  const badgeWidthsRef = useRef<number[]>([])
  const [visibleGenreCount, setVisibleGenreCount] = useState<number | null>(null)

  useLayoutEffect(() => {
    badgeWidthsRef.current = []
    setVisibleGenreCount(null)
  }, [genres])

  useLayoutEffect(() => {
    const genreList = genreListRef.current
    if (!genreList || !genres.length) return

    // Widths are captured while every badge is rendered, so later passes can fit them without remounting.
    if (!badgeWidthsRef.current.length) {
      badgeWidthsRef.current = Array.from(genreList.children).map(badge => (badge as HTMLElement).offsetWidth)
    }
    const badgeWidths = badgeWidthsRef.current
    const counterWidth = badgeWidths[badgeWidths.length - 1] ?? 0
    const genreWidths = badgeWidths.slice(0, genres.length)

    const fitGenres = () => {
      const availableWidth = genreList.clientWidth
      let usedWidth = 0
      let fittingCount = 0

      for (const genreWidth of genreWidths) {
        const nextWidth = usedWidth + (fittingCount ? GENRE_BADGE_GAP : 0) + genreWidth
        if (nextWidth > availableWidth) break
        usedWidth = nextWidth
        fittingCount += 1
      }

      while (fittingCount > 1 && fittingCount < genreWidths.length && usedWidth + GENRE_BADGE_GAP + counterWidth > availableWidth) {
        fittingCount -= 1
        usedWidth -= genreWidths[fittingCount] + GENRE_BADGE_GAP
      }

      setVisibleGenreCount(Math.max(fittingCount, 1))
    }

    fitGenres()
    const resizeObserver = new ResizeObserver(fitGenres)
    resizeObserver.observe(genreList)
    return () => resizeObserver.disconnect()
  }, [genres])

  const visibleGenres = visibleGenreCount === null ? genres : genres.slice(0, visibleGenreCount)
  const hiddenGenreCount = genres.length - visibleGenres.length

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/watch/${movie.id}`, { state: { movie } })
  }

  // Generate fallback gradients
  const fallbackGradients = [
    'from-red-950/40 to-neutral-900/60',
    'from-blue-950/40 to-neutral-900/60',
    'from-purple-950/40 to-neutral-900/60',
    'from-emerald-950/40 to-neutral-900/60',
    'from-amber-950/40 to-neutral-900/60'
  ]
  const gradientIndex = movie.title.length % fallbackGradients.length
  const fallbackGradient = fallbackGradients[gradientIndex]

  return (
    <div
      onClick={() => onSelectMovie(movie)}
      className="group relative aspect-2/3 rounded-xl border overflow-hidden bg-neutral-900 transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.12)] cursor-pointer border-white/5 hover:border-red-600/30"
    >
      {/* Movie Poster Image */}
      <div className="absolute inset-0 bg-neutral-900">
        {!imageError && movie.image ? (
          <img
            src={movie.image}
            alt={movie.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-all duration-500"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full bg-linear-to-br ${fallbackGradient} flex flex-col items-center justify-center p-4 text-center`}>
            <svg
              className="w-8 h-8 text-neutral-600 mb-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-12-3h12m-12-3h12m-12-3h12m-12-3h12m-12-3h12m-12-3h12" />
            </svg>
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block truncate w-full">
              {movie.genre}
            </span>
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
      </div>

      {/* Provider Badge (Top Left) */}
      {movie.source && (
        <div className="absolute top-2 left-2 z-20">
          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider shadow-md bg-black/70 text-neutral-300 border border-white/10 backdrop-blur-md">
            {movie.source}
          </span>
        </div>
      )}

      {/* Watched Eye Icon (Top Right) */}
      {isWatched && (
        <div className="absolute top-2 right-2 z-20" title={t.watchedBadge || "Déjà vu"}>
          <div className="w-7 h-7 rounded-full bg-black/60 text-white border border-white/15 flex items-center justify-center shadow-md backdrop-blur-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 text-neutral-200"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Hover Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/35 backdrop-blur-[1px] z-10">
        <button
          type="button"
          onClick={handlePlayClick}
          title={t.playMovie}
          className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 scale-75 group-hover:scale-100 transition-all duration-300 hover:bg-red-500 hover:scale-110 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            className="w-6 h-6 text-white ml-0.5"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      {/* Movie Metadata */}
      <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-0.5 z-10">
        {visibleGenres.length > 0 && (
          <div
            ref={genreListRef}
            className={`flex items-center gap-1 mb-1 overflow-hidden ${visibleGenreCount === null ? 'invisible' : ''}`}
            title={genres.join(', ')}
          >
            {visibleGenres.map(genre => (
              <span
                key={genre}
                className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider shadow-md bg-red-600/20 text-red-300 border border-red-500/25 backdrop-blur-md whitespace-nowrap shrink-0"
              >
                {genre}
              </span>
            ))}
            {(hiddenGenreCount > 0 || visibleGenreCount === null) && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider shadow-md bg-black/70 text-neutral-300 border border-white/10 backdrop-blur-md shrink-0">
                +{hiddenGenreCount || genres.length}
              </span>
            )}
          </div>
        )}
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors" title={movie.title}>
          {movie.title}
        </h3>
        <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-400 font-medium">
          <span>{movie.year}</span>
          {movie.tmdbId && (
            <span className="flex items-center gap-0.5 font-semibold text-neutral-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 text-amber-500"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {movie.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
