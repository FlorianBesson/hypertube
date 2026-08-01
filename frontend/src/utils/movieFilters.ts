import type { Movie } from '../types/movie'
import type { SortByOption, SortOrder, WatchedFilterOption } from '../services/sources/types'
import { movieMatchesLanguage } from './language'

export interface MovieFilterCriteria {
  watchedMovies: string[]
  watchedFilter: WatchedFilterOption
  selectedGenre: string
  selectedMinRating: number
  selectedLanguage: string
}

export function filterMovies(movies: Movie[], criteria: MovieFilterCriteria): Movie[] {
  const { watchedMovies, watchedFilter, selectedGenre, selectedMinRating, selectedLanguage } = criteria

  return movies.filter(movie => {
    const isWatched = watchedMovies.includes(movie.id)
    if (watchedFilter === 'watched' && !isWatched) return false
    if (watchedFilter === 'unwatched' && isWatched) return false

    if (selectedGenre) {
      const movieGenreLower = (movie.genre || '').toLowerCase()
      if (!movieGenreLower.includes(selectedGenre.toLowerCase())) return false
    }

    if (selectedMinRating > 0 && movie.rating < selectedMinRating) return false

    if (selectedLanguage && !movieMatchesLanguage(movie.language, selectedLanguage)) return false

    return true
  })
}

export function sortMovies(movies: Movie[], sortBy: SortByOption, order: SortOrder): Movie[] {
  return [...movies].sort((a, b) => {
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
      comparison = (a.downloads ?? 0) - (b.downloads ?? 0)
    }
    return order === 'asc' ? comparison : -comparison
  })
}
