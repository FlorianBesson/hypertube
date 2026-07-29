import type { Movie } from '../../../types/movie'

interface TmdbMovie {
  id: number
  title?: string
  original_title?: string
  overview?: string
  release_date?: string
  poster_path?: string | null
  vote_average?: number
  genre_ids?: number[]
}

interface TmdbSearchResponse {
  results?: TmdbMovie[]
}

interface EnrichmentOptions {
  apiKey?: string
  lang: 'en' | 'fr'
  concurrency?: number
  signal?: AbortSignal
}

const tmdbMatchCache = new Map<string, Promise<TmdbMovie | null>>()

const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
}

function normalizeTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:full movie|feature film|movie|film)\b/g, ' ')
    .replace(/\b(?:18|19|20)\d{2}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeTitle(left)
  const normalizedRight = normalizeTitle(right)

  if (!normalizedLeft || !normalizedRight) return 0
  if (normalizedLeft === normalizedRight) return 1

  const leftTokens = new Set(normalizedLeft.split(' '))
  const rightTokens = new Set(normalizedRight.split(' '))
  const commonTokens = [...leftTokens].filter(token => rightTokens.has(token)).length
  const allTokens = new Set([...leftTokens, ...rightTokens]).size

  return allTokens === 0 ? 0 : commonTokens / allTokens
}

function parseYear(value: string | number): number | null {
  const match = String(value).match(/\b(?:18|19|20)\d{2}\b/)
  return match ? Number(match[0]) : null
}

function matchScore(movie: Movie, candidate: TmdbMovie): number {
  const titleScore = Math.max(
    titleSimilarity(movie.title, candidate.title || ''),
    titleSimilarity(movie.title, candidate.original_title || '')
  )
  const archiveYear = parseYear(movie.year)
  const tmdbYear = parseYear(candidate.release_date || '')

  if (!archiveYear || !tmdbYear) return titleScore

  const difference = Math.abs(archiveYear - tmdbYear)
  if (difference === 0) return titleScore + 0.25
  if (difference === 1) return titleScore + 0.1
  if (difference > 2) return titleScore - 0.5
  return titleScore
}

async function searchTmdb(
  movie: Movie,
  apiKey: string,
  language: string,
  signal?: AbortSignal
): Promise<TmdbMovie[]> {
  const search = async (includeYear: boolean): Promise<TmdbMovie[]> => {
    const params = new URLSearchParams({
      api_key: apiKey,
      query: movie.title,
      include_adult: 'false',
      language,
      page: '1'
    })
    const year = parseYear(movie.year)
    if (includeYear && year) {
      params.set('primary_release_year', year.toString())
    }

    const response = await fetch(`https://api.themoviedb.org/3/search/movie?${params.toString()}`, {
      signal
    })
    if (!response.ok) {
      throw new Error(`TMDb returned ${response.status}`)
    }

    const data = await response.json() as TmdbSearchResponse
    return data.results || []
  }

  const resultsWithYear = await search(true)
  return resultsWithYear.length > 0 ? resultsWithYear : search(false)
}

async function findTmdbMatch(
  movie: Movie,
  apiKey: string,
  language: string,
  signal?: AbortSignal
): Promise<TmdbMovie | null> {
  const cacheKey = `${language}|${normalizeTitle(movie.title)}|${parseYear(movie.year) || ''}`
  const cached = tmdbMatchCache.get(cacheKey)
  if (cached) return cached

  const matchPromise = searchTmdb(movie, apiKey, language, signal)
    .then(results => {
      const ranked = results
        .map(candidate => ({ candidate, score: matchScore(movie, candidate) }))
        .sort((left, right) => right.score - left.score)

      return ranked[0] && ranked[0].score >= 0.5 ? ranked[0].candidate : null
    })
    .catch(error => {
      tmdbMatchCache.delete(cacheKey)
      throw error
    })

  tmdbMatchCache.set(cacheKey, matchPromise)
  return matchPromise
}

function mergeTmdbMatch(movie: Movie, match: TmdbMovie | null): Movie {
  if (!match) return movie

  const genres = (match.genre_ids || [])
    .map(genreId => TMDB_GENRES[genreId])
    .filter((genre): genre is string => Boolean(genre))

  return {
    ...movie,
    title: match.title || match.original_title || movie.title,
    genre: genres.join(', ') || movie.genre,
    year: match.release_date?.slice(0, 4) || movie.year,
    rating: match.vote_average || movie.rating,
    image: match.poster_path
      ? `https://image.tmdb.org/t/p/w500${match.poster_path}`
      : movie.image,
    description: match.overview || movie.description,
    source: 'Internet Archive',
    tmdbId: match.id
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(values[index])
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), values.length) },
    () => worker()
  )
  await Promise.all(workers)
  return results
}

export async function enrichInternetArchiveMoviesWithTmdb(
  movies: Movie[],
  { apiKey, lang, concurrency = 4, signal }: EnrichmentOptions
): Promise<Movie[]> {
  if (!apiKey) {
    throw new Error('VITE_TMDB_API_KEY is not configured')
  }
  if (movies.length === 0) return movies

  const language = lang === 'fr' ? 'fr-FR' : 'en-US'
  const matchedMovies = await mapWithConcurrency(movies, concurrency, async movie => {
    try {
      const match = await findTmdbMatch(movie, apiKey, language, signal)
      return match ? mergeTmdbMatch(movie, match) : null
    } catch (error) {
      if (signal?.aborted) throw error
      console.warn(`TMDb enrichment failed for "${movie.title}"`, error)
      return null
    }
  })

  return matchedMovies.filter((movie): movie is Movie => movie !== null)
}
