const COMPLETION_RATIO = 0.95
const MINIMUM_RESUME_SECONDS = 30

/** A movie is resumable when playback stopped past the intro but before the end credits. */
export function isResumable(progressSeconds: number, durationSeconds: number | null): boolean {
  if (!progressSeconds || progressSeconds < MINIMUM_RESUME_SECONDS) return false
  if (!durationSeconds) return true
  return progressSeconds < durationSeconds * COMPLETION_RATIO
}

export function formatWatchPosition(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  const pad = (value: number) => value.toString().padStart(2, '0')

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(remainingSeconds)}` : `${minutes}:${pad(remainingSeconds)}`
}
