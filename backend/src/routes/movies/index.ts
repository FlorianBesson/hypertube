import { Router } from 'express';
import streamRouter from './stream';
import commentsRouter from './comments';

const router = Router();

// Streaming endpoint (/api/movies/stream/:torrentHash)
router.use('/stream', streamRouter);

// Comments endpoints (/api/movies/comments/:imdbId)
router.use('/comments', commentsRouter);

export default router;
