interface SubtitleOverlayProps {
  toast: string | null
  activeCueText: string
  isSubtitlesEnabled: boolean
}

export default function SubtitleOverlay({ toast, activeCueText, isSubtitlesEnabled }: SubtitleOverlayProps) {
  return (
    <>
      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 bg-neutral-900/90 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold rounded-full shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}

      {isSubtitlesEnabled && activeCueText && (
        <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-20 max-w-2xl sm:max-w-3xl px-5 py-2.5 bg-black/85 border border-white/15 text-white text-base sm:text-lg font-semibold rounded-2xl text-center shadow-2xl backdrop-blur-md transition-all duration-150 pointer-events-none whitespace-pre-line leading-relaxed">
          {activeCueText.replace(/<[^>]*>/g, '')}
        </div>
      )}
    </>
  )
}
