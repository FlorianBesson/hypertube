export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins.toString().padStart(2, '0')}` : `${mins}min`
}

export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace('.', ',')}m`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace('.', ',')}k`
  }
  return `${count}`
}
