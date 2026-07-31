import type { ArchiveMetadataValue, InternetArchiveRawMovie } from '../types/movie'

export const INTERNET_ARCHIVE_PAGE_SIZE = 20

// Sanity cutoff to weed out movies too recent to plausibly be public domain
// (looser than the strict 95-year US rule, to avoid over-filtering).
export const PUBLIC_DOMAIN_YEAR_CUTOFF = 1990

export const INTERNET_ARCHIVE_BASE_QUERY = [
  'collection:feature_films',
  'mediatype:movies',
  'format:"Archive BitTorrent"',
  `date:[1870-01-01 TO ${PUBLIC_DOMAIN_YEAR_CUTOFF}-12-31]`
]

export const NON_MOVIE_TITLE_RE = /\b(trailer|teaser|commercial|promo|clip|vhs|raw footage|home video|newsreel|advertisement|test|episode|b-roll)\b/i
export const NON_MOVIE_SUBJECT_RE = /\b(commercials|home movies|promos|newsreels)\b/i

export function metadataValues(value?: ArchiveMetadataValue): string[] {
  if (value === undefined || value === null) return []
  return (Array.isArray(value) ? value : [value])
    .map(item => String(item).trim())
    .filter(Boolean)
}

export function metadataText(value?: ArchiveMetadataValue): string {
  return metadataValues(value)
    .join(', ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function metadataYear(movie: InternetArchiveRawMovie): string | number {
  const explicitYear = metadataValues(movie.year)[0]
  if (explicitYear) return explicitYear

  const date = metadataValues(movie.date)[0]
  return date?.match(/\b(?:18|19|20)\d{2}\b/)?.[0] || 'N/A'
}

export function escapeInternetArchiveQuery(value: string): string {
  return value.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1')
}

export function isLikelyMovie(movie: InternetArchiveRawMovie): boolean {
  const title = metadataText(movie.title)
  if (!title || title.trim().length < 2) return false
  if (NON_MOVIE_TITLE_RE.test(title)) return false

  const subject = metadataText(movie.subject)
  if (NON_MOVIE_SUBJECT_RE.test(subject)) return false

  return true
}
