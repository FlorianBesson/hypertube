import { useLocalStorageState } from './useLocalStorageState'
import type { MovieSourceId, SortByOption, SortOrder, WatchedFilterOption } from '../services/sources/types'
import { MOVIE_CATALOG_STORAGE_KEYS as KEYS } from '../utils/storageKeys'

/** Filter/sort selections that survive across sessions via localStorage. */
export function useMoviePersistedFilters() {
  const [selectedSource, setSelectedSource] = useLocalStorageState<MovieSourceId>(KEYS.source, 'all')
  const [sortBy, setSortBy] = useLocalStorageState<SortByOption>(KEYS.sortBy, 'download_count')
  const [order, setOrder] = useLocalStorageState<SortOrder>(KEYS.order, 'desc')
  const [selectedGenre, setSelectedGenre] = useLocalStorageState<string>(KEYS.genre, '')
  const [selectedMinRating, setSelectedMinRating] = useLocalStorageState(KEYS.minRating, 0, parseFloat)
  const [selectedLanguage, setSelectedLanguage] = useLocalStorageState<string>(KEYS.language, '')
  const [watchedFilter, setWatchedFilter] = useLocalStorageState<WatchedFilterOption>(KEYS.watchedFilter, 'all')

  return {
    selectedSource,
    setSelectedSource,
    sortBy,
    setSortBy,
    order,
    setOrder,
    selectedGenre,
    setSelectedGenre,
    selectedMinRating,
    setSelectedMinRating,
    selectedLanguage,
    setSelectedLanguage,
    watchedFilter,
    setWatchedFilter
  }
}
