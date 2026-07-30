import type { Movie } from '../../types/movie'
import type { IMovieSourceProvider, MovieSearchParams, MovieSourceId } from './types'

export const PUBLIC_DOMAIN_TORRENTS_DATABASE: Movie[] = [
  {
    id: 'pdt-sintel',
    title: 'Sintel (Test P2P)',
    genre: 'Animation, Short',
    year: 2010,
    rating: 7.6,
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Sintel_poster.jpg',
    source: 'Public Domain Torrents',
    description: 'A young woman named Sintel searches for her baby dragon, Scales, in a beautiful fantasy world.',
    creator: 'Colin Levy',
    language: 'English',
    downloads: 50000,
    hash: 'magnet:?xt=urn:btih:08ada5a7a618a59854e12273b10ec43b1b527146&dn=Sintel&tr=udp://tracker.coppersurfer.tk:6969/announce&tr=udp://tracker.openbittorrent.com:80/announce',
    torrentUrl: 'https://webtorrent.io/torrents/sintel.torrent',
    detailsUrl: 'https://durian.blender.org/',
    torrents: [
      {
        url: 'https://webtorrent.io/torrents/sintel.torrent',
        hash: '08ada5a7a618a59854e12273b10ec43b1b527146',
        quality: '720p',
        type: 'web',
        seeds: 154,
        peers: 42,
        size: '650 MB'
      }
    ]
  },
  {
    id: 'pdt-charade-1963',
    title: 'Charade',
    genre: 'Mystery, Romance, Thriller',
    year: 1963,
    rating: 7.9,
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Charade_%281963_poster%29.jpg',
    source: 'Public Domain Torrents',
    description: 'Romance and suspense ensue in Paris as a woman is pursued by several men who want a fortune her murdered husband had stolen.',
    creator: 'Stanley Donen',
    language: 'English',
    downloads: 18450,
    hash: 'magnet:?xt=urn:btih:6a9780003b6329a1b6592237894a4c6a66698687&dn=Charade_1963_PublicDomain&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/Charade_1963.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/Charade_1963.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/Charade_1963.torrent',
        hash: '6a9780003b6329a1b6592237894a4c6a66698687',
        quality: '720p',
        type: 'bluray',
        seeds: 42,
        peers: 12,
        size: '1.45 GB'
      }
    ]
  },
  {
    id: 'pdt-night-of-living-dead-1968',
    title: 'Night of the Living Dead',
    genre: 'Horror',
    year: 1968,
    rating: 7.8,
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Night_of_the_Living_Dead_%281968%29_poster.jpg',
    source: 'Public Domain Torrents',
    description: 'A ragtag group of Pennsylvanians barricade themselves in an old farmhouse to remain safe from a horde of flesh-eating ghouls.',
    creator: 'George A. Romero',
    language: 'English',
    downloads: 32100,
    hash: 'magnet:?xt=urn:btih:3c4078bd4a496b82098b671d1796c0032b4fbf3c&dn=Night_Of_The_Living_Dead_1968&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/Night_of_the_Living_Dead_1968.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/Night_of_the_Living_Dead_1968.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/Night_of_the_Living_Dead_1968.torrent',
        hash: '3c4078bd4a496b82098b671d1796c0032b4fbf3c',
        quality: '1080p',
        type: 'web-dl',
        seeds: 85,
        peers: 24,
        size: '1.82 GB'
      }
    ]
  },
  {
    id: 'pdt-his-girl-friday-1940',
    title: 'His Girl Friday',
    genre: 'Comedy, Romance',
    year: 1940,
    rating: 7.8,
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/15/His_Girl_Friday_poster.jpg',
    source: 'Public Domain Torrents',
    description: 'A newspaper editor uses every trick in the book to keep his ace reporter ex-wife from remarrying.',
    creator: 'Howard Hawks',
    language: 'English',
    downloads: 14200,
    hash: 'magnet:?xt=urn:btih:e61a29bd4a796b82098b671d1796c0032b4fbf99&dn=His_Girl_Friday_1940&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/His_Girl_Friday_1940.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/His_Girl_Friday_1940.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/His_Girl_Friday_1940.torrent',
        hash: 'e61a29bd4a796b82098b671d1796c0032b4fbf99',
        quality: '720p',
        type: 'web',
        seeds: 38,
        peers: 9,
        size: '1.10 GB'
      }
    ]
  },
  {
    id: 'pdt-the-general-1926',
    title: 'The General',
    genre: 'Action, Adventure, Comedy',
    year: 1926,
    rating: 8.1,
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/The_General_%281926_poster%29.jpg',
    source: 'Public Domain Torrents',
    description: 'When Union spies steal an engineer’s beloved locomotive, he pursues it single-handedly through enemy lines.',
    creator: 'Buster Keaton, Clyde Bruckman',
    language: 'Silent (English intertitles)',
    downloads: 21900,
    hash: 'magnet:?xt=urn:btih:b101188bd4a496b82098b671d1796c0032b4fbf12&dn=The_General_1926&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/The_General_1926.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/The_General_1926.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/The_General_1926.torrent',
        hash: 'b101188bd4a496b82098b671d1796c0032b4fbf12',
        quality: '1080p',
        type: 'remaster',
        seeds: 54,
        peers: 15,
        size: '1.65 GB'
      }
    ]
  },
  {
    id: 'pdt-carnival-of-souls-1962',
    title: 'Carnival of Souls',
    genre: 'Horror, Mystery',
    year: 1962,
    rating: 7.1,
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Carnival_of_Souls_%281962%29_poster.jpg',
    source: 'Public Domain Torrents',
    description: 'After a tragic drag race accident, a young woman moves to Utah and finds herself drawn to a mysterious abandoned pavilion.',
    creator: 'Herk Harvey',
    language: 'English',
    downloads: 9800,
    hash: 'magnet:?xt=urn:btih:c62238bd4a496b82098b671d1796c0032b4fbf44&dn=Carnival_Of_Souls_1962&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/Carnival_of_Souls_1962.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/Carnival_of_Souls_1962.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/Carnival_of_Souls_1962.torrent',
        hash: 'c62238bd4a496b82098b671d1796c0032b4fbf44',
        quality: '720p',
        type: 'web',
        seeds: 29,
        peers: 6,
        size: '950 MB'
      }
    ]
  },
  {
    id: 'pdt-metropolis-1927',
    title: 'Metropolis',
    genre: 'Sci-Fi, Drama',
    year: 1927,
    rating: 8.3,
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Metropolis_poster_1927.jpg',
    source: 'Public Domain Torrents',
    description: 'In a futuristic city sharply divided between the working class and the city planners, the son of the city’s mastermind falls in love with a working-class prophet.',
    creator: 'Fritz Lang',
    language: 'Silent (German intertitles)',
    downloads: 41200,
    hash: 'magnet:?xt=urn:btih:d73348bd4a496b82098b671d1796c0032b4fbf55&dn=Metropolis_1927&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/Metropolis_1927.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/Metropolis_1927.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/Metropolis_1927.torrent',
        hash: 'd73348bd4a496b82098b671d1796c0032b4fbf55',
        quality: '1080p',
        type: 'restored',
        seeds: 92,
        peers: 31,
        size: '2.10 GB'
      }
    ]
  },
  {
    id: 'pdt-plan-9-from-outer-space-1959',
    title: 'Plan 9 from Outer Space',
    genre: 'Horror, Sci-Fi',
    year: 1959,
    rating: 4.0,
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Plan_9_from_Outer_Space_poster.jpg',
    source: 'Public Domain Torrents',
    description: 'Aliens implement "Plan 9", a scheme to resurrect Earth’s dead as ghastly ghouls to stop humanity from creating a universe-destroying bomb.',
    creator: 'Ed Wood',
    language: 'English',
    downloads: 25400,
    hash: 'magnet:?xt=urn:btih:e84458bd4a496b82098b671d1796c0032b4fbf66&dn=Plan_9_From_Outer_Space_1959&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/Plan_9_from_Outer_Space_1959.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/Plan_9_from_Outer_Space_1959.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/Plan_9_from_Outer_Space_1959.torrent',
        hash: 'e84458bd4a496b82098b671d1796c0032b4fbf66',
        quality: '720p',
        type: 'web',
        seeds: 48,
        peers: 14,
        size: '1.05 GB'
      }
    ]
  },
  {
    id: 'pdt-little-shop-of-horrors-1960',
    title: 'The Little Shop of Horrors',
    genre: 'Comedy, Horror',
    year: 1960,
    rating: 6.2,
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Little_Shop_of_Horrors_poster.jpg',
    source: 'Public Domain Torrents',
    description: 'A clumsy florist’s assistant raises a plant that feeds on human blood and flesh.',
    creator: 'Roger Corman',
    language: 'English',
    downloads: 16700,
    hash: 'magnet:?xt=urn:btih:f95568bd4a496b82098b671d1796c0032b4fbf77&dn=The_Little_Shop_Of_Horrors_1960&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/The_Little_Shop_of_Horrors_1960.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/The_Little_Shop_of_Horrors_1960.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/The_Little_Shop_of_Horrors_1960.torrent',
        hash: 'f95568bd4a496b82098b671d1796c0032b4fbf77',
        quality: '720p',
        type: 'web',
        seeds: 33,
        peers: 8,
        size: '980 MB'
      }
    ]
  },
  {
    id: 'pdt-house-on-haunted-hill-1959',
    title: 'House on Haunted Hill',
    genre: 'Horror, Mystery',
    year: 1959,
    rating: 6.8,
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/House_on_Haunted_Hill_1959_poster.jpg',
    source: 'Public Domain Torrents',
    description: 'An eccentric millionaire offers $10,000 to five people who agree to stay overnight in a haunted house with him and his wife.',
    creator: 'William Castle',
    language: 'English',
    downloads: 19300,
    hash: 'magnet:?xt=urn:btih:a06678bd4a496b82098b671d1796c0032b4fbf88&dn=House_On_Haunted_Hill_1959&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/House_on_Haunted_Hill_1959.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/House_on_Haunted_Hill_1959.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/House_on_Haunted_Hill_1959.torrent',
        hash: 'a06678bd4a496b82098b671d1796c0032b4fbf88',
        quality: '1080p',
        type: 'web',
        seeds: 51,
        peers: 16,
        size: '1.28 GB'
      }
    ]
  },
  {
    id: 'pdt-vampire-bat-1933',
    title: 'The Vampire Bat',
    genre: 'Horror, Mystery',
    year: 1933,
    rating: 6.1,
    image: 'https://upload.wikimedia.org/wikipedia/commons/2/25/The_Vampire_Bat_poster.jpg',
    source: 'Public Domain Torrents',
    description: 'When corpses drained of blood begin to accumulate in a German village, townspeople suspect a foolish local man obsessed with bats.',
    creator: 'Frank R. Strayer',
    language: 'English',
    downloads: 8400,
    hash: 'magnet:?xt=urn:btih:b17788bd4a496b82098b671d1796c0032b4fbf99&dn=The_Vampire_Bat_1933&tr=udp://tracker.opentrackr.org:1337/announce',
    torrentUrl: 'http://www.publicdomain-torrents.com/bt/The_Vampire_Bat_1933.torrent',
    detailsUrl: 'http://www.publicdomain-torrents.com/nfo/The_Vampire_Bat_1933.html',
    torrents: [
      {
        url: 'http://www.publicdomain-torrents.com/bt/The_Vampire_Bat_1933.torrent',
        hash: 'b17788bd4a496b82098b671d1796c0032b4fbf99',
        quality: '720p',
        type: 'web',
        seeds: 22,
        peers: 5,
        size: '880 MB'
      }
    ]
  }
]

export class PublicDomainTorrentsSourceProvider implements IMovieSourceProvider {
  readonly id: MovieSourceId = 'publicdomain_torrents'
  readonly name = 'Public Domain Torrents'

  async searchMovies(params: MovieSearchParams): Promise<Movie[]> {
    const { query = '', genre = '', minRating = 0, sortBy = 'download_count', order = 'desc', page = 1, limit = 20 } = params

    let filtered = [...PUBLIC_DOMAIN_TORRENTS_DATABASE]

    // 1. Text Search Filter
    if (query.trim()) {
      const q = query.toLowerCase().trim()
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.genre || '').toLowerCase().includes(q)
      )
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
