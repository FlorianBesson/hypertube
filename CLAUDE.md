# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Hypertube — web app to search + stream torrent video, royalty-free/legal sources only (publicdomaintorrents.info, archive.org). Built at 42 (school project, `subject.md` = original spec).

Stack: React 19 + Vite + TypeScript + Tailwind 4 + React Router (frontend) — Express 5 + TypeScript + Prisma 7 + PostgreSQL (backend) — BitTorrent (torrent-stream) + Archive.org downloader for streaming — JWT/bcrypt/OAuth (42, Google) for auth — Nodemailer (Brevo SMTP) — Docker Compose + Caddy for infra.

## Commands

Everything runs in Docker; no local node install needed for the app itself.

```bash
cp .env.example .env       # fill DB creds, OAuth (42/Google), SMTP (Brevo), TMDB key, OpenSubtitles key
make dev                   # build + start dev containers (frontend :5173, backend :3000)
make down                  # stop dev containers
make logs                  # tail all container logs
make prisma-studio         # Prisma Studio → http://localhost:5555
make db-migrate            # prisma migrate dev
make db-seed                # prisma db seed
make db-reset               # migrate reset --force + reseed
make db-status              # prisma migrate status
make prod / make prod-down  # prod stack (compose.prod.yml)
make help                   # list all targets
```

No test suite exists in this repo (no test scripts in either `package.json`). CI (`.github/workflows/ci.yml`) runs, per package, outside Docker:

```bash
# frontend
cd frontend && npm ci && npm run lint && npm run build

# backend
cd backend && npm ci && npx prisma generate && npx tsc --noEmit
```

Run `npm run lint` / `npx tsc --noEmit` locally the same way before considering frontend/backend changes done — there's no automated test net to catch regressions otherwise.

## Architecture

### Movie search is client-side, streaming is server-side

These are two separate pipelines that only meet at the torrent hash / imdbId:

- **Search & catalog** (`frontend/src/services/sources/`): `movieSourceAggregator.ts` queries `ArchiveSourceProvider` and `PublicDomainTorrentsSourceProvider` in parallel directly from the browser, deduplicates by title, enriches results with TMDB metadata (`internetArchiveTmdb.ts`, bilingual en/fr query resolution), then filters to items with a confirmed TMDB match, a public-domain-era release year, and matching spoken-language. The backend is not involved in search — no server-side movie search endpoint exists.
- **Streaming** (`backend/src/services/stream/`): `torrentService.ts` is a facade over `bittorrentService.ts` (P2P via torrent-stream) and `archiveService.ts` (direct CDN download from archive.org), dispatched by whether the id passed in is a torrent hash or an Archive.org identifier (`getArchiveIdentifier`/`isArchiveIdentifier`). `routes/movies/stream.ts` serves via HTTP 206 range requests, preferring an already-completed file on disk (`downloads/`) over live P2P/CDN streaming. `movieDbService.ts`/`movieRepository.ts` persist minimal `Movie` rows (imdbId, hash, filePath, completion) to track what's cached.

### Backend route/service layering

Routes (`backend/src/routes/**`) stay thin — they parse the request and delegate to a service; business logic lives in `backend/src/services/**`. Each domain under `routes/` (`auth`, `users`, `movies`) has its own `index.ts` mounting sub-routers; `server.ts` wires those into `/api/auth`, `/api/user`, `/api/users`, `/api/movies`. Errors propagate via a single `HttpError` class (`errors.ts`) caught by the error-handling middleware in `server.ts`; note it special-cases the streaming routes (`res.headersSent`) since they may have already started writing the response body when an error occurs mid-stream.

Auth: `middlewares/auth.ts` (`authenticateToken`) verifies the JWT from `Authorization: Bearer <token>` and attaches the decoded payload to `req.user`. Prisma client is a singleton at `backend/src/prisma.ts`; generated client output goes to `backend/generated/prisma` (not `node_modules`), per `prisma/schema.prisma`.

### Frontend structure

`App.tsx` owns auth/session state (token + user in `localStorage`) and top-level routing; `AuthenticatedLayout` wraps the routes that require a logged-in user (`dashboard`, `profile`, `user/:id`) while `watch/:id` is gated separately. OAuth (42/Google) is handled via redirect callback routes (`/auth/callback/42`, `/auth/callback/google`) that exchange a `code` for a token against `/api/auth/:provider`. Data fetching/state for pages lives in `hooks/` (one hook per concern, e.g. `useMovieSearch`, `useMovieCatalog`, `useSubtitles`, `useRealtimeSeeds`); `services/` holds API/client wrappers, `sources/` holds the movie-search provider pipeline described above. i18n is static JSON (`locales/en.json`, `locales/fr.json`) resolved through `locales/translations.ts`, driven by a `lang` prop threaded through page components rather than a context/provider.

### Data model

Prisma schema (`backend/prisma/schema.prisma`) is intentionally small: `User`, `Movie` (cache/download tracking keyed by `imdbId`, not full movie metadata — that comes from TMDB/source providers at request time), `Comment` and `WatchedMovie` (both keyed by `imdbId` + `userId`, cascade-deleted with the user).

## Clean Code

Apply clean code principles to all changes in this repo:

- Small functions/handlers, one responsibility each. Keep routes thin (parse + delegate), logic in `services/`, per existing layering above.
- Meaningful names — no abbreviations, no single-letter vars outside tight loops. Match existing naming (e.g. `movieSourceAggregator`, `torrentService`) not generic names.
- No premature abstraction. Don't add a new provider/service layer or config flag until a second real case needs it.
- No dead code, no commented-out code, no unused exports/params.
- No comments explaining *what* the code does (names should do that) — only *why*, for a non-obvious constraint or workaround, one line.
- DRY within reason: extract shared logic (e.g. shared range-request handling in `stream.ts`) only when duplication is real and load-bearing, not speculative.
- Consistent error handling: throw `HttpError` in services/routes, never swallow errors silently — log or propagate.
- Keep functions' side effects explicit (DB writes, disk I/O, network) — don't bury them inside innocuous-looking helpers.

### Infra

`compose.dev.yml` runs `vite`, `api-express`, `postgres_db`, and an on-demand `prisma-studio` container on a shared `prisma-network`; `compose.prod.yml` + `caddy/` add the reverse proxy for production. Both frontend and backend Dockerfiles have `dev`/`prod` build targets selected via `--target`.
