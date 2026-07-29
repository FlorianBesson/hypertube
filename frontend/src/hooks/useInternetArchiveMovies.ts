import { useState, useEffect } from 'react'
import type { Movie } from '../types/movie'
import type { MovieSourceId, SortByOption, SortOrder, WatchedFilterOption } from '../services/sources/types'
import { movieSourceAggregator } from '../services/sources/movieSourceAggregator'

export type { SortByOption, SortOrder, WatchedFilterOption, MovieSourceId }

export interface UseInternetArchiveMoviesProps {
  lang: 'en' | 'fr'
}

export function useInternetArchiveMovies({ lang }: UseInternetArchiveMoviesProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  // Source selection state ('all' | 'archive' | 'publicdomain_torrents')
  const [selectedSource, setSelectedSource] = useState<MovieSourceId>('all')

  // Sort and Filter States
  const [sortBy, setSortBy] = useState<SortByOption>('download_count')
  const [order, setOrder] = useState<SortOrder>('desc')
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [selectedMinRating, setSelectedMinRating] = useState<number>(0)
  const [watchedFilter, setWatchedFilter] = useState<WatchedFilterOption>('all')

  // Pagination states
  const [page, setPage] = useState<number>(1)
  const [hasMore, setHasMore] = useState<boolean>(true)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      const queryStr = searchQuery.trim()
      setDebouncedQuery(queryStr)
      setPage(1)

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

  // Fetch movies via clean MovieSourceAggregator
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
        const fetchedMovies = await movieSourceAggregator.fetchMovies(
          selectedSource,
          {
            query: debouncedQuery.trim(),
            genre: selectedGenre,
            minRating: selectedMinRating,
            sortBy,
            order,
            page,
            limit: 20,
            lang,
            signal: controller.signal
          },
          import.meta.env.VITE_TMDB_API_KEY
        )

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

          setHasMore(fetchedMovies.length >= 10)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('[useMovies] Source aggregator fetch error:', err)
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
  }, [debouncedQuery, selectedSource, sortBy, order, selectedGenre, selectedMinRating, page, lang])

  return {
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
    watchedFilter,
    setWatchedFilter,
    page,
    setPage,
    hasMore
  }
}
