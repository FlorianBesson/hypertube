import { useEffect, useState } from 'react'

const SEEDS_POLL_INTERVAL_MS = 2000

/** Polls the P2P seed count for the current stream while no stream error is active. */
export function useRealtimeSeeds(streamIdentifier: string, disabled: boolean) {
  const [seeds, setSeeds] = useState<number | null>(null)

  useEffect(() => {
    if (disabled) return

    const fetchStats = async () => {
      try {
        const statsUrl = `/api/movies/stream/${encodeURIComponent(streamIdentifier)}/stats`
        const res = await fetch(statsUrl)
        if (res.ok) {
          const data = await res.json()
          if (data && data.success && typeof data.seeds === 'number') {
            setSeeds(data.seeds)
          }
        }
      } catch (err) {
        console.error('Error fetching real-time P2P stats:', err)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, SEEDS_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [streamIdentifier, disabled])

  return seeds
}
