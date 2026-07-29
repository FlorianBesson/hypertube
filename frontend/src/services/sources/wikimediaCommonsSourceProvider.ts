import type { Movie } from '../../types/movie'
import type { IMovieSourceProvider, MovieSearchParams, MovieSourceId } from './types'

interface WikimediaPage {
  pageid: number
  title: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  imageinfo?: Array<{
    url: string
    size?: number
    mime?: string
    extmetadata?: {
      ObjectName?: { value: string }
      ImageDescription?: { value: string }
      DateTimeOriginal?: { value: string }
      Artist?: { value: string }
    }
  }>
  categories?: Array<{ title: string }>
}

interface WikimediaResponse {
  query?: {
    pages?: Record<string, WikimediaPage>
  }
}

export class WikimediaCommonsSourceProvider implements IMovieSourceProvider {
  readonly id: MovieSourceId = 'wikimedia_commons'
  readonly name = 'Wikimedia Commons'

  async searchMovies(params: MovieSearchParams): Promise<Movie[]> {
    const { query = '', genre = '', minRating = 0, sortBy = 'download_count', order = 'desc', page = 1, limit = 20, signal } = params

    // Use MediaWiki Search generator in File namespace (ns:6) for video files
    const queryTerm = query.trim()
      ? `filetype:video ${query.trim()}`
      : 'filetype:video AND (film OR movie OR "public domain" OR cinema)'

    const searchParams = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: queryTerm,
      gsrnamespace: '6', // File namespace
      gsrlimit: '50',
      prop: 'pageimages|imageinfo|categories',
      piprop: 'thumbnail',
      pithumbsize: '500',
      iiprop: 'url|size|mime|extmetadata',
      format: 'json',
      origin: '*'
    })

    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${searchParams.toString()}`, {
      signal
    })

    if (!response.ok) {
      throw new Error(`Wikimedia Commons API returned ${response.status}`)
    }

    const data = await response.json() as WikimediaResponse
    const rawPages = Object.values(data.query?.pages || {})

    // Transform Wikimedia video file pages to clean Movie objects
    const movies: Movie[] = rawPages
      .filter(p => {
        const info = p.imageinfo?.[0]
        if (!info || !info.url) return false
        const mime = (info.mime || '').toLowerCase()
        const titleLower = p.title.toLowerCase()
        return mime.startsWith('video/') || titleLower.endsWith('.ogv') || titleLower.endsWith('.webm') || titleLower.endsWith('.mp4')
      })
      .map(p => {
        const info = p.imageinfo![0]
        const ext = info.extmetadata

        const rawTitle = p.title.replace(/^File:\s*/i, '').replace(/\.(ogv|webm|mp4|avi|mkv)$/i, '').replace(/_/g, ' ')
        const cleanTitle = rawTitle.replace(/\s*\(\d{4}\)/g, '').trim() || p.title

        const yearMatch = p.title.match(/\b(?:18|19|20)\d{2}\b/) || (ext?.DateTimeOriginal?.value || '').match(/\b(?:18|19|20)\d{2}\b/)
        const year = yearMatch ? parseInt(yearMatch[0], 10) : 'N/A'

        const description = (ext?.ImageDescription?.value || ext?.ObjectName?.value || cleanTitle)
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        const creator = (ext?.Artist?.value || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        const videoUrl = info.url
        const sizeBytes = info.size || 350000000

        // Calculate normalized popularity score matching global catalog range (150k - 650k)
        const basePopularity = Math.floor(sizeBytes / 1200) + 150000
        const titleBonus = (p.pageid % 100) * 4500
        const downloads = basePopularity + titleBonus

        return {
          id: `wikimedia-${p.pageid}`,
          title: cleanTitle,
          genre: 'Public Domain Film',
          year,
          rating: 7.5,
          image: p.thumbnail?.source || 'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg',
          source: this.name,
          description: description || 'Film libre du domaine public issu de Wikimedia Commons.',
          creator: creator || undefined,
          language: 'English',
          downloads: Math.floor(sizeBytes / 3000), // proportional popularity
          torrentUrl: videoUrl,
          detailsUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
          torrents: [
            {
              url: videoUrl,
              hash: videoUrl,
              quality: '720p',
              type: 'web',
              size_bytes: sizeBytes
            }
          ]
        }
      })

    let filtered = movies

    // 1. Genre Filter
    if (genre.trim()) {
      const g = genre.toLowerCase().trim()
      filtered = filtered.filter(m => (m.genre || '').toLowerCase().includes(g))
    }

    // 2. Min Rating Filter
    if (minRating > 0) {
      filtered = filtered.filter(m => m.rating >= minRating)
    }

    // 3. Sorting
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

    // 4. Pagination
    const startIndex = (page - 1) * limit
    return filtered.slice(startIndex, startIndex + limit)
  }
}
