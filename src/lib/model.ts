import type { Game, GameIndex } from '../api/games'
import type { League, LeagueUser, Matchup, ProjectionRow, Roster } from '../api/sleeper'
import type { PlayerDb } from './players'

export type PlayerState = 'pre' | 'in' | 'post' | 'bye'

export type PlayerLine = {
  id: string
  slot: string
  name: string
  pos: string
  team: string | null
  injury: string | null
  pts: number
  proj: number
  /** Live projection: actual so far plus pregame projection scaled by time left. */
  live: number
  state: PlayerState
  game: Game | null
  empty: boolean
}

export type TeamWeek = {
  rosterId: number
  name: string
  points: number
  projected: number
  starters: PlayerLine[]
  bench: PlayerLine[]
  counts: Record<'pre' | 'in' | 'post', number>
  record: { w: number; l: number; t: number; fpts: number }
  rank: number
}

export type Status =
  | 'winning'
  | 'losing'
  | 'tied'
  | 'won'
  | 'lost'
  | 'tie'
  | 'upcoming'
  | 'safe'
  | 'danger'
  | 'chopped'
  | 'eliminated'
  | 'nomatch'
  | 'notfound'

export type LeagueWeek = {
  league: League
  badges: string[]
  kind: 'h2h' | 'guillotine'
  me: TeamWeek | null
  opp: TeamWeek | null
  status: Status
  final: boolean
  started: boolean
  margin: number
  projMargin: number
  /** Guillotine: my place among surviving teams. */
  survival?: { rank: number; projRank: number; alive: number; cushion: number; projCushion: number }
  /** Leagues that also score a W/L vs the weekly median. */
  median?: { value: number; above: boolean }
}

export type ProjectionIndex = Map<string, ProjectionRow>

export function indexProjections(rows: ProjectionRow[]): ProjectionIndex {
  return new Map(rows.map((r) => [r.player_id, r]))
}

export function scoreStats(stats: Record<string, number>, scoring: Record<string, number>, pos = ''): number {
  let total = 0
  for (const key in stats) {
    const mult = scoring[key]
    if (mult) total += stats[key] * mult
  }
  // Projections omit some position-specific bonuses that live stats include.
  const p = pos.toLowerCase()
  if (p) {
    if (scoring[`bonus_rec_${p}`] && stats[`bonus_rec_${p}`] === undefined) total += (stats.rec ?? 0) * scoring[`bonus_rec_${p}`]
    if (scoring[`bonus_fd_${p}`] && stats[`bonus_fd_${p}`] === undefined)
      total += ((stats.rec_fd ?? 0) + (stats.rush_fd ?? 0)) * scoring[`bonus_fd_${p}`]
  }
  return total
}

const SLOT_LABELS: Record<string, string> = {
  FLEX: 'FLX',
  WRRB_FLEX: 'W/R',
  REC_FLEX: 'W/T',
  SUPER_FLEX: 'SF',
  IDP_FLEX: 'IDP',
}
export const slotLabel = (slot: string) => SLOT_LABELS[slot] ?? slot

export function leagueBadges(league: League): string[] {
  const { settings, scoring_settings: sc, roster_positions: slots } = league
  const badges: string[] = []
  badges.push(['RDR', 'KPR', 'DYN', 'GUIL'][settings.type] ?? 'LG')
  if (settings.best_ball) badges.push('BB')
  badges.push(sc.rec === 1 ? 'PPR' : sc.rec === 0.5 ? 'HALF' : sc.rec ? `${sc.rec}PPR` : 'STD')
  if (slots.includes('SUPER_FLEX')) badges.push('SF')
  else if (slots.filter((s) => s === 'QB').length > 1) badges.push('2QB')
  if (sc.bonus_rec_te) badges.push('TEP')
  if (slots.some((s) => ['DL', 'LB', 'DB', 'IDP_FLEX'].includes(s))) badges.push('IDP')
  badges.push(`${league.total_rosters}T`)
  return badges
}

type Inputs = {
  league: League
  userId: string
  week: number
  currentWeek: number
  rosters: Roster[]
  users: LeagueUser[]
  matchups: Matchup[]
  projections: ProjectionIndex | undefined
  games: GameIndex | undefined
  players: PlayerDb | undefined
}

function playerLine(id: string, slot: string, m: Matchup, inp: Inputs): PlayerLine {
  if (!id || id === '0') {
    return { id: `empty-${slot}`, slot, name: 'Empty', pos: '', team: null, injury: null, pts: 0, proj: 0, live: 0, state: 'bye', game: null, empty: true }
  }
  const db = inp.players?.[id]
  const proj = inp.projections?.get(id)
  const team = proj?.team ?? db?.[2] ?? null
  const name = db?.[0] ?? (proj?.player ? `${proj.player.first_name} ${proj.player.last_name}` : id)
  const pos = db?.[1] ?? proj?.player?.position ?? ''
  const pts = m.players_points?.[id] ?? 0
  const projected = proj ? scoreStats(proj.stats, inp.league.scoring_settings, pos) : 0
  const game = team ? (inp.games?.byTeam.get(team) ?? null) : null

  // Past weeks are settled even if the scoreboard hasn't loaded.
  let state: PlayerState = game ? game.state : inp.games || inp.week < inp.currentWeek ? 'bye' : 'pre'
  if (inp.week < inp.currentWeek) state = game ? 'post' : 'bye'

  let live = pts
  if (state === 'pre') live = projected
  else if (state === 'in') live = pts + projected * (game?.remaining ?? 0.5)

  return { id, slot, name, pos, team, injury: db?.[3] ?? null, pts, proj: projected, live, state, game, empty: false }
}

function teamWeek(m: Matchup, inp: Inputs, ranks: Map<number, number>): TeamWeek {
  const roster = inp.rosters.find((r) => r.roster_id === m.roster_id)
  const owner = inp.users.find((u) => u.user_id === roster?.owner_id)
  const slots = inp.league.roster_positions.filter((s) => s !== 'BN' && s !== 'IR' && s !== 'TAXI')
  const starterIds = m.starters ?? []
  const starters = slots.map((slot, i) => playerLine(starterIds[i] ?? '0', slot, m, inp))
  const starterSet = new Set(starterIds)
  const bench = (m.players ?? []).filter((id) => !starterSet.has(id)).map((id) => playerLine(id, 'BN', m, inp))
  bench.sort((a, b) => b.pts - a.pts || b.proj - a.proj)

  const counts = { pre: 0, in: 0, post: 0 }
  for (const p of starters) if (!p.empty && p.state !== 'bye') counts[p.state]++

  const s = roster?.settings
  return {
    rosterId: m.roster_id,
    name: owner?.metadata?.team_name || owner?.display_name || `Team ${m.roster_id}`,
    points: m.custom_points ?? m.points ?? 0,
    projected: starters.reduce((sum, p) => sum + p.live, 0),
    starters,
    bench,
    counts,
    record: { w: s?.wins ?? 0, l: s?.losses ?? 0, t: s?.ties ?? 0, fpts: (s?.fpts ?? 0) + (s?.fpts_decimal ?? 0) / 100 },
    rank: ranks.get(m.roster_id) ?? 0,
  }
}

function standings(rosters: Roster[]): Map<number, number> {
  const sorted = [...rosters].sort((a, b) => {
    const wa = a.settings.wins + a.settings.ties / 2
    const wb = b.settings.wins + b.settings.ties / 2
    const fa = (a.settings.fpts ?? 0) + (a.settings.fpts_decimal ?? 0) / 100
    const fb = (b.settings.fpts ?? 0) + (b.settings.fpts_decimal ?? 0) / 100
    return wb - wa || fb - fa
  })
  return new Map(sorted.map((r, i) => [r.roster_id, i + 1]))
}

const isSettled = (t: TeamWeek) => t.counts.pre === 0 && t.counts.in === 0

export function buildLeagueWeek(inp: Inputs): LeagueWeek {
  const { league, userId, rosters, matchups } = inp
  const badges = leagueBadges(league)
  const kind = league.settings.type === 3 ? 'guillotine' : 'h2h'
  const base = { league, badges, kind, me: null, opp: null, final: false, started: false, margin: 0, projMargin: 0 } as const

  const myRoster = rosters.find((r) => r.owner_id === userId || r.co_owners?.includes(userId))
  if (!myRoster) return { ...base, status: 'notfound' }
  const ranks = standings(rosters)
  const myMatchup = matchups.find((m) => m.roster_id === myRoster.roster_id)
  if (!myMatchup) return { ...base, status: 'nomatch' }

  const me = teamWeek(myMatchup, inp, ranks)
  const started = me.counts.in + me.counts.post > 0 || me.points > 0

  if (kind === 'guillotine') {
    const aliveIds = new Set(rosters.filter((r) => (r.players?.length ?? 0) > 0).map((r) => r.roster_id))
    if (!aliveIds.has(myRoster.roster_id)) return { ...base, me, status: 'eliminated' }
    const alive = matchups.filter((m) => aliveIds.has(m.roster_id)).map((m) => teamWeek(m, inp, ranks))
    const place = (key: 'points' | 'projected') => {
      const sorted = [...alive].sort((a, b) => b[key] - a[key])
      const rank = sorted.findIndex((t) => t.rosterId === me.rosterId) + 1
      const others = sorted.filter((t) => t.rosterId !== me.rosterId)
      const lowestOther = others.length ? others[others.length - 1][key] : 0
      return { rank, cushion: me[key] - lowestOther }
    }
    const now = place('points')
    const proj = place('projected')
    const final = alive.every(isSettled)
    const last = alive.length
    const status: Status = final ? (now.rank === last ? 'chopped' : 'safe') : !started ? 'upcoming' : proj.rank === last ? 'danger' : 'safe'
    return {
      ...base,
      me,
      status,
      final,
      started,
      margin: now.cushion,
      projMargin: proj.cushion,
      survival: { rank: now.rank, projRank: proj.rank, alive: last, cushion: now.cushion, projCushion: proj.cushion },
    }
  }

  let median: LeagueWeek['median']
  if (league.settings.league_average_match) {
    const pts = matchups.map((m) => m.custom_points ?? m.points ?? 0).sort((a, b) => a - b)
    const mid = Math.floor(pts.length / 2)
    const value = pts.length % 2 ? pts[mid] : (pts[mid - 1] + pts[mid]) / 2
    median = { value, above: me.points > value }
  }

  const oppMatchup =
    myMatchup.matchup_id != null ? matchups.find((m) => m.matchup_id === myMatchup.matchup_id && m.roster_id !== myMatchup.roster_id) : undefined
  if (!oppMatchup) return { ...base, me, status: 'nomatch', started, median }

  const opp = teamWeek(oppMatchup, inp, ranks)
  const final = inp.week < inp.currentWeek || (isSettled(me) && isSettled(opp))
  const margin = me.points - opp.points
  const projMargin = me.projected - opp.projected
  const anyStarted = started || opp.counts.in + opp.counts.post > 0 || opp.points > 0

  let status: Status
  if (final) status = margin > 0 ? 'won' : margin < 0 ? 'lost' : 'tie'
  else if (!anyStarted) status = 'upcoming'
  else status = margin > 0 ? 'winning' : margin < 0 ? 'losing' : 'tied'

  return { ...base, me, opp, status, final, started: anyStarted, margin, projMargin, median }
}

/** Collapse a status to good / bad / neutral for tallies and colors. */
export function tone(status: Status): 'good' | 'bad' | 'neutral' {
  if (status === 'winning' || status === 'won' || status === 'safe') return 'good'
  if (status === 'losing' || status === 'lost' || status === 'danger' || status === 'chopped') return 'bad'
  return 'neutral'
}

export const STATUS_LABEL: Record<Status, string> = {
  winning: 'WIN',
  losing: 'LOSS',
  tied: 'TIED',
  won: 'WON',
  lost: 'LOST',
  tie: 'TIE',
  upcoming: 'PRE',
  safe: 'SAFE',
  danger: 'RISK',
  chopped: 'CHOP',
  eliminated: 'OUT',
  nomatch: 'BYE',
  notfound: 'N/A',
}
