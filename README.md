# Hypertube (Magneto)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Hypertube est une application web de streaming de films via le protocole BitTorrent.

---

## Sommaire

- [Aperçu de la Stack Technique](#aperçu-de-la-stack-technique)
- [Architecture du Projet](#architecture-du-projet)
- [Fonctionnalités Principales](#fonctionnalités-principales)
- [Prérequis](#prérequis)
- [Variables d'Environnement](#variables-denvironnement)
- [Démarrage Rapide (Development)](#démarrage-rapide-development)
- [Déploiement (Production)](#déploiement-production)
- [Commandes Makefile](#commandes-makefile)
- [Base de Données & Prisma Studio](#base-de-données--prisma-studio)

---

## Aperçu de la Stack Technique

### Frontend
- **Framework** : [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Style & UI** : [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React Icons](https://lucide.dev/)
- **Routage** : [React Router DOM v7](https://reactrouter.com/)
- **Internationalisation (i18n)** : Support bilingue Français / Anglais (`fr.json`, `en.json`)

### Backend
- **Serveur API** : [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **ORM & DB** : [Prisma ORM](https://www.prisma.io/) avec [PostgreSQL 17](https://www.postgresql.org/)
- **Authentification & Sécurité** : 
  - Authentification locale (Mot de passe sécurisé via `bcrypt`)
  - **OAuth 2.0** : Connexion via **42 Intra** & **Google**
  - Jetons de session **JWT** (JSON Web Tokens)
  - Validation de schéma d'entrée via [Zod](https://zod.dev/)
- **Gestion des Fichiers** : `multer` pour le téléversement et stockage des avatars utilisateurs
- **Mails & Réinitialisation** : `nodemailer` connecté à un relai SMTP Brevo

### DevOps & Infrastructure
- **Proxy Inversé** : [Caddy 2](https://caddyserver.com/) pour la redirection HTTPS/HTTP et la distribution des fichiers statiques
- **Conteneurisation** : Docker & Docker Compose (`compose.dev.yml` & `compose.prod.yml`)

---

## Architecture du Projet

```text
hypertube/
├── backend/                # API REST Express & Prisma ORM
│   ├── prisma/             # Schéma Prisma & scripts de seeding
│   ├── src/                # Code source TypeScript du serveur API
│   │   ├── config/         # Multer, configurations SMTP
│   │   ├── middlewares/    # Auth JWT & gestion des erreurs
│   │   ├── routes/         # Endpoints Auth (/api/auth), Utilisateur (/api/user, /api/users)
│   │   └── server.ts       # Point d'entrée principal d'Express
│   ├── uploads/            # Stockage local des avatars utilisateurs
│   └── Dockerfile          # Multi-stage Dockerfile (dev / prod)
├── frontend/               # Application Web React Vite
│   ├── src/
│   │   ├── components/     # Composants réutilisables (Dashboard, Profile, UI)
│   │   ├── locales/        # Fichiers i18n (en.json, fr.json)
│   │   ├── pages/          # Pages principales (Login, Register, Dashboard, Profile...)
│   │   └── App.tsx         # Définition des routes React Router
│   └── Dockerfile          # Multi-stage Dockerfile (dev / prod)
├── caddy/                  # Serveur web Caddy & configuration Caddyfile
├── compose.dev.yml         # Environment de développement Docker Compose
├── compose.prod.yml        # Environment de production Docker Compose
├── Makefile                # Commandes et scripts d'automatisation
└── .env.example            # Modèle des variables d'environnement
```

---

## Fonctionnalités Principales

1. **Authentification Hybride & Réseaux Sociaux** :
   - Inscription et connexion par identifiant / email avec règles de complexité strictes pour les mots de passe.
   - Connexion OAuth 2.0 via **42 Intra** et **Google**.
   - Réinitialisation de mot de passe oubliés par jeton sécurisé envoyé par email (SMTP Brevo).
2. **Gestion de Profil Utilisateur** :
   - Mise à jour des informations personnelles (Prénom, Nom, Email, Bio).
   - Téléversement et suppression de la photo de profil / avatar (`multer`).
   - Consultation des profils utilisateur.
3. **Catalogue & Recherche de Films (Dashboard)** :
   - Navigation interactive dans le catalogue de films avec l'API TMDB.
   - Support bilingue dynamique (Français / Anglais).
4. **Environnement de Développement Isolé** :
   - Support complet du Hot Reloading (HMR) sur le Frontend et le Backend via Docker.
   - Studio visuel de base de données (Prisma Studio).

---

## Prérequis

- **Docker** & **Docker Compose**
- **Make**
- Une clé API [TMDB](https://www.themoviedb.org/settings/api)

---

## Variables d'Environnement

Créez un fichier `.env` à la racine du projet en copiant le modèle `.env.example` :

```bash
cp .env.example .env
```

Variables requises dans le fichier `.env` :

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

## Démarrage Rapide (Development)

1. Initialisez l'environnement de développement :
   ```bash
   make dev
   ```
2. Accédez à l'application :
   - **Frontend (Vite dev server)** : `http://localhost:5173`
   - **Backend API (Express)** : `http://localhost:3000`

---

## Déploiement (Production)

Pour lancer l'application en mode production avec Caddy comme proxy inversé :

```bash
make prod
```

---

## Commandes Makefile

| Commande | Description |
|---|---|
| `make dev` | Démarre l'environnement de développement complet (build + up) |
| `make dev-down` | Arrête les conteneurs de développement |
| `make dev-restart` | Redémarre les conteneurs de développement |
| `make prod` | Démarre l'environnement de production (Caddy + API + DB) |
| `make prod-down` | Arrête l'environnement de production |
| `make db-seed` | Remplit la base de données avec des données initiales de test |
| `make db-reset` | Réinitialise les migrations Prisma et relance le seeding |
| `make prisma-studio` | Démarre l'interface visuelle Prisma Studio sur `http://localhost:5555` |
| `make logs` | Affiche les logs en temps réel des conteneurs dev |

---

## Base de Données & Prisma Studio

Pour explorer visuellement la base de données PostgreSQL durant le développement :

```bash
make prisma-studio
```
Accédez ensuite à **Prisma Studio** à l'adresse : `http://localhost:5555`.
