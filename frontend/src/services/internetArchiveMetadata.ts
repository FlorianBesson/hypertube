import type { ArchiveMetadataValue, Movie } from '../types/movie'
import { enrichInternetArchiveMoviesWithTmdb } from './internetArchiveTmdb'
import { PUBLIC_DOMAIN_TORRENTS_DATABASE } from './sources/publicDomainTorrentsSourceProvider'
import {
  metadataText,
  metadataYear,
  normalizeArchiveRatingToTenScale,
  buildArchiveImageUrl,
  buildArchiveTorrentUrl,
  buildArchiveDetailsUrl
} from '../utils/internetArchiveUtils'

function buildMovieFromArchiveMetadata(id: string, metadata: Record<string, ArchiveMetadataValue>): Movie {
  return {
    id,
    title: metadataText(metadata.title) || id,
    genre: metadataText(metadata.subject) || 'Movie',
    year: metadataYear({ year: metadata.year, date: metadata.date }),
    rating: normalizeArchiveRatingToTenScale(metadata.avg_rating as number | undefined),
    image: buildArchiveImageUrl(id),
    source: 'Internet Archive',
    description: metadataText(metadata.description),
    creator: metadataText(metadata.creator),
    language: metadataText(metadata.language),
    torrentUrl: buildArchiveTorrentUrl(id),
    detailsUrl: buildArchiveDetailsUrl(id)
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
