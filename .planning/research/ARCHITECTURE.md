# Architecture Patterns — Hypertube

**Domain:** Torrent-streaming web application (42 school project)
**Researched:** 2026-03-27
**Overall confidence:** HIGH (core patterns verified against official docs and Node.js documentation)

---

## 1. Torrent State Management

### The Problem

Two users request the same movie at the same time. Without coordination, the backend starts two parallel downloads of the same torrent, doubling disk I/O and network usage — and then you have two incomplete, conflicting file writes to the same path.

### Recommended Pattern: In-Memory Map as Single Source of Truth

Use a module-level `Map` (singleton in Node.js due to module caching) keyed on `infoHash`. This is the correct approach for a single-process server — which is what you have with Docker Compose.

```typescript
// backend/src/lib/torrentManager.ts

type TorrentStatus = 'downloading' | 'ready' | 'error';

interface TorrentEntry {
  status: TorrentStatus;
  filePath: string;
  progress: number;        // 0-100
  downloadedAt?: Date;
  waiters: Array<(path: string) => void>; // callbacks waiting for 'ready'
}

const activeTorrents = new Map<string, TorrentEntry>();
```

**How deduplication works:**

```
User A requests infoHash "abc123"
  → Map.has("abc123") === false
  → Start download, set status = 'downloading', push no waiters
  → Map.set("abc123", entry)

User B requests infoHash "abc123" (30 seconds later, still downloading)
  → Map.has("abc123") === true, status === 'downloading'
  → Push User B's resolve callback onto entry.waiters
  → User B hangs on a Promise until the download completes

Download completes
  → Set status = 'ready', set filePath, set downloadedAt = new Date()
  → Drain entry.waiters: call each resolve(filePath)
  → User A and User B both receive the file path and begin streaming
```

**Why not the database for this?** The database is the wrong tool for ephemeral download coordination. A row in a `torrent_downloads` table cannot hold a live callback. Use the Map for runtime coordination and the database for persistence (so the `downloadedAt` timestamp survives a server restart for the cleanup job).

**What to store in the database (`torrent_downloads` table):**
- `infoHash` — primary key for lookups
- `filePath` — where the file lives on disk
- `status` — `downloading | ready | error`
- `fileSize` — needed for range request `Content-Length` and `Content-Range` headers
- `lastAccessedAt` — updated every time someone streams the file; drives the cleanup job
- `createdAt`

**Critical edge case — server restart:** On startup, query the database for all `status = 'ready'` entries and verify the file exists on disk. If the file is gone (container was rebuilt), reset status to `null` so the next request re-downloads. If you skip this check, users will get 404s after a restart.

```typescript
// backend/src/lib/torrentManager.ts — startup reconciliation
async function reconcileOnStartup() {
  const dbEntries = await prisma.torrentDownload.findMany({
    where: { status: 'ready' }
  });
  for (const entry of dbEntries) {
    const exists = await fs.access(entry.filePath).then(() => true).catch(() => false);
    if (!exists) {
      await prisma.torrentDownload.update({
        where: { infoHash: entry.infoHash },
        data: { status: 'error' }
      });
    }
  }
}
```

---

## 2. Background Jobs in Node.js

### The Problem

Torrent downloads are long-running (minutes to hours). They must not block the HTTP event loop. The frontend must know when the stream is ready to begin playback.

### Recommended Pattern: Async Event-Driven (No worker_threads Needed)

Torrent downloading is I/O-bound, not CPU-bound. The bandwidth bottleneck is the network. Node.js handles I/O-bound work natively via its event loop — you do not need `worker_threads` or `child_process` for the download itself.

Use `worker_threads` only for the CPU-bound parts: **SHA1 piece verification**. A single piece is typically 256KB–1MB of data that must be hashed to verify integrity. If you implement piece verification in the main thread, it will block HTTP handling for tens of milliseconds per piece, causing visible stuttering in the video player.

**Recommended split:**
- Main thread: HTTP server, torrent state Map, file I/O coordination
- Worker thread (optional but recommended): SHA1 piece hash verification
- No worker thread needed for: network socket handling, disk writes, metadata fetching

### Signaling the Frontend: SSE (Server-Sent Events)

Hono has a built-in `streamSSE` helper (confirmed in official docs). Use SSE to push download progress to the frontend — it is simpler than WebSockets and perfectly suited to this one-directional use case.

```typescript
// backend/src/routes/stream.ts
import { streamSSE } from 'hono/streaming';

app.get('/api/movies/:infoHash/progress', (c) => {
  const { infoHash } = c.req.param();

  return streamSSE(c, async (stream) => {
    // Poll the in-memory Map every 500ms and push updates
    while (true) {
      const entry = activeTorrents.get(infoHash);
      if (!entry) {
        await stream.writeSSE({ event: 'error', data: 'not found' });
        break;
      }
      await stream.writeSSE({
        event: 'progress',
        data: JSON.stringify({ status: entry.status, progress: entry.progress })
      });
      if (entry.status === 'ready' || entry.status === 'error') break;
      await stream.sleep(500);
    }
  });
});
```

**Frontend side:** Use the native `EventSource` API — no library needed.

```typescript
const source = new EventSource(`/api/movies/${infoHash}/progress`);
source.addEventListener('progress', (e) => {
  const { status, progress } = JSON.parse(e.data);
  if (status === 'ready') {
    source.close();
    startVideoPlayer();
  }
});
```

**When to start streaming before download completes:** A torrent client that supports piece-level access can begin serving the video stream as soon as the first few pieces are written. This is the "streaming while downloading" behavior the project requires. The threshold is roughly the first 2-5% of the file — enough to fill the browser's video buffer. Set the player `src` as soon as `progress > 2` (or when the first N bytes are confirmed written) rather than waiting for 100%.

---

## 3. Video File Caching and Cleanup

### Storage Layout

```
/app/media/
  {infoHash}/
    video.mp4          # original or transcoded output
    video.mkv          # original if mkv (kept until transcoded)
    subtitles_en.vtt
    subtitles_fr.vtt
```

Use `infoHash` as the directory name, not the movie title. Titles have special characters, spaces, and collision risk. Info hashes are unique and filesystem-safe (hex string).

**Docker volume:** Mount `/app/media` as a named Docker volume, not a bind mount. Named volumes persist across `docker compose down` and are not accidentally deleted when someone runs `docker compose down -v` on the source code.

```yaml
# compose.dev.yml
services:
  back:
    volumes:
      - ./backend:/app
      - /app/node_modules
      - media_files:/app/media    # named volume, survives restarts

volumes:
  media_files:
```

### Cleanup Job: Use node-cron, Not setInterval

`setInterval` is inappropriate for a "delete if unwatched for 1 month" job because:
1. It counts milliseconds from process start, not wall-clock time. After a server restart, the first cleanup fires immediately or after a full interval — unpredictable.
2. The interval needed (30 days) expressed in milliseconds is `2592000000` — an unreadable magic number.
3. `setInterval` has no overlap protection.

Use `node-cron` with a daily schedule and an overlap guard:

```typescript
// backend/src/jobs/cleanupStaleMedia.ts
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import fs from 'fs/promises';
import path from 'path';

const MEDIA_DIR = '/app/media';
const STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let isRunning = false;

export function startCleanupJob() {
  // Runs daily at 03:00
  cron.schedule('0 3 * * *', async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
      const stale = await prisma.torrentDownload.findMany({
        where: {
          status: 'ready',
          lastAccessedAt: { lt: cutoff }
        }
      });
      for (const entry of stale) {
        const dir = path.join(MEDIA_DIR, entry.infoHash);
        await fs.rm(dir, { recursive: true, force: true });
        await prisma.torrentDownload.update({
          where: { infoHash: entry.infoHash },
          data: { status: 'deleted' }
        });
        console.log(`[cleanup] Deleted stale torrent: ${entry.infoHash}`);
      }
    } finally {
      isRunning = false;
    }
  });
}
```

**Update `lastAccessedAt` on every stream request** — not just on initial download completion. A file that is watched every week should never be deleted.

---

## 4. Docker Compose Architecture

### Required Services

```yaml
# compose.dev.yml
services:
  front:
    build:
      context: ./frontend
      dockerfile: ./Dockerfile
      target: dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    env_file: .env

  back:
    build:
      context: ./backend
      dockerfile: ./Dockerfile
      target: dev
    ports:
      - "3000:3000"
      - "5555:5555"
    volumes:
      - ./backend:/app
      - /app/node_modules          # prevent host node_modules from leaking in
      - media_files:/app/media     # named volume for downloaded torrents
    env_file: .env
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: hypertube
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: hypertube
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hypertube"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pg_data:
  media_files:
```

**Why no Redis?** Redis adds operational overhead and is not required for this project. The in-memory Map handles download coordination. Redis would be appropriate if you ran multiple backend instances — you don't. Do not add Redis to impress evaluators; it adds complexity without benefit at this scale.

### ffmpeg in Docker

Do not use `jrottenberg/ffmpeg` as your base image — it does not include Node.js. Use a multi-stage build: copy the ffmpeg binary from an ffmpeg image into your Node.js image.

```dockerfile
# backend/Dockerfile
FROM node:24-alpine AS ffmpeg-source
RUN apk add --no-cache ffmpeg

FROM node:24-alpine AS dev
# Copy ffmpeg from the intermediate stage
COPY --from=ffmpeg-source /usr/bin/ffmpeg /usr/bin/ffmpeg
COPY --from=ffmpeg-source /usr/bin/ffprobe /usr/bin/ffprobe

WORKDIR /app
COPY package*.json ./
RUN npm install
CMD ["npm", "run", "dev"]

FROM node:24-alpine AS prod
COPY --from=ffmpeg-source /usr/bin/ffmpeg /usr/bin/ffmpeg
COPY --from=ffmpeg-source /usr/bin/ffprobe /usr/bin/ffprobe
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

**Why Alpine's ffmpeg is sufficient:** Alpine's `apk add ffmpeg` installs a fully functional ffmpeg build including libx264, libvpx, and the codecs needed for mkv-to-mp4/webm transcoding. You do not need the `jrottenberg/ffmpeg` images unless you need GPU acceleration, which you don't.

---

## 5. Video Streaming HTTP — Range Requests

### The Problem

`serveStatic` in Hono does not currently support 206 Partial Content (confirmed open issue #3324 as of 2024, PR #3523 still in draft). If you return a video file with status 200, **the browser cannot seek**. The seek bar will be disabled.

### Recommended Pattern: Manual Range Request Handler

Implement range request handling yourself in a Hono route handler. This is approximately 40 lines of code and is mandatory for a working video player.

```typescript
// backend/src/routes/stream.ts
import { Hono } from 'hono';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const MEDIA_DIR = '/app/media';

app.get('/api/stream/:infoHash', async (c) => {
  const { infoHash } = c.req.param();

  // 1. Validate infoHash format (hex, 40 chars) — prevents path traversal
  if (!/^[a-f0-9]{40}$/i.test(infoHash)) {
    return c.json({ error: 'Invalid infoHash' }, 400);
  }

  // 2. Look up file path from DB (not derived from user input)
  const entry = await prisma.torrentDownload.findUnique({
    where: { infoHash }
  });
  if (!entry || entry.status !== 'ready') {
    return c.json({ error: 'Not ready' }, 404);
  }

  // 3. Update last accessed
  await prisma.torrentDownload.update({
    where: { infoHash },
    data: { lastAccessedAt: new Date() }
  });

  const filePath = entry.filePath;
  const stat = await fsp.stat(filePath);
  const fileSize = stat.size;
  const rangeHeader = c.req.header('range');

  // 4. No Range header → return full file (200)
  if (!rangeHeader) {
    c.header('Content-Length', String(fileSize));
    c.header('Content-Type', 'video/mp4');
    c.header('Accept-Ranges', 'bytes');
    return c.body(fs.createReadStream(filePath) as any, 200);
  }

  // 5. Parse Range header → bytes=START-END
  const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

  // 6. Validate range
  if (start >= fileSize || end >= fileSize || start > end) {
    c.header('Content-Range', `bytes */${fileSize}`);
    return c.body(null, 416);
  }

  const chunkSize = end - start + 1;

  // 7. Return 206 Partial Content
  c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  c.header('Accept-Ranges', 'bytes');
  c.header('Content-Length', String(chunkSize));
  c.header('Content-Type', 'video/mp4');

  const stream = fs.createReadStream(filePath, { start, end });
  return c.body(stream as any, 206);
});
```

**Critical security note on `filePath`:** Never construct the file path by concatenating user input (e.g., `path.join(MEDIA_DIR, req.params.infoHash, 'video.mp4')`). Even with the regex check, always retrieve the `filePath` from the database where it was set by the server at download time, not derived from the request.

### Content-Type for mkv

If the original file is mkv and you have not yet transcoded it, you cannot stream it to a browser. Chrome and Firefox do not support mkv natively. You have two options:
1. Transcode to mp4 or webm before serving (recommended — do this at download time, not stream time)
2. Transcode on-the-fly with ffmpeg piped into the response stream (complex, high CPU, risky for seeking)

Transcode at download time. Store the output as `video.mp4`. Set `Content-Type: video/mp4`. Transcoding on-the-fly during streaming breaks seeking entirely.

---

## 6. Security Checklist for 42 Evaluations

Security failures cause an automatic zero. These are verified in a specific order by evaluators.

### Eliminatory Checks (Verified First)

**1. Passwords never in plaintext**

Use bcrypt with `saltRounds = 12`. Using 10 is acceptable but 12 is the current OWASP recommendation for 2025 hardware.

```typescript
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(input, hash);
```

Never log passwords. Never return the `password` field from any Prisma query to the client. Add a `select` clause to every user query: `select: { password: false, ... }`.

**2. SQL injection via Prisma**

Prisma's generated client uses parameterized queries by default — you are protected as long as you use the Prisma client API. You are **not** protected if you use `prisma.$queryRaw` with string concatenation. If you need raw SQL, use `prisma.$queryRaw(Prisma.sql`SELECT ... WHERE id = ${id}`)` — the tagged template literal is parameterized.

**3. XSS — Comments are the attack vector**

Comments are user-generated HTML-adjacent content displayed to other users. This is where evaluators will attempt injection.

On the frontend, never use `dangerouslySetInnerHTML`. Use `DOMPurify` to sanitize before rendering any user-provided text that might be displayed as HTML.

```typescript
import DOMPurify from 'dompurify';
// In your comment component:
const clean = DOMPurify.sanitize(comment.content);
// Then render as text, not HTML. If you must render HTML:
<div dangerouslySetInnerHTML={{ __html: clean }} />
```

On the backend, sanitize with `sanitize-html` before storing to the database. Defense in depth: sanitize at storage time AND at render time.

**4. File upload validation**

Profile picture uploads must validate:
- MIME type from magic bytes, not just the `Content-Type` header (headers are client-controlled)
- File size limit (reject anything over 5MB)
- Only allow `image/jpeg`, `image/png`, `image/webp`

```typescript
import fileType from 'file-type';

const buffer = await file.arrayBuffer();
const type = await fileType.fromBuffer(buffer);
if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime)) {
  return c.json({ error: 'Invalid file type' }, 400);
}
```

**5. .env never committed**

This is the first thing every evaluator checks. Verify with `git log --all --full-history -- .env` that `.env` has never been committed. If it has been committed even once (then deleted), the repo history contains your secrets and you fail.

### Standard Security (Checked After Eliminatory)

**HTTP security headers via Hono middleware**

```typescript
// Hono does not bundle helmet. Implement manually or use hono-helmet if available.
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});
```

**Rate limiting on auth endpoints**

Install `@hono/rate-limiter` or implement a simple in-memory rate limiter on `/api/auth/login` and `/api/auth/register`. Limit to 10 requests per IP per minute. Evaluators will attempt brute-force.

**JWT storage**

Store JWT in an `httpOnly` cookie, not `localStorage`. `localStorage` is accessible to JavaScript — any XSS attack can steal tokens stored there.

```typescript
c.cookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 60 * 60 * 24 * 7 // 7 days
});
```

**CORS**

Restrict CORS origin to your own frontend URL, not `*`.

```typescript
import { cors } from 'hono/cors';
app.use('/api/*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));
```

---

## 7. Prisma Schema Design

### Recommended Schema

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique
  username      String    @unique
  firstName     String
  lastName      String
  password      String?   // null for OAuth-only users
  profilePic    String?
  preferredLang String    @default("en")
  provider      String    @default("local") // "local" | "42" | "github"
  providerId    String?   // ID from OAuth provider
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  comments      Comment[]
  watchHistory  WatchHistory[]

  @@unique([provider, providerId])
  @@index([email])
  @@index([username])
}

model TorrentDownload {
  id             Int       @id @default(autoincrement())
  infoHash       String    @unique
  filePath       String?
  fileSize       BigInt?   // bytes — use BigInt for files > 2GB
  status         String    @default("pending") // pending | downloading | ready | error | deleted
  lastAccessedAt DateTime  @default(now())
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([status])
  @@index([lastAccessedAt]) // for the cleanup job query
}

model Movie {
  id            Int       @id @default(autoincrement())
  imdbId        String    @unique
  title         String
  year          Int
  rating        Float?
  genre         String[]
  synopsis      String?   @db.Text
  coverUrl      String?
  duration      Int?      // minutes
  cast          String[]
  infoHash      String?   // link to TorrentDownload
  createdAt     DateTime  @default(now())

  comments      Comment[]
  watchHistory  WatchHistory[]

  @@index([title])
  @@index([rating])
  @@index([year])
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String   @db.Text
  userId    Int
  movieId   Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie     Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)

  @@index([movieId])
  @@index([userId])
}

model WatchHistory {
  id        Int      @id @default(autoincrement())
  userId    Int
  movieId   Int
  watchedAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie     Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)

  @@unique([userId, movieId]) // upsert-safe: one record per user-movie pair
  @@index([userId])
}
```

### Key Design Decisions

- `fileSize` is `BigInt`, not `Int`. A 4K movie can be 60GB. PostgreSQL `INT` overflows above ~2.1GB. `BigInt` in Prisma maps to PostgreSQL `BIGINT`.
- `password` is nullable on `User` to support OAuth-only registrations (42 and GitHub users never set a password).
- `WatchHistory` has a `@@unique([userId, movieId])` constraint — use `prisma.watchHistory.upsert()` when marking a movie as watched to avoid duplicate rows.
- The `Movie` table caches metadata from OMDb/TMDb. Do not call the external API on every page load — cache the result in this table on first fetch.
- `genre` is a `String[]` (PostgreSQL array). This allows filtering `WHERE 'Action' = ANY(genre)` without a join table.

---

## 8. Environment Variables

### Complete `.env.example`

```bash
# Database
DATABASE_URL="postgresql://hypertube:CHANGE_ME@db:5432/hypertube"
POSTGRES_PASSWORD="CHANGE_ME"

# JWT
JWT_SECRET="CHANGE_ME_use_openssl_rand_base64_64"
JWT_EXPIRES_IN="7d"

# OAuth — 42
FORTYTWO_CLIENT_ID="your_42_app_uid"
FORTYTWO_CLIENT_SECRET="your_42_app_secret"
FORTYTWO_CALLBACK_URL="http://localhost:3000/api/auth/42/callback"

# OAuth — GitHub
GITHUB_CLIENT_ID="your_github_app_client_id"
GITHUB_CLIENT_SECRET="your_github_app_client_secret"
GITHUB_CALLBACK_URL="http://localhost:3000/api/auth/github/callback"

# Movie metadata
OMDB_API_KEY="your_omdb_key"
# OR
TMDB_API_KEY="your_tmdb_key"
TMDB_API_URL="https://api.themoviedb.org/3"

# Email (password reset)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your@gmail.com"
SMTP_PASS="your_app_password"
SMTP_FROM="Hypertube <your@gmail.com>"

# App
NODE_ENV="development"
PORT="3000"
FRONTEND_URL="http://localhost:5173"
MEDIA_DIR="/app/media"

# YTS API (no auth required, but document the base URL)
YTS_API_URL="https://yts.mx/api/v2"
```

### Startup Validation

Validate required env vars at server startup before accepting requests. If a required variable is missing, crash loudly rather than silently returning wrong behavior.

```typescript
// backend/src/lib/env.ts
const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'FORTYTWO_CLIENT_ID',
  'FORTYTWO_CLIENT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    console.error(`[startup] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
```

**JWT_SECRET generation:** Use `openssl rand -base64 64` to generate a 512-bit secret. Never use a short string, a word, or `"secret"`. Evaluators will check this.

---

## Common Mistakes Made by 42 Students on This Project

### Mistake 1: Using `webtorrent` (Automatic Failure)

The subject explicitly forbids webtorrent, pulsar, and peerflix. Any use of these libraries, even as a dev dependency that was later removed, can be detected in git history. Build a minimal BitTorrent implementation from scratch using `bittorrent-dht` and `bittorrent-tracker` for peer discovery, and raw TCP sockets for piece transfer.

### Mistake 2: Starting the Download in the HTTP Request Handler

```typescript
// BAD — blocks the response until download starts, causes timeout on slow torrents
app.get('/api/movies/:id/stream', async (c) => {
  await startDownload(infoHash); // waits synchronously
  return c.redirect('/api/stream/' + infoHash);
});
```

Start the download as a fire-and-forget operation. Return immediately with a "download started" status. Let the client poll via SSE.

### Mistake 3: Path Traversal via infoHash

```typescript
// BAD — user controls infoHash, could be "../../etc/passwd"
const filePath = path.join('/app/media', req.params.infoHash, 'video.mp4');
```

Always validate infoHash against `/^[a-f0-9]{40}$/i` before any filesystem operation. Retrieve the actual path from the database.

### Mistake 4: Storing JWT in localStorage

Evaluators open DevTools → Application → Local Storage and look for JWT tokens. If found, they will demonstrate that an XSS payload can steal it. Use `httpOnly` cookies.

### Mistake 5: Calling OMDb/TMDb on Every Search Request

Every search fires an external API call. OMDb has a 1,000 request/day free tier limit. Cache results in the `Movie` table. On first fetch, store in DB. On subsequent requests, serve from DB. Only call the API if the record is older than 24 hours or does not exist.

### Mistake 6: No `Accept-Ranges` Header

Returning a video file without `Accept-Ranges: bytes` causes browsers to not attempt range requests. The video plays but seeking is disabled. The browser has no way to know the server supports seeking.

### Mistake 7: Not Handling the mkv → mp4 Conversion Before Streaming

Many students transcode mkv files on-the-fly during streaming (piping ffmpeg output directly into the HTTP response). This works for the initial play but breaks seeking entirely because:
- The total `Content-Length` is unknown before transcoding completes
- The `Content-Range` header cannot be satisfied for a non-seekable ffmpeg pipe
- The browser cannot seek backwards in a stream it cannot byte-range-request

Transcode to mp4 as a step in the download pipeline, before the file is marked `ready`.

### Mistake 8: Not Handling the `db` Service Health in Docker Compose

The backend starts before PostgreSQL is ready to accept connections, Prisma tries to connect, fails, and the backend exits. Add `depends_on` with a `service_healthy` condition and a `healthcheck` on the `db` service. This is a very common evaluator complaint.

---

## Sources

- Hono Streaming Helpers (official docs): https://hono.dev/docs/helpers/streaming
- Hono 206 Partial Content issue: https://github.com/honojs/hono/issues/3324
- HTTP 206 Partial Content Node.js implementation: https://liveapi.com/blog/nodejs-video-streaming-server/
- Node.js Worker Threads vs Child Processes: https://amplication.com/blog/nodejs-worker-threads-vs-child-processes-which-one-should-you-use
- node-cron scheduled tasks (BetterStack): https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/
- Prisma indexes documentation: https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes
- Docker Compose volumes (named vs bind): https://docs.docker.com/reference/compose-file/volumes/
- OWASP bcrypt recommendations: https://www.nodejs-security.com/blog/owasp-nodejs-authentication-authorization-cryptography-practices
- Password hashing guide 2025 (bcrypt rounds): https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/
- parse-torrent (info hash extraction): https://www.npmjs.com/package/parse-torrent
- ffmpeg in Docker (img.ly guide): https://img.ly/blog/how-to-run-ffmpeg-inside-a-docker-container/

---

*Research date: 2026-03-27 | Confidence: HIGH for HTTP streaming, Docker, security, Prisma patterns. MEDIUM for torrent piece-level streaming threshold (project-specific tuning required).*
