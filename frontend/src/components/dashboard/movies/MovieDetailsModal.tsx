import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { TranslationType } from '../../../locales/translations'
import type { Movie } from '../../../types/movie'
import { fetchTmdbMovieDetails, type TmdbMovieDetails } from '../../../services/internetArchiveTmdb'

interface MovieDetailsProps {
    movie: Movie
    onClose: () => void
    t: TranslationType['dashboard']
    lang: 'en' | 'fr'
}

function formatRuntime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins.toString().padStart(2, '0')}` : `${mins}min`
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export default function MovieDetailsModal({ movie, onClose, t, lang }: MovieDetailsProps) {
    const navigate = useNavigate()
    const [imageError, setImageError] = useState(false)
    const [details, setDetails] = useState<TmdbMovieDetails | null>(null)

    const posterUrl = movie.image

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
                className="relative w-full max-w-4xl max-h-[90vh] bg-neutral-900 border border-white/10 rounded-2xl overflow-y-auto shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Bouton Fermer (X) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 transition-all duration-200 cursor-pointer"
                    title={t.closeModal || "Close"}
                >
                    ✕
                </button>

                {/* Backdrop TMDB */}
                {details?.backdropPath && (
                    <div className="relative h-40 sm:h-56 w-full shrink-0 overflow-hidden">
                        <img
                            src={details.backdropPath}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
                    </div>
                )}

                {/* Contenu principal */}
                <div className="p-6 sm:p-8 relative z-10 flex flex-col md:flex-row gap-6">
                    {/* Affiche du film */}
                    <div className="w-36 sm:w-48 aspect-2/3 rounded-xl border border-white/10 overflow-hidden shrink-0 shadow-xl bg-neutral-950">
                        {!imageError && posterUrl ? (
                            <img 
                                src={posterUrl} 
                                alt={movie.title} 
                                referrerPolicy="no-referrer"
                                onError={() => setImageError(true)}
                                className="w-full h-full object-cover" 
                            />
                        ) : (
                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center p-4 text-center text-xs text-neutral-500 font-bold">
                                {movie.title}
                            </div>
                        )}
                    </div>

                    {/* Informations textuelles */}
                    <div className="flex-1 flex flex-col gap-4 text-neutral-200">
                        <div>
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
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 pr-12">{movie.title}</h1>

                            {/* Badges Année, Durée, Note */}
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-semibold text-neutral-400">
                                <span>{movie.year}</span>
                                {details?.runtime !== undefined && details.runtime > 0 && (
                                    <>
                                        <span>•</span>
                                        <span>{formatRuntime(details.runtime)}</span>
                                    </>
                                )}
                                {movie.rating > 0 && <span>•</span>}
                                {movie.rating > 0 && (
                                <span className="flex items-center gap-1 text-amber-400 font-bold">
                                    ★ {movie.rating.toFixed(1)} / 10
                                </span>
                                )}
                            </div>
                        </div>

                        {/* Synopsis */}
                        <div>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">{t.description || 'Description'}</h3>
                            <p className="text-sm text-neutral-300 leading-relaxed">
                                {movie.description || t.noDescription || 'Aucune description disponible.'}
                            </p>
                        </div>

                        {/* Internet Archive metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10 text-xs">
                            <div>
                                <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">{t.creator || 'Créateur'}</span>
                                <span className="text-white font-medium">{movie.creator || t.notSpecified || 'Non renseigné'}</span>
                            </div>
                            <div>
                                <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">{t.language || 'Langue'}</span>
                                <span className="text-white font-medium">{movie.language || t.notSpecified || 'Non renseigné'}</span>
                            </div>
                            {details?.director && (
                                <div>
                                    <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">{t.director || 'Réalisateur'}</span>
                                    <span className="text-white font-medium">{details.director}</span>
                                </div>
                            )}
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

                        {/* Casting principal */}
                        {details?.cast && details.cast.length > 0 && (
                            <div className="pt-2 border-t border-white/10">
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">{t.cast || 'Casting principal'}</h3>
                                <div className="flex flex-wrap gap-3">
                                    {details.cast.map((member, index) => (
                                        <div key={index} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pr-3 pl-1 py-1">
                                            {member.profilePath ? (
                                                <img
                                                    src={member.profilePath}
                                                    alt={member.name}
                                                    referrerPolicy="no-referrer"
                                                    className="w-7 h-7 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-400">
                                                    {member.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="text-xs leading-tight">
                                                <div className="text-white font-semibold">{member.name}</div>
                                                {member.character && (
                                                    <div className="text-neutral-400">{member.character}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bouton de Lancement Vidéo */}
                        <div className="pt-4 flex items-center gap-4">
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
                                    className="bg-white/5 hover:bg-white/10 text-white font-bold text-sm px-6 py-3 rounded-full flex items-center gap-2 border border-white/10 transition-all cursor-pointer hover:scale-105"
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
            </div>
        </div>,
        document.body
    )
}
