import { Router } from 'express';
import streamRouter from './stream';
import commentsRouter from './comments';
import subtitlesRouter from './subtitles';

const router = Router();

// Streaming endpoint (/api/movies/stream/:torrentHash)
router.use('/stream', streamRouter);

// Comments endpoints (/api/movies/comments/:imdbId)
router.use('/comments', commentsRouter);

// Subtitles endpoints (/api/movies/subtitles/:imdbId/:lang)
router.use('/subtitles', subtitlesRouter);

export default router;
