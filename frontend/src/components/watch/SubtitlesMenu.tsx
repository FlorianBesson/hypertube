import type { TranslationType } from '../../locales/translations'
import type { SubtitleTrack } from '../../hooks/useSubtitles'
import { SUBTITLE_OFFSET_STEP_SEC } from '../../hooks/useSubtitles'

interface SubtitlesMenuProps {
  t: TranslationType['watch']
  subTracks: SubtitleTrack[]
  selectedSubLang: string
  showSubMenu: boolean
  onToggleMenu: () => void
  onSelect: (code: string) => void
  subOffset: number
  onAdjustOffset: (delta: number) => void
  onResetOffset: () => void
}

export default function SubtitlesMenu({
  t,
  subTracks,
  selectedSubLang,
  showSubMenu,
  onToggleMenu,
  onSelect,
  subOffset,
  onAdjustOffset,
  onResetOffset
}: SubtitlesMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggleMenu}
        className={`hover:text-red-500 transition-all cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-md ${selectedSubLang !== 'off' ? 'bg-red-600 text-white border-red-500 hover:bg-red-700' : 'bg-white/10 hover:bg-white/20 text-neutral-300 border-white/15'}`}
        title={t.subtitles || 'Sous-titres'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h9m-9 3.75h5.25" />
        </svg>
        <span>CC</span>
        <span className="text-[10px] uppercase opacity-80">({selectedSubLang})</span>
      </button>

      {showSubMenu && (
        <div className="absolute bottom-full right-0 mb-2 w-40 bg-neutral-900/95 border border-white/15 rounded-xl shadow-2xl p-1.5 z-30 flex flex-col gap-1 backdrop-blur-md">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-400 border-b border-white/10 flex items-center justify-between">
            <span>{t.subtitles || 'Sous-titres'}</span>
            <span className="text-red-500 font-mono text-[9px]">vtt</span>
          </div>
          <button
            onClick={() => onSelect('off')}
            className={`px-3 py-2 text-left text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between ${selectedSubLang === 'off' ? 'bg-red-600 font-bold text-white' : 'text-neutral-300 hover:bg-white/10'}`}
          >
            <span>{t.subtitlesOff || 'Désactivés'}</span>
            {selectedSubLang === 'off' && <span>✓</span>}
          </button>
          {subTracks.map((tr) => (
            <button
              key={tr.code}
              onClick={() => onSelect(tr.code)}
              className={`px-3 py-2 text-left text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between ${selectedSubLang === tr.code ? 'bg-red-600 font-bold text-white' : 'text-neutral-300 hover:bg-white/10'}`}
            >
              <span>{tr.label}</span>
              {selectedSubLang === tr.code && <span>✓</span>}
            </button>
          ))}

          {selectedSubLang !== 'off' && (
            <div className="mt-1 pt-1.5 border-t border-white/10 flex flex-col gap-1 px-1">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-semibold px-1">
                <span>{t.syncOffset || 'Décalage tempo'}</span>
                <span className="font-mono text-red-400 font-bold">
                  {subOffset > 0 ? `+${subOffset.toFixed(1)}s` : `${subOffset.toFixed(1)}s`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={() => onAdjustOffset(-SUBTITLE_OFFSET_STEP_SEC)}
                  className="flex-1 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold transition-colors cursor-pointer text-center"
                  title={t.advanceSubtitles || `Avancer les sous-titres (-${SUBTITLE_OFFSET_STEP_SEC}s)`}
                >
                  -{SUBTITLE_OFFSET_STEP_SEC}s
                </button>
                <button
                  onClick={onResetOffset}
                  className="px-2 py-1 bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                  title={t.reset || 'Réinitialiser'}
                >
                  {t.reset || 'Reset'}
                </button>
                <button
                  onClick={() => onAdjustOffset(SUBTITLE_OFFSET_STEP_SEC)}
                  className="flex-1 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold transition-colors cursor-pointer text-center"
                  title={t.delaySubtitles || `Retarder les sous-titres (+${SUBTITLE_OFFSET_STEP_SEC}s)`}
                >
                  +{SUBTITLE_OFFSET_STEP_SEC}s
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
