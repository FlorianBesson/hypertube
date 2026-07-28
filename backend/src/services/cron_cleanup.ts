import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';

/**
 * Nettoie les fichiers vidéo et sous-titres associés des films non visionnés depuis plus de 30 jours.
 * - Supprime le fichier (ou dossier) physique du disque s'il existe.
 * - Réinitialise les champs BDD `filePath`, `isCompleted` et `fileSize`.
 * - Affiche un log détaillé avec le nombre de films supprimés et l'espace libéré.
 */
export async function cleanupOldMovies(): Promise<{ purgedCount: number; freedBytes: number }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let purgedCount = 0;
    let freedBytes = 0;

    try {
        const expiredMovies = await prisma.movie.findMany({
            where: {
                filePath: { not: null },
                lastWatchedAt: { lt: thirtyDaysAgo },
            },
        });

        if (expiredMovies.length === 0) {
            console.log('[CRON] Aucun film inactif depuis 30 jours à nettoyer.');
            return { purgedCount: 0, freedBytes: 0 };
        }

        for (const movie of expiredMovies) {
            if (!movie.filePath) continue;

            let fileFreed = 0;

            try {
                if (fs.existsSync(movie.filePath)) {
                    const stats = fs.statSync(movie.filePath);
                    fileFreed = stats.size;

                    if (stats.isDirectory()) {
                        await fs.promises.rm(movie.filePath, { recursive: true, force: true });
                    } else {
                        await fs.promises.unlink(movie.filePath);

                        // Nettoyage éventuel des sous-titres associés s'ils partagent le même nom de base ou dossier
                        const dir = path.dirname(movie.filePath);
                        const ext = path.extname(movie.filePath);
                        const baseName = path.basename(movie.filePath, ext);

                        if (fs.existsSync(dir)) {
                            const dirFiles = await fs.promises.readdir(dir);
                            for (const file of dirFiles) {
                                if (file.startsWith(baseName) && (file.endsWith('.vtt') || file.endsWith('.srt'))) {
                                    const subPath = path.join(dir, file);
                                    if (fs.existsSync(subPath)) {
                                        const subStats = fs.statSync(subPath);
                                        fileFreed += subStats.size;
                                        await fs.promises.unlink(subPath);
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`[CRON] Erreur lors de la suppression du fichier pour le film ID ${movie.id} (${movie.filePath}):`, err);
            }

            // Réinitialisation en base de données
            await prisma.movie.update({
                where: { id: movie.id },
                data: {
                    filePath: null,
                    isCompleted: false,
                    fileSize: null,
                },
            });

            purgedCount++;
            freedBytes += fileFreed;
        }

        const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
        console.log(`[CRON] Nettoyage automatique terminé : ${purgedCount} film(s) purgé(s), ${freedMB} Mo d'espace libéré.`);

    } catch (error) {
        console.error('[CRON] Erreur globale lors du nettoyage des vidéos inactives:', error);
    }

    return { purgedCount, freedBytes };
}

/**
 * Initialise le planificateur Cron pour exécuter le nettoyage quotidien à 3h00 du matin.
 */
export function initCronJobs(): void {
    // Exécution tous les jours à 3h00 du matin ('0 3 * * *')
    cron.schedule('0 3 * * *', async () => {
        console.log('[CRON] Lancement de la tâche quotidienne de nettoyage des vidéos inactives...');
        await cleanupOldMovies();
    });

    console.log('[CRON] Planificateur de nettoyage automatique configuré (exécuté chaque jour à 03:00).');
}
