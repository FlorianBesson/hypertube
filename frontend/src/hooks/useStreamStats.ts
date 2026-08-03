import { useEffect, useState } from 'react'

const STATS_POLL_INTERVAL_MS = 2000

interface StreamStats {
  seeds: number | null
  format: string | null
}

/** Polls the P2P seed count and video container format for the current stream while no stream error is active. */
export function useStreamStats(streamIdentifier: string, disabled: boolean): StreamStats {
  const [stats, setStats] = useState<StreamStats>({ seeds: null, format: null })

  useEffect(() => {
    if (disabled) return

    const fetchStats = async () => {
      try {
        const statsUrl = `/api/movies/stream/${encodeURIComponent(streamIdentifier)}/stats`
        const res = await fetch(statsUrl)
        if (res.ok) {
          const data = await res.json()
          if (data && data.success) {
            setStats({
              seeds: typeof data.seeds === 'number' ? data.seeds : null,
              format: typeof data.format === 'string' ? data.format : null
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
  }, [streamIdentifier, disabled])

  return stats
}
