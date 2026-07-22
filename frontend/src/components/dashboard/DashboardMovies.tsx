import { useState, useEffect, useRef } from 'react'
import type { TranslationType } from '../../locales/translations'

interface Movie {
  id: string
  title: string
  genre: string
  year: string | number
  rating: number
  image: string
  source?: string
}

interface YtsRawMovie {
  id: number | string
  title: string
  genres?: string[]
  year: number | string
  rating?: number
  medium_cover_image?: string
}

interface PopcornRawMovie {
  _id?: string
  imdb_id?: string
  title: string
  year?: string | number
  rating?: { percentage?: number } | number
  genres?: string[]
  images?: {
    poster?: string
    fanart?: string
  }
}

interface MovieCardProps {
  movie: Movie
  isWatched: boolean
  onToggleWatch: (movieId: string, e: React.MouseEvent) => void
  t: TranslationType['dashboard']
}

interface DashboardMoviesProps {
  t: TranslationType['dashboard']
  showCommunity: boolean
  setShowCommunity: (val: boolean) => void
}

function MovieCard({ movie, isWatched, onToggleWatch, t }: MovieCardProps) {
  const [imageError, setImageError] = useState(false)

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
      onClick={(e) => onToggleWatch(movie.id, e)}
      className={`group relative aspect-[2/3] rounded-xl border overflow-hidden bg-neutral-900 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(220,38,38,0.12)] cursor-pointer ${
        isWatched 
          ? 'border-emerald-500/20 opacity-60 hover:opacity-85' 
          : 'border-white/5 hover:border-red-600/30'
      }`}
    >
      {/* Movie Poster Image */}
      <div className="absolute inset-0 bg-neutral-900">
        {!imageError && movie.image ? (
          <img
            src={movie.image}
            alt={movie.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500"
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

      {/* Watched Status Tag or Source Tag */}
      {isWatched ? (
        <div className="absolute top-2 left-2 z-20">
          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider shadow-md bg-emerald-600/90 text-white border border-emerald-500/30 flex items-center gap-1 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
              className="w-3.5 h-3.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {t.watchedBadge || "Watched"}
          </span>
        </div>
      ) : movie.source ? (
        <div className="absolute top-2 left-2 z-20">
          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider shadow-md bg-black/70 text-neutral-300 border border-white/10 backdrop-blur-md">
            {movie.source}
          </span>
        </div>
      ) : null}

      {/* Manual Watch Toggle Button on top right */}
      <button
        onClick={(e) => onToggleWatch(movie.id, e)}
        className={`absolute top-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center shadow-md border cursor-pointer transition-all duration-300 active:scale-90 opacity-0 group-hover:opacity-100 ${
          isWatched 
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/40' 
            : 'bg-black/60 hover:bg-black/80 text-neutral-400 hover:text-white border-white/10'
        }`}
        title={isWatched ? "Mark as unwatched" : "Mark as watched"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-4 h-4"
        >
          {isWatched ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          )}
        </svg>
      </button>

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
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  // Sort and Filter States
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'rating' | 'download_count'>('download_count')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [selectedMinRating, setSelectedMinRating] = useState<number>(0)
  const [watchedFilter, setWatchedFilter] = useState<'all' | 'watched' | 'unwatched'>('all')

  // Pagination states
  const [page, setPage] = useState<number>(1)
  const [hasMore, setHasMore] = useState<boolean>(true)

  // Watched movies tracker
  const [watchedMovies, setWatchedMovies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('watchedMovies')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const observerTarget = useRef<HTMLDivElement>(null)

  // Debounce search input and set search-related page/sort values inside the async callback
  useEffect(() => {
    const handler = setTimeout(() => {
      const queryStr = searchQuery.trim()
      setDebouncedQuery(queryStr)
      setPage(1)

      // Adjust default sorting based on search presence
      if (queryStr !== '') {
        setSortBy('title')
        setOrder('asc')
      } else {
        setSortBy('download_count')
        setOrder('desc')
      }
    }, 450)

    return () => {
      clearTimeout(handler)
    }
  }, [searchQuery])

  // Fetch movies from multiple external sources (YTS + Popcorn Time / Archive.org)
  useEffect(() => {
    let isMounted = true

    const fetchVideos = async () => {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(false)

      try {
        const queryStr = debouncedQuery.trim()

        // 1. Fetch YTS (External Source #1)
        const fetchYts = async (): Promise<Movie[]> => {
          const params = new URLSearchParams()
          params.append('limit', '20')
          params.append('page', page.toString())
          params.append('sort_by', sortBy)
          params.append('order_by', order)

          if (queryStr) params.append('query_term', queryStr)
          if (selectedGenre) params.append('genre', selectedGenre)
          if (selectedMinRating > 0) params.append('minimum_rating', selectedMinRating.toString())

          const ytsUrl = `https://movies-api.accel.li/api/v2/list_movies.json?${params.toString()}`
          const response = await fetch(ytsUrl)
          if (!response.ok) return []

          const ytsData = await response.json()
          if (!ytsData?.data?.movies) return []

          return ytsData.data.movies.map((m: YtsRawMovie) => ({
            id: `yts-${m.id}`,
            title: m.title,
            genre: m.genres && m.genres.length > 0 ? m.genres.join(', ') : 'Movie',
            year: m.year,
            rating: m.rating || 0,
            image: m.medium_cover_image || '',
            source: 'YTS'
          }))
        }

        // 2. Fetch Popcorn API (External Source #2)
        const fetchPopcorn = async (): Promise<Movie[]> => {
          try {
            const popcornUrl = queryStr
              ? `https://pop-api.vercel.app/movies/${page}?keywords=${encodeURIComponent(queryStr)}`
              : `https://pop-api.vercel.app/movies/${page}?sort=seeds`

            const response = await fetch(popcornUrl)
            if (!response.ok) return await fetchArchiveOrg()

            const data = await response.json()
            if (!Array.isArray(data)) return await fetchArchiveOrg()

            let filtered = data
            if (selectedGenre) {
              filtered = filtered.filter((m: PopcornRawMovie) =>
                m.genres?.some(g => g.toLowerCase().includes(selectedGenre.toLowerCase()))
              )
            }

            return filtered.map((m: PopcornRawMovie) => {
              const numRating = typeof m.rating === 'object'
                ? ((m.rating?.percentage || 0) / 10)
                : (Number(m.rating) || 0)

              return {
                id: `popcorn-${m._id || m.imdb_id || m.title}`,
                title: m.title,
                genre: m.genres && m.genres.length > 0 ? m.genres.join(', ') : 'Movie',
                year: m.year || 'N/A',
                rating: Math.min(10, Math.max(0, numRating)),
                image: m.images?.poster || m.images?.fanart || '',
                source: 'Popcorn API'
              }
            }).filter((m: Movie) => selectedMinRating === 0 || m.rating >= selectedMinRating)
          } catch {
            return await fetchArchiveOrg()
          }
        }

        // 3. Fallback Source #2: Archive.org Movies API
        const fetchArchiveOrg = async (): Promise<Movie[]> => {
          try {
            let queryParam = queryStr
              ? ` AND title:(${encodeURIComponent(queryStr)})`
              : ''
            if (selectedGenre) {
              queryParam += ` AND (title:(${encodeURIComponent(selectedGenre)}) OR subject:(${encodeURIComponent(selectedGenre)}))`
            }
            const archiveUrl = `https://archive.org/advancedsearch.php?q=mediatype:movies${queryParam}&fl[]=identifier,title,year,downloads&sort[]=downloads+desc&rows=20&page=${page}&output=json`

            const response = await fetch(archiveUrl)
            if (!response.ok) return []

            const data = await response.json()
            const docs = data?.response?.docs || []

            return docs.map((doc: { identifier: string; title: string; year?: string; downloads?: number }) => ({
              id: `archive-${doc.identifier}`,
              title: doc.title,
              genre: selectedGenre ? selectedGenre : 'Classic',
              year: doc.year || 'N/A',
              rating: Math.min(9.9, Math.round(((doc.downloads || 500) / 500) * 10) / 10),
              image: `https://archive.org/services/img/${doc.identifier}`,
              source: 'Archive.org'
            }))
          } catch {
            return []
          }
        }

        // Execute both external sources in parallel
        const [ytsResult, popcornResult] = await Promise.allSettled([
          fetchYts(),
          fetchPopcorn()
        ])

        const ytsList = ytsResult.status === 'fulfilled' ? ytsResult.value : []
        const popcornList = popcornResult.status === 'fulfilled' ? popcornResult.value : []

        // Interleave & merge both sources for balanced presentation
        const merged: Movie[] = []
        const maxLen = Math.max(ytsList.length, popcornList.length)
        for (let i = 0; i < maxLen; i++) {
          if (i < ytsList.length) merged.push(ytsList[i])
          if (i < popcornList.length) merged.push(popcornList[i])
        }

        // Deduplicate movies by normalized title
        const seenTitles = new Set<string>()
        const fetchedMovies: Movie[] = []
        for (const movie of merged) {
          const normTitle = movie.title.toLowerCase().trim()
          if (!seenTitles.has(normTitle)) {
            seenTitles.add(normTitle)
            fetchedMovies.push(movie)
          }
        }

        if (isMounted) {
          if (page === 1) {
            setMovies(fetchedMovies)
          } else {
            setMovies(prev => {
              const existingIds = new Set(prev.map(item => item.id))
              const uniqueNew = fetchedMovies.filter(item => !existingIds.has(item.id))
              return [...prev, ...uniqueNew]
            })
          }

          if (fetchedMovies.length === 0) {
            setHasMore(false)
          } else {
            setHasMore(true)
          }
        }
      } catch (err) {
        console.error("Fetch external video sources error:", err)
        if (isMounted) {
          setError(true)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    }

    fetchVideos()

    return () => {
      isMounted = false
    }
  }, [debouncedQuery, sortBy, order, selectedGenre, selectedMinRating, page])

  // Set up IntersectionObserver for infinite scrolling
  useEffect(() => {
    const target = observerTarget.current
    if (!target || !hasMore || loading || loadingMore) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setPage(prev => prev + 1)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(target)

    return () => {
      if (target) {
        observer.unobserve(target)
      }
    }
  }, [observerTarget, hasMore, loading, loadingMore])

  // Watch toggle handler (marks as watched in localStorage)
  const handleToggleWatch = (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setWatchedMovies(prev => {
      let updated: string[]
      if (prev.includes(movieId)) {
        updated = prev.filter(id => id !== movieId)
      } else {
        updated = [...prev, movieId]
      }
      localStorage.setItem('watchedMovies', JSON.stringify(updated))
      return updated
    })
  }

  // Client-side filtering & sorting for genre, rating, watched status, and order
  const displayedMovies = movies
    .filter(movie => {
      // Watched status filter
      const isWatched = watchedMovies.includes(movie.id)
      if (watchedFilter === 'watched' && !isWatched) return false
      if (watchedFilter === 'unwatched' && isWatched) return false

      // Genre filter
      if (selectedGenre) {
        const movieGenreLower = (movie.genre || '').toLowerCase()
        if (!movieGenreLower.includes(selectedGenre.toLowerCase())) {
          return false
        }
      }

      // Minimum rating filter
      if (selectedMinRating > 0 && movie.rating < selectedMinRating) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title)
      } else if (sortBy === 'year') {
        const yearA = typeof a.year === 'number' ? a.year : parseInt(String(a.year)) || 0
        const yearB = typeof b.year === 'number' ? b.year : parseInt(String(b.year)) || 0
        comparison = yearA - yearB
      } else if (sortBy === 'rating') {
        comparison = a.rating - b.rating
      }
      return order === 'asc' ? comparison : -comparison
    })

  return (
    <div className="flex-1 bg-neutral-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md w-full flex flex-col gap-6 relative overflow-hidden min-h-125 animate-in fade-in duration-300">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Dashboard Title Header */}
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

      {/* Filters and Sort Toolbar */}
      <div className="relative z-10 w-full flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Genre Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.genreLabel || "Genre"}</span>
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value)
                setPage(1)
              }}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer min-w-32"
            >
              <option value="">{t.allGenres || "All Genres"}</option>
              <option value="action">Action</option>
              <option value="adventure">Adventure</option>
              <option value="animation">Animation</option>
              <option value="comedy">Comedy</option>
              <option value="crime">Crime</option>
              <option value="documentary">Documentary</option>
              <option value="drama">Drama</option>
              <option value="family">Family</option>
              <option value="fantasy">Fantasy</option>
              <option value="history">History</option>
              <option value="horror">Horror</option>
              <option value="mystery">Mystery</option>
              <option value="romance">Romance</option>
              <option value="sci-fi">Sci-Fi</option>
              <option value="thriller">Thriller</option>
            </select>
          </div>

          {/* Min Rating Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.ratingLabel || "Min Rating"}</span>
            <select
              value={selectedMinRating}
              onChange={(e) => {
                setSelectedMinRating(Number(e.target.value))
                setPage(1)
              }}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer min-w-28"
            >
              <option value="0">{t.anyRating || "Any Rating"}</option>
              <option value="5">5+</option>
              <option value="6">6+</option>
              <option value="7">7+</option>
              <option value="8">8+</option>
              <option value="9">9+</option>
            </select>
          </div>

          {/* Watched Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.watchedLabel || "Status"}</span>
            <select
              value={watchedFilter}
              onChange={(e) => {
                setWatchedFilter(e.target.value as 'all' | 'watched' | 'unwatched')
                setPage(1)
              }}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer min-w-28"
            >
              <option value="all">{t.statusAll || "All movies"}</option>
              <option value="watched">{t.statusWatched || "Watched"}</option>
              <option value="unwatched">{t.statusUnwatched || "Unwatched"}</option>
            </select>
          </div>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.sortBy || "Sort by"}</span>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'title' | 'year' | 'rating' | 'download_count')
                  setPage(1)
                }}
                className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer min-w-36 flex-1 sm:flex-none"
              >
                <option value="download_count">{t.sortPopularity || "Popularity"}</option>
                <option value="title">{t.sortTitle || "Title (A-Z)"}</option>
                <option value="year">{t.sortYear || "Year"}</option>
                <option value="rating">{t.sortRating || "Rating"}</option>
              </select>
              
              <button
                onClick={() => {
                  setOrder(prev => prev === 'asc' ? 'desc' : 'asc')
                  setPage(1)
                }}
                className="border border-white/10 hover:border-red-500/50 bg-neutral-950 hover:bg-neutral-900 rounded-lg p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                title={order === 'asc' ? 'Ascending' : 'Descending'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`w-4 h-4 transition-transform duration-300 ${order === 'asc' ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Movies Grid / Content Section */}
      {loading && page === 1 ? (
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
      ) : displayedMovies.length === 0 ? (
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 relative z-10 pt-2">
            {displayedMovies.map((movie) => (
              <MovieCard 
                key={movie.id} 
                movie={movie} 
                isWatched={watchedMovies.includes(movie.id)}
                onToggleWatch={handleToggleWatch}
                t={t}
              />
            ))}
          </div>

          {/* Target for infinite scroll observer */}
          {hasMore && (
            <div ref={observerTarget} className="h-14 w-full flex items-center justify-center relative z-10 mt-4">
              {loadingMore && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className="w-3.5 h-3.5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                  <p>{t.loadingMore || "Loading more movies..."}</p>
                </div>
              )}
            </div>
          )}
          
          {!hasMore && (
            <div className="w-full text-center py-6 text-xs text-neutral-500 relative z-10 border-t border-white/5 mt-6">
              {t.noMoreMovies || "No more movies to load"}
            </div>
          )}
        </>
      )}
    </div>
  )
}
