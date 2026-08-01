import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TranslationType } from '../../../locales/translations'
import type { WatchHistoryEntry } from '../../../hooks/useWatchHistory'
import { isResumable, formatWatchPosition } from '../../../utils/watchProgress'

export interface HistoryCardProps {
  entry: WatchHistoryEntry
  lang: 'en' | 'fr'
  t: TranslationType['dashboard']
}

export default function HistoryCard({ entry, lang, t }: HistoryCardProps) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()

  const { movie, watchedAt, progressSeconds, durationSeconds } = entry
  const watchedLabel = new Date(watchedAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short'
  })

  const canResume = isResumable(progressSeconds, durationSeconds)
  const progressPercentage = durationSeconds ? Math.min((progressSeconds / durationSeconds) * 100, 100) : 0

  return (
    <div
      onClick={() => navigate(`/watch/${movie.id}`, { state: { movie } })}
      title={t.playMovie}
      className="bg-neutral-900/40 border border-white/5 rounded-2xl p-2 flex items-center gap-3 cursor-pointer hover:bg-neutral-900/80 hover:border-red-600/30 hover:shadow-[0_0_20px_rgba(220,38,38,0.07)] transition-all duration-300 group active:scale-[0.98]"
    >
      <div className="w-10 aspect-2/3 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
        {!imageError && movie.image ? (
          <img
            src={movie.image}
            alt={movie.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-red-950/40 to-neutral-900/60" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white group-hover:text-red-500 transition-colors truncate" title={movie.title}>
          {movie.title}
        </p>
        <p className="text-[10px] text-neutral-500 uppercase mt-0.5 tracking-wider truncate">
          {canResume ? `${t.resumeAt} ${formatWatchPosition(progressSeconds)}` : `${movie.year} · ${watchedLabel}`}
        </p>
        {canResume && progressPercentage > 0 && (
          <div className="h-1 mt-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 rounded-full" style={{ width: `${progressPercentage}%` }} />
          </div>
        )}
      </div>

      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-neutral-600 group-hover:text-red-500 transition-colors shrink-0">
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  )
}
