import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchGames, gamesAreHot } from '../api/games'
import { sleeper, type League } from '../api/sleeper'
import { buildLeagueWeek, indexProjections, type LeagueWeek } from '../lib/model'
import { loadPlayers } from '../lib/players'

const MIN = 60_000
const LIVE_POLL = 30_000

export function useNflState() {
  return useQuery({ queryKey: ['state'], queryFn: sleeper.state, staleTime: 10 * MIN })
}

export function useSleeperUser(username: string) {
  return useQuery({
    queryKey: ['user', username.toLowerCase()],
    queryFn: async () => {
      const user = await sleeper.user(username)
      if (!user) throw new Error(`No Sleeper user named "${username}"`)
      return user
    },
    enabled: !!username,
    staleTime: Infinity,
    retry: false,
  })
}

export function useLeagues(userId: string | undefined, season: string | undefined) {
  return useQuery({
    queryKey: ['leagues', userId, season],
    queryFn: () => sleeper.leagues(userId!, season!),
    enabled: !!userId && !!season,
    staleTime: 30 * MIN,
  })
}

export function useGames(season: string | undefined, week: number) {
  return useQuery({
    queryKey: ['games', season, week],
    queryFn: () => fetchGames(season!, week),
    enabled: !!season,
    staleTime: 20_000,
    refetchInterval: (q) => (gamesAreHot(q.state.data) ? LIVE_POLL : 5 * MIN),
  })
}

export function usePlayers() {
  return useQuery({ queryKey: ['players'], queryFn: loadPlayers, staleTime: 12 * 60 * MIN })
}

export function useProjections(season: string | undefined, week: number) {
  return useQuery({
    queryKey: ['projections', season, week],
    queryFn: async () => indexProjections(await sleeper.projections(season!, week)),
    enabled: !!season,
    staleTime: 15 * MIN,
    refetchInterval: 15 * MIN,
  })
}

// Module-level so useQueries can keep the combined result referentially stable.
function summarize<T>(results: UseQueryResult<T>[]) {
  return {
    data: results.map((q) => q.data),
    errors: results.flatMap((q) => (q.error ? [q.error.message] : [])),
    fetching: results.some((q) => q.isFetching),
    updatedAt: Math.max(0, ...results.map((q) => q.dataUpdatedAt)),
  }
}

type WeekArgs = {
  userId: string | undefined
  leagues: League[]
  season: string | undefined
  week: number
  currentWeek: number
}

export function useWeekBoard({ userId, leagues, season, week, currentWeek }: WeekArgs) {
  const games = useGames(season, week)
  const players = usePlayers()
  const projections = useProjections(season, week)
  const live = week === currentWeek && gamesAreHot(games.data)

  const rosters = useQueries({
    queries: leagues.map((l) => ({
      queryKey: ['rosters', l.league_id],
      queryFn: () => sleeper.rosters(l.league_id),
      staleTime: 10 * MIN,
    })),
    combine: summarize,
  })
  const users = useQueries({
    queries: leagues.map((l) => ({
      queryKey: ['users', l.league_id],
      queryFn: () => sleeper.users(l.league_id),
      staleTime: 30 * MIN,
    })),
    combine: summarize,
  })
  const matchups = useQueries({
    queries: leagues.map((l) => ({
      queryKey: ['matchups', l.league_id, week],
      queryFn: () => sleeper.matchups(l.league_id, week),
      staleTime: live ? 15_000 : 2 * MIN,
      refetchInterval: live ? LIVE_POLL : week === currentWeek ? 5 * MIN : false,
    })),
    combine: summarize,
  })

  const projectionIndex = projections.data
  const gameIndex = games.data
  const playerDb = players.data
  const board = useMemo(() => {
    if (!userId) return []
    return leagues.map((league, i): LeagueWeek | null => {
      const r = rosters.data[i]
      const u = users.data[i]
      const m = matchups.data[i]
      if (!r || !u || !m) return null
      return buildLeagueWeek({
        league,
        userId,
        week,
        currentWeek,
        rosters: r,
        users: u,
        matchups: m,
        projections: projectionIndex,
        games: gameIndex,
        players: playerDb,
      })
    })
  }, [userId, leagues, week, currentWeek, projectionIndex, gameIndex, playerDb, rosters.data, users.data, matchups.data])

  const errors = [...rosters.errors, ...users.errors, ...matchups.errors]
  const fetching = rosters.fetching || users.fetching || matchups.fetching || games.isFetching

  return { board, games: games.data, playersReady: !!players.data, errors, updatedAt: matchups.updatedAt, fetching, live }
}

export function useSeasonGrid(leagues: League[], weeks: number[]) {
  const pairs = leagues.flatMap((l) => weeks.map((w) => [l, w] as const))
  const results = useQueries({
    queries: pairs.map(([l, w]) => ({
      queryKey: ['matchups', l.league_id, w],
      queryFn: () => sleeper.matchups(l.league_id, w),
      staleTime: 30 * MIN,
    })),
  })
  return { pairs, results }
}
