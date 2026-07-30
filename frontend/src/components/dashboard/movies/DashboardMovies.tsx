import { useState, useRef, useEffect, useMemo } from 'react'
import type { TranslationType } from '../../../locales/translations'
import type { Movie } from '../../../types/movie'
import MovieDetailsModal from './MovieDetailsModal'
import MovieCard from './MovieCard'
import MovieToolbar from './MovieToolbar'
import { useWatchedMovies } from '../../../hooks/useWatchedMovies'
import { useInternetArchiveMovies } from '../../../hooks/useInternetArchiveMovies'

export type { Movie, Torrent } from '../../../types/movie'

export interface DashboardMoviesProps {
  t: TranslationType['dashboard']
  lang: 'en' | 'fr'
  showCommunity: boolean
  setShowCommunity: (val: boolean) => void
}

export default function DashboardMovies({ t, lang, showCommunity, setShowCommunity }: DashboardMoviesProps) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const observerTarget = useRef<HTMLDivElement>(null)

  const { watchedMovies } = useWatchedMovies()
  const {
    searchQuery,
    setSearchQuery,
    movies,
    loading,
    loadingMore,
    error,
    sortBy,
    setSortBy,
    order,
    setOrder,
    selectedGenre,
    setSelectedGenre,
    selectedMinRating,
    setSelectedMinRating,
    watchedFilter,
    setWatchedFilter,
    page,
    setPage,
    hasMore
  } = useInternetArchiveMovies({ lang })

  // IntersectionObserver for infinite scroll
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
  }, [observerTarget, hasMore, loading, loadingMore, setPage])

  // Client-side filtering & sorting
  const displayedMovies = useMemo(() => {
    return movies
      .filter(movie => {
        const isWatched = watchedMovies.includes(movie.id)
        if (watchedFilter === 'watched' && !isWatched) return false
        if (watchedFilter === 'unwatched' && isWatched) return false

        if (selectedGenre) {
          const movieGenreLower = (movie.genre || '').toLowerCase()
          if (!movieGenreLower.includes(selectedGenre.toLowerCase())) {
            return false
          }
        }

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
  }, [movies, watchedMovies, watchedFilter, selectedGenre, selectedMinRating, sortBy, order])

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

      {/* Toolbar (Search & Filters) */}
      <MovieToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGenre={selectedGenre}
        onGenreChange={(g) => {
          setSelectedGenre(g)
          setPage(1)
        }}
        selectedMinRating={selectedMinRating}
        onMinRatingChange={(r) => {
          setSelectedMinRating(r)
          setPage(1)
        }}
        watchedFilter={watchedFilter}
        onWatchedFilterChange={(f) => {
          setWatchedFilter(f)
          setPage(1)
        }}
        sortBy={sortBy}
        onSortByChange={(s) => {
          setSortBy(s)
          setPage(1)
        }}
        order={order}
        onOrderToggle={() => {
          setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
          setPage(1)
        }}
        t={t}
      />

      {/* Movies Grid / Content Section */}
      {loading && page === 1 ? (
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="w-3 h-3 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
            <p>{t.loadingMovies || "Searching video databases..."}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-2/3 bg-neutral-800/20 rounded-xl border border-white/5 animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
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
                onSelectMovie={(m) => setSelectedMovie(m)}
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

      {/* Render Movie Details Modal when a movie is selected */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          t={t}
        />
      )}
    </div>
  )
}
