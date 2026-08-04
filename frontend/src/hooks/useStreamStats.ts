import { useEffect, useState } from 'react'
import { buildStreamStatsUrl } from '../services/videoStream'

const STATS_POLL_INTERVAL_MS = 2000

export type ConversionStatus = 'not_needed' | 'converting' | 'ready'

interface StreamStats {
  seeds: number | null
  format: string | null
  conversionStatus: ConversionStatus | null
  // The offset (seconds) the HLS conversion is actually running at. Authoritative over
  // whatever offset was requested: a still-downloading source with an unknown total
  // duration can't honor an arbitrary seek and falls back to 0 on the backend.
  offsetSeconds: number
}

/**
 * Polls the P2P seed count, video container format and HLS conversion status for the
 * current stream while no stream error is active. `offsetSeconds`/`totalDurationSeconds`
 * tell the backend where the player wants to be based (0, or a seek target) so it can
 * (re)start the HLS conversion there.
 */
export function useStreamStats(
  streamIdentifier: string,
  disabled: boolean,
  token: string | null,
  offsetSeconds: number,
  totalDurationSeconds: number | null
): StreamStats {
  const [stats, setStats] = useState<StreamStats>({ seeds: null, format: null, conversionStatus: null, offsetSeconds: 0 })

  useEffect(() => {
    if (disabled) return

    const fetchStats = async () => {
      try {
        const res = await fetch(buildStreamStatsUrl(streamIdentifier, token, offsetSeconds, totalDurationSeconds))
        if (res.ok) {
          const data = await res.json()
          if (data && data.success) {
            setStats({
              seeds: typeof data.seeds === 'number' ? data.seeds : null,
              format: typeof data.format === 'string' ? data.format : null,
              conversionStatus: typeof data.conversionStatus === 'string' ? data.conversionStatus : null,
              offsetSeconds: typeof data.offsetSeconds === 'number' ? data.offsetSeconds : 0
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
  }, [streamIdentifier, disabled, token, offsetSeconds, totalDurationSeconds])

  return stats
}
