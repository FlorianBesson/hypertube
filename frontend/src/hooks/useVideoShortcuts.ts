import { useEffect } from 'react'

// Keyboard shortcuts: p = play/pause, f = fullscreen, Backspace = back to dashboard. Ignored while typing in an input/textarea.
export function useVideoShortcuts(togglePlay: () => void, toggleFullscreen: () => void, onBack: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, toggleFullscreen, onBack])
}
