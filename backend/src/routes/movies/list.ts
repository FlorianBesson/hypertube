import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma';
import fs from 'fs';
import path from 'path';

const router = Router();
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;

async function fetchMovieDetailsFromTmdb(id: string) {
    const isImdbId = id.startsWith('tt');
    const endpoint = isImdbId
        ? `https://api.themoviedb.org/3/find/${id}?api_key=${TMDB_API_KEY}&external_source=imdb_id&language=en-US`
        : `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`;

    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const data = await response.json() as any;

    let movieData = data;
    if (isImdbId && data.movie_results && data.movie_results.length > 0) {
        movieData = data.movie_results[0];
    }

    if (!movieData || (!movieData.title && !movieData.name)) return null;

    let runtime = movieData.runtime;
    if (!runtime && movieData.id) {
        try {
            const detailRes = await fetch(`https://api.themoviedb.org/3/movie/${movieData.id}?api_key=${TMDB_API_KEY}&language=en-US`);
            if (detailRes.ok) {
                const detailData = await detailRes.json() as any;
                runtime = detailData.runtime;
            }
        } catch {
            // Ignore runtime fetch error
        }
    }

    return {
        id: id,
        name: movieData.title || movieData.name || movieData.original_title,
        imdb_mark: movieData.vote_average || null,
        production_year: movieData.release_date ? parseInt(movieData.release_date.substring(0, 4), 10) : null,
        length: runtime ? `${runtime} min` : null,
        poster_path: movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : null,
        overview: movieData.overview
    };
}


async function fetchFrontpageMoviesFromArchive(page: number = 1, limit: number = 20) {
    try {
        const url = `https://archive.org/advancedsearch.php?q=mediatype%3Amovies+AND+collection%3Afeature_films&rows=30&page=${page}&output=json&sort%5B%5D=downloads+desc&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&fl%5B%5D=avg_rating`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json() as any;
            const docs = data.response?.docs || [];
            if (docs.length > 0) {
                const matchedMovies: any[] = [];
                for (const m of docs) {
                    const cleanedTitle = (m.title || m.identifier).replace(/^"\s*/, '').replace(/"\s*$/, '').trim();
                    const movieInfo = await fetchMovieDetailsFromTmdb(cleanedTitle);
                    if (movieInfo && movieInfo.production_year && movieInfo.production_year <= 1978 && movieInfo.production_year >= 1888) {
                        matchedMovies.push({
                            id: m.identifier,
                            name: movieInfo.name,
                            imdb_mark: movieInfo.imdb_mark,
                            production_year: movieInfo.production_year,
                            poster_path: movieInfo.poster_path || `https://archive.org/services/img/${m.identifier}`
                        });
                        if (matchedMovies.length >= limit) break;
                    }
                }
                if (matchedMovies.length > 0) return matchedMovies;
            }
        }
    } catch (err) {
        console.error("Error fetching Archive.org movies:", err);
    }
    return [];
}

function getFrontpagePublicDomainMovies(page: number = 1, limit: number = 20) {
    try {
        const jsonPath = path.join(__dirname, '../../data/public_domain_torrents.json');
        if (fs.existsSync(jsonPath)) {
            const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            const startIndex = (page - 1) * limit;
            return raw.slice(startIndex, startIndex + limit).map((m: any) => ({
                id: m.imdb_id || `pdt-${m.id}`,
                name: m.title,
                imdb_mark: m.vote_average || null,
                production_year: m.release_date ? parseInt(m.release_date.substring(0, 4), 10) : null,
                poster_path: m.poster_path || null
            }));
        }
    } catch (err) {
        console.error("Error reading public domain movies json:", err);
    }
    return [];
}

async function fetchCombinedFrontpageMovies(page: number = 1, limit: number = 20) {
    const archiveMovies = await fetchFrontpageMoviesFromArchive(page, limit);
    const pdtMovies = getFrontpagePublicDomainMovies(page, limit);

    const combined = [...archiveMovies, ...pdtMovies];
    const seen = new Set<string>();
    const result: any[] = [];

    for (const movie of combined) {
        const key = movie.name.toLowerCase().trim();
        if (!seen.has(key)) {
            seen.add(key);
            result.push(movie);
        }
        if (result.length >= limit) break;
    }

    return result;
}

router.get("/", async (req: Request, res: Response) => {
    try {
        const page = parseInt((req.query.page as string) || "1", 10);
        let movies = await fetchCombinedFrontpageMovies(isNaN(page) ? 1 : page);

        if (movies.length === 0) {
            movies = getFrontpagePublicDomainMovies(isNaN(page) ? 1 : page);
        }

        res.json({
            success: true,
            movies: movies.map((m: any) => ({
                id: m.id,
                name: m.name,
                imdb_mark: m.imdb_mark,
                production_year: m.production_year,
                poster_path: m.poster_path
            }))
        });
    } catch (error) {
        console.error("GET /movies error:", error);
        res.status(500).json({ success: false, message: "Error fetching frontpage movies" });
    }
});

router.get("/:id", async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        if (!idParam) {
            res.status(400).json({ success: false, message: "Missing movie ID" });
            return;
        }
        const movieId = Array.isArray(idParam) ? idParam[0] : idParam;

        // 1. Fetch movie metadata from TMDb
        const movieInfo = await fetchMovieDetailsFromTmdb(movieId);

        // 2. Count comments in database for this movie
        const commentCount = await prisma.comment.count({
            where: { imdbId: movieId }
        });

        // 3. List available local subtitles
        const subtitleDir = path.join(process.cwd(), 'uploads', 'subtitles', movieId);
        let availableSubtitles: string[] = [];
        if (fs.existsSync(subtitleDir)) {
            const files = fs.readdirSync(subtitleDir);
            availableSubtitles = files.filter(f => f.endsWith('.vtt')).map(f => f.replace('.vtt', ''));
        }

        if (!movieInfo) {
            res.status(404).json({
                success: false,
                message: "Movie not found"
            });
            return;
        }

        res.json({
            success: true,
            movie: {
                id: movieInfo.id,
                name: movieInfo.name,
                imdb_mark: movieInfo.imdb_mark,
                production_year: movieInfo.production_year,
                length: movieInfo.length,
                available_subtitles: availableSubtitles,
                number_of_comments: commentCount,
                comment_count: commentCount,
                poster_path: movieInfo.poster_path,
                overview: movieInfo.overview
            }
        });
    } catch (error) {
        console.error("GET /movies/:id error:", error);
        res.status(500).json({ success: false, message: "Error fetching movie details" });
    }
});

export default router;
