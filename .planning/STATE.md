# Project State: Hypertube

**Initialized:** 2026-03-27
**Current Phase:** None — ready to start Phase 1
**Milestone:** v1.0 — Mandatory Part Complete

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-27)

**Core value:** Un utilisateur peut chercher un film, cliquer, et commencer à le regarder en quelques secondes — sans jamais quitter le navigateur.
**Current focus:** Phase 1 — Setup Infrastructure

## Roadmap Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Setup Infrastructure | ○ Pending | 3 |
| 2 | Authentication & Security Foundation | ○ Pending | 4 |
| 3 | Torrent Streaming Core | ○ Pending | 3 |
| 4 | Video Transcoding & Seeking | ○ Pending | 2 |
| 5 | Search, Library & Video Detail | ○ Pending | 4 |
| 6 | REST API & Polish | ○ Pending | 4 |

Progress: ░░░░░░░░░░ 0%

## Key Technical Decisions (from research)

- **torrent-stream** — Node.js torrent library (webtorrent/peerflix/pulsar forbidden)
- **Arctic** — OAuth client library (only lib with 42 School provider for Hono)
- **Better Auth** — OAuth2 server plugin for `/oauth/token` endpoint
- **TMDb** over OMDb — no daily cap (OMDb = 1000/day limit)
- **apibay.org** — TPB JSON API (no scraping needed)
- **206 Partial Content** — must be implemented manually in Hono (no built-in support)
- **Transcode at download time** — not stream time (byte-range + live transcode = architecturally impossible)
- **ESM modules** — project must use `"type": "module"` (file-type v19+ is ESM-only)
- **fileSize as BigInt** in Prisma (4K movies > 2.1GB overflow 32-bit INT)
- **OpenSubtitles** — 20 downloads/day limit, cache all subtitle files to disk

## Workflow Config

- **Mode:** YOLO (auto-execute) — but ask before any git operation
- **Agents:** Research + Plan Check + Verifier enabled
- **Models:** Balanced (Sonnet)
- **Parallelization:** Enabled

## Next Action

Run `/gsd:plan-phase 1` to plan Phase 1: Setup Infrastructure

---
*Last updated: 2026-03-27 after project initialization*
