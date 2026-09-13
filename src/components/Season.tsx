import { useQueries } from '@tanstack/react-query'
import { sleeper, sleeperLeagueUrl, type League } from '../api/sleeper'
import { useSeasonGrid } from '../hooks/data'
import { pts, record } from '../lib/format'
import { buildLeagueWeek, type LeagueWeek } from '../lib/model'

type Props = { leagues: League[]; userId: string; currentWeek: number }

export function Season({ leagues, userId, currentWeek }: Props) {
  const weeks = Array.from({ length: currentWeek }, (_, i) => i + 1)
  const { pairs, results } = useSeasonGrid(leagues, weeks)
  const rosters = useQueries({ queries: leagues.map((l) => ({ queryKey: ['rosters', l.league_id], queryFn: () => sleeper.rosters(l.league_id), staleTime: 600_000 })) })
  const users = useQueries({ queries: leagues.map((l) => ({ queryKey: ['users', l.league_id], queryFn: () => sleeper.users(l.league_id), staleTime: 1_800_000 })) })

  const cells = new Map<string, LeagueWeek>()
  pairs.forEach(([league, week], i) => {
    const li = leagues.indexOf(league)
    const m = results[i].data
    const r = rosters[li].data
    const u = users[li].data
    if (!m || !r || !u) return
    cells.set(`${league.league_id}:${week}`, buildLeagueWeek({ league, userId, week, currentWeek, rosters: r, users: u, matchups: m, projections: undefined, games: undefined, players: undefined }))
  })

  let totalW = 0
  let totalL = 0
  let totalT = 0
  for (const c of cells.values()) {
    if (c.kind !== 'h2h' || !c.opp || !c.final) continue
    if (c.margin > 0) totalW++
    else if (c.margin < 0) totalL++
    else totalT++
  }

  return (
    <section className="season">
      <section className="summary">
        <div className="cell">
          <div className="cell-label">SEASON H2H · SETTLED</div>
          <div className="cell-value">
            <span className="good">{String(totalW).padStart(2, '0')}</span>
            <span className="dim">-</span>
            <span className="bad">{String(totalL).padStart(2, '0')}</span>
            {totalT > 0 && <>-{String(totalT).padStart(2, '0')}</>}
          </div>
          <div className="cell-hint">{totalW + totalL + totalT ? `${((totalW / (totalW + totalL + totalT)) * 100).toFixed(1)}% WIN RATE` : 'NO WEEKS FINAL YET'}</div>
        </div>
      </section>
      <div className="panel season-scroll">
        <table className="season-table">
          <thead>
            <tr>
              <th className="left">LEAGUE</th>
              <th>REC</th>
              {weeks.map((w) => (
                <th key={w}>W{String(w).padStart(2, '0')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leagues.map((l, li) => {
              const latest = cells.get(`${l.league_id}:${currentWeek}`)
              const me = latest?.me
              const rosterCount = rosters[li].data?.length
              return (
                <tr key={l.league_id}>
                  <td className="left">
                    <a href={sleeperLeagueUrl(l.league_id)} target="_blank" rel="noreferrer">
                      {l.name.toUpperCase()}
                    </a>
                  </td>
                  <td className="season-record">
                    {me && l.settings.type !== 3 ? (
                      <>
                        {record(me.record.w, me.record.l, me.record.t)}
                        {me.record.w + me.record.l + me.record.t > 0 && (
                          <span className="muted">
                            {' '}
                            #{String(me.rank).padStart(2, '0')}/{rosterCount}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  {weeks.map((w) => (
                    <SeasonCell key={w} c={cells.get(`${l.league_id}:${w}`)} />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="dim footnote">RECORDS UPDATE WHEN SLEEPER PROCESSES THE WEEK (USUALLY TUE). CURRENT WEEK SHOWS LIVE SCORE.</p>
    </section>
  )
}

function SeasonCell({ c }: { c: LeagueWeek | undefined }) {
  if (!c) return <td className="dim">..</td>
  if (!c.me || c.status === 'nomatch' || c.status === 'notfound') return <td className="dim">--</td>
  if (c.status === 'eliminated') return <td className="dim">OUT</td>

  let letter = ''
  let cls = 'neutral'
  if (c.kind === 'guillotine') {
    letter = c.survival ? `#${String(c.survival.rank).padStart(2, '0')}` : ''
    cls = c.status === 'chopped' ? 'bad' : c.final ? 'good' : 'neutral'
  } else if (c.opp) {
    letter = c.margin > 0 ? 'W' : c.margin < 0 ? 'L' : 'T'
    cls = c.margin > 0 ? 'good' : c.margin < 0 ? 'bad' : 'neutral'
    if (!c.started && !c.final) letter = ''
  }
  const title = c.opp ? `${pts(c.me.points)} – ${pts(c.opp.points)} vs ${c.opp.name}` : pts(c.me.points)
  return (
    <td className={`wk ${cls} ${c.final ? 'final' : 'live'}`} title={title}>
      <span className="strong">{letter || '·'}</span> <span className="dim">{c.started || c.final ? c.me.points.toFixed(1) : ''}</span>
    </td>
  )
}
