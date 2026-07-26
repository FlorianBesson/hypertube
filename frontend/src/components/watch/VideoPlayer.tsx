import { useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Film, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TranslationType } from '../../locales/translations'
import type { Movie } from '../dashboard/DashboardMovies'

interface VideoPlayerProps {
  movie: Movie | null
  t: TranslationType['watch']
}

export default function VideoPlayer({ movie, t }: VideoPlayerProps) {
  const navigate = useNavigate()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(24) // Mock progress percentage
  const [volume, setVolume] = useState(80)

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col justify-between group">
      {/* Background Image / Fake Video Canvas */}
      <div className="absolute inset-0 z-0 bg-neutral-950 flex items-center justify-center">
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
            <Film className="w-20 h-20 text-neutral-800 animate-pulse" />
          </div>
        )}
        {/* Subtle Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/70" />
      </div>

      {/* Top Floating Overlay (Header over video) */}
      <div className="relative z-10 p-4 sm:p-6 pr-16 sm:pr-20 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/80 via-black/40 to-transparent">
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

      {/* Center Play Button Overlay */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <button
          onClick={togglePlay}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 backdrop-blur-md transform transition-all duration-300 hover:scale-110 cursor-pointer border border-red-400/30"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-10 h-10 sm:w-12 sm:h-12 fill-current" />
          ) : (
            <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-current ml-1" />
          )}
        </button>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="relative z-10 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-md flex flex-col gap-3 opacity-95 group-hover:opacity-100 transition-opacity">
        {/* Progress / Scrub Bar */}
        <div
          className="w-full h-2 hover:h-3 bg-white/20 rounded-full cursor-pointer transition-all relative overflow-hidden group/bar"
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
                  setVolume(Number(e.target.value))
                  if (isMuted) setIsMuted(false)
                }}
                className="w-20 h-1.5 accent-red-600 bg-white/20 rounded cursor-pointer"
              />
            </div>

            <span className="text-neutral-400 font-mono text-xs">
              {Math.floor((progress * 120) / 100)}:15 / 120:00
            </span>
          </div>

          <div className="flex items-center gap-4">
            {movie && (
              <span className="hidden sm:inline text-xs font-semibold text-neutral-300">
                {movie.title}
              </span>
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
