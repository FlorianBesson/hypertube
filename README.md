# Hypertube

Web app search + stream torrent video, royalty-free/legal sources only (publicdomaintorrents.info, archive.org). Built at 42.

## Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS 4, React Router
- **Backend**: Express 5, TypeScript, Prisma 7 + PostgreSQL
- **Streaming**: BitTorrent (torrent-stream) + Archive.org direct downloader
- **Auth**: JWT, bcrypt, OAuth (42, Google)
- **Email**: Nodemailer (Brevo SMTP) — password reset
- **Infra**: Docker Compose, Caddy

## Features

- Register/login (email+password or OAuth: 42, Google), password reset via email
- User profile: edit info/avatar, view other users' profiles (email stays private)
- Movie library: search, thumbnails, watched status, comments
- Video streaming while downloading (torrent + archive sources)
- Subtitles
- i18n (en/fr)

## Getting Started

Requires Docker + Docker Compose.

```bash
cp .env.example .env
# fill in .env: DB creds, OAuth (42/Google) client id+secret, SMTP (Brevo), TMDB key, OpenSubtitles key
make dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Prisma Studio: `make prisma-studio` → http://localhost:5555

## Useful Commands

```bash
make help          # list all commands
make dev            # build + start dev containers
make down            # stop dev containers
make logs            # tail container logs
make db-migrate      # run Prisma migrations
make db-seed          # seed database
make db-reset         # reset + reseed database
make prod             # build + start prod containers
```

## Project Structure

```
backend/    Express API, Prisma schema/migrations, streaming + movie services
frontend/   React app (pages, components, hooks, services, locales)
caddy/      reverse proxy config
```
