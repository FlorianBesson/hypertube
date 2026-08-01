import { useState, useRef, useEffect, useMemo } from 'react'
import type { TranslationType } from '../../../locales/translations'
import type { Movie } from '../../../types/movie'
import MovieDetailsModal from './MovieDetailsModal'
import MovieCard from './MovieCard'
import MovieToolbar from './MovieToolbar'
import StatusMessage from './StatusMessage'
import { useWatchedMovies } from '../../../hooks/useWatchedMovies'
import { useMovieCatalog } from '../../../hooks/useMovieCatalog'
import { filterMovies } from '../../../utils/movieFilters'

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
    selectedSource,
    setSelectedSource,
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
    selectedLanguage,
    setSelectedLanguage,
    watchedFilter,
    setWatchedFilter,
    page,
    setPage,
    hasMore
  } = useMovieCatalog({ lang })

  // Changing any filter/sort criteria restarts pagination from page 1
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

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

  // Sorting stays server-side (each fetched batch arrives sorted, and changing
  // the sort refetches from page 1) so newly loaded pages append to the grid
  // instead of being reshuffled into the already-displayed movies.
  const displayedMovies = useMemo(() => filterMovies(movies, {
    watchedMovies,
    watchedFilter,
    selectedGenre,
    selectedMinRating,
    selectedLanguage
  }), [movies, watchedMovies, watchedFilter, selectedGenre, selectedMinRating, selectedLanguage])

  return (
    <div className="flex-1 bg-neutral-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md w-full flex flex-col gap-6 relative overflow-hidden min-h-125 animate-in fade-in duration-300">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      {/* Toolbar (Search & Filters) */}
      <MovieToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSource={selectedSource}
        onSourceChange={withPageReset(setSelectedSource)}
        selectedGenre={selectedGenre}
        onGenreChange={withPageReset(setSelectedGenre)}
        selectedMinRating={selectedMinRating}
        onMinRatingChange={withPageReset(setSelectedMinRating)}
        selectedLanguage={selectedLanguage}
        onLanguageChange={withPageReset(setSelectedLanguage)}
        watchedFilter={watchedFilter}
        onWatchedFilterChange={withPageReset(setWatchedFilter)}
        sortBy={sortBy}
        onSortByChange={withPageReset(setSortBy)}
        order={order}
        onOrderToggle={() => {
          setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
          setPage(1)
        }}
        showCommunity={showCommunity}
        onToggleCommunity={() => setShowCommunity(!showCommunity)}
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
        <StatusMessage
          icon={
            <svg className="w-12 h-12 text-red-500/80 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
            </svg>
          }
          message={t.errorLoadingMovies || 'An error occurred while loading video databases.'}
        />
      ) : displayedMovies.length === 0 ? (
        <StatusMessage
          icon={
            <svg className="w-12 h-12 text-neutral-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          }
          message={t.noMoviesFound || 'No films found matching search query.'}
        />
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
          lang={lang}
        />
      )}
    </div>
  )
}
