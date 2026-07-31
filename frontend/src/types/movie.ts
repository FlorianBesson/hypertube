export interface Movie {
  id: string
  title: string
  genre: string
  year: string | number
  rating: number
  image: string
  source?: string
  torrents?: Torrent[]
  description?: string
  creator?: string
  language?: string
  downloads?: number
  torrentUrl?: string
  detailsUrl?: string
  tmdbId?: number
  imdbId?: string
  hash?: string
  runtime?: number
  backdropPath?: string
  budget?: number
  revenue?: number
  genres?: string[]
  cast?: { name: string; character?: string; profilePath?: string }[]
  director?: string
  trailerUrl?: string
}

export interface Torrent {
  url: string
  hash: string
  quality: string
  type: string
  is_repack?: string
  video_codec?: string
  bit_depth?: string
  audio_channels?: string
  seeds?: number
  peers?: number
  size?: string
  size_bytes?: number
  date_uploaded?: string
  date_uploaded_unix?: number
}

export type ArchiveMetadataValue = string | number | Array<string | number>

export interface InternetArchiveRawMovie {
  identifier: string
  title?: ArchiveMetadataValue
  description?: ArchiveMetadataValue
  creator?: ArchiveMetadataValue
  date?: ArchiveMetadataValue
  year?: ArchiveMetadataValue
  subject?: ArchiveMetadataValue
  language?: ArchiveMetadataValue
  downloads?: number
  avg_rating?: number
}

export interface InternetArchiveSearchResponse {
  response?: {
    numFound?: number
    start?: number
    docs?: InternetArchiveRawMovie[]
  }
}
