import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { TranslationType } from '../locales/translations'
import { buildSubtitleUrl } from '../services/videoStream'

const SUBTITLE_TOAST_DURATION_MS = 3500
export const SUBTITLE_OFFSET_STEP_SEC = 0.5

export interface SubtitleTrack {
  code: string
  label: string
}

export function useSubtitles(
  videoRef: RefObject<HTMLVideoElement | null>,
  imdbId: string | undefined,
  t: TranslationType['watch'],
  lang: 'en' | 'fr',
  token: string | null
) {
  const [selectedSubLang, setSelectedSubLang] = useState<string>(lang)
  const [showSubMenu, setShowSubMenu] = useState(false)
  const [activeCueText, setActiveCueText] = useState('')
  const [subOffset, setSubOffset] = useState(0)
  const [subToast, setSubToast] = useState<string | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const subTracks: SubtitleTrack[] = [
    { code: 'fr', label: t.french || 'Français' },
    { code: 'en', label: t.english || 'English' },
    { code: 'es', label: t.spanish || 'Español' }
  ]

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  const showSubToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setSubToast(message)
    toastTimeoutRef.current = setTimeout(() => setSubToast(null), SUBTITLE_TOAST_DURATION_MS)
  }

  const syncActiveCue = (lang: string = selectedSubLang, offsetSec: number = subOffset) => {
    const video = videoRef.current
    if (!video || lang === 'off') {
      setActiveCueText('')
      return
    }

    const textTracks = video.textTracks
    const currentTime = video.currentTime + offsetSec

    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i]
      if (track.language === lang) {
        track.mode = 'hidden' // Parse cues in JS without native low overlay
        const cues = track.cues
        if (cues) {
          let matchedText = ''
          for (let j = 0; j < cues.length; j++) {
            const cue = cues[j] as VTTCue
            if (currentTime >= cue.startTime && currentTime <= cue.endTime) {
              matchedText = cue.text
              break
            }
          }
          setActiveCueText(matchedText)
        }
      } else {
        track.mode = 'disabled'
      }
    }
  }

  const selectSubtitle = async (code: string) => {
    setShowSubMenu(false)
    if (code === 'off') {
      setSelectedSubLang('off')
      setActiveCueText('')
      return
    }

    const trackObj = subTracks.find(tr => tr.code === code)
    const label = trackObj?.label || code

    if (!imdbId) {
      const msg = (t.subtitlesUnavailable || 'Sous-titres indisponibles en {lang} pour ce film').replace('{lang}', label)
      showSubToast(msg)
      setSelectedSubLang('off')
      setActiveCueText('')
      return
    }

    try {
      const res = await fetch(buildSubtitleUrl(imdbId, code, token))
      if (!res.ok) {
        const msg = (t.subtitlesUnavailable || 'Sous-titres indisponibles en {lang} pour ce film').replace('{lang}', label)
        showSubToast(msg)
        setSelectedSubLang('off')
        setActiveCueText('')
        return
      }
      setSelectedSubLang(code)
      syncActiveCue(code)
    } catch {
      const msg = (t.subtitlesError || 'Erreur lors de la récupération des sous-titres en {lang}').replace('{lang}', label)
      showSubToast(msg)
      setSelectedSubLang('off')
      setActiveCueText('')
    }
  }

  const adjustOffset = (delta: number) => {
    const next = parseFloat((subOffset + delta).toFixed(1))
    setSubOffset(next)
    syncActiveCue(selectedSubLang, next)
  }

  const resetOffset = () => {
    setSubOffset(0)
    syncActiveCue(selectedSubLang, 0)
  }

  return {
    subTracks,
    selectedSubLang,
    showSubMenu,
    setShowSubMenu,
    activeCueText,
    subOffset,
    subToast,
    syncActiveCue,
    selectSubtitle,
    adjustOffset,
    resetOffset
  }
}
