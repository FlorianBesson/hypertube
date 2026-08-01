import type { Movie } from '../../types/movie'
import type { IMovieSourceProvider, MovieSearchParams, MovieSourceId } from './types'
import { ArchiveSourceProvider } from './archiveSourceProvider'
import { PublicDomainTorrentsSourceProvider } from './publicDomainTorrentsSourceProvider'
import { enrichInternetArchiveMoviesWithTmdb, resolveSearchTitles } from '../internetArchiveTmdb'
import { PUBLIC_DOMAIN_YEAR_CUTOFF } from '../../utils/internetArchiveUtils'
import { movieMatchesLanguage } from '../../utils/language'
import { sortMovies } from '../../utils/movieFilters'

// Each extra source page costs another round of TMDB enrichment requests, so
// cap how far we chase the target count before giving the user what we have.
const MAX_SOURCE_PAGES_PER_FETCH = 2

export interface MovieFetchOptions {
  tmdbApiKey?: string
  /** How many movies to return once TMDB/public-domain/language filtering is done */
  targetCount: number
}

/** A movie that survived filtering, so its TMDB match is known */
type MatchedMovie = Movie & { tmdbId: number }

export interface MovieFetchResult {
  movies: Movie[]
  /** Source page the next fetch should start from */
  nextPage: number
  /** True when the providers ran out of results before the target was reached */
  exhausted: boolean
}

export class MovieSourceAggregator {
  private providers: Map<MovieSourceId, IMovieSourceProvider> = new Map()

  constructor() {
    this.registerProvider(new ArchiveSourceProvider())
    this.registerProvider(new PublicDomainTorrentsSourceProvider())
  }

  public registerProvider(provider: IMovieSourceProvider): void {
    this.providers.set(provider.id, provider)
  }

  public async fetchMovies(
    sourceId: MovieSourceId,
    params: MovieSearchParams,
    options: MovieFetchOptions
  ): Promise<MovieFetchResult> {
    const searchParams = await this.resolveBilingualQuery(params, options.tmdbApiKey)

    const collected: Movie[] = []
    const seenTmdbIds = new Set<number>()
    let page = params.page
    let exhausted = false

    for (let attempt = 0; attempt < MAX_SOURCE_PAGES_PER_FETCH; attempt++) {
      const rawMovies = await this.fetchFromProviders(sourceId, { ...searchParams, page })
      page++

      if (rawMovies.length === 0) {
        exhausted = true
        break
      }

      const kept = await this.enrichAndFilter(rawMovies, params, options.tmdbApiKey)
      for (const movie of kept) {
        if (seenTmdbIds.has(movie.tmdbId)) continue
        seenTmdbIds.add(movie.tmdbId)
        collected.push(movie)
      }

      if (collected.length >= options.targetCount) break
    }

    const { sortBy = 'download_count', order = 'desc' } = params

    return {
      movies: sortMovies(collected, sortBy, order).slice(0, options.targetCount),
      nextPage: page,
      exhausted
    }
  }

  /** Resolves the query in both English and French via TMDB, so the source
   * queries can match a title typed in either language. */
  private async resolveBilingualQuery(
    params: MovieSearchParams,
    tmdbApiKey?: string
  ): Promise<MovieSearchParams> {
    if (!params.query || !params.query.trim() || !tmdbApiKey) return params

    try {
      const queryTerms = await resolveSearchTitles(params.query.trim(), tmdbApiKey, params.signal)
      return { ...params, queryTerms }
    } catch (err) {
      if (params.signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
        throw err
      }
      console.warn('[MovieSourceAggregator] Bilingual query resolution failed:', err)
      return params
    }
  }

  private async fetchFromProviders(
    sourceId: MovieSourceId,
    searchParams: MovieSearchParams
  ): Promise<Movie[]> {
    if (sourceId !== 'all' && this.providers.has(sourceId)) {
      const provider = this.providers.get(sourceId)!
      try {
        return await provider.searchMovies(searchParams)
      } catch (err) {
        if (searchParams.signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
          throw err
        }
        console.error(`[MovieSourceAggregator] Provider ${sourceId} failed:`, err)
        return []
      }
    }

    const activeProviders = Array.from(this.providers.values())
    const results = await Promise.allSettled(
      activeProviders.map(provider => provider.searchMovies(searchParams))
    )

    const combined: Movie[] = []
    results.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        combined.push(...res.value)
      } else {
        const reason = res.reason
        if (!searchParams.signal?.aborted && reason?.name !== 'AbortError') {
          console.warn(`[MovieSourceAggregator] Provider ${activeProviders[index].id} error:`, reason)
        }
      }
    })

    const seenTitles = new Set<string>()
    return combined.filter(movie => {
      const key = movie.title.toLowerCase().trim()
      if (seenTitles.has(key)) return false
      seenTitles.add(key)
      return true
    })
  }

  private async enrichAndFilter(
    movies: Movie[],
    params: MovieSearchParams,
    tmdbApiKey?: string
  ): Promise<MatchedMovie[]> {
    let enriched = movies
    try {
      enriched = await enrichInternetArchiveMoviesWithTmdb(movies, {
        apiKey: tmdbApiKey,
        lang: params.lang,
        concurrency: 4,
        signal: params.signal
      })
    } catch (err) {
      if (params.signal?.aborted) throw err
      console.warn('[MovieSourceAggregator] TMDB enrichment warning:', err)
    }

    // Only show movies we could confidently match to TMDB, old enough to
    // actually be in the public domain (TMDB enrichment can otherwise
    // overwrite the year with a mismatched, more recent release), and
    // matching the selected spoken-language filter (checked here, after TMDB
    // enrichment, since movie.language is only reliably known at this point)
    return enriched.filter((movie): movie is MatchedMovie => {
      if (!movie.tmdbId) return false
      const year = typeof movie.year === 'number' ? movie.year : parseInt(String(movie.year), 10)
      if (Number.isNaN(year) || year > PUBLIC_DOMAIN_YEAR_CUTOFF) return false
      if (params.movieLanguage && !movieMatchesLanguage(movie.language, params.movieLanguage)) return false
      return true
    })
  }
}

export const movieSourceAggregator = new MovieSourceAggregator()
