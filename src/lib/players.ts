import { sleeper } from '../api/sleeper'

/** [name, position, team, injury] — trimmed so the ~14MB feed fits in localStorage. */
export type PlayerTuple = [string, string, string | null, string | null]
export type PlayerDb = Record<string, PlayerTuple>

const KEY = 'fwt:players:v1'
const MAX_AGE = 24 * 60 * 60_000

export async function loadPlayers(): Promise<PlayerDb> {
  try {
    const cached = localStorage.getItem(KEY)
    if (cached) {
      const { at, db } = JSON.parse(cached) as { at: number; db: PlayerDb }
      if (Date.now() - at < MAX_AGE) return db
    }
  } catch {
    // Corrupt or unavailable cache; refetch below.
  }

  const raw = await sleeper.players()
  const db: PlayerDb = {}
  for (const [id, p] of Object.entries(raw)) {
    const name = p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(' ')
    db[id] = [name || id, p.position ?? '', p.team ?? null, p.injury_status ?? null]
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), db }))
  } catch {
    // Quota exceeded; we'll just refetch next session.
  }
  return db
}
