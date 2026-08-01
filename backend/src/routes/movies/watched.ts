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

function getImdbIdParam(req: Request): string {
  const rawImdbId = req.params.imdbId;
  const imdbId = Array.isArray(rawImdbId) ? rawImdbId[0] : rawImdbId;
  if (!imdbId) {
    throw new HttpError(400, 'Missing movie ID');
  }
  return imdbId;
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
    select: { imdbId: true, watchedAt: true, progressSeconds: true, durationSeconds: true },
    orderBy: { watchedAt: 'desc' },
    take: limit,
  });

  res.json({ success: true, history });
});

/**
 * Route: GET /api/movies/watched/:imdbId/progress
 * Description: Fetches the playback position of a movie for the authenticated user.
 * Access: Authenticated
 */
router.get('/:imdbId/progress', authenticateToken, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    throw new HttpError(401, 'Unauthenticated user');
  }

  const record = await prisma.watchedMovie.findUnique({
    where: { userId_imdbId: { userId, imdbId: getImdbIdParam(req) } },
    select: { progressSeconds: true, durationSeconds: true },
  });

  res.json({
    success: true,
    progressSeconds: record?.progressSeconds ?? 0,
    durationSeconds: record?.durationSeconds ?? null,
  });
});

/**
 * Route: PUT /api/movies/watched/:imdbId/progress
 * Description: Saves the playback position of a movie so the user can resume it later.
 * Access: Authenticated
 */
router.put('/:imdbId/progress', authenticateToken, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    throw new HttpError(401, 'Unauthenticated user');
  }

  const imdbId = getImdbIdParam(req);
  const progressSeconds = Math.floor(Number(req.body?.progressSeconds));
  if (!Number.isFinite(progressSeconds) || progressSeconds < 0) {
    throw new HttpError(400, 'Invalid playback position');
  }

  const rawDuration = req.body?.durationSeconds;
  const parsedDuration = Math.floor(Number(rawDuration));
  const durationSeconds =
    rawDuration === undefined || !Number.isFinite(parsedDuration) || parsedDuration <= 0 ? null : parsedDuration;

  await prisma.watchedMovie.upsert({
    where: { userId_imdbId: { userId, imdbId } },
    update: { progressSeconds, ...(durationSeconds !== null && { durationSeconds }) },
    create: { userId, imdbId, progressSeconds, durationSeconds },
  });

  res.json({ success: true, message: 'Playback position saved' });
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

  const imdbId = getImdbIdParam(req);

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
