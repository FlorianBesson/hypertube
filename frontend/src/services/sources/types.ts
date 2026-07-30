import type { Movie } from '../../types/movie'

export type MovieSourceId = 'all' | 'archive' | 'publicdomain_torrents'

export type SortByOption = 'title' | 'year' | 'rating' | 'download_count'
export type SortOrder = 'asc' | 'desc'
export type WatchedFilterOption = 'all' | 'watched' | 'unwatched'

export interface MovieSearchParams {
  query?: string
  genre?: string
  minRating?: number
  sortBy?: SortByOption
  order?: SortOrder
  page: number
  limit: number
  lang: 'en' | 'fr'
  signal?: AbortSignal
}

export interface IMovieSourceProvider {
  readonly id: MovieSourceId
  readonly name: string
  searchMovies(params: MovieSearchParams): Promise<Movie[]>
}
