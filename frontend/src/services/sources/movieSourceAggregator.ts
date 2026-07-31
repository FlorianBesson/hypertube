import type { Movie } from '../../types/movie'
import type { IMovieSourceProvider, MovieSearchParams, MovieSourceId } from './types'
import { ArchiveSourceProvider } from './archiveSourceProvider'
import { PublicDomainTorrentsSourceProvider } from './publicDomainTorrentsSourceProvider'
import { enrichInternetArchiveMoviesWithTmdb, resolveSearchTitles } from '../internetArchiveTmdb'
import { PUBLIC_DOMAIN_YEAR_CUTOFF } from '../../utils/internetArchiveUtils'
import { movieMatchesLanguage } from '../../utils/language'
import { sortMovies } from '../../utils/movieFilters'

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
    tmdbApiKey?: string
  ): Promise<Movie[]> {
    let movies: Movie[] = []
    let searchParams = params

    // Resolve the query in both English and French via TMDB, so the source
    // queries below can match a title typed in either language.
    if (params.query && params.query.trim() && tmdbApiKey) {
      try {
        const queryTerms = await resolveSearchTitles(params.query.trim(), tmdbApiKey, params.signal)
        searchParams = { ...params, queryTerms }
      } catch (err) {
        if (params.signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
          throw err
        }
        console.warn('[MovieSourceAggregator] Bilingual query resolution failed:', err)
      }
    }

    if (sourceId !== 'all' && this.providers.has(sourceId)) {
      const provider = this.providers.get(sourceId)!
      try {
        movies = await provider.searchMovies(searchParams)
      } catch (err) {
        if (params.signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
          throw err
        }
        console.error(`[MovieSourceAggregator] Provider ${sourceId} failed:`, err)
        movies = []
      }
    } else {
      // Query all providers in parallel
      const activeProviders = Array.from(this.providers.values())
      const results = await Promise.allSettled(
        activeProviders.map(p => p.searchMovies(searchParams))
      )

      const combined: Movie[] = []
      results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          combined.push(...res.value)
        } else {
          const reason = res.reason
          if (!params.signal?.aborted && reason?.name !== 'AbortError') {
            console.warn(`[MovieSourceAggregator] Provider ${activeProviders[index].id} error:`, reason)
          }
        }
      })

      // Interleave / deduplicate by title
      const seenTitles = new Set<string>()
      const uniqueMovies: Movie[] = []

      for (const m of combined) {
        const key = m.title.toLowerCase().trim()
        if (!seenTitles.has(key)) {
          seenTitles.add(key)
          uniqueMovies.push(m)
        }
      }

      movies = uniqueMovies
    }

    // Sort unified results
    const { sortBy = 'download_count', order = 'desc' } = params
    movies = sortMovies(movies, sortBy, order)

    // Optionally enrich with TMDB
    if (movies.length > 0) {
      try {
        movies = await enrichInternetArchiveMoviesWithTmdb(movies, {
          apiKey: tmdbApiKey,
          lang: params.lang,
          concurrency: 4,
          signal: params.signal
        })
      } catch (err) {
        if (!params.signal?.aborted) {
          console.warn('[MovieSourceAggregator] TMDB enrichment warning:', err)
        }
      }
    }

    // Only show movies we could confidently match to TMDB, old enough to
    // actually be in the public domain (TMDB enrichment can otherwise
    // overwrite the year with a mismatched, more recent release), and
    // matching the selected spoken-language filter (checked here, after TMDB
    // enrichment, since movie.language is only reliably known at this point)
    return movies.filter(movie => {
      if (!movie.tmdbId) return false
      const year = typeof movie.year === 'number' ? movie.year : parseInt(String(movie.year), 10)
      if (Number.isNaN(year) || year > PUBLIC_DOMAIN_YEAR_CUTOFF) return false
      if (params.movieLanguage && !movieMatchesLanguage(movie.language, params.movieLanguage)) return false
      return true
    })
  }
}

export const movieSourceAggregator = new MovieSourceAggregator()
