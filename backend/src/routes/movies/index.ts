import { Router } from 'express';
import streamRouter from './stream';
import commentsRouter from './comments';
import watchedRouter from './watched';

const router = Router();

// Streaming endpoint (/api/movies/stream/:torrentHash)
router.use('/stream', streamRouter);

// Comments endpoints (/api/movies/comments/:imdbId)
router.use('/comments', commentsRouter);

// Watched endpoints (/api/movies/watched)
router.use('/watched', watchedRouter);

export default router;
