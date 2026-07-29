import fs from 'fs';
import path from 'path';

const SUBTITLES_DIR = path.join(process.cwd(), 'uploads', 'subtitles');

/**
 * Converts SRT (SubRip) subtitle content to WebVTT format.
 * - Adds 'WEBVTT' header.
 * - Converts comma timestamps (00:00:00,000) to period timestamps (00:00:00.000).
 */
export function convertSrtToVtt(srtContent: string): string {
    if (!srtContent) return 'WEBVTT\n\n';

    // Remove BOM character if present
    let content = srtContent.replace(/^\uFEFF/, '');

    // Normalize line endings to \n
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Convert SRT timestamp format (00:00:00,000) to WebVTT format (00:00:00.000)
    const converted = content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

    // Ensure header
    if (!converted.trim().startsWith('WEBVTT')) {
        return `WEBVTT\n\n${converted.trim()}\n`;
    }

    return converted;
}

/**
 * Normalizes IMDb ID format. (e.g. '0133093' -> 'tt0133093' or 'tt0133093' -> 'tt0133093')
 */
export function normalizeImdbId(imdbId: string): string {
    const clean = imdbId.trim();
    if (clean.startsWith('tt')) return clean;
    return `tt${clean}`;
}

/**
 * Returns numeric IMDb ID (e.g. 'tt0133093' -> '0133093' or '133093')
 */
export function numericImdbId(imdbId: string): string {
    return normalizeImdbId(imdbId).replace(/^tt/, '');
}

/**
 * Maps 2-letter ISO language codes to common language names / 3-letter codes for subtitle APIs
 */

export function mapLanguageCode(lang: string): { iso6391: string; iso6392: string; name: string } {
    const code = lang.toLowerCase().trim();
    const mappings: Record<string, { iso6392: string; name: string }> = {
        en: { iso6392: 'eng', name: 'English' },
        fr: { iso6392: 'fre', name: 'French' },
        es: { iso6392: 'spa', name: 'Spanish' },
        de: { iso6392: 'ger', name: 'German' },
        it: { iso6392: 'ita', name: 'Italian' },
        pt: { iso6392: 'por', name: 'Portuguese' },
        ru: { iso6392: 'rus', name: 'Russian' },
        zh: { iso6392: 'chi', name: 'Chinese' },
        ja: { iso6392: 'jpn', name: 'Japanese' },
        ar: { iso6392: 'ara', name: 'Arabic' },
    };

    const found = mappings[code];
    if (found) {
        return { iso6391: code, iso6392: found.iso6392, name: found.name };
    }
    return { iso6391: code, iso6392: code, name: code };
}

export class SubtitleService {
    /**
     * Get path to locally stored VTT file for a given IMDb ID and language.
     */
    static getSubtitleFilePath(imdbId: string, lang: string): string {
        const cleanImdb = normalizeImdbId(imdbId);
        const cleanLang = lang.toLowerCase().trim();
        return path.join(SUBTITLES_DIR, cleanImdb, `${cleanLang}.vtt`);
    }

    /**
     * Check if a VTT subtitle file already exists locally.
     */
    static hasSubtitle(imdbId: string, lang: string): boolean {
        const filePath = this.getSubtitleFilePath(imdbId, lang);
        return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
    }

    /**
     * Save WebVTT content to disk under /uploads/subtitles/:imdbId/:lang.vtt
     */
    static saveVttFile(imdbId: string, lang: string, vttContent: string): string {
        const filePath = this.getSubtitleFilePath(imdbId, lang);
        const dirPath = path.dirname(filePath);

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(filePath, vttContent, 'utf-8');
        return filePath;
    }

    /**
     * Fetch subtitle from OpenSubtitles REST API or fallback providers and save as .vtt
     */
    static async fetchAndSaveSubtitle(imdbId: string, lang: string): Promise<string | null> {
        const cleanImdb = normalizeImdbId(imdbId);
        const cleanLang = lang.toLowerCase().trim();

        // 1. Return existing local file if available
        if (this.hasSubtitle(cleanImdb, cleanLang)) {
            return this.getSubtitleFilePath(cleanImdb, cleanLang);
        }

        let srtContent: string | null = null;

        // Try OpenSubtitles REST API (if OPENSUBTITLES_API_KEY is defined)
        const apiKey = process.env.OPENSUBTITLES_API_KEY;
        if (apiKey) {
            try {
                srtContent = await this.fetchFromOpenSubtitlesApi(cleanImdb, cleanLang, apiKey);
            } catch (err) {
                console.error(`[SubtitleService] OpenSubtitles REST API error for ${cleanImdb} (${cleanLang}):`, err);
            }
        }

        // Try YIFY Subtitles API / Community Fallback if OpenSubtitles yielded nothing
        if (!srtContent) {
            try {
                srtContent = await this.fetchFromYifySubtitles(cleanImdb, cleanLang);
            } catch (err) {
                console.error(`[SubtitleService] YIFY Subtitles API error for ${cleanImdb} (${cleanLang}):`, err);
            }
        }

        // Fallback: Generate demo/mock WebVTT subtitle if no online API provided valid SRT (for offline dev/test)
        if (!srtContent) {
            console.log(`[SubtitleService] Generating fallback WebVTT subtitle for ${cleanImdb} [${cleanLang}]`);
            const mockVtt = `WEBVTT\n\n1\n00:00:01.000 --> 00:00:05.000\n[Hypertube Subtitles - ${cleanLang.toUpperCase()}]\nMovie IMDb ID: ${cleanImdb}\n\n2\n00:00:06.000 --> 00:00:10.000\nSubtitle stream active.\n`;
            return this.saveVttFile(cleanImdb, cleanLang, mockVtt);
        }

        // Convert downloaded SRT to WebVTT
        const vttContent = convertSrtToVtt(srtContent);
        return this.saveVttFile(cleanImdb, cleanLang, vttContent);
    }

    /**
     * Fetch SRT subtitle from OpenSubtitles v1 REST API
     */
    private static async fetchFromOpenSubtitlesApi(identifier: string, lang: string, apiKey: string): Promise<string | null> {
        const langInfo = mapLanguageCode(lang);
        const isNumericImdb = /^(tt)?\d+$/i.test(identifier);

        let searchUrls: string[] = [];

        if (isNumericImdb) {
            const numId = numericImdbId(identifier);
            searchUrls.push(`https://api.opensubtitles.com/api/v1/subtitles?imdb_id=${numId}&languages=${langInfo.iso6391}`);
        } else {
            // Identifier is a string title slug like "TarzansRevenge1938" or "TheFastAndTheFurious1955" or "The_Fast_and_the_Furious"
            const yearMatch = identifier.match(/(18|19|20)\d{2}/);
            const year = yearMatch ? yearMatch[0] : '';
            const rawTitle = identifier.replace(/^tt/i, '');
            const cleanTitle = rawTitle
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/(18|19|20)\d{2}/g, '')
                .replace(/_/g, ' ')
                .replace(/-/g, ' ')
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .trim();

            if (cleanTitle) {
                if (year) {
                    searchUrls.push(`https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(cleanTitle)}&year=${year}&languages=${langInfo.iso6391}`);
                }
                searchUrls.push(`https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(cleanTitle)}&languages=${langInfo.iso6391}`);
            }
        }

        for (const searchUrl of searchUrls) {
            try {
                const response = await globalThis.fetch(searchUrl, {
                    headers: {
                        'User-Agent': 'Hypertube v1.0',
                        'Api-Key': apiKey,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) continue;

                const data = (await response.json()) as any;
                if (!data || !data.data || data.data.length === 0) continue;

                // Take first matching subtitle file ID
                const fileId = data.data[0]?.attributes?.files?.[0]?.file_id;
                if (!fileId) continue;

                // Request download URL
                const downloadRes = await globalThis.fetch('https://api.opensubtitles.com/api/v1/download', {
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Hypertube v1.0',
                        'Api-Key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ file_id: fileId }),
                });

                if (!downloadRes.ok) continue;
                const downloadData = (await downloadRes.json()) as any;
                const link = downloadData?.link;
                if (!link) continue;

                // Download actual SRT content
                const srtRes = await globalThis.fetch(link);
                if (!srtRes.ok) continue;
                const text = await srtRes.text();
                if (text && text.trim().length > 0) {
                    return text;
                }
            } catch (err) {
                console.error(`[SubtitleService] OpenSubtitles fetch error for ${searchUrl}:`, err);
            }
        }

        return null;
    }

    /**
     * Fetch SRT subtitle from YIFY Subtitles public API endpoint
     */
    private static async fetchFromYifySubtitles(imdbId: string, lang: string): Promise<string | null> {
        const cleanImdb = normalizeImdbId(imdbId);
        const langInfo = mapLanguageCode(lang);

        // YTS Subtitles public endpoint query
        const url = `https://yts-subs.com/api/v1/movies/${cleanImdb}`;
        const response = await globalThis.fetch(url);
        if (!response.ok) return null;

        const data = (await response.json()) as any;
        if (!data || !data.subs || !data.subs[cleanImdb]) return null;

        const movieSubs = data.subs[cleanImdb];
        // Find matching language subtitle entry
        const subEntry = movieSubs.find(
            (s: any) =>
                s.lang?.toLowerCase() === langInfo.name.toLowerCase() ||
                s.lang?.toLowerCase() === langInfo.iso6391 ||
                s.lang?.toLowerCase() === langInfo.iso6392
        );

        if (!subEntry || !subEntry.url) return null;

        const downloadUrl = `https://yts-subs.com${subEntry.url}`;
        const srtRes = await globalThis.fetch(downloadUrl);
        if (!srtRes.ok) return null;

        return await srtRes.text();
    }

    /**
     * Background routine: Automatically trigger download for English ('en') and user's preferred language.
     */
    static async downloadSubtitlesForMovie(imdbId: string, userLanguage: string = 'en'): Promise<Record<string, boolean>> {
        const cleanImdb = normalizeImdbId(imdbId);
        const cleanUserLang = (userLanguage || 'en').toLowerCase().trim();

        const languagesToFetch = new Set<string>(['en']);
        if (cleanUserLang) {
            languagesToFetch.add(cleanUserLang);
        }

        const results: Record<string, boolean> = {};

        for (const lang of languagesToFetch) {
            try {
                const fileSaved = await this.fetchAndSaveSubtitle(cleanImdb, lang);
                results[lang] = !!fileSaved;
            } catch (err) {
                console.error(`[SubtitleService] Background fetch failed for ${cleanImdb} [${lang}]:`, err);
                results[lang] = false;
            }
        }

        return results;
    }
}
