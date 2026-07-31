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
    throw new HttpError(401, 'Utilisateur non identifié');
  }

  const records = await prisma.watchedMovie.findMany({
    where: { userId },
    select: { imdbId: true },
  });
  const watched = records.map((r) => r.imdbId);
  res.json({ success: true, watched });
});

/**
 * Route: POST /api/movies/watched/:imdbId
 * Description: Marks a movie as watched by the authenticated user in BDD.
 * Access: Authenticated
 */
router.post('/:imdbId', authenticateToken, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    throw new HttpError(401, 'Utilisateur non identifié');
  }

  const rawImdbId = req.params.imdbId;
  const imdbId = Array.isArray(rawImdbId) ? rawImdbId[0] : rawImdbId;

  if (!imdbId) {
    throw new HttpError(400, 'ID de film manquant');
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

  res.json({ success: true, message: 'Film marqué comme vu' });
});

export default router;
