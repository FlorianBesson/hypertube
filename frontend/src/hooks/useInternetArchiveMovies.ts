import { useState, useEffect } from 'react'
import type { Movie, InternetArchiveSearchResponse } from '../types/movie'
import { enrichInternetArchiveMoviesWithTmdb } from '../components/dashboard/internetArchiveTmdb'
import {
  INTERNET_ARCHIVE_BASE_QUERY,
  INTERNET_ARCHIVE_PAGE_SIZE,
  escapeInternetArchiveQuery,
  isLikelyMovie,
  metadataText,
  metadataValues,
  metadataYear
} from '../utils/internetArchiveUtils'

export type SortByOption = 'title' | 'year' | 'rating' | 'download_count'
export type SortOrder = 'asc' | 'desc'
export type WatchedFilterOption = 'all' | 'watched' | 'unwatched'

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

  // Fetch movies from Internet Archive
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
        const queryStr = debouncedQuery.trim()
        const queryParts = [...INTERNET_ARCHIVE_BASE_QUERY]

        if (queryStr) {
          queryParts.push(`(${escapeInternetArchiveQuery(queryStr)})`)
        }

        if (selectedGenre) {
          queryParts.push(`subject:"${escapeInternetArchiveQuery(selectedGenre)}"`)
        }

        if (selectedMinRating > 0) {
          queryParts.push(`avg_rating:[${selectedMinRating / 2} TO *]`)
        }

        const sortField = {
          download_count: 'downloads',
          title: 'titleSorter',
          year: 'date',
          rating: 'avg_rating'
        }[sortBy]

        const FETCH_ROWS = 35

        const params = new URLSearchParams({
          q: queryParts.join(' AND '),
          rows: FETCH_ROWS.toString(),
          page: page.toString(),
          output: 'json'
        })
        params.append('sort[]', `${sortField} ${order}`)
        const fields = [
          'identifier',
          'title',
          'description',
          'creator',
          'date',
          'year',
          'subject',
          'language',
          'downloads',
          'avg_rating'
        ]
        fields.forEach(field => params.append('fl[]', field))

        const response = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`, {
          signal: controller.signal
        })
        if (!response.ok) {
          throw new Error(`Internet Archive returned ${response.status}`)
        }

        const data = await response.json() as InternetArchiveSearchResponse
        const rawDocs = data.response?.docs || []

        const docs = rawDocs.filter(isLikelyMovie)

        const archiveMovies: Movie[] = docs.map(movie => ({
          id: movie.identifier,
          title: metadataText(movie.title) || movie.identifier,
          genre: metadataValues(movie.subject).slice(0, 3).join(', ') || 'Movie',
          year: metadataYear(movie),
          rating: Math.min(10, Math.max(0, Number(movie.avg_rating || 0) * 2)),
          image: `https://archive.org/services/img/${encodeURIComponent(movie.identifier)}`,
          source: 'Internet Archive',
          description: metadataText(movie.description),
          creator: metadataText(movie.creator),
          language: metadataText(movie.language),
          downloads: Number(movie.downloads || 0),
          torrentUrl: `https://archive.org/download/${encodeURIComponent(movie.identifier)}/${encodeURIComponent(movie.identifier)}_archive.torrent`,
          detailsUrl: `https://archive.org/details/${encodeURIComponent(movie.identifier)}`
        }))

        const enrichedMovies = await enrichInternetArchiveMoviesWithTmdb(archiveMovies, {
          apiKey: import.meta.env.VITE_TMDB_API_KEY,
          lang,
          concurrency: 4,
          signal: controller.signal
        })

        const fetchedMovies = enrichedMovies.slice(0, INTERNET_ARCHIVE_PAGE_SIZE)

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

          const start = data.response?.start || 0
          const total = data.response?.numFound || 0
          setHasMore(start + rawDocs.length < Math.min(total, 10_000))
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Internet Archive catalog fetch error:', err)
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
  }, [debouncedQuery, sortBy, order, selectedGenre, selectedMinRating, page, lang])

  return {
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
  }
}
