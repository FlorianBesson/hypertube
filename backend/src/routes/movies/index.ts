import { Router } from 'express';
import moviesListRouter from './list';
import streamRouter from './stream';
import commentsRouter from './comments';
import subtitlesRouter from './subtitles';
import watchedRouter from './watched';
import { authenticateMediaToken } from '../../middlewares/auth';

const router = Router();

// Streaming endpoint (/api/movies/stream/:torrentHash)
router.use('/stream', authenticateMediaToken, streamRouter);

// Comments endpoints (/movies/:id/comments or /movie/:id/comments)
router.use('/:id/comments', commentsRouter);

// Subtitles endpoints (/api/movies/subtitles/:imdbId/:lang)
router.use('/subtitles', authenticateMediaToken, subtitlesRouter);

// Watched endpoints (/api/movies/watched)
router.use('/watched', watchedRouter);

// List & detail endpoints (/api/movies and /api/movies/:id) - MUST be mounted last
router.use('/', moviesListRouter);

export default router;
