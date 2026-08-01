import { useEffect, useState } from 'react'

/** Persists a piece of state to localStorage, restoring it on mount. */
export function useLocalStorageState<T extends string | number | boolean>(
  key: string,
  defaultValue: T,
  parse: (raw: string) => T = (raw) => raw as unknown as T
) {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key)
    return raw ? parse(raw) : defaultValue
  })

  useEffect(() => {
    localStorage.setItem(key, String(value))
  }, [key, value])

  return [value, setValue] as const
}
