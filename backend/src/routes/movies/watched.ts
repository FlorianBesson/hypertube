import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middlewares/auth';
import { prisma } from '../../prisma';
import { HttpError } from '../../errors';

const router = Router();

function getUserId(req: Request): number | null {
  const userPayload = (req as any).user;
  const rawId = userPayload?.userId || userPayload?.id;
  if (!rawId) return null;
  const parsed = typeof rawId === 'string' ? parseInt(rawId, 10) : Number(rawId);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Route: GET /api/movies/watched
 * Description: Fetches list of movie IDs (imdbId) watched by the authenticated user from BDD.
 * Access: Authenticated
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    throw new HttpError(401, 'Unauthenticated user');
  }

  const records = await prisma.watchedMovie.findMany({
    where: { userId },
    select: { imdbId: true },
  });
  const watched = records.map((r) => r.imdbId);
  res.json({ success: true, watched });
});

/**
 * Route: GET /api/movies/watched/history
 * Description: Fetches the most recently watched movies of the authenticated user, newest first.
 * Access: Authenticated
 */
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    throw new HttpError(401, 'Unauthenticated user');
  }

  const requestedLimit = Number(req.query.limit);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 20) : 6;

  const history = await prisma.watchedMovie.findMany({
    where: { userId },
    select: { imdbId: true, watchedAt: true },
    orderBy: { watchedAt: 'desc' },
    take: limit,
  });

  res.json({ success: true, history });
});

/**
 * Route: POST /api/movies/watched/:imdbId
 * Description: Marks a movie as watched by the authenticated user in BDD.
 * Access: Authenticated
 */
router.post('/:imdbId', authenticateToken, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    throw new HttpError(401, 'Unauthenticated user');
  }

  const rawImdbId = req.params.imdbId;
  const imdbId = Array.isArray(rawImdbId) ? rawImdbId[0] : rawImdbId;

  if (!imdbId) {
    throw new HttpError(400, 'Missing movie ID');
  }

  await prisma.watchedMovie.upsert({
    where: {
      userId_imdbId: {
        userId,
        imdbId,
      },
    },
    update: {
      watchedAt: new Date(),
    },
    create: {
      userId,
      imdbId,
    },
  });

  res.json({ success: true, message: 'Movie marked as watched' });
});

export default router;
