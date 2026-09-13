import { useCallback, useState } from 'react'

/** A shared link like `?user=name` picks the user, then is stripped so switching users later still works. */
export function applyLinkedUser() {
  const params = new URLSearchParams(window.location.search)
  const name = params.get('user')?.trim()
  if (!name) return
  try {
    localStorage.setItem('fwt:username', JSON.stringify(name))
  } catch {
    return
  }
  params.delete('user')
  const qs = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash)
}

export function shareLink(username: string) {
  return `${window.location.origin}${window.location.pathname}?user=${encodeURIComponent(username)}`
}

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
