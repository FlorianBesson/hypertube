import type { Movie } from '../../types/movie'
import type { IMovieSourceProvider, MovieSearchParams, MovieSourceId } from './types'

import rawScrapedTorrents from './public_domain_torrents.json'

interface RawPublicDomainMovie {
  id: string
  title: string
  detail_url?: string
  torrents?: string[]
  status?: string
  imdb_id?: string
  tmdb_id?: number
  poster_path?: string
  overview?: string
  vote_average?: number
  release_date?: string
  genres?: string
}

function parseYear(title: string): number | string {
  const match = title.match(/\b(19\d{2}|20\d{2})\b/)
  return match ? parseInt(match[0], 10) : 'N/A'
}

const SCRAPED_MOVIES: Movie[] = (rawScrapedTorrents as RawPublicDomainMovie[]).map((m: RawPublicDomainMovie) => {
  const defaultTorrentUrl = m.torrents && m.torrents.length > 0 ? m.torrents[0] : ''
  const movieYear = m.release_date ? m.release_date.slice(0, 4) : parseYear(m.title)
  
  const formattedTorrents = (m.torrents || []).map((tUrl: string) => {
    let quality = '720p'
    if (tUrl.toLowerCase().includes('1080')) {
      quality = '1080p'
    } else if (tUrl.toLowerCase().includes('mp4')) {
      quality = 'MP4'
    } else if (tUrl.toLowerCase().includes('avi')) {
      quality = 'AVI'
    } else if (tUrl.toLowerCase().includes('psp')) {
      quality = 'PSP'
    }
    
    return {
      url: tUrl,
      hash: tUrl, // resolver streams direct url if starts with http
      quality,
      type: 'web',
      size: 'N/A'
    }
  })

  let genre = m.genres || 'Classics, Public Domain'
  if (!m.genres) {
    const titleLower = m.title.toLowerCase()
    if (titleLower.includes('chaplin') || titleLower.includes('comedy') || titleLower.includes('jerry')) {
      genre = 'Comedy, Classics'
    } else if (titleLower.includes('horror') || titleLower.includes('creature') || titleLower.includes('monster') || titleLower.includes('dead')) {
      genre = 'Horror, Classics'
    } else if (titleLower.includes('ninja') || titleLower.includes('karate') || titleLower.includes('action')) {
      genre = 'Action, Martial Arts'
    } else if (titleLower.includes('scifi') || titleLower.includes('space') || titleLower.includes('alien') || titleLower.includes('planet')) {
      genre = 'Sci-Fi, Classics'
    } else if (titleLower.includes('sherlock') || titleLower.includes('mystery')) {
      genre = 'Mystery, Detective'
    } else if (titleLower.includes('western') || titleLower.includes('cowboy')) {
      genre = 'Western, Classics'
    }
  }

  return {
    id: `pdt-${m.id}`,
    title: m.title,
    genre,
    year: movieYear,
    rating: m.vote_average ? Number(m.vote_average) : 5.0,
    image: m.poster_path || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    source: 'Public Domain Torrents',
    description: m.overview || `A classic movie: ${m.title}. Available for free and legal streaming via public domain torrent distribution.`,
    downloads: 1000,
    torrentUrl: defaultTorrentUrl,
    detailsUrl: m.detail_url,
    torrents: formattedTorrents,
    tmdbId: m.tmdb_id ? Number(m.tmdb_id) : undefined,
    imdbId: m.imdb_id || undefined
  }
})

export const PUBLIC_DOMAIN_TORRENTS_DATABASE: Movie[] = SCRAPED_MOVIES

export class PublicDomainTorrentsSourceProvider implements IMovieSourceProvider {
  readonly id: MovieSourceId = 'publicdomain_torrents'
  readonly name = 'Public Domain Torrents'

  async searchMovies(params: MovieSearchParams): Promise<Movie[]> {
    const { query = '', genre = '', minRating = 0, sortBy = 'download_count', order = 'desc', page = 1, limit = 20 } = params

    let filtered = [...PUBLIC_DOMAIN_TORRENTS_DATABASE]

    // 1. Text Search Filter
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      filtered = filtered.filter(m => m.title.toLowerCase().includes(q))
    }

    // 2. Genre Filter
    if (genre.trim()) {
      const g = genre.toLowerCase().trim()
      filtered = filtered.filter(m => (m.genre || '').toLowerCase().includes(g))
    }

    // 3. Min Rating Filter
    if (minRating > 0) {
      filtered = filtered.filter(m => m.rating >= minRating)
    }

    // 4. Sorting
    filtered.sort((a, b) => {
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

    // 5. Pagination
    const startIndex = (page - 1) * limit
    return filtered.slice(startIndex, startIndex + limit)
  }
}
