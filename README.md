# Hypertube (Magneto)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express.js_5-404D59?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Caddy](https://img.shields.io/badge/Caddy_2-00B4B6?style=for-the-badge&logo=caddy&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Hypertube** est une application web de streaming vidéo via le protocole BitTorrent, développée dans le cadre du cursus de l'École 42. Elle permet aux utilisateurs de rechercher des films, de consulter les détails, d’interagir via des commentaires, et de lire des contenus vidéo en streaming continu directement dans le navigateur pendant le téléchargement en arrière-plan.

---

## 📋 Sommaire

- [Aperçu de la Stack Technique](#-aperçu-de-la-stack-technique)
- [Architecture du Projet](#-architecture-du-projet)
- [Fonctionnalités Principales](#-fonctionnalités-principales)
- [Spécifications & Endpoints de l'API REST](#-spécifications--endpoints-de-lapi-rest)
- [Prérequis](#-prérequis)
- [Variables d'Environnement](#-variables-denvironnement)
- [Guide de Démarrage (Développement)](#-guide-de-démarrage-développement)
- [Déploiement en Production](#-déploiement-en-production)
- [Gestion de la Base de Données & Prisma Studio](#-gestion-de-la-base-de-données--prisma-studio)
- [Maintenance & Nettoyage Automatique](#-maintenance--nettoyage-automatique)
- [Commandes Makefile](#-commandes-makefile)

---

## 🛠 Aperçu de la Stack Technique

### Frontend
- **Framework & Build** : [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling & UI** : [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React Icons](https://lucide.dev/)
- **Routage** : [React Router DOM v7](https://reactrouter.com/)
- **Internationalisation (i18n)** : Support bilingue Français / Anglais (`fr.json`, `en.json`)

### Backend
- **Serveur API** : [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **ORM & Base de données** : [Prisma ORM](https://www.prisma.io/) avec [PostgreSQL 17](https://www.postgresql.org/)
- **Moteur de Torrent & Streaming** : Téléchargement BitTorrent en tâche de fond, streaming vidéo HTTP avec support des en-têtes `Range` (`HTTP 206 Partial Content`) et gestion multi-formats.
- **Authentification & Sécurité** :
  - Inscription / Connexion locale (mots de passe hachés via `bcrypt`)
  - **OAuth 2.0** : Intégration **42 Intra** & **Google**
  - Jetons de session **JWT** (JSON Web Tokens)
  - Validation des requêtes via [Zod](https://zod.dev/)
- **Gestion des Fichiers & Media** : Stockage local avec `multer` pour les avatars utilisateurs
- **Emails** : `nodemailer` connecté à un relais SMTP Brevo pour la réinitialisation de mot de passe

### DevOps & Infrastructure
- **Proxy Inversé** : [Caddy 2](https://caddyserver.com/) pour la distribution des fichiers statiques, reverse proxying de l'API et gestion HTTPS
- **Conteneurisation** : Docker & Docker Compose (`compose.dev.yml` pour le dev, `compose.prod.yml` pour la prod)

---

## 🏗 Architecture du Projet

```text
hypertube/
├── backend/                  # API REST Express & Prisma ORM
│   ├── prisma/               # Schéma Prisma & scripts de seeding
│   ├── src/                  # Code source TypeScript du serveur API
│   │   ├── config/           # Configurations Multer, SMTP, etc.
│   │   ├── db/               # Utilitaires de connexion Postgres
│   │   ├── middlewares/      # Authentification JWT & gestion des erreurs
│   │   ├── routes/           # Routes API (Auth, Users, Movies, Torrent)
│   │   │   ├── auth/         # Register, Login, OAuth (42, Google), Password reset
│   │   │   ├── users/        # Gestion profil (/api/user) & membres (/api/users)
│   │   │   ├── movies/       # Streaming, commentaires, films vus
│   │   │   └── torrent/      # Endpoints torrent
│   │   ├── services/         # Services métiers (Movies, Stream, Torrent, Archive, Cron)
│   │   └── server.ts         # Point d'entrée principal de l'API Express
│   ├── uploads/              # Stockage local des avatars des utilisateurs
│   └── Dockerfile            # Dockerfile multi-stage (dev / prod)
├── frontend/                 # Application Web React Vite
│   ├── src/
│   │   ├── components/       # Composants réutilisables (Dashboard, Profile, Watch, UI)
│   │   ├── hooks/            # Custom hooks React
│   │   ├── locales/          # Fichiers de langues i18n (en.json, fr.json)
│   │   ├── pages/            # Pages principales (Login, Register, Dashboard, Profile, Watch...)
│   │   ├── services/         # Clients d'API & intégration TMDB
│   │   └── App.tsx           # Routage principal React Router
│   └── Dockerfile            # Dockerfile multi-stage (dev / prod)
├── caddy/                    # Proxy Caddy & Caddyfile
├── compose.dev.yml           # Configuration Docker Compose (Développement)
├── compose.prod.yml          # Configuration Docker Compose (Production)
├── Makefile                  # Scripts d'automatisation des commandes
├── subject.md                # Spécifications et contraintes du sujet 42
└── .env.example              # Modèle de variables d'environnement
```

---

## ✨ Fonctionnalités Principales

1. **Authentification & Gestion d'Accès** :
   - Inscription et connexion par identifiant/email avec règles de complexité des mots de passe.
   - Connexion OAuth 2.0 via **42 Intra** et **Google**.
   - Procédure de réinitialisation de mot de passe via jeton sécurisé envoyé par email.
2. **Profils Utilisateurs** :
   - Consultation et mise à jour du profil personnel (nom, prénom, email, biographie).
   - Téléversement et suppression d’avatars personnalisés (`multer`).
   - Consultation restreinte des autres membres de la communauté (adresse email privée).
3. **Catalogue de Films & Recherche (Dashboard)** :
   - Recherche multi-critères via l'API TMDB & sources de torrents.
   - Filtres et tri (par nom, genre, note IMDb, année de sortie).
   - Scroll infini pour le chargement automatique des contenus.
   - **Suivi de visionnage** : Distinction visuelle entre films déjà vus et non vus.
4. **Lecteur Vidéo, Commentaires & BitTorrent Streaming** :
   - Téléchargement BitTorrent en tâche de fond lancé lors de la sélection d'un film.
   - Streaming vidéo en direct via le support des requêtes HTTP Range (`206 Partial Content`).
   - Lecteur vidéo HTML5 avec gestion des sous-titres et commentaires interactifs.
5. **Nettoyage Automatique & Maintenance** :
   - Tâche Cron automatique qui supprime du disque les films non visionnés pendant **plus de 30 jours**.
6. **Internationalisation (i18n)** :
   - Prise en charge intégrale du français et de l'anglais dans toute l'interface.

---

## 🌐 Spécifications & Endpoints de l'API REST

| Méthode | Endpoint | Authentifié | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Non | Inscription d'un nouvel utilisateur |
| `POST` | `/api/auth/login` | Non | Connexion utilisateur (retourne un jeton JWT) |
| `POST` | `/api/auth/forgot-password` | Non | Demande de réinitialisation de mot de passe par email |
| `POST` | `/api/auth/reset-password` | Non | Validation du nouveau mot de passe via token |
| `GET` | `/api/auth/42` / `google` | Non | Auth OAuth 2.0 (42 Intra / Google) |
| `GET` | `/api/user/me` | Oui | Récupération du profil de l'utilisateur connecté |
| `PATCH` | `/api/user/me` | Oui | Mise à jour des informations de profil |
| `POST` | `/api/user/me/photo` | Oui | Téléversement d'une photo de profil (Avatar) |
| `DELETE` | `/api/user/me/photo` | Oui | Suppression de la photo de profil |
| `GET` | `/api/users` | Oui | Liste publique des membres de la communauté |
| `GET` | `/api/users/:id` | Oui | Profil d'un membre de la communauté (email masqué) |
| `GET` | `/api/movies/stream/:torrentHash` | Oui | Flux vidéo HTTP Range pour un torrent |
| `GET` | `/api/movies/comments/:imdbId` | Oui | Récupération des commentaires d'un film |
| `POST` | `/api/movies/comments/:imdbId` | Oui | Ajout d'un commentaire sur un film |
| `GET` | `/api/movies/watched` | Oui | Récupération de la liste des films visionnés |
| `POST` | `/api/movies/watched` | Oui | Enregistrement d'un film comme visionné |
| `GET` | `/api/db-check` | Non | Verification de la connexion à la base de données |
| `GET` | `/api/ping` | Non | Test de disponibilité du serveur API Express |

---

## ⚡ Prérequis

- **Docker** (version 20.10+) & **Docker Compose** (v2+)
- **Make**
- Une clé API [TMDB (The Movie Database)](https://www.themoviedb.org/settings/api)

---

## 🔐 Variables d'Environnement

Créez un fichier `.env` à la racine du projet à partir du modèle `.env.example` :

```bash
cp .env.example .env
```

Exemple de variables dans `.env` :

```env
# Base de données PostgreSQL
POSTGRES_DB=hypertube_db
POSTGRES_USER=hypertube_user
POSTGRES_PASSWORD=your_secure_password

# OAuth Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback/google

# OAuth 42 Intra
FORTYTWO_CLIENT_ID=your_42_client_id
FORTYTWO_CLIENT_SECRET=your_42_client_secret
FORTYTWO_REDIRECT_URI=http://localhost:5173/auth/callback/42

# Configuration SMTP Brevo (Réinitialisation de mot de passe)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_login
SMTP_PASS=your_brevo_password
SMTP_FROM=noreply@hypertube.com
FRONTEND_URL=http://localhost:5173

# Clé API TMDB (Catalogue de films)
VITE_TMDB_API_KEY=your_tmdb_api_key
```

---

## 🚀 Guide de Démarrage (Développement)

1. Initialiser le fichier de configuration :
   ```bash
   cp .env.example .env
   ```

2. Démarrer l'environnement de développement :
   ```bash
   make dev
   ```

3. Accéder aux services :
   - **Frontend (Vite dev server)** : [http://localhost:5173](http://localhost:5173)
   - **Backend API (Express)** : [http://localhost:3000](http://localhost:3000)
   - **Prisma Studio** : [http://localhost:5555](http://localhost:5555) *(via `make prisma-studio`)*

---

## 🚢 Déploiement en Production

Pour lancer l'application en mode production avec **Caddy 2** en proxy inversé :

```bash
make prod
```

En production :
- Le Frontend React est compilé statiquement et distribué via Caddy.
- Le Backend API Express est accessible sous `/api`.
- Les données et certificats sont gérés de façon optimale.

Pour arrêter l'environnement de production :
```bash
make prod-down
```

---

## 🗄 Base de Données & Prisma Studio

L'application utilise **Prisma ORM** avec PostgreSQL.

- **Exécuter les migrations** :
  ```bash
  make db-migrate
  ```
- **Remplir la base avec des données de test (Seeding)** :
  ```bash
  make db-seed
  ```
- **Réinitialiser la base de données** :
  ```bash
  make db-reset
  ```
- **Lancer Prisma Studio (Interface graphique BDD)** :
  ```bash
  make prisma-studio
  ```
  Accédez à l'interface visuelle sur `http://localhost:5555`.

---

## 🧹 Maintenance & Nettoyage Automatique

Conformément aux spécifications du sujet Hypertube, les vidéos téléchargées qui n'ont pas été visionnées depuis **plus de 30 jours** sont automatiquement supprimées du disque par une tâche Cron s'exécutant sur le serveur backend (`backend/src/services/maintenance/cron_cleanup.ts`).

---

## 🛠 Commandes Makefile

| Commande | Description |
|---|---|
| `make help` | Affiche la liste et la description des commandes du Makefile |
| `make dev` | Construit et démarre l'environnement de développement complet |
| `make dev-down` | Arrête et nettoie les conteneurs de développement |
| `make dev-restart` | Redémarre les conteneurs de développement |
| `make prod` | Construit et démarre l'infrastructure de production (Caddy + API + BDD) |
| `make prod-down` | Arrête l'infrastructure de production |
| `make prod-logs` | Affiche les logs des conteneurs de production |
| `make db-migrate` | Applique les migrations Prisma |
| `make db-seed` | Initialise la base avec les données de test |
| `make db-reset` | Réinitialise les migrations Prisma et relance le seeding |
| `make db-status` | Affiche le statut des migrations de base de données |
| `make prisma-studio` | Lance Prisma Studio sur `http://localhost:5555` |
| `make logs` | Affiche les logs des conteneurs de dev en temps réel |
| `make re` | Redémarre l'environnement dev (`make down` puis `make dev`) |

---

<p align="center">Projet développé dans le cadre du cursus de l'École 42.</p>
