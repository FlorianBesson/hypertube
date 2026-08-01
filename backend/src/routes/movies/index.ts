import moviesListRouter from './list';
import streamRouter from './stream';
import commentsRouter from './comments';
import subtitlesRouter from './subtitles';
import watchedRouter from './watched';

const router = Router();

// List & detail endpoints (/api/movies and /api/movies/:id)
router.use('/', moviesListRouter);

// Streaming endpoint (/api/movies/stream/:torrentHash)
router.use('/stream', streamRouter);

// Comments endpoints (/api/movies/comments/:imdbId)
router.use('/comments', commentsRouter);

// Subtitles endpoints (/api/movies/subtitles/:imdbId/:lang)
router.use('/subtitles', subtitlesRouter);
// Watched endpoints (/api/movies/watched)
router.use('/watched', watchedRouter);

export default router;
