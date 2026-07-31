import type { Movie, InternetArchiveSearchResponse } from '../../types/movie'
import type { IMovieSourceProvider, MovieSearchParams, MovieSourceId } from './types'
import {
  INTERNET_ARCHIVE_BASE_QUERY,
  escapeInternetArchiveQuery,
  isLikelyMovie,
  metadataText,
  metadataValues,
  metadataYear
} from '../../utils/internetArchiveUtils'
import { LANGUAGE_TOKENS } from '../../utils/language'

export class ArchiveSourceProvider implements IMovieSourceProvider {
  readonly id: MovieSourceId = 'archive'
  readonly name = 'Internet Archive'

  async searchMovies(params: MovieSearchParams): Promise<Movie[]> {
    const { query, genre, minRating, movieLanguage, sortBy = 'download_count', order = 'desc', page, limit, signal } = params

    const queryParts = [...INTERNET_ARCHIVE_BASE_QUERY]

    if (query && query.trim()) {
      queryParts.push(`title:(${escapeInternetArchiveQuery(query.trim())})`)
    }

    if (genre && genre.trim()) {
      queryParts.push(`subject:"${escapeInternetArchiveQuery(genre.trim())}"`)
    }

    if (minRating && minRating > 0) {
      queryParts.push(`avg_rating:[${minRating / 2} TO *]`)
    }

    if (movieLanguage && movieLanguage.trim()) {
      const tokens = LANGUAGE_TOKENS[movieLanguage] || [movieLanguage]
      queryParts.push(`language:(${tokens.map(t => `"${t}"`).join(' OR ')})`)
    }

    const sortField = {
      download_count: 'downloads',
      title: 'titleSorter',
      year: 'date',
      rating: 'avg_rating'
    }[sortBy] || 'downloads'

    const searchParams = new URLSearchParams({
      q: queryParts.join(' AND '),
      rows: (limit * 2).toString(), // fetch extra to account for filtering non-movies
      page: page.toString(),
      output: 'json'
    })
    searchParams.append('sort[]', `${sortField} ${order}`)

    const fields = [
      'identifier',
      'title',
      'description',
      'creator',
      'date',
      'year',
      'subject',
      'language',
      'downloads',
      'avg_rating'
    ]
    fields.forEach(field => searchParams.append('fl[]', field))

    const response = await fetch(`https://archive.org/advancedsearch.php?${searchParams.toString()}`, {
      signal
    })

    if (!response.ok) {
      throw new Error(`Internet Archive HTTP ${response.status}`)
    }

    const data = await response.json() as InternetArchiveSearchResponse
    const rawDocs = data.response?.docs || []

    const docs = rawDocs.filter(isLikelyMovie)

    return docs.slice(0, limit).map(movie => ({
      id: movie.identifier,
      title: metadataText(movie.title) || movie.identifier,
      genre: metadataValues(movie.subject).slice(0, 3).join(', ') || 'Movie',
      year: metadataYear(movie),
      rating: Math.min(10, Math.max(0, Number(movie.avg_rating || 0) * 2)),
      image: `https://archive.org/services/img/${encodeURIComponent(movie.identifier)}`,
      source: this.name,
      description: metadataText(movie.description),
      creator: metadataText(movie.creator),
      language: metadataText(movie.language),
      downloads: Number(movie.downloads || 0),
      torrentUrl: `https://archive.org/download/${encodeURIComponent(movie.identifier)}/${encodeURIComponent(movie.identifier)}_archive.torrent`,
      detailsUrl: `https://archive.org/details/${encodeURIComponent(movie.identifier)}`
    }))
  }
}
