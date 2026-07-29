import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TranslationType } from '../../locales/translations'
import type { Movie } from '../dashboard/DashboardMovies'

interface VideoPlayerProps {
  movie: Movie | null
  t: TranslationType['watch']
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }
  return `${pad(m)}:${pad(s)}`
}

export default function VideoPlayer({ movie, t }: VideoPlayerProps) {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(80)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isBuffering, setIsBuffering] = useState(true)
  const [streamError, setStreamError] = useState<string | null>(null)

  // Construct backend video stream URL based on torrent hash or movie info
  const torrentHash = movie?.torrents?.[0]?.hash || movie?.hash || movie?.id || 'sample'
  const streamUrl = `/api/movies/stream/${encodeURIComponent(torrentHash)}${movie?.id ? `?imdbId=${encodeURIComponent(movie.id)}` : ''}`

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100
    }
  }, [volume])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch((err) => {
        console.error('Play error:', err)
      })
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleSeek = (posPercentage: number) => {
    if (!videoRef.current || !duration) return
    const newTime = (posPercentage / 100) * duration
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
    setProgress(posPercentage)
  }

  const [selectedSubLang, setSelectedSubLang] = useState<string>('fr')
  const [showSubMenu, setShowSubMenu] = useState(false)
  const [activeCueText, setActiveCueText] = useState<string>('')
  const [subOffset, setSubOffset] = useState<number>(0)

  // Subtitle track URLs
  const imdbId = movie?.imdbId || movie?.id || 'tt0133093'
  const subTracks = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ]

  const syncActiveCue = (lang: string, offsetSec: number = subOffset) => {
    if (!videoRef.current || lang === 'off') {
      setActiveCueText('')
      return
    }
    const textTracks = videoRef.current.textTracks
    const currentTime = videoRef.current.currentTime + offsetSec

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

  const handleSubChange = (code: string) => {
    setSelectedSubLang(code)
    setShowSubMenu(false)
    syncActiveCue(code)
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-between group">
      {/* HTML5 Video Element connected to torrent stream API and WebVTT Subtitle tracks */}
      <video
        ref={videoRef}
        src={streamUrl}
        className="absolute inset-0 z-0 w-full h-full object-contain bg-black"
        playsInline
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false)
          setStreamError(null)
        }}
        onCanPlay={() => setIsBuffering(false)}
        onError={(e) => {
          console.error('Video stream error:', e)
          setIsBuffering(false)
          setStreamError(t.errorLoadingVideo)
        }}
        onTimeUpdate={() => {
          if (videoRef.current) {
            const cur = videoRef.current.currentTime
            const dur = videoRef.current.duration || 0
            setCurrentTime(cur)
            setDuration(dur)
            if (dur > 0) {
              setProgress((cur / dur) * 100)
            }
            syncActiveCue(selectedSubLang)
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0)
            setIsBuffering(false)
            syncActiveCue(selectedSubLang)
          }
        }}
      >
        {subTracks.map((tr) => (
          <track
            key={tr.code}
            kind="subtitles"
            src={`/api/movies/subtitles/${encodeURIComponent(imdbId)}/${tr.code}`}
            srcLang={tr.code}
            label={tr.label}
          />
        ))}
      </video>

      {/* Floating Subtitle Overlay - Positioned safely above bottom control bar */}
      {selectedSubLang !== 'off' && activeCueText && (
        <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-20 max-w-2xl sm:max-w-3xl px-5 py-2.5 bg-black/85 border border-white/15 text-white text-base sm:text-lg font-semibold rounded-2xl text-center shadow-2xl backdrop-blur-md transition-all duration-150 pointer-events-none whitespace-pre-line leading-relaxed">
          {activeCueText.replace(/<[^>]*>/g, '')}
        </div>
      )}

      {/* Buffering Spinner / Overlay */}
      {isBuffering && !streamError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs pointer-events-none">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-3" />
          <span className="text-xs font-semibold text-neutral-300 tracking-wider uppercase">
            {t.buffering || 'Bufferisation du flux vidéo...'}
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {streamError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950/90 backdrop-blur-md p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-lg mb-2">{t.videoUnavailable || 'Flux vidéo indisponible'}</h3>
          <p className="text-neutral-400 font-medium text-xs max-w-md mb-6 leading-relaxed">{streamError}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setStreamError(null)
                setIsBuffering(true)
                if (videoRef.current) {
                  videoRef.current.load()
                  videoRef.current.play().catch(() => {})
                }
              }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-red-600/20 cursor-pointer"
            >
              {t.retry || 'Réessayer'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              {t.backToCatalog || 'Retour au catalogue'}
            </button>
          </div>
        </div>
      )}

      {/* Top Floating Overlay (Header over video) */}
      <div className="relative z-10 p-4 sm:p-6 pr-16 sm:pr-20 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity bg-linear-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          {/* Back to Catalog Button (Icon only) */}
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-lg hover:scale-105"
            title={t.backToCatalog}
          >
            <ArrowLeft className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Center Spacer */}
      <div className="relative z-10 flex-1" />

      {/* Bottom Floating Control Bar */}
      <div className="relative z-10 p-4 sm:p-6 bg-linear-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md flex flex-col gap-3 opacity-95 group-hover:opacity-100 transition-opacity">
        {/* Progress / Scrub Bar */}
        <div
          className="w-full h-2 hover:h-3 bg-white/20 rounded-full cursor-pointer transition-all relative overflow-hidden group/bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pos = (e.clientX - rect.left) / rect.width
            handleSeek(pos * 100)
          }}
        >
          <div
            className="h-full bg-red-600 rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow opacity-0 group-hover/bar:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls Bottom Row */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="hover:text-red-500 transition-colors cursor-pointer p-1"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-2 group/vol">
              <button onClick={toggleMute} className="hover:text-red-500 transition-colors cursor-pointer p-1">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVol = Number(e.target.value)
                  setVolume(newVol)
                  if (videoRef.current) {
                    videoRef.current.volume = newVol / 100
                    videoRef.current.muted = newVol === 0
                  }
                  if (isMuted && newVol > 0) setIsMuted(false)
                }}
                className="w-20 h-1.5 accent-red-600 bg-white/20 rounded cursor-pointer"
              />
            </div>

            <span className="text-neutral-400 font-mono text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {movie && (
              <span className="hidden sm:inline text-xs font-semibold text-neutral-300">
                {movie.title}
              </span>
            )}
            {/* Subtitles CC Menu Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSubMenu(!showSubMenu)}
                className={`hover:text-red-500 transition-all cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-md ${selectedSubLang !== 'off' ? 'bg-red-600 text-white border-red-500 hover:bg-red-700' : 'bg-white/10 hover:bg-white/20 text-neutral-300 border-white/15'}`}
                title="Sous-titres / Subtitles"
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
                    <span>Sous-titres</span>
                    <span className="text-red-500 font-mono text-[9px]">vtt</span>
                  </div>
                  <button
                    onClick={() => handleSubChange('off')}
                    className={`px-3 py-2 text-left text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between ${selectedSubLang === 'off' ? 'bg-red-600 font-bold text-white' : 'text-neutral-300 hover:bg-white/10'}`}
                  >
                    <span>Désactivés</span>
                    {selectedSubLang === 'off' && <span>✓</span>}
                  </button>
                  {subTracks.map((tr) => (
                    <button
                      key={tr.code}
                      onClick={() => handleSubChange(tr.code)}
                      className={`px-3 py-2 text-left text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between ${selectedSubLang === tr.code ? 'bg-red-600 font-bold text-white' : 'text-neutral-300 hover:bg-white/10'}`}
                    >
                      <span>{tr.label}</span>
                      {selectedSubLang === tr.code && <span>✓</span>}
                    </button>
                  ))}

                  {/* Subtitle Delay Offset Controls */}
                  {selectedSubLang !== 'off' && (
                    <div className="mt-1 pt-1.5 border-t border-white/10 flex flex-col gap-1 px-1">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-semibold px-1">
                        <span>Décalage tempo</span>
                        <span className="font-mono text-red-400 font-bold">
                          {subOffset > 0 ? `+${subOffset.toFixed(1)}s` : `${subOffset.toFixed(1)}s`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <button
                          onClick={() => {
                            const next = parseFloat((subOffset - 0.5).toFixed(1))
                            setSubOffset(next)
                            syncActiveCue(selectedSubLang, next)
                          }}
                          className="flex-1 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold transition-colors cursor-pointer text-center"
                          title="Avancer les sous-titres (-0.5s)"
                        >
                          -0.5s
                        </button>
                        <button
                          onClick={() => {
                            setSubOffset(0)
                            syncActiveCue(selectedSubLang, 0)
                          }}
                          className="px-2 py-1 bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                          title="Réinitialiser"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => {
                            const next = parseFloat((subOffset + 0.5).toFixed(1))
                            setSubOffset(next)
                            syncActiveCue(selectedSubLang, next)
                          }}
                          className="flex-1 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold transition-colors cursor-pointer text-center"
                          title="Retarder les sous-titres (+0.5s)"
                        >
                          +0.5s
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const elem = document.documentElement
                if (!document.fullscreenElement) {
                  elem.requestFullscreen().catch(() => {})
                } else {
                  document.exitFullscreen().catch(() => {})
                }
              }}
              className="hover:text-red-500 transition-colors cursor-pointer p-1.5 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

