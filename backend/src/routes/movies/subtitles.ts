import { Router, Request, Response } from 'express';
import fs from 'fs';
import { SubtitleService, normalizeImdbId } from '../../services/subtitle';

const router = Router();

/**
 * Route: GET /api/movies/subtitles/:imdbId/:lang
 * Description: Serves WebVTT subtitle file for a specific movie IMDb ID and language.
 */
router.get("/:imdbId/:lang", async (req: Request, res: Response) => {
    try {
        const rawImdbId = Array.isArray(req.params.imdbId) ? req.params.imdbId[0] : req.params.imdbId;
        const rawLang = Array.isArray(req.params.lang) ? req.params.lang[0] : req.params.lang;

        if (!rawImdbId || !rawLang) {
            res.status(400).send("Paramètres IMDb ID et langue requis");
            return;
        }

        const cleanImdb = normalizeImdbId(rawImdbId);
        const cleanLang = rawLang.toLowerCase().trim();

        const filePath = await SubtitleService.fetchAndSaveSubtitle(cleanImdb, cleanLang);

        if (!filePath || !fs.existsSync(filePath)) {
            res.status(404).send("Sous-titres introuvables");
            return;
        }

        res.setHeader('Content-Type', 'text/vtt');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.sendFile(filePath);
    } catch (error) {
        console.error("Subtitle route error:", error);
        res.status(500).send("Erreur serveur sous-titres");
    }
});

export default router;
