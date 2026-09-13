import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { GameStrip } from './components/GameStrip'
import { Header, type Tab } from './components/Header'
import { LeagueTable } from './components/LeagueTable'
import { Rooting } from './components/Rooting'
import { Season } from './components/Season'
import { Settings } from './components/Settings'
import { Setup } from './components/Setup'
import { Summary } from './components/Summary'
import { useLeagues, useNflState, useSleeperUser, useWeekBoard } from './hooks/data'
import type { LeagueWeek } from './lib/model'
import { usePref } from './lib/prefs'
import { SORTS, sortBoard, type SortKey } from './lib/sort'

const REGULAR_SEASON_WEEKS = 18

export default function App() {
  const [username, setUsername] = usePref('username', '')
  const [editingUser, setEditingUser] = useState(false)
  const user = useSleeperUser(username)

  if (!username || editingUser || user.isError) {
    return (
      <Setup
        initial={username}
        loading={user.isFetching}
        error={user.error?.message}
        onSubmit={(name) => {
          if (name === username) void user.refetch()
          setUsername(name)
          setEditingUser(false)
        }}
      />
    )
  }
  if (!user.data) return <div className="boot">Loading…</div>
  return <Dashboard username={user.data.display_name || username} userId={user.data.user_id} onChangeUser={() => setEditingUser(true)} />
}

function Dashboard({ username, userId, onChangeUser }: { username: string; userId: string; onChangeUser: () => void }) {
  const queryClient = useQueryClient()
  const state = useNflState()
  const season = state.data?.season
  const currentWeek = Math.max(1, Math.min(REGULAR_SEASON_WEEKS, state.data?.display_week || state.data?.week || 1))
  const leaguesQ = useLeagues(userId, season)

  const [tab, setTab] = usePref<Tab>('tab', 'matchups')
  const [sort, setSort] = usePref<SortKey>('sort', 'sleeper')
  const [hidden, setHidden] = usePref<string[]>('hidden', [])
  const [weekChoice, setWeekChoice] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [cursor, setCursor] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const week = weekChoice ?? currentWeek

  const allLeagues = useMemo(() => leaguesQ.data ?? [], [leaguesQ.data])
  const leagues = useMemo(() => allLeagues.filter((l) => !hidden.includes(l.league_id)), [allLeagues, hidden])

  const { board, games, errors, updatedAt, fetching, live } = useWeekBoard({ userId, leagues, season, week, currentWeek })
  const ready = useMemo(() => board.filter((b): b is LeagueWeek => b !== null), [board])
  const sorted = useMemo(() => sortBoard(ready, sort), [ready, sort])
  const loadingCount = board.length - ready.length

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (showSettings || (e.target instanceof Element && e.target.closest('input, select, textarea'))) return
      const setWeek = (w: number) => setWeekChoice(Math.max(1, Math.min(REGULAR_SEASON_WEEKS, w)))
      switch (e.key) {
        case '1':
          return setTab('matchups')
        case '2':
          return setTab('rooting')
        case '3':
          return setTab('season')
        case 'ArrowLeft':
          return setWeek(week - 1)
        case 'ArrowRight':
          return setWeek(week + 1)
        case 'r':
          return void queryClient.invalidateQueries()
      }
      if (tab !== 'matchups') return
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setCursor((c) => Math.min(sorted.length - 1, c + 1))
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setCursor((c) => Math.max(0, c - 1))
      } else if (e.key === 'Enter' || e.key === ' ') {
        const b = sorted[cursor]
        if (b) {
          e.preventDefault()
          toggle(b.league.league_id)
        }
      } else if (e.key === 'e') {
        setExpanded((prev) => (prev.size ? new Set() : new Set(sorted.filter((b) => b.me).map((b) => b.league.league_id))))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, week, sorted, cursor, showSettings, queryClient, setTab])

  useEffect(() => {
    document.querySelector('[data-focused]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const loadError = state.error || leaguesQ.error

  return (
    <div className="app">
      <Header
        tab={tab}
        onTab={setTab}
        week={week}
        maxWeek={REGULAR_SEASON_WEEKS}
        onWeek={setWeekChoice}
        live={live}
        fetching={fetching}
        updatedAt={updatedAt}
        onRefresh={() => queryClient.invalidateQueries()}
        username={username}
        onSettings={() => setShowSettings(true)}
      />
      <main>
        {loadError && <div className="banner error">Couldn't reach Sleeper: {(loadError as Error).message}</div>}
        {errors.length > 0 && <div className="banner warn">Some leagues failed to load ({errors.length}). They'll retry automatically.</div>}
        {leaguesQ.data && allLeagues.length === 0 && <div className="banner">No {season} NFL leagues found for {username}.</div>}

        {tab !== 'season' && (
          <>
            <div className="week-title">
              <h1>
                Week {week}
                {week === currentWeek ? <span className="muted"> · this week</span> : week > currentWeek ? <span className="muted"> · upcoming</span> : null}
              </h1>
              {tab === 'matchups' && (
                <label className="sort">
                  Sort
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <Summary board={ready} />
            <GameStrip games={games} board={ready} />
          </>
        )}

        {tab === 'matchups' && (
          <LeagueTable board={sorted} loadingCount={leaguesQ.isLoading ? 6 : loadingCount} expanded={expanded} cursor={cursor} onToggle={toggle} onCursor={setCursor} />
        )}
        {tab === 'rooting' && <Rooting board={ready} />}
        {tab === 'season' && <Season leagues={leagues} userId={userId} currentWeek={currentWeek} />}

        {hidden.length > 0 && (
          <p className="muted footnote">
            {hidden.length} league{hidden.length > 1 ? 's' : ''} hidden ·{' '}
            <button className="link" onClick={() => setShowSettings(true)}>
              manage
            </button>
          </p>
        )}
      </main>

      {showSettings && (
        <Settings
          username={username}
          leagues={allLeagues}
          hidden={hidden}
          onHidden={setHidden}
          onChangeUser={() => {
            setShowSettings(false)
            onChangeUser()
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
