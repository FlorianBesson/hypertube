import { useLayoutEffect, useRef, useState } from 'react'

export interface MovieGenreBadgesProps {
  genres: string[]
}

const BADGE_GAP = 4

export default function MovieGenreBadges({ genres }: MovieGenreBadgesProps) {
  const badgeListRef = useRef<HTMLDivElement>(null)
  const badgeWidthsRef = useRef<number[]>([])
  const [visibleCount, setVisibleCount] = useState<number | null>(null)

  useLayoutEffect(() => {
    const badgeList = badgeListRef.current
    if (!badgeList) return

    // Widths are captured while every badge is still rendered, so later passes can refit without remounting.
    if (!badgeWidthsRef.current.length) {
      badgeWidthsRef.current = Array.from(badgeList.children).map(badge => (badge as HTMLElement).offsetWidth)
    }
    const badgeWidths = badgeWidthsRef.current
    const counterWidth = badgeWidths[badgeWidths.length - 1] ?? 0
    const genreWidths = badgeWidths.slice(0, genres.length)

    const fitBadges = () => {
      const availableWidth = badgeList.clientWidth
      let usedWidth = 0
      let fittingCount = 0

      for (const genreWidth of genreWidths) {
        const nextWidth = usedWidth + (fittingCount ? BADGE_GAP : 0) + genreWidth
        if (nextWidth > availableWidth) break
        usedWidth = nextWidth
        fittingCount += 1
      }

      while (
        fittingCount > 1 &&
        fittingCount < genreWidths.length &&
        usedWidth + BADGE_GAP + counterWidth > availableWidth
      ) {
        fittingCount -= 1
        usedWidth -= genreWidths[fittingCount] + BADGE_GAP
      }

      setVisibleCount(Math.max(fittingCount, 1))
    }

    fitBadges()
    const resizeObserver = new ResizeObserver(fitBadges)
    resizeObserver.observe(badgeList)
    return () => resizeObserver.disconnect()
  }, [genres])

  const isMeasuring = visibleCount === null
  const visibleGenres = isMeasuring ? genres : genres.slice(0, visibleCount)
  const hiddenCount = genres.length - visibleGenres.length

  return (
    <div
      ref={badgeListRef}
      className={`flex items-center gap-1 mb-1 overflow-hidden ${isMeasuring ? 'invisible' : ''}`}
      title={genres.join(', ')}
    >
      {visibleGenres.map(genre => (
        <span
          key={genre}
          className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider shadow-md bg-red-600/20 text-red-300 border border-red-500/25 backdrop-blur-md whitespace-nowrap shrink-0"
        >
          {genre}
        </span>
      ))}
      {(hiddenCount > 0 || isMeasuring) && (
        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider shadow-md bg-black/70 text-neutral-300 border border-white/10 backdrop-blur-md shrink-0">
          +{hiddenCount || genres.length}
        </span>
      )}
    </div>
  )
}
