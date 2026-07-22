import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { TranslationType } from '../../locales/translations'
import type { Movie } from './DashboardMovies'

interface MovieDetailsProps {
    movie: Movie
    onClose: () => void
    t: TranslationType['dashboard']
}

interface TmdbCrewMember {
    job?: string
    name?: string
}

interface TmdbCastMember {
    name?: string
}

interface YtsCastMember {
    name?: string
}

interface TmdbDetails {
    overview?: string
    runtime?: number
    backdrop_path?: string
    director?: string
    cast?: string[]
}

export default function MovieDetailsModal({ movie, onClose, t }: MovieDetailsProps) {
    const [details, setDetails] = useState<TmdbDetails | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [recoveredPoster, setRecoveredPoster] = useState<string | null>(null)
    const [imageError, setImageError] = useState(false)

    const posterUrl = recoveredPoster || movie.image

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    // Auto-recovery: If YTS image domain is DNS-blocked, fetch official poster from OMDb API
    useEffect(() => {
        if (imageError && movie.title) {
            const cleanTitle = movie.title.replace(/\(\d{4}\)/, '').trim()
            fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(cleanTitle)}&apikey=trilogy`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.Poster && data.Poster !== 'N/A') {
                        setRecoveredPoster(data.Poster)
                        setImageError(false)
                    }
                })
                .catch(() => {})
        }
    }, [imageError, movie.title])

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
                const cleanTitle = movie.title.replace(/\(\d{4}\)/, '').trim()
                const apiKey = import.meta.env.VITE_TMDB_API_KEY

                // 1. Si la clé TMDb est configurée dans le .env, l'utiliser en priorité
                if (apiKey) {
                    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`
                    const searchRes = await fetch(searchUrl)
                    if (searchRes.ok) {
                        const searchData = await searchRes.json()
                        if (searchData.results && searchData.results.length > 0) {
                            const tmdbId = searchData.results[0].id
                            const creditsUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`
                            const creditsRes = await fetch(creditsUrl)
                            if (creditsRes.ok) {
                                const creditsData = await creditsRes.json()
                                const directorObj = creditsData.credits?.crew?.find((c: TmdbCrewMember) => c.job === 'Director')
                                const castList = creditsData.credits?.cast?.slice(0, 5).map((c: TmdbCastMember) => c.name || '') || []

                                if (creditsData.poster_path) {
                                    setRecoveredPoster(`https://image.tmdb.org/t/p/w500${creditsData.poster_path}`)
                                }

                                setDetails({
                                    overview: creditsData.overview || "Aucun synopsis disponible.",
                                    runtime: creditsData.runtime || 0,
                                    backdrop_path: creditsData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${creditsData.backdrop_path}` : undefined,
                                    director: directorObj ? directorObj.name : "Inconnu",
                                    cast: castList
                                })
                                return
                            }
                        }
                    }
                }

                // 2. Fallback OMDb API
                const omdbUrl = `https://www.omdbapi.com/?t=${encodeURIComponent(cleanTitle)}&apikey=trilogy`
                const omdbRes = await fetch(omdbUrl)
                if (omdbRes.ok) {
                    const omdbData = await omdbRes.json()
                    if (omdbData.Response !== "False") {
                        const runtimeNum = parseInt(omdbData.Runtime) || 0
                        const castArray = omdbData.Actors ? omdbData.Actors.split(', ') : []
                        if (omdbData.Poster && omdbData.Poster !== "N/A") {
                            setRecoveredPoster(omdbData.Poster)
                        }
                        setDetails({
                            overview: omdbData.Plot || "Aucun synopsis disponible.",
                            runtime: runtimeNum,
                            backdrop_path: omdbData.Poster !== "N/A" ? omdbData.Poster : undefined,
                            director: omdbData.Director !== "N/A" ? omdbData.Director : "Inconnu",
                            cast: castArray
                        })
                        return
                    }
                }

                // 3. Fallback YTS Movie Details API
                if (movie.id.startsWith('yts-')) {
                    const ytsId = movie.id.replace('yts-', '')
                    const ytsDetailsUrl = `https://movies-api.accel.li/api/v2/movie_details.json?movie_id=${ytsId}&with_cast=true`
                    const ytsRes = await fetch(ytsDetailsUrl)
                    if (ytsRes.ok) {
                        const ytsData = await ytsRes.json()
                        const m = ytsData?.data?.movie
                        if (m) {
                            const castList = m.cast ? m.cast.map((c: YtsCastMember) => c.name || '') : []
                            setDetails({
                                overview: m.description_full || m.description_intro || "Aucun synopsis disponible.",
                                runtime: m.runtime || 0,
                                backdrop_path: undefined,
                                director: "Cinéma",
                                cast: castList
                            })
                            return
                        }
                    }
                }

                // 4. Fallback final
                setDetails({
                    overview: "Aucune information détaillée disponible pour ce film.",
                    director: "Inconnu",
                    cast: []
                })
            } catch (err) {
                console.error("Erreur lors de la récupération des détails du film:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchMovieDetails()
    }, [movie])

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

                {/* Bannière d'arrière-plan HD (Backdrop) */}
                <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-neutral-950 shrink-0">
                    {details?.backdrop_path || posterUrl ? (
                        <img
                            src={details?.backdrop_path || posterUrl}
                            alt={movie.title}
                            referrerPolicy="no-referrer"
                            onError={() => setImageError(true)}
                            className="w-full h-full object-cover opacity-40 blur-[2px]"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-red-950 to-neutral-900 opacity-60" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/50 to-transparent" />
                </div>

                {/* Contenu principal */}
                <div className="p-6 sm:p-8 -mt-24 relative z-10 flex flex-col md:flex-row gap-6">
                    {/* Affiche du film */}
                    <div className="w-36 sm:w-48 aspect-[2/3] rounded-xl border border-white/10 overflow-hidden shrink-0 shadow-xl bg-neutral-950">
                        {posterUrl ? (
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
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-red-500 uppercase tracking-widest">{movie.genre}</span>
                                {movie.source && (
                                    <span className="text-[10px] bg-white/10 text-neutral-300 px-2 py-0.5 rounded border border-white/10 font-mono">
                                        {movie.source}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{movie.title}</h1>
                            
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
                                onClick={() => alert("Le lecteur vidéo BitTorrent sera lancé à l'étape suivante !")}
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