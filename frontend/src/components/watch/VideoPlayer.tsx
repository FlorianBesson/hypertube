import { useState, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Film, Download, ShieldCheck } from 'lucide-react'
import type { TranslationType } from '../../locales/translations'
import type { Movie } from '../dashboard/DashboardMovies'

interface VideoPlayerProps {
  movie: Movie | null
  t: TranslationType['watch']
}

export default function VideoPlayer({ movie, t }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(24) // Mock progress percentage
  const [volume, setVolume] = useState(80)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Dev Mode Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-4 py-2 rounded-xl flex items-center justify-between">
        <span className="font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          {t.fakePlayerNotice}
        </span>
        <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
          Dev Mode
        </span>
      </div>

      {/* Video Container (Aspect 16:9) */}
      <div className="relative w-full aspect-video bg-neutral-950 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group flex flex-col justify-between">
        {/* Background Image / Fake Video Canvas */}
        <div className="absolute inset-0 z-0 bg-neutral-900 flex items-center justify-center">
          {movie?.image ? (
            <img
              src={movie.image}
              alt={movie?.title || 'Video Player'}
              className={`w-full h-full object-cover transition-all duration-700 ${
                isPlaying ? 'opacity-40 scale-105 filter blur-sm' : 'opacity-60 filter brightness-75'
              }`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
              <Film className="w-16 h-16 text-neutral-700 animate-pulse" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-black/60" />
        </div>

        {/* Top Video Overlay Bar */}
        <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3">
            <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider shadow">
              {t.quality}
            </span>
            <span className="text-xs font-mono text-neutral-300 bg-black/60 px-3 py-1 rounded-md border border-white/10 backdrop-blur-md flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
              {t.torrentSpeed}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-white/10 text-neutral-300 font-semibold px-2.5 py-1 rounded-md border border-white/10 backdrop-blur-sm">
              Subtitles: EN / FR
            </span>
          </div>
        </div>

        {/* Center Play Button Overlay */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 backdrop-blur-md transform transition-all duration-300 hover:scale-110 cursor-pointer border border-red-400/30"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
            ) : (
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
            )}
          </button>
        </div>

        {/* Bottom Control Bar */}
        <div className="relative z-10 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-sm flex flex-col gap-2 opacity-95 group-hover:opacity-100 transition-opacity">
          {/* Progress / Scrub Bar */}
          <div
            className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full cursor-pointer transition-all relative overflow-hidden group/bar"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pos = (e.clientX - rect.left) / rect.width
              setProgress(Math.round(pos * 100))
            }}
          >
            <div
              className="h-full bg-red-600 rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/bar:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Controls Bottom Row */}
          <div className="flex items-center justify-between text-white text-xs pt-1">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="hover:text-red-500 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2 group/vol">
                <button onClick={toggleMute} className="hover:text-red-500 transition-colors cursor-pointer">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(Number(e.target.value))
                    if (isMuted) setIsMuted(false)
                  }}
                  className="w-16 h-1 accent-red-600 bg-white/20 rounded cursor-pointer"
                />
              </div>

              <span className="text-neutral-400 font-mono text-[11px]">
                {Math.floor((progress * 120) / 100)}:15 / 120:00
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const elem = document.documentElement
                  if (!document.fullscreenElement) {
                    elem.requestFullscreen().catch(() => {})
                  } else {
                    document.exitFullscreen().catch(() => {})
                  }
                }}
                className="hover:text-red-500 transition-colors cursor-pointer p-1"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Movie Details Info Box below video */}
      {movie && (
        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">{movie.title}</h1>
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
              <span className="bg-red-600/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20 uppercase text-[10px] font-bold">
                {movie.genre}
              </span>
              <span>•</span>
              <span>{movie.year}</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">★ {movie.rating.toFixed(1)} / 10</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
