import { useState, useEffect } from 'react'
import type { TranslationType } from '../../locales/translations'

interface Movie {
  id: string
  title: string
  genre: string
  year: string | number
  metric: string
  image: string
}

interface DashboardMoviesProps {
  t: TranslationType['dashboard']
  showCommunity: boolean
  setShowCommunity: (val: boolean) => void
}

function MovieCard({ movie }: { movie: Movie }) {
  const [imageError, setImageError] = useState(false)

  // Generate a distinct styled gradient as fallback based on movie title length
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
      className="group relative aspect-[2/3] rounded-xl border border-white/5 overflow-hidden bg-neutral-900 hover:bg-neutral-800/40 hover:border-red-600/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(220,38,38,0.12)] cursor-pointer"
    >
      {/* Movie Poster Image */}
      <div className="absolute inset-0 bg-neutral-900">
        {!imageError && movie.image ? (
          <img
            src={movie.image}
            alt={movie.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${fallbackGradient} flex flex-col items-center justify-center p-4 text-center`}>
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
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
      </div>

      {/* Hover Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/35 backdrop-blur-[1px] z-10">
        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 scale-75 group-hover:scale-100 transition-all duration-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            className="w-6 h-6 text-white ml-0.5"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Movie Metadata */}
      <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-0.5 z-10">
        <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest truncate">{movie.genre}</span>
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors" title={movie.title}>
          {movie.title}
        </h3>
        <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-400 font-medium">
          <span>{movie.year}</span>
          <span className="flex items-center gap-0.5 font-semibold text-neutral-200">
            {movie.metric}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function DashboardMovies({ t, showCommunity, setShowCommunity }: DashboardMoviesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Debounce search query to limit external API request frequency
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 450)

    return () => {
      clearTimeout(handler)
    }
  }, [searchQuery])

  // Fetch movies from YTS
  useEffect(() => {
    let isMounted = true

    const fetchVideos = async () => {
      setLoading(true)
      setError(false)

      try {
        const queryStr = debouncedQuery.trim()
        
        // Prepare YTS URL (using public CORS-enabled API)
        const ytsUrl = queryStr
          ? `https://movies-api.accel.li/api/v2/list_movies.json?limit=20&query_term=${encodeURIComponent(queryStr)}`
          : `https://movies-api.accel.li/api/v2/list_movies.json?limit=20&sort_by=download_count`

        const response = await fetch(ytsUrl)
        if (!response.ok) {
          throw new Error('YTS API response error')
        }

        const ytsData = await response.json()
        let fetchedMovies: Movie[] = []

        if (ytsData?.data?.movies) {
          fetchedMovies = ytsData.data.movies.map((m: any) => ({
            id: `yts-${m.id}`,
            title: m.title,
            genre: m.genres ? m.genres[0] : 'Movie',
            year: m.year,
            metric: `⭐ ${m.rating ? m.rating.toFixed(1) : '0.0'}`,
            image: m.medium_cover_image || ''
          }))
        }

        if (isMounted) {
          setMovies(fetchedMovies)
        }
      } catch (err) {
        console.error("Fetch YTS videos error:", err)
        if (isMounted) {
          setError(true)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchVideos()

    return () => {
      isMounted = false
    }
  }, [debouncedQuery])

  return (
    <div className="flex-1 bg-neutral-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md w-full flex flex-col gap-6 relative overflow-hidden min-h-125 animate-in fade-in duration-300">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-3 relative z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 15.75v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 15.75c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m1.125 1.125h7.5" />
            </svg>
            {t.moviesTitle || "Movies"}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {t.moviesSubtitle || "Explore and discover films"}
          </p>
        </div>
        
        <button 
          onClick={() => setShowCommunity(!showCommunity)}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all group border border-transparent hover:border-white/10 shrink-0 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:text-red-400 transition-colors">
            {showCommunity ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            )}
            {showCommunity ? null : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            )}
          </svg>
          {showCommunity ? (t.hideCommunity || "Hide Community") : (t.showCommunity || "Show Community")}
        </button>
      </div>

      {/* Search Input Section */}
      <div className="relative z-10 w-full max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <svg
              className="w-4 h-4 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder || "Search movies..."}
            className="w-full bg-neutral-950/40 border border-white/10 focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 rounded-full pl-10 pr-9 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Movies Content Section */}
      {loading ? (
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="w-3 h-3 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
            <p>{t.loadingMovies || "Searching video databases..."}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-neutral-800/20 rounded-xl border border-white/5 animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-2">
                  <div className="h-3 bg-neutral-700/50 rounded w-1/3" />
                  <div className="h-4 bg-neutral-700/50 rounded w-3/4" />
                  <div className="flex justify-between mt-1">
                    <div className="h-3 bg-neutral-700/50 rounded w-1/4" />
                    <div className="h-3 bg-neutral-700/50 rounded w-1/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="relative z-10 py-16 flex flex-col items-center justify-center text-center">
          <svg
            className="w-12 h-12 text-red-500/80 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-neutral-400 text-sm font-semibold max-w-sm">
            {t.errorLoadingMovies || "An error occurred while loading video databases."}
          </p>
        </div>
      ) : movies.length === 0 ? (
        <div className="relative z-10 py-16 flex flex-col items-center justify-center text-center">
          <svg
            className="w-12 h-12 text-neutral-600 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-neutral-400 text-sm font-semibold">{t.noMoviesFound || "No films found matching search query."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 relative z-10 pt-2">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  )
}
