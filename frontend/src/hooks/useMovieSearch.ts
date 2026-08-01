import { useEffect, useRef, useState } from 'react'
import type { Movie } from '../types/movie'
import type { MovieSourceId, SortByOption, SortOrder } from '../services/sources/types'
import { movieSourceAggregator } from '../services/sources/movieSourceAggregator'

const SEARCH_DEBOUNCE_MS = 450
const SOURCE_PAGE_SIZE_ALL_SOURCES = 10
const SOURCE_PAGE_SIZE_SINGLE_SOURCE = 20
const MOVIES_PER_PAGE = 20

export interface UseMovieSearchParams {
  lang: 'en' | 'fr'
  selectedSource: MovieSourceId
  selectedGenre: string
  selectedMinRating: number
  selectedLanguage: string
  sortBy: SortByOption
  setSortBy: (value: SortByOption) => void
  order: SortOrder
  setOrder: (value: SortOrder) => void
}

/** Search query, debouncing, pagination and fetching against the movie source aggregator. */
export function useMovieSearch({
  lang,
  selectedSource,
  selectedGenre,
  selectedMinRating,
  selectedLanguage,
  sortBy,
  setSortBy,
  order,
  setOrder
}: UseMovieSearchParams) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Provider-side page cursor: one catalog page can consume several source
  // pages, since TMDB/public-domain filtering drops a large share of results.
  const sourcePageRef = useRef(1)

  // Always holds the latest sortBy/order, read (not depended upon) by the
  // debounce effect below so it can snapshot "the sort before this search"
  // without retriggering on every sort change.
  const latestSortRef = useRef({ sortBy, order })
  useEffect(() => {
    latestSortRef.current = { sortBy, order }
  }, [sortBy, order])

  // While a search is active, results are force-sorted by title (A-Z); the
  // sort in effect just before the search started is restored once the
  // query is cleared, so search-driven filtering doesn't require the user
  // to manually swap sortBy/order back to their preference afterwards.
  const sortBeforeSearchRef = useRef<{ sortBy: SortByOption; order: SortOrder } | null>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      const queryStr = searchQuery.trim()
      setDebouncedQuery(queryStr)
      setPage(1)

      if (queryStr !== '') {
        if (!sortBeforeSearchRef.current) {
          sortBeforeSearchRef.current = latestSortRef.current
        }
        setSortBy('title')
        setOrder('asc')
      } else if (sortBeforeSearchRef.current) {
        setSortBy(sortBeforeSearchRef.current.sortBy)
        setOrder(sortBeforeSearchRef.current.order)
        sortBeforeSearchRef.current = null
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(handler)
  }, [searchQuery, setSortBy, setOrder])

  // Fetch movies via the clean MovieSourceAggregator
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchVideos = async () => {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(false)

      try {
        const limit = selectedSource === 'all' ? SOURCE_PAGE_SIZE_ALL_SOURCES : SOURCE_PAGE_SIZE_SINGLE_SOURCE
        if (page === 1) {
          sourcePageRef.current = 1
        }

        const result = await movieSourceAggregator.fetchMovies(
          selectedSource,
          {
            query: debouncedQuery.trim(),
            genre: selectedGenre,
            minRating: selectedMinRating,
            movieLanguage: selectedLanguage,
            sortBy,
            order,
            page: sourcePageRef.current,
            limit,
            lang,
            signal: controller.signal
          },
          { tmdbApiKey: import.meta.env.VITE_TMDB_API_KEY, targetCount: MOVIES_PER_PAGE }
        )

        if (isMounted) {
          sourcePageRef.current = result.nextPage

          if (page === 1) {
            setMovies(result.movies)
          } else {
            setMovies(prev => {
              const existingTmdbIds = new Set(prev.map(item => item.tmdbId))
              const uniqueNew = result.movies.filter(item => !existingTmdbIds.has(item.tmdbId))
              return [...prev, ...uniqueNew]
            })
          }

          setHasMore(!result.exhausted)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('[useMovieSearch] Source aggregator fetch error:', err)
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
      controller.abort()
    }
  }, [debouncedQuery, selectedSource, sortBy, order, selectedGenre, selectedMinRating, selectedLanguage, page, lang])

  return {
    searchQuery,
    setSearchQuery,
    movies,
    loading,
    loadingMore,
    error,
    page,
    setPage,
    hasMore
  }
}
