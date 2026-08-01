import { useEffect, useState } from 'react'
import { Info, PanelRightClose } from 'lucide-react'
import type { TranslationType } from '../../locales/translations'
import type { Movie } from '../../types/movie'
import { fetchTmdbMovieDetails, type TmdbMovieDetails } from '../../services/internetArchiveTmdb'
import { formatRuntime } from '../../utils/format'

interface InfoPanelProps {
  movie: Movie | null
  lang: 'en' | 'fr'
  t: TranslationType['watch']
  onClose: () => void
}

export default function InfoPanel({ movie, lang, t, onClose }: InfoPanelProps) {
  const [details, setDetails] = useState<TmdbMovieDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY
    if (!movie?.tmdbId || !apiKey) return

    const controller = new AbortController()
    queueMicrotask(() => setIsLoading(true))
    fetchTmdbMovieDetails(movie.tmdbId, apiKey, lang, controller.signal)
      .then(setDetails)
      .catch(() => {})
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [movie?.tmdbId, lang])

  const genres = details?.genres?.join(', ') || movie?.genre

  return (
    <div className="absolute top-0 right-0 z-40 w-full sm:w-96 lg:w-104 h-full flex flex-col bg-neutral-950/95 border-l border-white/10 p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-600/20 border border-red-500/20 text-red-500">
            <Info className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t.infoTitle}</h2>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/10"
          title={t.collapseInfo}
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1 custom-scrollbar min-h-0">
        {!movie ? null : (
          <>
            <div className="flex gap-3">
              <div className="w-20 h-28 rounded-lg border border-white/10 overflow-hidden shrink-0 shadow-lg bg-neutral-900">
                {!imageError && movie.image ? (
                  <img
                    src={movie.image}
                    alt={movie.title}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center p-2 text-center text-[10px] text-neutral-500 font-bold">
                    {movie.title}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {genres && (
                  <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest">{genres}</span>
                )}
                <h3 className="text-sm font-bold text-white leading-snug">{movie.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-semibold text-neutral-400">
                  <span>{movie.year}</span>
                  {details?.runtime !== undefined && details.runtime > 0 && (
                    <>
                      <span>•</span>
                      <span>{formatRuntime(details.runtime)}</span>
                    </>
                  )}
                  {movie.rating > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">★ {movie.rating.toFixed(1)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">{t.description}</h4>
              <p className="text-xs text-neutral-300 leading-relaxed">{movie.description || t.noDescription}</p>
            </div>

            {details?.director && (
              <div>
                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">{t.director}</h4>
                <p className="text-xs text-white font-medium">{details.director}</p>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center items-center py-6">
                <span className="w-5 h-5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
              </div>
            )}

            {details?.cast && details.cast.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">{t.cast}</h4>
                <div className="flex flex-col gap-2.5">
                  {details.cast.map((member, index) => (
                    <div key={index} className="flex items-center gap-2.5">
                      {member.profilePath ? (
                        <img
                          src={member.profilePath}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-400 shrink-0">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-xs leading-tight min-w-0">
                        <div className="text-white font-semibold truncate">{member.name}</div>
                        {member.character && <div className="text-neutral-400 truncate">{member.character}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
