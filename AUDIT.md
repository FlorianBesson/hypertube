# Audit Hypertube — 7 août 2026

## Périmètre

Audit statique de la base de code, vérifications sur la stack Docker de développement et tests non destructifs de routes HTTP. Les parcours OAuth réels, la réception SMTP et le téléchargement BitTorrent complet n'ont pas été exécutés.

## État actuel

- Le lint frontend passe.
- La vérification TypeScript backend passe (`npx tsc --noEmit`).
- Le build frontend passe dans le conteneur Docker.
- La stack de développement est saine : API, frontend et PostgreSQL sont démarrés ; l'API est `healthy`.
- Les endpoints de diagnostic publics `/api/ping` et `/api/db-check` ont été supprimés. Le healthcheck Docker utilise désormais `/healthz`, hors du namespace API et non exposé par Caddy en production.

## Éléments conformes au sujet

- Inscription, connexion avec mot de passe hashé via bcrypt et réinitialisation par e-mail.
- OAuth 42 et Google.
- Profils utilisateur, confidentialité de l'e-mail et modification limitée au propriétaire.
- Interface responsive, header, footer, internationalisation anglais/français et déconnexion.
- Catalogue, recherche, tri, filtres, pagination infinie et statut vu/non vu.
- Commentaires et contrôle de leur propriétaire.
- Streaming BitTorrent côté serveur, lecture progressive, cache, requêtes HTTP Range et conversion HLS/MKV.
- Nettoyage planifié des vidéos non vues depuis 30 jours.
- API OAuth2 et routes REST principales.

## Constats critiques

### 1. Traversée de répertoires possible dans les sous-titres

**Risque : critique — à corriger avant une soutenance.**

Les paramètres `imdbId` et `lang` servent à construire un chemin local sans validation stricte. Une valeur encodée contenant `../` peut faire sortir l'écriture ou la lecture du dossier `uploads/subtitles`.

- Code concerné : `backend/src/routes/movies/subtitles.ts`
- Construction du chemin : `backend/src/services/subtitle.ts`

Correction recommandée : accepter uniquement un IMDb ID avec `^tt\\d+$` et des codes de langue explicitement autorisés, par exemple `en`, `fr`, `es`. Vérifier aussi que le chemin résolu reste bien sous le dossier de sous-titres.

### 2. Validation d'upload d'avatar insuffisante

**Risque : critique — le sujet contrôle explicitement les uploads.**

Multer accepte un fichier à partir de son extension et du MIME type fourni par le navigateur. Ces valeurs sont falsifiables ; le contenu réel du fichier n'est pas vérifié.

- Code concerné : `backend/src/config/multer.ts`
- Validation client seulement : `frontend/src/pages/ProfilePage.tsx`

Correction recommandée : vérifier les magic bytes côté serveur, accepter uniquement JPEG/PNG/WebP réels, rejeter les fichiers invalides et servir les uploads avec `X-Content-Type-Options: nosniff`.

### 3. Sous-titres non téléchargés automatiquement

**Risque : non-conformité fonctionnelle.**

Le service contient `downloadSubtitlesForMovie`, mais cette fonction n'est appelée nulle part. Les sous-titres anglais et ceux correspondant à la langue préférée doivent être téléchargés automatiquement s'ils existent.

- Code concerné : `backend/src/services/subtitle.ts`

Correction recommandée : lancer le téléchargement en tâche de fond au démarrage du film, avec la langue anglaise et la langue préférée de l'utilisateur lorsque celle-ci diffère de la langue du film.

## Constats importants

### 4. Payloads de commentaires incompatibles avec le sujet

**Risque : API REST évaluée comme incomplète.**

Le schéma accepte `comment` ou `content`, mais certaines routes extraient uniquement `content`. Avec le payload attendu par le sujet, `{ "comment": "..." }`, la mise à jour peut être ignorée et la création via `/movies/:movie_id/comments` peut enregistrer un contenu vide.

- Code concerné : `backend/src/routes/movies/comments.ts`

Correction recommandée : normaliser systématiquement avec `const content = validation.data.content ?? validation.data.comment` dans les routes POST et PATCH, puis tester les payloads documentés dans le sujet.

### 5. Politique de mot de passe incohérente

**Risque : sécurité / validation de formulaire.**

L'inscription impose une longueur, un chiffre et un caractère spécial. La modification de mot de passe ne contrôle que huit caractères minimum, côté frontend comme backend.

- Code concerné : `backend/src/routes/auth/register.ts`
- Code concerné : `backend/src/routes/users/community.ts`

Correction recommandée : partager un même schéma Zod pour l'inscription, le reset et la modification de mot de passe.

### 6. Clé TMDB exposée au navigateur

**Risque : secret non protégé.**

Une variable préfixée `VITE_` est injectée dans le bundle frontend. `VITE_TMDB_API_KEY` est donc accessible à tous les visiteurs.

- Code concerné : `frontend/src/hooks/useMovieSearch.ts`
- Code concerné : `frontend/src/services/internetArchiveTmdb.ts`

Correction recommandée : déplacer les appels TMDB vers le backend et ne jamais injecter cette clé dans le navigateur.

### 7. JWT dans localStorage et dans les URLs média

**Risque : vol de session en cas de XSS, fuite dans les logs ou l'historique.**

Le JWT est stocké dans `localStorage` puis ajouté aux URLs de streaming et de sous-titres pour permettre aux éléments HTML `<video>` et `<track>` de s'authentifier.

- Code concerné : `frontend/src/App.tsx`
- Code concerné : `frontend/src/services/videoStream.ts`

Correction recommandée : privilégier un cookie `HttpOnly`, `Secure`, `SameSite` pour la session et utiliser un jeton média éphémère spécifique si nécessaire.

### 8. OAuth sans paramètre state

**Risque : login-CSRF.**

Les flux OAuth 42 et Google ne génèrent ni ne vérifient de paramètre `state`.

- Code concerné : `backend/src/routes/auth/login.ts`

Correction recommandée : générer un `state` cryptographiquement aléatoire, le lier à une session/cookie de courte durée et vérifier sa valeur au callback.

### 9. Comptes de démonstration aux identifiants publics

**Risque : accès non autorisé si le seed est utilisé hors développement.**

Le seed crée plusieurs utilisateurs avec le mot de passe public `password`. Les mots de passe sont bien hashés, mais restent trivialement connus.

- Code concerné : `backend/prisma/seed.ts`

Correction recommandée : ne jamais exécuter ce seed en environnement exposé, ou générer des mots de passe aléatoires affichés uniquement localement.

## Durcissement conseillé

- Ajouter `helmet`, désactiver `X-Powered-By` et définir au minimum CSP, `nosniff` et une politique `Referrer-Policy`.
- Ajouter une limitation de débit aux routes de connexion, inscription et réinitialisation de mot de passe.
- Valider systématiquement tous les payloads, query params et route params avec Zod.
- Retirer les alias inutiles de routes (`/api/movie`, `/movie`) afin de ne publier que l'API documentée.
- Ajouter des tests automatisés non destructifs pour les autorisations (401/403), les payloads REST documentés, les uploads et la traversée de chemins.
- Éviter les `console.error` et `console.warn` visibles côté navigateur durant les scénarios normaux de démonstration, car le sujet interdit les erreurs et avertissements dans la console client.

## Dépendances

`npm audit --omit=dev --package-lock-only` sur le backend signale deux dépendances vulnérables :

- `fast-uri` : sévérité high ; vulnérabilité de host confusion.
- `file-type` : sévérité moderate ; boucle infinie possible sur un fichier ASF malformé.

Mettre à jour les dépendances transitives avant d'utiliser `file-type` pour sécuriser la validation des uploads.

## Ordre de correction recommandé

1. Corriger la traversée de chemins dans les sous-titres.
2. Sécuriser les uploads d'avatar.
3. Corriger les payloads de commentaires REST.
4. Déclencher le téléchargement automatique des sous-titres.
5. Unifier la validation des mots de passe et ajouter les protections HTTP/OAuth.
6. Déplacer TMDB côté backend et revoir les tokens média.
