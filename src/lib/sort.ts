import { tone, type LeagueWeek } from './model'

export type SortKey = 'closest' | 'status' | 'name' | 'sleeper'

export const SORTS: { id: SortKey; label: string }[] = [
  { id: 'sleeper', label: 'Sleeper order' },
  { id: 'closest', label: 'Closest first' },
  { id: 'status', label: 'Losing first' },
  { id: 'name', label: 'Name' },
]

export function sortBoard(board: LeagueWeek[], key: SortKey): LeagueWeek[] {
  const out = [...board]
  const toneRank = { bad: 0, neutral: 1, good: 2 }
  if (key === 'name') out.sort((a, b) => a.league.name.localeCompare(b.league.name))
  if (key === 'closest') out.sort((a, b) => closeness(a) - closeness(b))
  if (key === 'status') out.sort((a, b) => toneRank[tone(a.status)] - toneRank[tone(b.status)] || a.projMargin - b.projMargin)
  return out
}

// Unfinished close matchups first; finished and irrelevant ones last.
function closeness(b: LeagueWeek) {
  if (!b.me || b.status === 'eliminated' || b.status === 'nomatch') return 1e6
  return (b.final ? 1e4 : 0) + Math.abs(b.final ? b.margin : b.projMargin)
}
