# Requirements: Hypertube

**Defined:** 2026-03-27
**Core Value:** Un utilisateur peut chercher un film, cliquer, et commencer à le regarder en quelques secondes — sans jamais quitter le navigateur.

## v1 Requirements

### Infrastructure

- [ ] **INF-01**: `.env` exclu du git via `.gitignore` (credentials, API keys, JWT secret)
- [ ] **INF-02**: `backend/Dockerfile` complet avec Node 24-alpine, dépendances système (ffmpeg), et build
- [ ] **INF-03**: `compose.dev.yml` corrigé et étendu avec services backend, frontend, PostgreSQL
- [ ] **INF-04**: Root `package.json` avec npm workspaces (backend + frontend)
- [ ] **INF-05**: Prisma schema complet : users, movies, comments, watched_history, torrent_downloads
- [ ] **INF-06**: Variables d'environnement documentées dans `.env.example`

### Authentication

- [ ] **AUTH-01**: Inscription avec email, username, nom, prénom, mot de passe hashé (bcrypt ≥12 rounds)
- [ ] **AUTH-02**: Login username/password avec JWT (cookie httpOnly, SameSite=Strict)
- [ ] **AUTH-03**: OAuth 42 School via Arctic library (authorization code flow)
- [ ] **AUTH-04**: OAuth GitHub via Arctic library
- [ ] **AUTH-05**: Réinitialisation de mot de passe par email (token `crypto.randomBytes()`, SHA-256 en DB, expiry 10min)
- [ ] **AUTH-06**: Logout depuis n'importe quelle page (invalidation token côté serveur)
- [ ] **AUTH-07**: Sélection langue préférée (défaut anglais, stockée en DB user)
- [ ] **AUTH-08**: Session persistante via refresh token rotation (whitelist en DB)

### User Profiles

- [ ] **PROF-01**: Modifier email, photo de profil (upload validé par magic bytes), username, nom, prénom
- [ ] **PROF-02**: Voir le profil d'un autre utilisateur (photo, username, nom — email masqué)

### Library (authentifiés seulement)

- [ ] **LIB-01**: Recherche YTS API (films HD, métadonnées IMDb incluses)
- [ ] **LIB-02**: Recherche The Pirate Bay via apibay.org JSON API
- [ ] **LIB-03**: Affichage thumbnails : nom, année, note TMDb, cover image, statut vu/non-vu
- [ ] **LIB-04**: Page par défaut : films populaires si aucune recherche (triés par seeders/downloads)
- [ ] **LIB-05**: Infinite scroll avec IntersectionObserver (cursor pagination Prisma, pas de bouton "page suivante")
- [ ] **LIB-06**: Filtres : nom, genre, note TMDb, année de production
- [ ] **LIB-07**: Tri : nom, note, année, popularité
- [ ] **LIB-08**: Enrichissement métadonnées via TMDb API (poster HD, casting, résumé, durée)

### Video Streaming (authentifiés seulement)

- [ ] **VID-01**: Lancement téléchargement torrent côté serveur via `torrent-stream` (non-bloquant, I/O async)
- [ ] **VID-02**: Streaming HTTP avec 206 Partial Content implémenté manuellement (Range requests pour seeking)
- [ ] **VID-03**: Pre-fetch first/last pieces du fichier torrent pour détecter durée/codec browser-side
- [ ] **VID-04**: Déduplication : si 2 users demandent le même film, 1 seul téléchargement (Map en mémoire + DB)
- [ ] **VID-05**: Conversion mkv → fragmented mp4 au moment du téléchargement (fluent-ffmpeg, `-movflags frag_keyframe+empty_moov`)
- [ ] **VID-06**: Seeking timestamp-based : `GET /stream/:hash?t=120` relance ffmpeg avec `-ss 120`
- [ ] **VID-07**: Sauvegarde du fichier téléchargé sur serveur ; suppression si `lastAccessedAt` > 1 mois (cron job)
- [ ] **VID-08**: Sous-titres anglais via OpenSubtitles API (cache disque, SRT→WebVTT via `srt-to-vtt`)
- [ ] **VID-09**: Sous-titres langue préférée utilisateur si disponible
- [ ] **VID-10**: Progress streaming via SSE (Hono `streamSSE`) pendant téléchargement
- [ ] **VID-11**: Page détail : résumé, casting, année, durée, note TMDb, cover, player HTML5
- [ ] **VID-12**: Commentaires sur la vidéo (créer, lister)

### API RESTful (OAuth2)

- [ ] **API-01**: `POST /oauth/token` via Better Auth oauthProvider plugin (client_credentials)
- [ ] **API-02**: `GET /users` — liste id + username
- [ ] **API-03**: `GET /users/:id` — username, email, profile picture URL
- [ ] **API-04**: `PATCH /users/:id` — username, email, password, profile picture URL
- [ ] **API-05**: `GET /movies` — liste films frontpage avec id + nom
- [ ] **API-06**: `GET /movies/:id` — nom, id, note TMDb, année, durée, sous-titres dispo, nb commentaires
- [ ] **API-07**: `GET /comments` — derniers commentaires (auteur, date, contenu, id)
- [ ] **API-08**: `GET /comments/:id` — commentaire, auteur, id, date
- [ ] **API-09**: `PATCH /comments/:id` — modifier commentaire
- [ ] **API-10**: `DELETE /comments/:id` — supprimer commentaire
- [ ] **API-11**: `POST /comments` ou `POST /movies/:id/comments` — créer commentaire

### Security (éliminatoire)

- [ ] **SEC-01**: Mots de passe hashés bcrypt (≥12 rounds), jamais stockés en clair
- [ ] **SEC-02**: Toutes les queries via Prisma ORM (protection SQLi par construction)
- [ ] **SEC-03**: Sanitisation des inputs utilisateur (DOMPurify côté client pour commentaires)
- [ ] **SEC-04**: Upload photos profil : validation magic bytes (file-type), taille max, types acceptés (jpg/png/gif/webp)
- [ ] **SEC-05**: Helmet.js headers de sécurité sur Hono (X-Frame-Options, CSP, etc.)
- [ ] **SEC-06**: Aucun warning/error dans la console navigateur ni côté serveur
- [ ] **SEC-07**: Rate limiting sur routes auth (login, password reset)
- [ ] **SEC-08**: JWT en cookie httpOnly (pas exposé en localStorage)

### UI/UX

- [ ] **UI-01**: Layout : header, main, footer sur toutes les pages
- [ ] **UI-02**: Responsive mobile (layout acceptable sur petites résolutions)
- [ ] **UI-03**: Validation côté client et serveur de tous les formulaires
- [ ] **UI-04**: i18n avec react-i18next (anglais par défaut, structure en place dès le début)

## v2 Requirements

### Bonus (après mandatory parfait)

- **BON-01**: Strategies OAuth supplémentaires (Google, Discord, etc.)
- **BON-02**: Gestion de plusieurs résolutions vidéo
- **BON-03**: Streaming via MediaStream API
- **BON-04**: Routes API add/delete movies

## Out of Scope

| Feature | Reason |
|---------|--------|
| webtorrent / pulsar / peerflix | Interdits par le sujet |
| Upload de vidéos par les utilisateurs | Hors spec — streaming torrent uniquement |
| Application mobile native | Web-first (Firefox/Chrome), pas dans le sujet |
| Chat en temps réel | Hors spec |
| Système de notation/likes | Hors spec — commentaires seulement |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INF-01 | Phase 1 | Pending |
| INF-02 | Phase 1 | Pending |
| INF-03 | Phase 1 | Pending |
| INF-04 | Phase 1 | Pending |
| INF-05 | Phase 1 | Pending |
| INF-06 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| AUTH-07 | Phase 2 | Pending |
| AUTH-08 | Phase 2 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| SEC-01 | Phase 2 | Pending |
| SEC-02 | Phase 2 | Pending |
| SEC-04 | Phase 2 | Pending |
| SEC-05 | Phase 2 | Pending |
| SEC-07 | Phase 2 | Pending |
| SEC-08 | Phase 2 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-04 | Phase 2 | Pending |
| VID-01 | Phase 3 | Pending |
| VID-02 | Phase 3 | Pending |
| VID-03 | Phase 3 | Pending |
| VID-04 | Phase 3 | Pending |
| VID-10 | Phase 3 | Pending |
| SEC-06 | Phase 3 (initial) / Phase 6 (final) | Pending |
| VID-05 | Phase 4 | Pending |
| VID-06 | Phase 4 | Pending |
| VID-07 | Phase 4 | Pending |
| LIB-01 | Phase 5 | Pending |
| LIB-02 | Phase 5 | Pending |
| LIB-03 | Phase 5 | Pending |
| LIB-04 | Phase 5 | Pending |
| LIB-05 | Phase 5 | Pending |
| LIB-06 | Phase 5 | Pending |
| LIB-07 | Phase 5 | Pending |
| LIB-08 | Phase 5 | Pending |
| VID-08 | Phase 5 | Pending |
| VID-09 | Phase 5 | Pending |
| VID-11 | Phase 5 | Pending |
| VID-12 | Phase 5 | Pending |
| SEC-03 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| API-01 | Phase 6 | Pending |
| API-02 | Phase 6 | Pending |
| API-03 | Phase 6 | Pending |
| API-04 | Phase 6 | Pending |
| API-05 | Phase 6 | Pending |
| API-06 | Phase 6 | Pending |
| API-07 | Phase 6 | Pending |
| API-08 | Phase 6 | Pending |
| API-09 | Phase 6 | Pending |
| API-10 | Phase 6 | Pending |
| API-11 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 59 total (INF×6, AUTH×8, PROF×2, LIB×8, VID×12, API×11, SEC×8, UI×4)
- Mapped to phases: 59
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 — traceability updated to match ROADMAP.md phase assignments*
