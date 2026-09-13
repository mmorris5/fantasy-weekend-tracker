const BASE = 'https://api.sleeper.app'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`Sleeper ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

export type NflState = {
  week: number
  display_week: number
  season: string
  season_type: 'pre' | 'regular' | 'post' | 'off'
}

export type SleeperUser = {
  user_id: string
  username: string
  display_name: string
  avatar: string | null
}

export type League = {
  league_id: string
  name: string
  season: string
  status: string
  avatar: string | null
  total_rosters: number
  roster_positions: string[]
  scoring_settings: Record<string, number>
  settings: {
    type: number // 0 redraft, 1 keeper, 2 dynasty, 3 guillotine
    best_ball?: number
    start_week?: number
    playoff_week_start?: number
    league_average_match?: number
  }
}

export type Roster = {
  roster_id: number
  owner_id: string | null
  co_owners: string[] | null
  players: string[] | null
  settings: {
    wins: number
    losses: number
    ties: number
    fpts?: number
    fpts_decimal?: number
  }
}

export type LeagueUser = {
  user_id: string
  display_name: string
  metadata: { team_name?: string } | null
}

export type Matchup = {
  roster_id: number
  matchup_id: number | null
  points: number
  custom_points: number | null
  starters: string[] | null
  players: string[] | null
  players_points: Record<string, number> | null
}

export type ProjectionRow = {
  player_id: string
  team: string | null
  stats: Record<string, number>
  player?: { first_name: string; last_name: string; position: string }
}

export type ScheduleGame = {
  game_id: string
  week: number
  date: string
  home: string
  away: string
  status: 'pre_game' | 'in_game' | 'complete' | 'canceled'
}

export const sleeper = {
  state: () => get<NflState>('/v1/state/nfl'),
  user: (username: string) => get<SleeperUser | null>(`/v1/user/${encodeURIComponent(username)}`),
  leagues: (userId: string, season: string) => get<League[]>(`/v1/user/${userId}/leagues/nfl/${season}`),
  rosters: (leagueId: string) => get<Roster[]>(`/v1/league/${leagueId}/rosters`),
  users: (leagueId: string) => get<LeagueUser[]>(`/v1/league/${leagueId}/users`),
  matchups: (leagueId: string, week: number) => get<Matchup[]>(`/v1/league/${leagueId}/matchups/${week}`),
  players: () => get<Record<string, RawPlayer>>('/v1/players/nfl'),
  // Undocumented but public endpoints used by sleeper.com itself.
  projections: (season: string, week: number) => {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB']
    const qs = positions.map((p) => `position[]=${p}`).join('&')
    return get<ProjectionRow[]>(`/projections/nfl/${season}/${week}?season_type=regular&${qs}`)
  },
  schedule: (season: string) => get<ScheduleGame[]>(`/schedule/nfl/regular/${season}`),
}

export type RawPlayer = {
  full_name?: string
  first_name?: string
  last_name?: string
  position?: string
  team?: string | null
  injury_status?: string | null
}

export const sleeperLeagueUrl = (leagueId: string) => `https://sleeper.com/leagues/${leagueId}`
