import type { TranslationType } from '../../../locales/translations'
import type { MovieSourceId, SortByOption, SortOrder, WatchedFilterOption } from '../../../services/sources/types'
import FilterSelect from './FilterSelect'
import { MOVIE_GENRES } from '../../../utils/movieGenres'
import { MOVIE_LANGUAGE_OPTIONS } from '../../../utils/language'

export interface MovieToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedSource: MovieSourceId
  onSourceChange: (source: MovieSourceId) => void
  selectedGenre: string
  onGenreChange: (genre: string) => void
  selectedMinRating: number
  onMinRatingChange: (rating: number) => void
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  watchedFilter: WatchedFilterOption
  onWatchedFilterChange: (status: WatchedFilterOption) => void
  sortBy: SortByOption
  onSortByChange: (sortBy: SortByOption) => void
  order: SortOrder
  onOrderToggle: () => void
  showCommunity: boolean
  onToggleCommunity: () => void
  t: TranslationType['dashboard']
}

export default function MovieToolbar({
  searchQuery,
  onSearchChange,
  selectedSource,
  onSourceChange,
  selectedGenre,
  onGenreChange,
  selectedMinRating,
  onMinRatingChange,
  selectedLanguage,
  onLanguageChange,
  watchedFilter,
  onWatchedFilterChange,
  sortBy,
  onSortByChange,
  order,
  onOrderToggle,
  showCommunity,
  onToggleCommunity,
  t
}: MovieToolbarProps) {
  return (
    <div className="flex flex-col gap-4 w-full relative z-10">
      {/* Search Input + Community Toggle Section */}
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="w-full max-w-md">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <svg
                className="w-4 h-4 text-neutral-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder || "Search movies..."}
              className="w-full bg-neutral-950/40 border border-white/10 focus:border-red-500/70 focus:ring-1 focus:ring-red-500/50 rounded-full pl-10 pr-9 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onToggleCommunity}
          className="flex items-center justify-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full transition-all group border border-transparent hover:border-white/10 shrink-0 cursor-pointer sm:ml-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:text-red-400 transition-colors">
            {showCommunity ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            )}
            {showCommunity ? null : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            )}
          </svg>
          {showCommunity ? (t.hideCommunity || "Hide Community") : (t.showCommunity || "Show Community")}
        </button>
      </div>

      {/* Filters and Sort Toolbar */}
      <div className="w-full flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Source Provider Filter (accent styling to signal it's the primary filter) */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.sourceLabel || "Source"}</span>
            <select
              value={selectedSource}
              onChange={(e) => onSourceChange(e.target.value as MovieSourceId)}
              className="bg-neutral-950 border border-red-500/40 rounded-lg px-3 py-1.5 text-xs text-red-400 font-semibold outline-none focus:border-red-500 cursor-pointer min-w-36 shadow-sm"
            >
              <option value="all">{t.allSources || "All Sources"}</option>
              <option value="archive">{t.internetArchive || "Internet Archive"}</option>
              <option value="publicdomain_torrents">{t.publicDomainTorrents || "Public Domain Torrents"}</option>
            </select>
          </div>

          <FilterSelect
            label={t.genreLabel || "Genre"}
            value={selectedGenre}
            onChange={onGenreChange}
            minWidthClassName="min-w-32"
            options={[{ value: '', label: t.allGenres || "All Genres" }, ...MOVIE_GENRES]}
          />

          <FilterSelect
            label={t.ratingLabel || "Min Rating"}
            value={selectedMinRating}
            onChange={(value) => onMinRatingChange(Number(value))}
            minWidthClassName="min-w-28"
            options={[
              { value: '0', label: t.anyRating || "Any Rating" },
              { value: '5', label: '5+' },
              { value: '6', label: '6+' },
              { value: '7', label: '7+' },
              { value: '8', label: '8+' },
              { value: '9', label: '9+' }
            ]}
          />

          <FilterSelect
            label={t.languageLabel || "Language"}
            value={selectedLanguage}
            onChange={onLanguageChange}
            minWidthClassName="min-w-32"
            options={[{ value: '', label: t.allLanguages || "All Languages" }, ...MOVIE_LANGUAGE_OPTIONS]}
          />

          <FilterSelect
            label={t.watchedLabel || "Status"}
            value={watchedFilter}
            onChange={(value) => onWatchedFilterChange(value as WatchedFilterOption)}
            minWidthClassName="min-w-28"
            options={[
              { value: 'all', label: t.statusAll || "All movies" },
              { value: 'watched', label: t.statusWatched || "Watched" },
              { value: 'unwatched', label: t.statusUnwatched || "Unwatched" }
            ]}
          />
        </div>

        {/* Sorting Dropdown */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.sortBy || "Sort by"}</span>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as SortByOption)}
                className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer min-w-36 flex-1 sm:flex-none"
              >
                <option value="download_count">{t.sortPopularity || "Popularity"}</option>
                <option value="title">{t.sortTitle || "Title (A-Z)"}</option>
                <option value="year">{t.sortYear || "Year"}</option>
                <option value="rating">{t.sortRating || "Rating"}</option>
              </select>

              <button
                onClick={onOrderToggle}
                className="border border-white/10 hover:border-red-500/50 bg-neutral-950 hover:bg-neutral-900 rounded-lg p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                title={order === 'asc' ? 'Ascending' : 'Descending'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`w-4 h-4 transition-transform duration-300 ${order === 'asc' ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
