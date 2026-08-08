import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { TranslationType } from '../../../locales/translations'
import type { Movie } from '../../../types/movie'
import { fetchTmdbMovieDetails, type TmdbMovieDetails } from '../../../services/internetArchiveTmdb'
import { getLanguageDisplayName } from '../../../utils/language'
import { formatRuntime } from '../../../utils/format'

interface MovieDetailsProps {
  movie: Movie
  onClose: () => void
  t: TranslationType['dashboard']
  lang: 'en' | 'fr'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export default function MovieDetailsModal({ movie, onClose, t, lang }: MovieDetailsProps) {
  const navigate = useNavigate()
  const [details, setDetails] = useState<TmdbMovieDetails | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY
    if (!movie.tmdbId || !apiKey) return

    const controller = new AbortController()
    fetchTmdbMovieDetails(movie.tmdbId, apiKey, lang, controller.signal)
      .then(setDetails)
      .catch(() => {})

    return () => controller.abort()
  }, [movie.tmdbId, lang])

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Boite de la modale */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton Fermer (X) — hors du conteneur scrollable pour rester visible */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition-all duration-200 cursor-pointer"
          title={t.closeModal || "Close"}
        >
          ✕
        </button>

        <div className="overflow-y-auto flex flex-col scrollbar-none">
          {/* Hero : backdrop TMDB plein cadre 16/9 + titre et actions en surimpression */}
          <div className={`relative w-full shrink-0 bg-neutral-950 ${details?.backdropPath ? 'aspect-video min-h-80' : ''}`}>
            {details?.backdropPath && (
              <>
                <img
                  src={details.backdropPath}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-neutral-900 via-neutral-900/50 to-transparent" />
                <div className="absolute inset-0 bg-linear-to-r from-neutral-900/70 to-transparent" />
              </>
            )}

            <div className={`flex flex-col gap-3 px-6 sm:px-8 pb-6 sm:pb-8 ${details?.backdropPath ? 'absolute inset-x-0 bottom-0' : 'pt-8'}`}>
              <div className="flex items-center gap-2 pr-12">
                <span className="text-xs font-extrabold text-red-500 uppercase tracking-widest">
                  {details?.genres?.join(', ') || movie.genre}
                </span>
                {movie.source && (
                  <span className="text-[10px] bg-white/10 text-neutral-300 px-2 py-0.5 rounded border border-white/10 font-mono">
                    {movie.source}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white pr-12 drop-shadow-lg">{movie.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-neutral-300">
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
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      ★ {movie.rating.toFixed(1)} / 10
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={() => {
                    onClose()
                    navigate(`/watch/${movie.id}`, { state: { movie } })
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-3 rounded-full flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer hover:scale-105"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {t.playMovie || 'Lancer la vidéo'}
                </button>
                {details?.trailerUrl && (
                  <a
                    href={details.trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-6 py-3 rounded-full flex items-center gap-2 border border-white/15 transition-all cursor-pointer hover:scale-105 backdrop-blur-md"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M21.6 7.2c-.2-1-1-1.7-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3c-1 .2-1.7 1-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8c.2 1 1 1.7 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3c1-.2 1.7-1 1.9-1.9.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z" />
                    </svg>
                    {t.watchTrailer || 'Bande-annonce'}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="p-6 sm:p-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-[8rem_1fr_12rem] gap-6">
              {/* Colonne 1 : affiche */}
              <div className="w-32 h-48 mx-auto md:mx-0 rounded-xl border border-white/10 overflow-hidden shrink-0 shadow-xl bg-neutral-950">
                {!imageError && movie.image ? (
                  <img
                    src={movie.image}
                    alt={movie.title}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center p-3 text-center text-xs text-neutral-500 font-bold">
                    {movie.title}
                  </div>
                )}
              </div>

              {/* Colonne 2 : informations */}
              <div className="flex flex-col gap-4 text-neutral-200 min-w-0">
                {/* Synopsis */}
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t.description || 'Description'}</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {movie.description || t.noDescription || 'Aucune description disponible.'}
                  </p>
                </div>

                {/* Internet Archive metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10 text-xs">
                  {details?.director && (
                    <div>
                      <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">{t.director || 'Réalisateur'}</span>
                      <span className="text-white font-medium">{details.director}</span>
                    </div>
                  )}
                  {details?.producers && details.producers.length > 0 && (
                    <div>
                      <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">
                        {details.producers.length > 1 ? (t.producers || 'Producteurs') : (t.producer || 'Producteur')}
                      </span>
                      <span className="text-white font-medium">{details.producers.join(', ')}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">{t.language || 'Langue'}</span>
                    <span className="text-white font-medium">{getLanguageDisplayName(movie.language, lang) || t.notSpecified || 'Non renseigné'}</span>
                  </div>
                  {details?.budget !== undefined && details.budget > 0 && (
                    <div>
                      <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">{t.budget || 'Budget'}</span>
                      <span className="text-white font-medium">{formatCurrency(details.budget)}</span>
                    </div>
                  )}
                  {details?.revenue !== undefined && details.revenue > 0 && (
                    <div>
                      <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">{t.revenue || 'Recettes'}</span>
                      <span className="text-white font-medium">{formatCurrency(details.revenue)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Colonne 3 : casting principal */}
              {details?.cast && details.cast.length > 0 && (
                <div className="flex flex-col gap-3 md:border-l md:border-white/10 md:pl-6">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{t.cast || 'Casting principal'}</h3>
                  <div className="flex flex-col gap-3">
                    {details.cast.map((member, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {member.profilePath ? (
                          <img
                            src={member.profilePath}
                            alt={member.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-400 shrink-0">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div className="text-xs leading-tight min-w-0">
                          <div className="text-white font-semibold truncate">{member.name}</div>
                          {member.character && (
                            <div className="text-neutral-400 truncate">{member.character}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
