# Roadmap: Hypertube

**Created:** 2026-03-27
**Milestone:** v1.0 — Mandatory Part Complete
**Granularity:** Standard

## Milestone Goal

v1.0 is complete when an authenticated user can open the app, search for a film by name, genre, year, or rating, click a result, and watch it stream in the browser via BitTorrent — with subtitles, a working seek bar, and comments — while a second user requesting the same film shares the same download. The app runs fully in Docker, authenticates via local accounts and OAuth (42 School + GitHub), exposes a complete OAuth2-protected REST API, and passes 42 security checks (bcrypt, no SQLi, XSS sanitization, validated file uploads).

## Phases

- [ ] **Phase 1: Setup Infrastructure** - Docker, PostgreSQL, Prisma schema, monorepo workspace, environment config
- [ ] **Phase 2: Authentication & Security Foundation** - Local auth, OAuth (42+GitHub), JWT sessions, profiles, security hardening
- [ ] **Phase 3: Torrent Streaming Core** - torrent-stream integration, HTTP 206 range requests, first/last piece prefetch, SSE progress
- [ ] **Phase 4: Video Transcoding & Seeking** - ffmpeg mkv→fragmented mp4 pipeline, timestamp-based seeking, file lifecycle
- [ ] **Phase 5: Search, Library & Video Detail** - YTS+TPB search, TMDb enrichment, infinite scroll, filters/sort, detail page, subtitles, comments
- [ ] **Phase 6: REST API & Polish** - OAuth2 server, all REST endpoints, i18n completion, responsive UI, console hygiene

## Phase Details

### Phase 1: Setup Infrastructure

**Goal**: A clean, reproducible Docker environment exists with PostgreSQL running, Prisma schema migrated, npm workspaces configured, and all secrets excluded from git — so every subsequent phase builds on a stable foundation.
**Depends on**: Nothing (first phase)
**Requirements**: INF-01, INF-02, INF-03, INF-04, INF-05, INF-06

#### Plans

- **Plan 1.1**: Monorepo & Environment Config — Configure root `package.json` with npm workspaces (backend + frontend), create `.env.example` with all required variables (DB URL, JWT secret, API keys, OAuth credentials), add `.env` and `node_modules` to `.gitignore`. `[INF-01, INF-04, INF-06]`
- **Plan 1.2**: Docker Compose & Dockerfiles — Fix `compose.dev.yml` Docker volume bug, add PostgreSQL service, write `backend/Dockerfile` (Node 24-alpine, system deps: ffmpeg, build tools), wire hot-reload volumes for dev. `[INF-02, INF-03]`
- **Plan 1.3**: Prisma Schema & Database Bootstrap — Write complete Prisma schema (users with language + refresh_token_whitelist, movies, comments, watched_history, torrent_downloads with BigInt fileSize), run initial migration, seed a smoke-test record. `[INF-05]`

**Success Criteria** (what must be TRUE):
  1. `docker compose -f compose.dev.yml up` starts backend, frontend, and PostgreSQL with no errors
  2. Prisma migration runs clean against the containerized PostgreSQL instance
  3. `.env` is absent from git history and `git status` confirms it is ignored
  4. `npm install` from the root installs both workspace packages without conflicts

---

### Phase 2: Authentication & Security Foundation

**Goal**: Users can register, log in via email/password or OAuth (42 School + GitHub), maintain persistent sessions, reset forgotten passwords, and manage their profile — with all 42-eliminatory security requirements wired in from day one.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, PROF-01, PROF-02, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-07, SEC-08, UI-01, UI-04

#### Plans

- **Plan 2.1**: Local Auth & Session Management — Implement registration (bcrypt ≥12 rounds, SEC-01), login with JWT in httpOnly SameSite=Strict cookie (AUTH-02, SEC-08), logout with server-side token invalidation (AUTH-06), refresh token rotation whitelist in DB (AUTH-08), rate limiting on auth routes (SEC-07). All queries via Prisma (SEC-02). `[AUTH-01, AUTH-02, AUTH-06, AUTH-08, SEC-01, SEC-02, SEC-07, SEC-08]`
- **Plan 2.2**: OAuth 42 School + GitHub — Integrate Arctic library for 42 School authorization code flow (AUTH-03) and GitHub OAuth (AUTH-04), handle callback routes, upsert user on first OAuth login, redirect to app on success. `[AUTH-03, AUTH-04]`
- **Plan 2.3**: Password Reset & Language Preference — Email-based password reset using `crypto.randomBytes()` token stored as SHA-256 with 10-minute expiry (AUTH-05), language selection stored in DB user row (AUTH-07). `[AUTH-05, AUTH-07]`
- **Plan 2.4**: User Profiles & Security Middleware — Profile edit (email, username, first/last name, avatar upload with file-type magic bytes validation, size cap, jpg/png/gif/webp only) (PROF-01, SEC-04), public profile view with email masked (PROF-02), Helmet.js security headers on Hono (SEC-05), DOMPurify input sanitization (SEC-03), global layout with header/footer (UI-01), i18n scaffold with react-i18next (UI-04). `[PROF-01, PROF-02, SEC-03, SEC-04, SEC-05, UI-01, UI-04]`

**Success Criteria** (what must be TRUE):
  1. User can register with email + password and receive a hashed credential in the database (never plaintext)
  2. User can log in, navigate to another page, close the browser, reopen, and still be authenticated (persistent session via refresh token)
  3. User can log in with a 42 School or GitHub account without creating a separate password
  4. User can request a password reset, receive an email, and set a new password within 10 minutes
  5. User can upload a profile photo; a file with a forged extension but wrong magic bytes is rejected
  6. Helmet security headers are present on all responses (visible in browser DevTools Network tab)
**UI hint**: yes

---

### Phase 3: Torrent Streaming Core

**Goal**: Clicking "Watch" on any video triggers a server-side torrent download and streams it to the browser in real time via HTTP 206 Partial Content — the highest-risk technical component, validated before any features are layered on top.
**Depends on**: Phase 2
**Requirements**: VID-01, VID-02, VID-03, VID-04, VID-10, SEC-06

#### Plans

- **Plan 3.1**: torrent-stream Integration & Deduplication — Wire `torrent-stream` to accept a magnet URI or torrent hash, start download non-blocking (async I/O), store active download state in a server-side Map keyed by hash and in DB torrent_downloads table, deduplicate so a second user request for the same hash attaches to the existing download rather than starting a new one. `[VID-01, VID-04]`
- **Plan 3.2**: HTTP 206 Range Request Streaming — Implement manual 206 Partial Content handler in Hono (no serveStatic): parse `Range` header, compute byte offsets, pipe the correct slice of the torrent-stream file object to the response with `Content-Range` and `Accept-Ranges` headers. Test with `curl -r 0-1023`. `[VID-02]`
- **Plan 3.3**: First/Last Piece Prefetch & SSE Progress — Issue torrent-stream `critical()` requests for the first and last pieces immediately on download start so the browser-side player can detect codec and duration before full download (VID-03). Implement `GET /stream/:hash/progress` as a Hono `streamSSE` endpoint that emits download percentage events while the torrent is active (VID-10). Audit and eliminate all console warnings/errors (SEC-06). `[VID-03, VID-10, SEC-06]`

**Success Criteria** (what must be TRUE):
  1. A `curl -r 0-1023 /stream/:hash` against an active torrent returns HTTP 206 with correct `Content-Range` header
  2. Two concurrent browser tabs requesting the same torrent hash result in exactly one torrent-stream instance (verified in server logs)
  3. The SSE progress endpoint emits events at least every 2 seconds while a download is active
  4. No console errors appear in the browser or server terminal during a streaming session

---

### Phase 4: Video Transcoding & Seeking

**Goal**: Any video format (including MKV) is transparently converted to fragmented MP4 at download time so the browser's native HTML5 player can seek to any timestamp without re-downloading from the start.
**Depends on**: Phase 3
**Requirements**: VID-05, VID-06, VID-07

#### Plans

- **Plan 4.1**: ffmpeg Transcode Pipeline — Integrate fluent-ffmpeg to detect container format on the torrent-stream file; if MKV (or non-mp4), pipe through ffmpeg with `-movflags frag_keyframe+empty_moov` to produce fragmented MP4 on the fly at download time (not at stream time). Output written to a server-side cache path keyed by torrent hash. `[VID-05]`
- **Plan 4.2**: Timestamp-Based Seeking & File Lifecycle — Implement `GET /stream/:hash?t=<seconds>` that re-invokes ffmpeg with `-ss <seconds>` as input seek offset so the player can resume from any position without streaming from byte 0. Implement a cron job (`node-cron` or similar) that deletes cached video files where `lastAccessedAt` is older than 1 month, and update `lastAccessedAt` on each stream access. `[VID-06, VID-07]`

**Success Criteria** (what must be TRUE):
  1. An MKV torrent streams to the browser as MP4 without any browser codec error
  2. Seeking to minute 45 in the player results in playback starting from that position without buffering from the beginning (verified via network tab — byte range starts mid-file)
  3. A test file with `lastAccessedAt` set 32 days in the past is deleted when the cron job runs

---

### Phase 5: Search, Library & Video Detail

**Goal**: Authenticated users can search the YTS and TPB catalogues, browse a default popular-films page, filter and sort results, view full film metadata, watch with subtitles, and leave comments — the complete end-to-end user journey.
**Depends on**: Phase 4
**Requirements**: LIB-01, LIB-02, LIB-03, LIB-04, LIB-05, LIB-06, LIB-07, LIB-08, VID-08, VID-09, VID-11, VID-12, UI-02, UI-03, SEC-03

#### Plans

- **Plan 5.1**: Search Backends & TMDb Enrichment — Implement YTS API search (LIB-01) and apibay.org TPB JSON API search (LIB-02), normalize results to a common schema, enrich each result with TMDb metadata (poster HD, cast, synopsis, runtime) (LIB-08), cache TMDb responses in the movies Prisma table to avoid repeated API calls. `[LIB-01, LIB-02, LIB-08]`
- **Plan 5.2**: Library Page — Default view shows popular films sorted by seeders/downloads when no search is active (LIB-04), thumbnail grid displays title, year, TMDb rating, cover, and watched/unwatched badge per user (LIB-03), infinite scroll using `IntersectionObserver` with Prisma cursor pagination (LIB-05), filter controls for name, genre, TMDb rating, production year (LIB-06), sort controls for name, rating, year, popularity (LIB-07). `[LIB-03, LIB-04, LIB-05, LIB-06, LIB-07]`
- **Plan 5.3**: Video Detail Page & Subtitles — Detail page renders TMDb summary, cast, year, runtime, rating, cover art, and embedded HTML5 `<video>` player wired to the `/stream/:hash` endpoint (VID-11). Fetch English subtitles from OpenSubtitles API, convert SRT to WebVTT via `srt-to-vtt`, cache to disk (20 downloads/day limit) (VID-08). If the user's preferred language differs from English, attempt to fetch that subtitle track as well (VID-09). `[VID-08, VID-09, VID-11]`
- **Plan 5.4**: Comments, Forms & Responsive UI — Comment create and list on each video detail page, wired to the comments Prisma table (VID-12). DOMPurify sanitization on comment render (SEC-03). Client-side and server-side validation on all forms with visible error states (UI-03). Responsive layout for mobile screen sizes (UI-02). `[VID-12, SEC-03, UI-02, UI-03]`

**Success Criteria** (what must be TRUE):
  1. Searching "Inception" returns results from both YTS and TPB with TMDb poster, rating, and year displayed
  2. The library page loads popular films by default and appends more results automatically as the user scrolls to the bottom (no "next page" button)
  3. Filtering by genre "Drama" and sort by "rating" returns a correctly filtered and sorted list
  4. The video detail page shows full cast and synopsis, the player loads without error, and English subtitles appear as a selectable track
  5. A logged-in user can post a comment on a film and see it appear immediately; a second user sees it on refresh
  6. The layout renders without horizontal scroll overflow on a 375px wide viewport
**UI hint**: yes

---

### Phase 6: REST API & Polish

**Goal**: A fully documented OAuth2-protected REST API covers all resource endpoints, the UI is available in at least two languages, and the project meets all 42 quality gates — zero console errors, correct HTTP semantics, and end-to-end security.
**Depends on**: Phase 5
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10, API-11, SEC-06

#### Plans

- **Plan 6.1**: OAuth2 Server & Token Endpoint — Configure Better Auth `oauthProvider` plugin to expose `POST /oauth/token` supporting `client_credentials` grant (API-01). Register a test client, verify token issuance and introspection. Wire OAuth2 bearer token middleware to protect all `/users`, `/movies`, `/comments` routes. `[API-01]`
- **Plan 6.2**: Users & Movies API Endpoints — `GET /users` (id + username list) (API-02), `GET /users/:id` (username, email, profile picture URL) (API-03), `PATCH /users/:id` (username, email, password, profile picture URL) with ownership check (API-04), `GET /movies` (frontpage list with id + name) (API-05), `GET /movies/:id` (name, TMDb rating, year, runtime, available subtitles, comment count) (API-06). `[API-02, API-03, API-04, API-05, API-06]`
- **Plan 6.3**: Comments API Endpoints — `GET /comments` (latest comments with author, date, content, id) (API-07), `GET /comments/:id` (API-08), `PATCH /comments/:id` with author ownership check (API-09), `DELETE /comments/:id` with author ownership check (API-10), `POST /comments` or `POST /movies/:id/comments` (API-11). `[API-07, API-08, API-09, API-10, API-11]`
- **Plan 6.4**: i18n Completion, UI Polish & Console Hygiene — Complete react-i18next translation keys for French (or second supported language), wire the user's DB language preference to the active i18n locale, audit and eliminate all browser and server console warnings/errors (SEC-06), final accessibility pass (ARIA labels on interactive elements), verify all HTTP responses use correct status codes. `[SEC-06]`

**Success Criteria** (what must be TRUE):
  1. `POST /oauth/token` with valid client credentials returns a bearer token; subsequent `GET /users` with that token returns 200, without it returns 401
  2. `PATCH /users/:id` with a different user's token returns 403
  3. `DELETE /comments/:id` as the comment author returns 200; as a different user returns 403
  4. Switching the user's preferred language to French reloads all UI strings in French without a full page reload
  5. Zero errors or warnings appear in the browser console and server terminal during a complete user journey (register → search → watch → comment)
**UI hint**: yes

---

## Requirements Coverage

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 1 | INF-01, INF-02, INF-03, INF-04, INF-05, INF-06 | 6 |
| Phase 2 | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, PROF-01, PROF-02, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-07, SEC-08, UI-01, UI-04 | 19 |
| Phase 3 | VID-01, VID-02, VID-03, VID-04, VID-10, SEC-06 | 6 |
| Phase 4 | VID-05, VID-06, VID-07 | 3 |
| Phase 5 | LIB-01, LIB-02, LIB-03, LIB-04, LIB-05, LIB-06, LIB-07, LIB-08, VID-08, VID-09, VID-11, VID-12, UI-02, UI-03, SEC-03 | 15 |
| Phase 6 | API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10, API-11, SEC-06 | 12 |
| **Total** | | **61** |

> Note: SEC-03 appears in Phase 2 (scaffold) and Phase 5 (comment rendering) — it is fully implemented in Phase 5. SEC-06 spans Phase 3 (initial audit) and Phase 6 (final audit) — it is fully verified in Phase 6. All 59 distinct requirement IDs are covered.

## Dependency Graph

```
Phase 1: Setup Infrastructure
    |
    v
Phase 2: Authentication & Security Foundation
    |
    v
Phase 3: Torrent Streaming Core        (highest-risk — validated before features)
    |
    v
Phase 4: Video Transcoding & Seeking   (builds on streaming, adds ffmpeg layer)
    |
    v
Phase 5: Search, Library & Video Detail (full user journey — needs auth + stream + transcode)
    |
    v
Phase 6: REST API & Polish             (wraps everything in OAuth2, final hardening)
```

Within phases, plans with no inter-dependencies can execute in parallel:
- Phase 2: Plans 2.1 and 2.2 are independent (local auth vs OAuth); 2.3 and 2.4 depend on 2.1
- Phase 5: Plans 5.1 (search backends) and 5.3 (detail page) are independent; 5.2 needs 5.1; 5.4 needs 5.3
- Phase 6: Plans 6.2 and 6.3 are independent once 6.1 (OAuth2 middleware) is done

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Setup Infrastructure | 0/3 | Not started | - |
| 2. Authentication & Security Foundation | 0/4 | Not started | - |
| 3. Torrent Streaming Core | 0/3 | Not started | - |
| 4. Video Transcoding & Seeking | 0/2 | Not started | - |
| 5. Search, Library & Video Detail | 0/4 | Not started | - |
| 6. REST API & Polish | 0/4 | Not started | - |
