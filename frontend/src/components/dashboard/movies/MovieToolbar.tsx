import type { TranslationType } from '../../../locales/translations'
import type { MovieSourceId, SortByOption, SortOrder, WatchedFilterOption } from '../../../hooks/useInternetArchiveMovies'

export interface MovieToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedSource?: MovieSourceId
  onSourceChange?: (source: MovieSourceId) => void
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
  t: TranslationType['dashboard']
}

export default function MovieToolbar({
  searchQuery,
  onSearchChange,
  selectedSource = 'all',
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
  t
}: MovieToolbarProps) {
  return (
    <div className="flex flex-col gap-4 w-full relative z-10">
      {/* Search Input Section */}
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

      {/* Filters and Sort Toolbar */}
      <div className="w-full flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Source Provider Filter */}
          {onSourceChange && (
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
          )}

          {/* Genre Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.genreLabel || "Genre"}</span>
            <select
              value={selectedGenre}
              onChange={(e) => onGenreChange(e.target.value)}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer min-w-32"
            >
              <option value="">{t.allGenres || "All Genres"}</option>
              <option value="action">Action</option>
              <option value="adventure">Adventure</option>
              <option value="animation">Animation</option>
              <option value="comedy">Comedy</option>
              <option value="crime">Crime</option>
              <option value="documentary">Documentary</option>
              <option value="drama">Drama</option>
              <option value="family">Family</option>
              <option value="fantasy">Fantasy</option>
              <option value="history">History</option>
              <option value="horror">Horror</option>
              <option value="mystery">Mystery</option>
              <option value="romance">Romance</option>
              <option value="sci-fi">Sci-Fi</option>
              <option value="thriller">Thriller</option>
            </select>
          </div>

          {/* Min Rating Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.ratingLabel || "Min Rating"}</span>
            <select
              value={selectedMinRating}
              onChange={(e) => onMinRatingChange(Number(e.target.value))}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer min-w-28"
            >
              <option value="0">{t.anyRating || "Any Rating"}</option>
              <option value="5">5+</option>
              <option value="6">6+</option>
              <option value="7">7+</option>
              <option value="8">8+</option>
              <option value="9">9+</option>
            </select>
          </div>

          {/* Language Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.languageLabel || "Language"}</span>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer min-w-32"
            >
              <option value="">{t.allLanguages || "All Languages"}</option>
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="german">German</option>
              <option value="french">French</option>
              <option value="japanese">Japanese</option>
              <option value="italian">Italian</option>
            </select>
          </div>

          {/* Watched Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{t.watchedLabel || "Status"}</span>
            <select
              value={watchedFilter}
              onChange={(e) => onWatchedFilterChange(e.target.value as WatchedFilterOption)}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-red-500/70 cursor-pointer min-w-28"
            >
              <option value="all">{t.statusAll || "All movies"}</option>
              <option value="watched">{t.statusWatched || "Watched"}</option>
              <option value="unwatched">{t.statusUnwatched || "Unwatched"}</option>
            </select>
          </div>
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
