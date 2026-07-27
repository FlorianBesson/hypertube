import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { TranslationType } from '../../locales/translations'
import type { Movie } from './DashboardMovies'

interface MovieDetailsProps {
    movie: Movie
    onClose: () => void
    t: TranslationType['dashboard']
    lang: 'en' | 'fr'
}

interface TmdbCrewMember {
    job?: string
    name?: string
}

interface TmdbCastMember {
    name?: string
}

interface TmdbDetails {
    overview?: string
    runtime?: number
    backdrop_path?: string
    director?: string
    cast?: string[]
}

export default function MovieDetailsModal({ movie, onClose, t, lang }: MovieDetailsProps) {
    const navigate = useNavigate()
    const [details, setDetails] = useState<TmdbDetails | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [imageError, setImageError] = useState(false)

    const posterUrl = movie.image

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

    useEffect(() => {
        const fetchMovieDetails = async () => {
            setIsLoading(true)
            try {
                const apiKey = import.meta.env.VITE_TMDB_API_KEY
                if (!apiKey) {
                    throw new Error('VITE_TMDB_API_KEY is not configured')
                }

                const language = lang === 'fr' ? 'fr-FR' : 'en-US'
                const params = new URLSearchParams({
                    api_key: apiKey,
                    language,
                    append_to_response: 'credits'
                })
                const response = await fetch(
                    `https://api.themoviedb.org/3/movie/${movie.id}?${params.toString()}`
                )
                if (!response.ok) {
                    throw new Error(`TMDb returned ${response.status}`)
                }

                const data = await response.json()
                const director = data.credits?.crew?.find(
                    (member: TmdbCrewMember) => member.job === 'Director'
                )
                const cast = data.credits?.cast
                    ?.slice(0, 5)
                    .map((member: TmdbCastMember) => member.name || '') || []

                setDetails({
                    overview: data.overview || 'Aucun synopsis disponible.',
                    runtime: data.runtime || 0,
                    backdrop_path: data.backdrop_path
                        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
                        : undefined,
                    director: director?.name || 'Inconnu',
                    cast
                })
            } catch (err) {
                console.error('Erreur lors de la récupération des détails TMDb :', err)
                setDetails({
                    overview: 'Aucune information détaillée disponible pour ce film.',
                    director: 'Inconnu',
                    cast: []
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchMovieDetails()
    }, [movie, lang])

    // Helper pour formater la durée (ex: 124 min -> 2h 04m)
    const formatRuntime = (minutes?: number) => {
        if (!minutes || minutes === 0) return 'Durée inconnue'
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return `${h}h ${m < 10 ? '0' : ''}${m}m`
    }

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
                    title={t.moviesTitle ? "Fermer" : "Close"}
                >
                    ✕
                </button>

                {/* Contenu principal */}
                <div className="p-6 sm:p-8 relative z-10 flex flex-col md:flex-row gap-6">
                    {/* Affiche du film */}
                    <div className="w-36 sm:w-48 aspect-[2/3] rounded-xl border border-white/10 overflow-hidden shrink-0 shadow-xl bg-neutral-950">
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
                                <span className="text-xs font-extrabold text-red-500 uppercase tracking-widest">{movie.genre}</span>
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
                                <span>•</span>
                                <span>{formatRuntime(details?.runtime)}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-amber-400 font-bold">
                                    ★ {movie.rating.toFixed(1)} / 10
                                </span>
                            </div>
                        </div>

                        {/* Synopsis */}
                        <div>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Synopsis</h3>
                            {isLoading ? (
                                <div className="h-16 bg-neutral-800/40 rounded animate-pulse" />
                            ) : (
                                <p className="text-sm text-neutral-300 leading-relaxed">{details?.overview}</p>
                            )}
                        </div>

                        {/* Casting & Réalisateur */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10 text-xs">
                            <div>
                                <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Réalisateur</span>
                                <span className="text-white font-medium">{isLoading ? "..." : details?.director}</span>
                            </div>
                            <div>
                                <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Casting principal</span>
                                <span className="text-white font-medium">
                                    {isLoading ? "..." : details?.cast && details.cast.length > 0 ? details.cast.join(', ') : "Non renseigné"}
                                </span>
                            </div>
                        </div>

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
                                Lancer la vidéo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
