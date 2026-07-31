import type { ArchiveMetadataValue, Movie } from '../types/movie'
import { enrichInternetArchiveMoviesWithTmdb } from './internetArchiveTmdb'
import { PUBLIC_DOMAIN_TORRENTS_DATABASE } from './sources/publicDomainTorrentsSourceProvider'

const YEAR_PATTERN = /\b(?:18|19|20)\d{2}\b/

function flattenMetadataField(value: ArchiveMetadataValue | undefined): string {
  const values = Array.isArray(value) ? value : value == null ? [] : [value]
  return values.map(String).join(', ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeArchiveRatingToTenScale(rawRating: number | undefined): number {
  return Math.min(10, Math.max(0, Number(rawRating || 0) * 2))
}

function buildMovieFromArchiveMetadata(id: string, metadata: Record<string, ArchiveMetadataValue>): Movie {
  const encodedId = encodeURIComponent(id)
  const date = flattenMetadataField(metadata.year) || flattenMetadataField(metadata.date)
  const year = date.match(YEAR_PATTERN)?.[0] || 'N/A'

  return {
    id,
    title: flattenMetadataField(metadata.title) || id,
    genre: flattenMetadataField(metadata.subject) || 'Movie',
    year,
    rating: normalizeArchiveRatingToTenScale(metadata.avg_rating as number | undefined),
    image: `https://archive.org/services/img/${encodedId}`,
    source: 'Internet Archive',
    description: flattenMetadataField(metadata.description),
    creator: flattenMetadataField(metadata.creator),
    language: flattenMetadataField(metadata.language),
    torrentUrl: `https://archive.org/download/${encodedId}/${encodedId}_archive.torrent`,
    detailsUrl: `https://archive.org/details/${encodedId}`
  }
}

async function fetchArchiveMovie(id: string): Promise<Movie> {
  const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`)
  if (!response.ok) {
    throw new Error(`Internet Archive returned ${response.status}`)
  }

  const data = await response.json()
  return buildMovieFromArchiveMetadata(id, data.metadata || {})
}

/** Resolves a movie by its route id when it wasn't passed via router navigation state. */
export async function resolveMovieById(id: string, lang: 'en' | 'fr'): Promise<Movie | null> {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY

  if (id.startsWith('pdt-')) {
    const found = PUBLIC_DOMAIN_TORRENTS_DATABASE.find(candidate => candidate.id === id)
    if (found) {
      const [enriched] = await enrichInternetArchiveMoviesWithTmdb([found], { apiKey, lang })
      return enriched || found
    }
  }

  const baseMovie = await fetchArchiveMovie(id)
  const [enriched] = await enrichInternetArchiveMoviesWithTmdb([baseMovie], { apiKey, lang })
  return enriched || baseMovie
}
