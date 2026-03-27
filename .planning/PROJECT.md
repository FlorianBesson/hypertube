# Hypertube

## What This Is

Hypertube est une web app (projet 42) qui permet à des utilisateurs authentifiés de rechercher et regarder des vidéos. Le serveur télécharge les fichiers via BitTorrent et les streame simultanément au navigateur — la lecture démarre dès qu'assez de données sont disponibles, sans attendre la fin du téléchargement.

## Core Value

Un utilisateur peut chercher un film, cliquer, et commencer à le regarder en quelques secondes — sans jamais quitter le navigateur.

## Requirements

### Validated

- ✓ Monorepo Docker avec services frontend/backend isolés — existing
- ✓ Hono backend skeleton (port 3000) — existing
- ✓ React + Vite frontend skeleton (port 5173) — existing
- ✓ Prisma ORM configuré avec Prisma Studio — existing

### Active

**Setup & Infrastructure**
- [ ] `.env` exclu du git (`.gitignore`) — obligatoire, échec automatique sinon
- [ ] `backend/Dockerfile` complété (Node 24-alpine, Hono, build)
- [ ] `compose.dev.yml` corrigé (volume `./backend:/app`)
- [ ] PostgreSQL service ajouté au Docker Compose
- [ ] Root `package.json` avec npm workspaces

**Authentication**
- [ ] Inscription : email, username, nom, prénom, mot de passe hashé (bcrypt)
- [ ] Login username/password
- [ ] OAuth 42 strategy
- [ ] OAuth GitHub strategy
- [ ] Réinitialisation de mot de passe par email
- [ ] Logout depuis n'importe quelle page
- [ ] Sélection de langue préférée (défaut : anglais)

**Profils utilisateurs**
- [ ] Modifier email, photo de profil, informations
- [ ] Voir le profil d'un autre utilisateur (email masqué)

**Bibliothèque (authentifiés seulement)**
- [ ] Recherche via YTS API + The Pirate Bay (min. 2 sources)
- [ ] Affichage en thumbnails : nom, année, note IMDb (OMDb/TMDb), cover
- [ ] Page par défaut : vidéos populaires si aucune recherche
- [ ] Différenciation visuelle vidéos vues / non vues
- [ ] Infinite scroll (chargement asynchrone, sans lien)
- [ ] Filtres/tri : nom, genre, note IMDb, année de production

**Player vidéo (authentifiés seulement)**
- [ ] Streaming torrent côté serveur : démarrage dès assez de données (non-bloquant)
- [ ] Conversion à la volée si format non supporté (mkv requis)
- [ ] Détails : résumé, casting, année, durée, note IMDb, cover
- [ ] Sous-titres anglais auto + langue préférée utilisateur si disponible
- [ ] Sauvegarde du fichier téléchargé ; suppression si non visionné depuis 1 mois
- [ ] Commentaires sur la vidéo

**API RESTful (OAuth2)**
- [ ] `POST /oauth/token` — client + secret → auth token
- [ ] `GET/PATCH /users`, `GET/PATCH /users/:id`
- [ ] `GET /movies`, `GET /movies/:id`
- [ ] `GET/POST /comments`, `GET/PATCH/DELETE /comments/:id`
- [ ] `POST /movies/:id/comments`

**Sécurité (éliminatoire)**
- [ ] Mots de passe hashés (bcrypt), jamais en clair
- [ ] Protection injection SQL (Prisma paramétré)
- [ ] XSS : pas d'injection HTML/JS non protégée
- [ ] Validation de tous les formulaires et uploads
- [ ] `.env` local uniquement, exclu du repo

### Out of Scope

- webtorrent, pulsar, peerflix — interdits par le sujet (but éducatif)
- Application mobile native — web-first, Firefox/Chrome suffisant
- Bonus (résolutions multiples, MediaStream API, routes API add/delete movies) — après mandatory parfait
- Upload de vidéos par les utilisateurs — streaming torrent seulement

## Context

Projet académique 42, noté lors d'une soutenance peer-to-peer. La sécurité est vérifiée exhaustivement — la moindre faille (plain text password, SQLi, XSS) donne automatiquement 0. La partie bonus n'est évaluée que si le mandatory est parfait.

**Stack décidée :**
- Backend : Hono (Node 24) + Prisma + PostgreSQL
- Frontend : React + Vite + TypeScript
- Auth OAuth : 42 strategy + GitHub strategy
- Torrent sources : YTS API + The Pirate Bay
- Métadonnées vidéo : OMDb ou TMDb (API gratuite)
- Conversion vidéo : ffmpeg (à la volée)
- Containerisation : Docker Compose

## Constraints

- **Sécurité** : Échec automatique à la soutenance si brèche (plain text pwd, SQLi, XSS, upload non validé)
- **Librairies** : webtorrent, pulsar, peerflix interdits — streaming torrent custom obligatoire
- **Compatibilité** : Firefox et Chrome dernières versions uniquement
- **Responsive** : Layout correct sur mobile
- **Format vidéo** : mkv support minimum, conversion on-the-fly si non mp4/webm
- **API** : Doit être prouvée RESTful à la soutenance

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hono comme framework backend | Déjà dans le scaffold + léger, TypeScript natif, adapté aux APIs | — Pending |
| PostgreSQL via Prisma | Robuste, bien supporté par Prisma, adapté prod | — Pending |
| YTS API + The Pirate Bay | YTS API propre pour films HD, TPB pour catalogue large | — Pending |
| GitHub comme 2ème OAuth | Simple à configurer, familier pour étudiants 42 | — Pending |
| ffmpeg pour conversion | Standard industry, supporte mkv→mp4/webm on-the-fly | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-27 after initialization*
