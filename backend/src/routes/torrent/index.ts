import { Router } from 'express';
import { torrentHandler } from './torrentClient';
import { searchTorrents } from './torrentClient';

const router = Router();

// Register Endpoint (mounted at /api/auth/register)
router.post("/download", torrentHandler);
router.post("/search", searchTorrents)

export default router;
