# Technology Stack

**Project:** Hypertube — BitTorrent streaming web application
**Researched:** 2026-03-27
**Overall Confidence:** MEDIUM-HIGH

---

## 1. Torrent Libraries (Allowed — NOT webtorrent/pulsar/peerflix)

### Primary Recommendation: `torrent-stream`

`torrent-stream` is the low-level engine that peerflix itself is built on. Since the subject forbids peerflix (the CLI wrapper) but not its engine, `torrent-stream` is the correct choice.

**Why it works:**
- Exposes torrent files as Node.js readable streams via `file.createReadStream()`
- Automatically prioritizes pieces needed by active streams
- Supports byte-range slicing via `start`/`end` options — exactly what HTTP range requests need
- Operates independently: connects to DHT, fetches peers, downloads pieces without requiring webtorrent

**Maintenance note:** Last commit March 2018. The library is essentially frozen but stable. The BitTorrent protocol hasn't changed, and it has 2000+ GitHub stars, 227 forks, and active dependents. Test on Node 24 early — native addon (leveldb) may need rebuild.

**Core API:**

```javascript
const torrentStream = require('torrent-stream');

const engine = torrentStream('magnet:?xt=urn:btih:...', {
  tmp: '/tmp/hypertube',      // download directory
  path: '/tmp/hypertube',     // same
  trackers: [                 // extra trackers for better peer discovery
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://tracker.openbittorrent.com:6969/announce',
  ]
});

engine.on('ready', () => {
  // engine.files is an array of file objects
  const videoFile = engine.files.find(f => f.name.match(/\.(mp4|mkv|avi|mov)$/i));

  videoFile.select(); // start downloading this file

  // Range request streaming:
  const stream = videoFile.createReadStream({ start: 0, end: videoFile.length - 1 });
  // start and end are inclusive byte offsets
});
```

**CRITICAL GOTCHA — First/Last Piece Trick:**
Video players need the first AND last pieces of a file to determine codec info and file length before playback starts. Without the last piece, many players will refuse to play or show duration as 0:00.

```javascript
// After engine.on('ready'), select the file and pre-fetch boundary pieces:
videoFile.select();
const pieceLength = engine.torrent.pieceLength;
const fileEnd = videoFile.offset + videoFile.length - 1;
// Create a small stream to pull the last piece into priority queue:
const lastPieceStream = videoFile.createReadStream({
  start: Math.max(0, videoFile.length - pieceLength),
  end: videoFile.length - 1,
});
lastPieceStream.on('data', () => {}); // drain it
lastPieceStream.on('end', () => lastPieceStream.destroy());
```

### Supporting Libraries

| Library | Purpose | Notes |
|---------|---------|-------|
| `parse-torrent` | Parse magnet URIs and .torrent files into metadata | From webtorrent org but NOT webtorrent itself; extracts infoHash, name, announce |
| `bittorrent-protocol` | Low-level peer wire protocol | Use if building custom client from scratch |
| `bittorrent-dht` | DHT peer discovery | Dependency of torrent-stream, can be used standalone |
| `node-bencode` / `bencode` | Encode/decode bencoded data | Needed if parsing raw .torrent files manually |

**parse-torrent is safe to use** — it is a standalone utility, not the streaming client. The restriction is on webtorrent/pulsar/peerflix (the streaming clients), not on their parsing utilities.

---

## 2. Streaming Architecture

### The Core Pipeline

```
[Magnet/Hash]
     |
[torrent-stream engine]  ← connects to DHT, finds peers, downloads pieces
     |
[file.createReadStream({ start, end })]  ← Node.js Readable
     |
     ├─→ [Direct pipe] → HTTP 206 response (for native mp4/webm)
     |
     └─→ [fluent-ffmpeg stdin] → [ffmpeg process] → [ffmpeg stdout] → HTTP response
                                     ↑
                            (mkv → mp4 or webm transcode)
```

### HTTP Range Request Handling

This is non-trivial and must be implemented correctly or video seeking breaks entirely.

**The request/response cycle:**

```
Browser → GET /stream/:infoHash HTTP/1.1
          Range: bytes=10485760-   (user seeked to ~10MB mark)

Server  → HTTP/1.1 206 Partial Content
          Content-Range: bytes 10485760-104857600/104857600
          Content-Type: video/mp4
          Accept-Ranges: bytes
          Content-Length: 94371840
```

**Implementation pattern for Hono:**

```typescript
import { Hono } from 'hono';
import torrentStream from 'torrent-stream';

const app = new Hono();

app.get('/stream/:infoHash', async (c) => {
  const engine = getOrCreateEngine(c.req.param('infoHash')); // cached engine map

  return new Promise((resolve) => {
    engine.on('ready', () => {
      const file = engine.files.find(f => isVideoFile(f.name));
      const fileSize = file.length;

      const rangeHeader = c.req.header('Range');
      let start = 0;
      let end = fileSize - 1;

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        start = parseInt(match[1], 10);
        end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
      }

      const chunkSize = end - start + 1;
      const torrentStream = file.createReadStream({ start, end });

      // Hono on Node.js: use a web-compatible ReadableStream
      const webStream = ReadableStream.from(torrentStream);

      resolve(
        new Response(webStream, {
          status: rangeHeader ? 206 : 200,
          headers: {
            'Content-Type': getMimeType(file.name),
            'Content-Length': String(chunkSize),
            'Accept-Ranges': 'bytes',
            'Content-Range': rangeHeader
              ? `bytes ${start}-${end}/${fileSize}`
              : undefined,
          },
        })
      );
    });
  });
});
```

**Hono streaming note:** Hono's built-in `stream()` helper may buffer the full response on Node.js adapter (known issue: https://github.com/honojs/hono/issues/4154). Use raw `new Response(readableStream)` instead when streaming large binary data. The Node.js web stream `ReadableStream.from(nodeReadable)` converts a Node.js stream to a WHATWG ReadableStream.

### How Much Data Before Playback Starts?

- For **native mp4/webm**: Browser can start playing after receiving the `moov` atom (metadata). If mp4 was encoded with `-movflags faststart`, this is at the beginning of the file. Expect ~200KB–2MB before playback begins, depending on the file.
- For **mkv → ffmpeg transcode**: Playback starts as soon as ffmpeg emits the first output frames. Use `-movflags frag_keyframe+empty_moov` to ensure the browser gets decodable data immediately without a complete moov atom.
- Practically: expect 5–30 seconds wait depending on peer availability and network speed.

### Engine Lifecycle Management

**Critical:** Do not create a new engine per request. Cache engines by infoHash and reuse:

```typescript
const engines = new Map<string, Engine>();

function getOrCreateEngine(infoHash: string) {
  if (!engines.has(infoHash)) {
    const engine = torrentStream(`magnet:?xt=urn:btih:${infoHash}`);
    engines.set(infoHash, engine);
  }
  return engines.get(infoHash)!;
}
```

**Cleanup:** Destroy engines that have been idle. Implement a TTL-based eviction (e.g., destroy after 30min of no active streams). Call `engine.destroy()` to close connections and free ports.

---

## 3. FFmpeg Integration

### The MP4 Streaming Problem

Standard MP4 containers store the `moov` atom (metadata) at the **end** of the file. You cannot stream a standard MP4 without first seeking to the end — which means you need the full file. This is why FFmpeg flags matter critically.

### Recommended Approach: Fragmented MP4 (fMP4)

For mkv → mp4 transcoding intended for streaming:

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';

function transcodeToMP4(inputStream: NodeJS.ReadableStream): NodeJS.ReadableStream {
  const output = new PassThrough();

  ffmpeg(inputStream)
    .inputFormat('matroska')      // or let ffmpeg auto-detect
    .videoCodec('libx264')        // re-encode video
    .audioCodec('aac')            // re-encode audio
    .outputOptions([
      '-movflags frag_keyframe+empty_moov+default_base_moof',
      // frag_keyframe: fragment at each keyframe
      // empty_moov: write moov atom first (before mdat) → browser can start playing immediately
      // default_base_moof: improves compatibility
      '-preset ultrafast',        // fastest encode, lower quality — good for streaming
      '-crf 23',                  // quality level
      '-g 52',                    // keyframe interval (every ~2s at 25fps)
    ])
    .toFormat('mp4')
    .pipe(output, { end: true })
    .on('error', (err) => {
      console.error('FFmpeg error:', err.message);
      output.destroy(err);
    });

  return output;
}
```

### For WebM (no re-encoding, just remux if source is VP8/VP9)

```typescript
function transcodeToWebM(inputStream: NodeJS.ReadableStream): NodeJS.ReadableStream {
  const output = new PassThrough();

  ffmpeg(inputStream)
    .videoCodec('libvpx-vp9')
    .audioCodec('libopus')
    .outputOptions(['-deadline realtime', '-cpu-used 8'])
    .toFormat('webm')
    .pipe(output, { end: true });

  return output;
}
```

### Copy Instead of Re-encode (fastest path)

If the source container is mkv but codecs are already H.264+AAC (common), just remux without re-encoding:

```typescript
ffmpeg(inputStream)
  .videoCodec('copy')     // no re-encode
  .audioCodec('copy')     // no re-encode
  .outputOptions(['-movflags frag_keyframe+empty_moov'])
  .toFormat('mp4')
  .pipe(output, { end: true });
```

This starts nearly instantly (no encoding delay) and produces valid fragmented MP4.

### Seeking with Transcoded Content

**CRITICAL LIMITATION:** You cannot support HTTP byte-range seeking on a live transcode stream. The browser requests `Range: bytes=50000000-` but ffmpeg has only produced the first 10MB so far — byte ranges don't map to timestamps.

**Solution: Timestamp-based seeking**

When user seeks, kill the current ffmpeg process and start a new one with `-ss` input flag:

```typescript
ffmpeg(inputStream)
  .inputOptions([`-ss ${seekSeconds}`])  // seek BEFORE input (fast, less accurate)
  // OR:
  .outputOptions([`-ss ${seekSeconds}`]) // seek AFTER decode (slow, frame-accurate)
  .videoCodec('copy')
  .audioCodec('copy')
  .outputOptions(['-movflags frag_keyframe+empty_moov'])
  .toFormat('mp4')
  .pipe(output);
```

The frontend must intercept the HTML5 video `seeking` event and make a new request:
`GET /stream/:infoHash?t=120` → server starts ffmpeg at 120s.

### Detecting If Transcoding is Needed

```typescript
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfprobePath(ffprobePath);

function needsTranscode(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return resolve(true); // transcode if unknown
      const vStream = metadata.streams.find(s => s.codec_type === 'video');
      const aStream = metadata.streams.find(s => s.codec_type === 'audio');
      const safeVideo = ['h264', 'vp8', 'vp9'].includes(vStream?.codec_name ?? '');
      const safeAudio = ['aac', 'mp3', 'opus', 'vorbis'].includes(aStream?.codec_name ?? '');
      resolve(!safeVideo || !safeAudio);
    });
  });
}
```

**NOTE:** `ffprobe` requires reading file metadata, which consumes stream bytes. On a torrent stream you cannot `ffprobe` a live stream without buffering. Either:
1. Probe only after first N pieces are downloaded (check file extension heuristically first)
2. Use the file extension as a proxy: `.mkv` almost always needs remux, `.mp4` usually does not

### Docker FFmpeg Installation

```dockerfile
FROM node:24-alpine
RUN apk add --no-cache ffmpeg
# ffmpeg binary will be at /usr/bin/ffmpeg
```

Or use `@ffmpeg-installer/ffmpeg` npm package which bundles a static ffmpeg binary (avoids Docker layer complexity).

---

## 4. YTS API

**Base URL:** `https://yts.mx/api/v2/`
**Authentication:** None required — completely open API
**Rate limits:** Not formally documented; cache aggressively. No key, no OAuth.

### Endpoints

#### Search / List Movies

```
GET https://yts.mx/api/v2/list_movies.json
```

Parameters:
| Param | Values | Notes |
|-------|--------|-------|
| `query_term` | string | Search by title, actor, or director |
| `limit` | 1–50 (default 20) | Results per page |
| `page` | integer | Pagination |
| `quality` | `720p`, `1080p`, `3D` | Filter by quality |
| `minimum_rating` | 0–9 | IMDb rating floor |
| `sort_by` | `title`, `year`, `rating`, `peers`, `seeds`, `download_count`, `like_count`, `date_added` | |
| `genre` | string | e.g., `action`, `comedy`, `drama` |
| `with_rt_ratings` | boolean | Include Rotten Tomatoes scores |

Response structure:
```json
{
  "status": "ok",
  "data": {
    "movie_count": 51234,
    "limit": 20,
    "page_number": 1,
    "movies": [
      {
        "id": 2,
        "title": "Interstellar",
        "year": 2014,
        "rating": 8.6,
        "runtime": 169,
        "genres": ["Adventure", "Drama", "Sci-Fi"],
        "summary": "...",
        "language": "English",
        "medium_cover_image": "https://yts.mx/assets/images/movies/...",
        "torrents": [
          {
            "hash": "E3A3B5F5E6B7C4D1...",
            "quality": "1080p",
            "type": "bluray",
            "seeds": 4521,
            "peers": 1043,
            "size": "1.98 GB",
            "size_bytes": 2124522905
          }
        ]
      }
    ]
  }
}
```

#### Movie Details

```
GET https://yts.mx/api/v2/movie_details.json?movie_id=2&with_images=true&with_cast=true
```

#### Constructing Magnet Links

YTS provides the torrent `hash` but not the magnet link directly. Construct it:

```typescript
function buildMagnet(hash: string, title: string): string {
  const trackers = [
    'udp://open.demonii.com:1337/announce',
    'udp://tracker.openbittorrent.com:80',
    'udp://tracker.coppersurfer.tk:6969',
    'udp://glotorrents.pw:6969/announce',
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://torrent.gresille.org:80/announce',
    'udp://p4p.arenabg.com:1337',
    'udp://tracker.leechers-paradise.org:6969',
  ];
  const dn = encodeURIComponent(title);
  const trList = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
  return `magnet:?xt=urn:btih:${hash}&dn=${dn}${trList}`;
}
```

**Reliability note:** YTS has multiple mirror domains (`yts.mx`, `yts.lt`, `yts.am`). The main domain may be blocked in some Docker/CI environments. Consider implementing a fallback chain.

---

## 5. The Pirate Bay

### Official Internal API: apibay.org

TPB runs an internal JSON API at `apibay.org`. No scraping needed — this is the same API the website uses internally.

**Base URL:** `https://apibay.org/`

#### Search

```
GET https://apibay.org/q.php?q={query}&cat=0
```

Response: JSON array of torrent objects:
```json
[
  {
    "id": "47393068",
    "name": "Interstellar.2014.1080p.BluRay.x264",
    "info_hash": "E3A3B5F5E6B7C4D1...",
    "leechers": "84",
    "seeders": "1205",
    "num_files": "2",
    "size": "3093004705",
    "username": "YIFY",
    "added": "1418486520",
    "status": "vip",
    "category": "207",
    "imdb": "tt0816692"
  }
]
```

When no results found, returns `[{"id":"0","name":"No results returned","info_hash":"0000000000000000000000000000000000000000",...}]` — check for this sentinel.

#### Other Endpoints

```
GET https://apibay.org/precompiled/data_top100_all.json   # Top 100 all
GET https://apibay.org/precompiled/data_top100_{cat}.json # Top 100 by category
```

Category codes for video: `200` = Video, `201` = Movies, `202` = Movies DVDR, `207` = HD Movies

#### Constructing Magnets from TPB Results

```typescript
function tpbMagnet(infoHash: string, name: string): string {
  const trackers = [
    'udp://tracker.openbittorrent.com:80',
    'udp://tracker.opentrackr.org:1337/announce',
  ];
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}`
    + trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
}
```

#### Reliability Considerations

- `apibay.org` is blocked in many countries and school networks. Your Docker container may not have access.
- Use a wrapper library like `apibay` (npm: `apibay`, TypeScript, updated March 2026) which supports configuring a custom base URL / mirror.
- Implement a health-check and fallback to a mirror: `apibay.org`, `thepiratebay.org/apibay`, etc.
- Test from your school's Docker environment early — VPN or proxy may be needed.

---

## 6. Video Metadata: OMDb vs TMDb

### Recommendation: TMDb

| Criterion | OMDb | TMDb |
|-----------|------|------|
| Free tier | 1,000 requests/day | ~40 req/10s (generous) |
| API key | Yes ($1/month Patreon OR free limited) | Yes, free no-cost registration |
| Cast data | Yes (with `&plot=full`) | Yes, separate `/credits` endpoint |
| Poster images | URL string | Full CDN at `image.tmdb.org/t/p/w500{path}` |
| Authentication | Simple query param `?apikey=` | Bearer token OR `?api_key=` param |
| Data quality | Good (IMDb-backed) | Excellent, community-maintained |
| Language | English only | Multi-language |
| Complexity | Very simple | Slightly more complex (multi-endpoint) |

**Use TMDb.** The free tier is more practical (rate limit by RPS not by day), image hosting is included, and cast/crew data is richer. OMDb's 1000/day limit is unusable in a school project with multiple concurrent users.

### TMDb Key Endpoints

```
# Search movies
GET https://api.themoviedb.org/3/search/movie?query=Interstellar&api_key=YOUR_KEY

# Movie details
GET https://api.themoviedb.org/3/movie/{tmdb_id}?api_key=YOUR_KEY

# Cast and crew
GET https://api.themoviedb.org/3/movie/{tmdb_id}/credits?api_key=YOUR_KEY

# Poster image (no API key needed)
https://image.tmdb.org/t/p/w500{poster_path}
```

### Matching YTS/TPB Results to TMDb

YTS provides IMDb IDs in its `imdb_code` field. TPB apibay.org also returns `imdb` field. Use this to look up TMDb directly:

```
GET https://api.themoviedb.org/3/find/{imdb_id}?external_source=imdb_id&api_key=YOUR_KEY
```

This is the cleanest lookup path — no fuzzy title matching needed.

---

## 7. Subtitle Fetching

### OpenSubtitles REST API v1

**Base URL:** `https://api.opensubtitles.com/api/v1`
**Authentication:** `Api-Key` header (free key from opensubtitles.com developer registration)
**Free tier limits:** ~20 downloads/day per account. For a school project, register one shared API key and cache subtitle files to disk.

#### Step 1: Search

```typescript
const response = await fetch(
  `https://api.opensubtitles.com/api/v1/subtitles?imdb_id=${imdbId}&languages=en,fr`,
  {
    headers: {
      'Api-Key': process.env.OPENSUBTITLES_API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'Hypertube v1.0',
    }
  }
);
const data = await response.json();
const subtitles = data.data; // array of subtitle objects
// Each has: subtitle.attributes.files[0].file_id
```

#### Step 2: Get Download Link

```typescript
const dlResponse = await fetch('https://api.opensubtitles.com/api/v1/download', {
  method: 'POST',
  headers: {
    'Api-Key': process.env.OPENSUBTITLES_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ file_id: fileId }),
});
const { link } = await dlResponse.json();
// link is a temporary download URL (expires ~24h)
```

#### Step 3: Download + Convert SRT → WebVTT

```typescript
import srt2vtt from 'srt-to-vtt'; // mafintosh/srt-to-vtt
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

// Download SRT and convert to VTT in one pipeline:
const srtStream = await fetch(link).then(r => r.body);
const nodeReadable = Readable.fromWeb(srtStream);

await pipeline(
  nodeReadable,
  srt2vtt(),
  createWriteStream('/tmp/subtitles/movie-en.vtt')
);
```

HTML5 video usage:
```html
<video>
  <source src="/stream/INFOHASH" type="video/mp4" />
  <track kind="subtitles" src="/subtitles/IMDB_ID/en" srclang="en" label="English" default />
</video>
```

**Caching:** Always cache fetched subtitles to disk. Do not re-fetch on every request — the free tier will exhaust in minutes under concurrent users.

**Alternative approach:** If OpenSubtitles rate limits are hit, `subsrt` npm library supports multiple formats and can be used for offline conversion if subtitle files are obtained elsewhere.

---

## 8. OAuth with 42 Intra

### Library: `passport-42`

```bash
npm install passport passport-42 express-session
```

**Note on Hono compatibility:** Passport.js was designed for Express. With Hono on Node.js, use `@hono/node-server` and integrate Passport via middleware adapter. Alternatively, implement OAuth2 manually using `passport-oauth2` as the base strategy.

### 42 OAuth2 Endpoints

| Purpose | URL |
|---------|-----|
| Authorization | `https://api.intra.42.fr/oauth/authorize` |
| Token exchange | `https://api.intra.42.fr/oauth/token` |
| User profile | `https://api.intra.42.fr/v2/me` |
| Token info | `https://api.intra.42.fr/oauth/token/info` |

### passport-42 Configuration

```typescript
import passport from 'passport';
import { Strategy as FortyTwoStrategy } from 'passport-42';

passport.use(new FortyTwoStrategy(
  {
    clientID: process.env.FT_CLIENT_ID,
    clientSecret: process.env.FT_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/42/callback',
    // profileFields maps passport profile keys to 42 API field paths:
    profileFields: {
      'id':           function(obj) { return String(obj.id); },
      'username':     'login',
      'displayName':  'displayname',
      'emails':       [{ value: 'email' }],
      'photos':       [{ value: 'image.link' }],
    }
  },
  async (accessToken, refreshToken, profile, done) => {
    // profile.id = 42 user ID
    // profile.username = login (e.g., "jdoe")
    // profile.emails[0].value = email
    // profile.photos[0].value = avatar URL
    const user = await upsertUser({
      fortyTwoId: profile.id,
      login: profile.username,
      email: profile.emails[0].value,
      avatar: profile.photos[0].value,
    });
    return done(null, user);
  }
));
```

### Routes

```typescript
// Initiate OAuth flow
app.get('/auth/42',
  passport.authenticate('42')
);

// Callback after 42 grants access
app.get('/auth/42/callback',
  passport.authenticate('42', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);
```

### Hono + Passport Integration Pattern

Passport expects Express-compatible `req.session`, `req.login()`, etc. With Hono:

```typescript
import { serve } from '@hono/node-server';
import express from 'express'; // only for passport middleware
// OR: implement OAuth2 token exchange manually without passport
```

**Simpler alternative for Hono:** Skip passport entirely and implement the OAuth2 code exchange manually. It's only ~30 lines:

```typescript
// 1. Redirect to 42 authorize URL
// 2. Receive ?code= callback
// 3. POST to token endpoint with code + client_secret
// 4. GET /v2/me with access_token
// 5. Upsert user in DB, create JWT session
```

This avoids the Express/Passport compatibility surface entirely and pairs naturally with Hono's JWT middleware.

---

## 9. Download Storage Strategy

### Where Videos Live

Downloaded torrent pieces must be stored somewhere. Options:

| Strategy | Pros | Cons |
|----------|------|------|
| Docker named volume | Persists across restarts | Manual cleanup needed |
| `/tmp` | Automatic OS cleanup | Lost on container restart |
| Dedicated download dir with TTL eviction | Clean control | Must implement eviction |

**Recommendation:** Mount a Docker volume at `/downloads/`. Implement a cleanup job: if a torrent has not been streamed in 30 days, delete it. The 42 subject requires this cleanup behavior.

```typescript
// Track last access time in DB:
// model TorrentCache { infoHash, filePath, lastAccessedAt }
// Cron: DELETE WHERE lastAccessedAt < NOW() - 30 days
```

---

## 10. Full Recommended Stack

### Core

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Hono | ^4.x | Web framework | Fast, edge-compatible, clean API |
| Node.js | 24 LTS | Runtime | Required by subject |
| React | ^18.x | Frontend | Required by subject |
| TypeScript | ^5.x | Language | Type safety across stack |

### Database & ORM

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16 | Primary database | Required by subject |
| Prisma | ^5.x | ORM | Type-safe, good migration tooling |

### Torrent & Streaming

| Package | Version | Purpose |
|---------|---------|---------|
| `torrent-stream` | ^2.0.0 | Core torrent download engine |
| `parse-torrent` | ^11.x | Parse magnet URIs, .torrent files |
| `fluent-ffmpeg` | ^2.1.x | FFmpeg wrapper for transcoding |
| `@ffmpeg-installer/ffmpeg` | ^1.x | Static ffmpeg binary (Docker-friendly) |
| `@ffprobe-installer/ffprobe` | ^1.x | Static ffprobe binary |

### External APIs

| Package | Purpose |
|---------|---------|
| `apibay` (npm) | TPB API TypeScript wrapper |
| Direct `fetch` | YTS API (no wrapper needed) |
| Direct `fetch` | TMDb API (no wrapper needed) |
| Direct `fetch` | OpenSubtitles API (no wrapper needed) |
| `srt-to-vtt` | SRT → WebVTT subtitle conversion |

### Auth

| Package | Purpose |
|---------|---------|
| `passport` + `passport-42` | 42 OAuth — OR manual OAuth2 (recommended for Hono) |
| `hono/jwt` | JWT session management |
| `bcrypt` | Local password hashing for non-OAuth users |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker + docker-compose | Containerization (required by subject) |
| Docker named volume | Persistent torrent download storage |
| Alpine Linux base | Minimal image size |

---

## 11. Installation

```bash
# Core framework
npm install hono @hono/node-server

# Torrent
npm install torrent-stream parse-torrent

# FFmpeg
npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe

# Subtitle conversion
npm install srt-to-vtt

# Auth
npm install passport passport-42
# OR skip passport for Hono-native auth

# External API clients (no npm package needed — use fetch)
# For TPB wrapper:
npm install apibay

# Dev
npm install -D typescript @types/node @types/fluent-ffmpeg @types/torrent-stream
```

---

## 12. Critical Gotchas Summary

1. **torrent-stream is a 2018 project** — test native dependency rebuild on Node 24 immediately. May need `npm rebuild` or a fork.

2. **MP4 seeking over live transcode is impossible** — implement timestamp-based seeking (`?t=120`), not byte-range seeking, for transcoded content. Only native mp4/webm files support byte-range seeking.

3. **The first/last piece trick is mandatory** — pre-fetch the last piece of the video file on engine ready. Without it, video player shows duration 0 and may refuse to play.

4. **Engine lifecycle** — one engine per infoHash, cached globally. Never create a new engine per HTTP request. Each engine opens ports and connections.

5. **Hono streaming caveat** — `stream()` helper may buffer on Node.js. Use `new Response(readableStream)` directly for video streaming.

6. **OpenSubtitles 20 downloads/day** — cache every subtitle file. This limit will be hit in minutes during testing if you don't cache.

7. **TPB apibay.org may be blocked** — test network access from your Docker container on the school network early. Have a mirror fallback.

8. **ffmpeg empty_moov + frag_keyframe is required** for browser-playable streaming output. Without these flags, the browser will not play until the full file is downloaded.

9. **Passport.js is Express-centric** — for Hono, manual OAuth2 implementation is cleaner and avoids session middleware compatibility issues.

10. **YTS API stability** — the domain changes periodically. Use `yts.mx` as primary, implement a fallback array.

---

## Sources

- torrent-stream GitHub: https://github.com/mafintosh/torrent-stream
- apibay GitHub: https://github.com/codeit-ninja/apibay
- fluent-ffmpeg seekable video issue: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/684
- YTS API documentation: https://github.com/BrokenEmpire/YTS/blob/master/API.md
- TMDb API Getting Started: https://developer.themoviedb.org/reference/intro/getting-started
- OpenSubtitles API guide: https://apidog.com/blog/opensubtitles-api/
- passport-42: https://www.passportjs.org/packages/passport-42/
- 42 API docs: https://api.intra.42.fr/apidoc
- srt-to-vtt: https://github.com/mafintosh/srt-to-vtt
- Hono streaming docs: https://hono.dev/docs/helpers/streaming
- Hono streaming Node.js issue: https://github.com/honojs/hono/issues/4154
- MDN Transcoding for MSE: https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API/Transcoding_assets_for_MSE
