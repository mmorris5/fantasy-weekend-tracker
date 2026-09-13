import { useCallback, useState } from 'react'

export function usePref<T>(key: string, initial: T): [T, (next: T) => void] {
  const storageKey = `fwt:${key}`
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // Storage unavailable; keep in-memory value.
      }
    },
    [storageKey],
  )
  return [value, set]
}
