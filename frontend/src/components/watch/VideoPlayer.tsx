import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TranslationType } from '../../locales/translations'
import type { Movie } from '../../types/movie'

interface VideoPlayerProps {
  movie: Movie | null
  t: TranslationType['watch']
  onControlsVisibilityChange?: (visible: boolean) => void
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

export default function VideoPlayer({ movie, t, onControlsVisibilityChange }: VideoPlayerProps) {
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
  const [showControls, setShowControls] = useState(true)
  const [realtimeSeeds, setRealtimeSeeds] = useState<number | null>(null)
  const controlsTimeoutRef = useRef<number | null>(null)

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current)
    }
    setShowControls(true)
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  const handleMouseMove = () => {
    resetControlsTimeout()
  }

  // Construct backend video stream URL based on torrent hash or movie info
  const token = localStorage.getItem('token')
  const torrentHash = movie?.torrents?.[0]?.hash || movie?.hash || movie?.torrentUrl || movie?.id || 'sample'
  const streamUrl = `/api/movies/stream/${encodeURIComponent(torrentHash)}?${movie?.id ? `imdbId=${encodeURIComponent(movie.id)}&` : ''}${token ? `token=${encodeURIComponent(token)}` : ''}`

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100
    }
  }, [volume])

  useEffect(() => {
    if (streamError) return

    const fetchStats = async () => {
      try {
        const statsUrl = `/api/movies/stream/${encodeURIComponent(torrentHash)}/stats`
        const res = await fetch(statsUrl)
        if (res.ok) {
          const data = await res.json()
          if (data && data.success && typeof data.seeds === 'number') {
            setRealtimeSeeds(data.seeds)
          }
        }
      } catch (err) {
        console.error('Error fetching real-time P2P stats:', err)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 2000)

    return () => clearInterval(interval)
  }, [torrentHash, streamError])

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current)
      }
    } else {
      resetControlsTimeout()
    }
  }, [isPlaying])

  useEffect(() => {
    if (onControlsVisibilityChange) {
      onControlsVisibilityChange(showControls)
    }
  }, [showControls, onControlsVisibilityChange])

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

  return (
    <div
      className={`relative w-full h-full bg-black overflow-hidden flex flex-col justify-between group ${!showControls ? 'cursor-none' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* HTML5 Video Element connected to torrent stream API */}
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
        onError={async (e) => {
          console.error('Video stream error:', e)
          setIsBuffering(false)
          try {
            const errRes = await fetch(streamUrl)
            if (!errRes.ok) {
              const errData = await errRes.json()
              if (errData && errData.message) {
                setStreamError(errData.message)
                return
              }
            }
          } catch (fetchErr) {
            console.error('Error fetching stream details:', fetchErr)
          }
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
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0)
            setIsBuffering(false)
          }
        }}
      />

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
      <div className={`relative z-10 p-4 sm:p-6 pr-16 sm:pr-20 flex items-center justify-between transition-opacity duration-300 bg-linear-to-b from-black/80 via-black/40 to-transparent ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
      <div className={`relative z-10 p-4 sm:p-6 bg-linear-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md flex flex-col gap-3 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
              <div className="hidden sm:flex flex-col items-end gap-0.5">
                <span className="text-xs font-semibold text-neutral-300">
                  {movie.title}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {realtimeSeeds !== null ? realtimeSeeds : 0} seeds
                </span>
              </div>
            )}

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

