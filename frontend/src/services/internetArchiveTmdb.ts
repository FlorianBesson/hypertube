import type { Movie } from '../types/movie'

interface TmdbMovie {
  id: number
  title?: string
  original_title?: string
  original_language?: string
  overview?: string
  release_date?: string
  poster_path?: string | null
  vote_average?: number
  genre_ids?: number[]
  imdb_id?: string
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

  if (archiveYear && tmdbYear) {
    const difference = Math.abs(archiveYear - tmdbYear)
    if (difference === 0) return titleScore + 0.25
    if (difference === 1) return titleScore + 0.1
    if (difference <= 3) return titleScore
    if (difference <= 6) return titleScore - 0.2
    return titleScore - 0.5
  }

  // If no year in source metadata, penalize modern releases (> 1980) to avoid false positive remakes
  if (tmdbYear && tmdbYear > 1980) {
    return titleScore - 0.6
  }

  return titleScore
}

export function cleanTitleForSearch(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:18|19|20)\d{2}\b/g, ' ')
    .replace(/\b(?:full movie|feature film|movie|film|hd|4k|1080p|720p|restored|public domain|mp4|avi)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractQuotedTitle(title: string): string | null {
  const match = title.match(/"([^"]+)"/)
  return match ? match[1].trim() : null
}

async function searchTmdb(
  movie: Movie,
  apiKey: string,
  language: string,
  signal?: AbortSignal
): Promise<TmdbMovie[]> {
  const cleanedQuery = cleanTitleForSearch(movie.title) || movie.title
  const quotedQuery = extractQuotedTitle(movie.title)

  const search = async (query: string, includeYear: boolean): Promise<TmdbMovie[]> => {
    const params = new URLSearchParams({
      api_key: apiKey,
      query,
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

  // Archive.org titles often wrap the real title in quotes and append hashtag/credit noise after it
  if (quotedQuery && quotedQuery !== cleanedQuery) {
    const quotedResults = await search(quotedQuery, true)
    if (quotedResults.length > 0) return quotedResults
    const quotedResultsNoYear = await search(quotedQuery, false)
    if (quotedResultsNoYear.length > 0) return quotedResultsNoYear
  }

  const resultsWithYear = await search(cleanedQuery, true)
  return resultsWithYear.length > 0 ? resultsWithYear : search(cleanedQuery, false)
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
    .then(async results => {
      const mYear = parseYear(movie.year)
      const ranked = results
        .map(candidate => ({ candidate, score: matchScore(movie, candidate) }))
        .filter(item => item.score >= 0.3)
        .sort((left, right) => {
          if (Math.abs(right.score - left.score) > 0.25) {
            return right.score - left.score
          }
          if (!mYear) {
            const yearLeft = parseYear(left.candidate.release_date || '') || 9999
            const yearRight = parseYear(right.candidate.release_date || '') || 9999
            return yearLeft - yearRight
          }
          return right.score - left.score
        })

      const bestCandidate = ranked[0] ? ranked[0].candidate : null
      if (!bestCandidate) return null

      // Fetch external IDs (IMDb ID) for TMDb movie
      try {
        const extRes = await fetch(`https://api.themoviedb.org/3/movie/${bestCandidate.id}/external_ids?api_key=${apiKey}`, { signal })
        if (extRes.ok) {
          const extData = await extRes.json() as { imdb_id?: string }
          if (extData.imdb_id) {
            bestCandidate.imdb_id = extData.imdb_id
          }
        }
      } catch {
        // Ignore external_ids error, fallback to candidate without imdb_id
      }

      return bestCandidate
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
    language: match.original_language || movie.language,
    source: movie.source,
    tmdbId: match.id,
    imdbId: match.imdb_id || undefined
  }
}

export interface TmdbCastMember {
  name: string
  character?: string
  profilePath?: string
}

export interface TmdbMovieDetails {
  runtime?: number
  backdropPath?: string
  budget?: number
  revenue?: number
  genres?: string[]
  cast?: TmdbCastMember[]
  director?: string
  trailerUrl?: string
}

interface TmdbMovieDetailsResponse {
  runtime?: number | null
  backdrop_path?: string | null
  budget?: number
  revenue?: number
  genres?: { id: number; name: string }[]
  credits?: {
    cast?: { name: string; character?: string; profile_path?: string | null; order?: number }[]
    crew?: { name: string; job?: string }[]
  }
  videos?: {
    results?: { key: string; site: string; type: string; official?: boolean }[]
  }
}

// Archive.org / public-domain-torrents titles are almost always in English,
// but users may search in French. Resolve the typed query against TMDB in
// both languages and return the distinct English/French titles it maps to,
// so provider queries can match on whichever title the source actually uses.
export async function resolveSearchTitles(
  query: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<string[]> {
  const terms = new Set<string>([query])

  const search = async (language: string): Promise<TmdbMovie[]> => {
    const params = new URLSearchParams({
      api_key: apiKey,
      query,
      include_adult: 'false',
      language,
      page: '1'
    })
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?${params.toString()}`, { signal })
    if (!response.ok) return []
    const data = await response.json() as TmdbSearchResponse
    return data.results || []
  }

  const [enResults, frResults] = await Promise.all([search('en-US'), search('fr-FR')])
  ;[...enResults.slice(0, 5), ...frResults.slice(0, 5)].forEach(candidate => {
    if (candidate.title) terms.add(candidate.title)
    if (candidate.original_title) terms.add(candidate.original_title)
  })

  return Array.from(terms).filter(Boolean)
}

export async function fetchTmdbMovieDetails(
  tmdbId: number,
  apiKey: string,
  lang: 'en' | 'fr',
  signal?: AbortSignal
): Promise<TmdbMovieDetails | null> {
  const language = lang === 'fr' ? 'fr-FR' : 'en-US'
  const params = new URLSearchParams({
    api_key: apiKey,
    language,
    append_to_response: 'credits,videos'
  })

  const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?${params.toString()}`, { signal })
  if (!response.ok) return null

  const data = await response.json() as TmdbMovieDetailsResponse

  const cast = (data.credits?.cast || [])
    .slice()
    .sort((left, right) => (left.order ?? 999) - (right.order ?? 999))
    .slice(0, 6)
    .map(member => ({
      name: member.name,
      character: member.character,
      profilePath: member.profile_path ? `https://image.tmdb.org/t/p/w185${member.profile_path}` : undefined
    }))

  const director = data.credits?.crew?.find(member => member.job === 'Director')?.name

  const trailer = (data.videos?.results || [])
    .filter(video => video.site === 'YouTube' && video.type === 'Trailer')
    .sort((left, right) => Number(right.official) - Number(left.official))[0]

  return {
    runtime: data.runtime ?? undefined,
    backdropPath: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : undefined,
    budget: data.budget || undefined,
    revenue: data.revenue || undefined,
    genres: (data.genres || []).map(genre => genre.name),
    cast: cast.length > 0 ? cast : undefined,
    director,
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined
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
    return movies
  }
  if (movies.length === 0) return movies

  const language = lang === 'fr' ? 'fr-FR' : 'en-US'
  const enrichedMovies = await mapWithConcurrency(movies, concurrency, async movie => {
    try {
      const match = await findTmdbMatch(movie, apiKey, language, signal)
      return match ? mergeTmdbMatch(movie, match) : movie
    } catch (error) {
      if (signal?.aborted) throw error
      console.warn(`TMDb enrichment failed for "${movie.title}"`, error)
      return movie
    }
  })

  return enrichedMovies
}
