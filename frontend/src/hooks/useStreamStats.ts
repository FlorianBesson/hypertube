import { useEffect, useState } from 'react'
import { buildStreamStatsUrl } from '../services/videoStream'

const STATS_POLL_INTERVAL_MS = 2000

export type ConversionStatus = 'not_needed' | 'converting' | 'ready'

interface StreamStats {
  seeds: number | null
  format: string | null
  conversionStatus: ConversionStatus | null
  // How much of the movie (seconds) the HLS conversion has produced so far — used to cap
  // seeking at what's actually playable and to render the "converted" portion of the bar.
  convertedSeconds: number
}

/** Polls the P2P seed count, video container format and HLS conversion progress for the current stream while no stream error is active. */
export function useStreamStats(streamIdentifier: string, disabled: boolean, token: string | null): StreamStats {
  const [stats, setStats] = useState<StreamStats>({ seeds: null, format: null, conversionStatus: null, convertedSeconds: 0 })

  useEffect(() => {
    if (disabled) return

    const fetchStats = async () => {
      try {
        const res = await fetch(buildStreamStatsUrl(streamIdentifier, token))
        if (res.ok) {
          const data = await res.json()
          if (data && data.success) {
            setStats({
              seeds: typeof data.seeds === 'number' ? data.seeds : null,
              format: typeof data.format === 'string' ? data.format : null,
              conversionStatus: typeof data.conversionStatus === 'string' ? data.conversionStatus : null,
              convertedSeconds: typeof data.convertedSeconds === 'number' ? data.convertedSeconds : 0
            })
          }
        }
      } catch (err) {
        console.error('Error fetching real-time P2P stats:', err)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, STATS_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [streamIdentifier, disabled, token])

  return stats
}
