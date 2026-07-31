import { useCallback, useEffect, useRef, useState } from 'react'

const CONTROLS_HIDE_DELAY_MS = 3000

/** Shows player controls on mouse activity and auto-hides them after a delay while playing. */
export function useControlsVisibility(isPlaying: boolean, onVisibilityChange?: (visible: boolean) => void) {
  const [showControls, setShowControls] = useState(true)
  const hideTimeoutRef = useRef<number | null>(null)

  const resetHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current)
    }
    setShowControls(true)
    hideTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, CONTROLS_HIDE_DELAY_MS)
  }, [isPlaying])

  const handleMouseMove = useCallback(() => {
    resetHideTimeout()
  }, [resetHideTimeout])

  useEffect(() => {
    if (!isPlaying) {
      queueMicrotask(() => setShowControls(true))
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current)
    } else {
      queueMicrotask(() => resetHideTimeout())
    }
  }, [isPlaying, resetHideTimeout])

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    onVisibilityChange?.(showControls)
  }, [showControls, onVisibilityChange])

  return { showControls, handleMouseMove }
}
