import { sleeper } from './sleeper'

export type Game = {
  id: string
  home: string
  away: string
  state: 'pre' | 'in' | 'post'
  kickoff: number | null
  detail: string
  /** Fraction of regulation left, 1 before kickoff, 0 when final. */
  remaining: number
  homeScore: number | null
  awayScore: number | null
}

export type GameIndex = {
  games: Game[]
  byTeam: Map<string, Game>
  source: 'espn' | 'sleeper'
}

// ESPN abbreviations that differ from Sleeper's.
const ESPN_TO_SLEEPER: Record<string, string> = { WSH: 'WAS' }

const kickoffFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

/** "Sun 1:00 PM" -> "SUN 1:00P" */
const kickoffLabel = (ts: number) => kickoffFmt.format(ts).toUpperCase().replace(',', '').replace(/\s?([AP])M$/, '$1')

function liveLabel(period: number, clock: string, name: string) {
  if (name === 'STATUS_HALFTIME') return 'HALF'
  if (name === 'STATUS_END_PERIOD') return `END Q${period}`
  return period >= 5 ? `OT ${clock}` : `Q${period} ${clock}`
}

type EspnEvent = {
  id: string
  date: string
  competitions: {
    status: { clock: number; displayClock: string; period: number; type: { state: 'pre' | 'in' | 'post'; name: string; shortDetail: string } }
    competitors: { homeAway: 'home' | 'away'; score?: string; team: { abbreviation: string } }[]
  }[]
}

async function fromEspn(season: string, week: number): Promise<Game[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}&dates=${season}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN ${res.status}`)
  const data = (await res.json()) as { events: EspnEvent[] }
  return data.events.flatMap((ev) => {
    const comp = ev.competitions[0]
    const { type, period, clock, displayClock } = comp.status
    if (type.name === 'STATUS_CANCELED' || type.name === 'STATUS_POSTPONED') return []
    const team = (side: 'home' | 'away') => comp.competitors.find((c) => c.homeAway === side)!
    const abbr = (side: 'home' | 'away') => {
      const a = team(side).team.abbreviation
      return ESPN_TO_SLEEPER[a] ?? a
    }
    const kickoff = Date.parse(ev.date)
    let remaining = 1
    if (type.state === 'post') remaining = 0
    else if (type.state === 'in') remaining = period >= 5 ? 0.02 : Math.max(0, ((4 - period) * 900 + clock) / 3600)
    const score = (side: 'home' | 'away') => (type.state === 'pre' ? null : Number(team(side).score ?? 0))
    return [
      {
        id: ev.id,
        home: abbr('home'),
        away: abbr('away'),
        state: type.state,
        kickoff,
        detail: type.state === 'pre' ? kickoffLabel(kickoff) : type.state === 'post' ? 'FINAL' : liveLabel(period, displayClock, type.name),
        remaining,
        homeScore: score('home'),
        awayScore: score('away'),
      },
    ]
  })
}

async function fromSleeper(season: string, week: number): Promise<Game[]> {
  const all = await sleeper.schedule(season)
  return all
    .filter((g) => g.week === week && g.status !== 'canceled')
    .map((g) => {
      const state = g.status === 'complete' ? 'post' : g.status === 'in_game' ? 'in' : 'pre'
      return {
        id: g.game_id,
        home: g.home,
        away: g.away,
        state,
        kickoff: null,
        detail: state === 'post' ? 'FINAL' : state === 'in' ? 'LIVE' : g.date,
        remaining: state === 'post' ? 0 : state === 'in' ? 0.5 : 1,
        homeScore: null,
        awayScore: null,
      }
    })
}

export async function fetchGames(season: string, week: number): Promise<GameIndex> {
  let games: Game[]
  let source: GameIndex['source'] = 'espn'
  try {
    games = await fromEspn(season, week)
    if (games.length === 0) throw new Error('ESPN returned no games')
  } catch {
    games = await fromSleeper(season, week)
    source = 'sleeper'
  }
  games.sort((a, b) => (a.kickoff ?? 0) - (b.kickoff ?? 0))
  const byTeam = new Map<string, Game>()
  for (const g of games) {
    byTeam.set(g.home, g)
    byTeam.set(g.away, g)
  }
  return { games, byTeam, source }
}

/** Poll fast when a game is live or about to start. */
export function gamesAreHot(index: GameIndex | undefined): boolean {
  if (!index) return false
  const soon = Date.now() + 10 * 60_000
  return index.games.some((g) => g.state === 'in' || (g.state === 'pre' && g.kickoff !== null && g.kickoff < soon))
}
