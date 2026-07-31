import { Router, Request, Response } from 'express';
import fs from 'fs';
import { SubtitleService, normalizeImdbId } from '../../services/subtitle';
import { HttpError } from '../../errors';

const router = Router();

/**
 * Route: GET /api/movies/subtitles/:imdbId/:lang
 * Description: Serves WebVTT subtitle file for a specific movie IMDb ID and language.
 */
router.get("/:imdbId/:lang", async (req: Request, res: Response) => {
    const rawImdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;
    const rawLang = Array.isArray(req.params.lang) ? req.params.lang[0] : req.params.lang;

    if (!rawImdbId || !rawLang) {
        throw new HttpError(400, "Paramètres IMDb ID et langue requis");
    }

    const cleanImdb = normalizeImdbId(rawImdbId);
    const cleanLang = rawLang.toLowerCase().trim();

    const filePath = await SubtitleService.fetchAndSaveSubtitle(cleanImdb, cleanLang);

    if (!filePath || !fs.existsSync(filePath)) {
        throw new HttpError(404, "Sous-titres introuvables");
    }

    res.setHeader('Content-Type', 'text/vtt');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
});

export default router;
