import { useMoviePersistedFilters } from './useMoviePersistedFilters'
import { useMovieSearch } from './useMovieSearch'

export interface UseMovieCatalogProps {
  lang: 'en' | 'fr'
}

/** Combines persisted filters with search/pagination to back the movie catalog dashboard. */
export function useMovieCatalog({ lang }: UseMovieCatalogProps) {
  const filters = useMoviePersistedFilters()
  const search = useMovieSearch({
    lang,
    selectedSource: filters.selectedSource,
    selectedGenre: filters.selectedGenre,
    selectedMinRating: filters.selectedMinRating,
    selectedLanguage: filters.selectedLanguage,
    sortBy: filters.sortBy,
    setSortBy: filters.setSortBy,
    order: filters.order,
    setOrder: filters.setOrder
  })

  return { ...filters, ...search }
}
