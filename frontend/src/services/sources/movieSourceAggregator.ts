import type { Movie } from '../../types/movie'
import type { IMovieSourceProvider, MovieSearchParams, MovieSourceId } from './types'
import { ArchiveSourceProvider } from './archiveSourceProvider'
import { PublicDomainTorrentsSourceProvider } from './publicDomainTorrentsSourceProvider'
import { enrichInternetArchiveMoviesWithTmdb } from '../internetArchiveTmdb'

export class MovieSourceAggregator {
  private providers: Map<MovieSourceId, IMovieSourceProvider> = new Map()

  constructor() {
    this.registerProvider(new ArchiveSourceProvider())
    this.registerProvider(new PublicDomainTorrentsSourceProvider())
  }

  public registerProvider(provider: IMovieSourceProvider): void {
    this.providers.set(provider.id, provider)
  }

  public getAvailableSources(): { id: MovieSourceId; name: string }[] {
    const list: { id: MovieSourceId; name: string }[] = [
      { id: 'all', name: 'Toutes les sources' }
    ]
    this.providers.forEach(p => {
      list.push({ id: p.id, name: p.name })
    })
    return list
  }

  public async fetchMovies(
    sourceId: MovieSourceId,
    params: MovieSearchParams,
    tmdbApiKey?: string
  ): Promise<Movie[]> {
    let movies: Movie[] = []

    if (sourceId !== 'all' && this.providers.has(sourceId)) {
      const provider = this.providers.get(sourceId)!
      try {
        movies = await provider.searchMovies(params)
      } catch (err: any) {
        if (params.signal?.aborted || err?.name === 'AbortError') {
          throw err
        }
        console.error(`[MovieSourceAggregator] Provider ${sourceId} failed:`, err)
        movies = []
      }
    } else {
      // Query all providers in parallel
      const activeProviders = Array.from(this.providers.values())
      const results = await Promise.allSettled(
        activeProviders.map(p => p.searchMovies(params))
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
    movies.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title)
      } else if (sortBy === 'year') {
        const yearA = typeof a.year === 'number' ? a.year : parseInt(String(a.year)) || 0
        const yearB = typeof b.year === 'number' ? b.year : parseInt(String(b.year)) || 0
        comparison = yearA - yearB
      } else if (sortBy === 'rating') {
        comparison = a.rating - b.rating
      } else if (sortBy === 'download_count') {
        comparison = (a.downloads || 0) - (b.downloads || 0)
      }
      return order === 'asc' ? comparison : -comparison
    })

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

    // Only show movies we could confidently match to TMDB
    return movies.filter(movie => movie.tmdbId)
  }
}

export const movieSourceAggregator = new MovieSourceAggregator()
