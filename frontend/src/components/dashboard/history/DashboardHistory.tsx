import type { TranslationType } from '../../../locales/translations'
import type { WatchHistoryEntry } from '../../../hooks/useWatchHistory'
import HistoryCard from './HistoryCard'

export interface DashboardHistoryProps {
  t: TranslationType['dashboard']
  lang: 'en' | 'fr'
  loadingHistory: boolean
  errorHistory: boolean
  historyEntries: WatchHistoryEntry[]
}

export default function DashboardHistory({ t, lang, loadingHistory, errorHistory, historyEntries }: DashboardHistoryProps) {
  const renderContent = () => {
    if (loadingHistory) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <span className="w-6 h-6 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          <p className="text-xs text-neutral-500">{t.loadingHistory}</p>
        </div>
      )
    }

    if (errorHistory) {
      return (
        <div className="text-center py-6 text-red-400 text-sm">
          {t.failedHistory}
        </div>
      )
    }

    if (historyEntries.length === 0) {
      return (
        <div className="text-center py-8 text-neutral-500 text-sm italic">
          {t.noHistory}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        {historyEntries.map((entry) => (
          <HistoryCard key={entry.movie.id} entry={entry} lang={lang} t={t} />
        ))}
      </div>
    )
  }

  return (
    <div className="w-full bg-neutral-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-6 relative overflow-hidden animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col gap-1 relative z-10">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t.historyTitle}
        </h2>
        <p className="text-xs text-neutral-400">
          {t.historySubtitle}
        </p>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto pr-1">
        {renderContent()}
      </div>
    </div>
  )
}
