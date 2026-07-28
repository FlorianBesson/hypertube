# Hypertube - Technical Specification & Requirements

> **Instructions for AI Agents (Claude, Gemini, Antigravity, etc.):**  
> This file is the primary reference specification for the Hypertube project. When assisting on this codebase, you must strictly comply with all mandatory rules, constraints, security guidelines, and architectural requirements detailed below.

---

## 1. Project Overview & General Constraints

- **Objective**: Create a web application that enables users to search for and watch videos. The video player is integrated into the site, downloading and streaming video content via BitTorrent in real-time.
- **Allowed Video Sources**: Only legal, royalty-free, or legally distributable content sources may be queried (e.g., [legittorrents.info](http://www.legittorrents.info), [archive.org](https://archive.org)). The search engine must query **at least 2 external sources**.
- **Torrent Video Stream Restrictions**: Libraries that provide out-of-the-box torrent video streaming (such as `webtorrent`, `pulsar`, or `peerflix`) are **strictly forbidden**. Torrent handling and streaming must be managed customly on the server side in a non-blocking background process.
- **Tech Stack & Server**: Any programming language, web server (Apache, Nginx, built-in), or framework is allowed (except forbidden torrent streaming libraries).
- **Browser & UI Requirements**: Compatible with the latest Chrome and Firefox. Layout must include at least a Header, Main section, and Footer. Fully responsive for mobile devices and small screen resolutions.
- **Security & Secret Storage**:
  - All credentials, API keys, and environment variables **must** be stored in `.env` (excluded by `.gitignore`). Hardcoding secrets in git leads to automatic failure (grade 0).
  - Passwords must be hashed (never stored in plain text).
  - All forms, inputs, and uploads must be sanitized and protected against SQL Injections, XSS (HTML/JS code injection), and unauthorized upload content.
- **Console Output**: Zero client-side or server-side console errors, warnings, or notices.

---

## 2. Mandatory Features

### 2.1 User Interface & Authentication
- **Registration**: Requires at least email address, username, last name, first name, and a hashed/protected password.
- **Omniauth / OAuth**: Support at least 2 login strategies: 42 Strategy + 1 other strategy of choice.
- **Login & Reset**: Login via username + password. Password reset link sent via email upon request.
- **Session**: Single-click logout available on all pages.
- **Language**: Preferred language selection (defaults to English).
- **User Profiles**:
  - Users can update their own email, profile picture, and user info.
  - Users can view any other user's profile picture and info.
  - Email addresses **must remain private** and only visible to the profile owner.

### 2.2 Library & Search
- **Access**: Restricted to authenticated users.
- **Search Engine**: Queries at least 2 legal sources and displays results as video thumbnails sorted by name.
- **Default View**: When no search query is active, displays the most popular videos from external sources (sorted by downloads, peers, seeders, etc.).
- **Thumbnails**:
  - Displays video title, production year (if available), IMDb rating (OMDb/TMDb, if available), and cover image.
  - Visual differentiation between watched and unwatched videos.
  - Infinite scroll pagination: Next page loads asynchronously on scroll (no links or manual buttons to load pages).
  - Sortable and filterable by criteria (name, genre, IMDb score, production year).

### 2.3 Video Player, Streaming & Subtitles
- **Access**: Restricted to authenticated users.
- **Video Detail Page**: Displays video player, summary (if available), cast details (producer, director, main cast), production year, length, IMDb rating, cover image, and comments list.
- **Interactive Comments**: Authenticated users can post comments; prior comments are listed.
- **Background Torrenting & Streaming**:
  - Selecting an un-downloaded movie triggers torrent downloading on the server in the background (non-blocking).
  - Video streaming to web player starts as soon as enough buffer data is downloaded.
  - Fully downloaded movies are saved on the server. Movies unwatched for 1 month are automatically deleted.
- **Transcoding**: If the video format is not natively supported by browsers (MP4, WebM), it must be converted on the fly into an acceptable format (**MKV support mandatory** at minimum).
- **Subtitles**: Download and provide English subtitles if available. If the movie language differs from the user's preferred language, download and allow selection of preferred language subtitles.

### 2.4 RESTful API & Documentation
- **Auth**: OAuth2 token endpoint (`POST oauth/token` expecting client + secret).
- **Access Control**: Authenticated users can view profiles, but can **only update their own profile** (return `403` on unauthorized update attempts). Unauthenticated users can access the frontpage top movies list.
- **API Endpoints Table**:

| Method | Endpoint | Description & Expected Data |
| :--- | :--- | :--- |
| `POST` | `oauth/token` | Expects `client` + `secret`, returns authentication token |
| `GET` | `/users` | Returns list of users with `id` and `username` |
| `GET` | `/users/:id` | Returns `username` and `profile_picture_url`. Email address excluded unless requester is profile owner |
| `PATCH` | `/users/:id` | Expected: `username`, `email`, `password`, `profile_picture_url`. Restricted to own profile (`403` otherwise) |
| `GET` | `/movies` | Returns list of frontpage movies (`id`, `name`) |
| `GET` | `/movies/:id` | Returns movie `name`, `id`, IMDb score, production year, length, available subtitles, comment count |
| `GET` | `/comments` | Returns list of latest comments (`author_username`, `date`, `content`, `id`) |
| `GET` | `/comments/:id` | Returns comment content, `author_username`, `id`, `date` |
| `PATCH` | `/comments/:id` | Expected: `comment`, `username` |
| `DELETE` | `/comments/:id` | Deletes target comment |
| `POST` | `/comments` or `/movies/:movie_id/comments` | Expected: `comment`, `movie_id`. Remaining fields populated by server |

- **Restricted Access**: Any unhandled API call must return the appropriate HTTP error code. Evidence of RESTful compliance required during defense.

---

## 3. Defense & Eliminatory Rules

- Zero errors, warnings, or notices in server or client browser consoles.
- Anything not specifically authorized is forbidden.
- Any security breach (plain-text passwords in DB, SQL injection, unvalidated uploads/forms) results in a non-negotiable **grade of 0**.
