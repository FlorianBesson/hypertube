import { Router } from 'express';
import { torrentHandler } from './torrentClient';

const router = Router();

// Register Endpoint (mounted at /api/auth/register)
router.post("/", torrentHandler);

export default router;
