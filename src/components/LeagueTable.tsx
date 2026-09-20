import { useState } from 'react'
import { sleeperLeagueUrl } from '../api/sleeper'
import { ordinal, proj, pts, record, signed } from '../lib/format'
import { leagueAccent, slotLabel, STATUS_LABEL, tone, type LeagueWeek, type PlayerLine, type TeamWeek } from '../lib/model'

type Props = {
  board: LeagueWeek[]
  loadingCount: number
  expanded: Set<string>
  cursor: number
  onToggle: (leagueId: string) => void
  onCursor: (i: number) => void
}

export function LeagueTable({ board, loadingCount, expanded, cursor, onToggle, onCursor }: Props) {
  return (
    <section className="board">
      {board.map((b, i) => (
        <LeagueCard
          key={b.league.league_id}
          b={b}
          open={expanded.has(b.league.league_id)}
          focused={cursor === i}
          onToggle={() => {
            onCursor(i)
            onToggle(b.league.league_id)
          }}
        />
      ))}
      {Array.from({ length: loadingCount }, (_, i) => (
        <article key={`sk-${i}`} className="card skeleton" aria-hidden />
      ))}
    </section>
  )
}

function LeagueCard({ b, open, focused, onToggle }: { b: LeagueWeek; open: boolean; focused: boolean; onToggle: () => void }) {
  const t = tone(b.status)
  const inactive = !b.me || b.status === 'nomatch' || b.status === 'eliminated' || b.status === 'notfound'
  const { me, opp, survival } = b
  const accent = leagueAccent(b.league.league_id)

  return (
    <article
      className={`card tone-${t} ${open ? 'open' : ''} ${focused ? 'focused' : ''} ${inactive ? 'inactive' : ''}`}
      style={{ '--accent': accent } as React.CSSProperties}
      data-focused={focused || undefined}
    >
      <button className="card-head" onClick={inactive ? undefined : onToggle} disabled={inactive}>
        <span className="card-title">
          <span className="league-name">{b.league.name}</span>
          <span className="tags">
            {b.badges.map((x) => (
              <span key={x} className="tag">
                {x}
              </span>
            ))}
          </span>
        </span>
        <span className={`pill tone-${t} ${b.final ? 'final' : ''}`}>{STATUS_LABEL[b.status]}</span>
      </button>

      {me && (
        <div className="card-score">
          <div className="side">
            <div className="team">{me.name}</div>
            <div className="score">{pts(me.points)}</div>
            <div className="proj">{b.final ? 'final' : `proj ${proj(me.projected)}`}</div>
          </div>

          <div className="mid">
            <div className={`delta ${b.margin > 0 ? 'good' : b.margin < 0 ? 'bad' : ''}`}>{inactive ? '' : signed(b.margin)}</div>
            {!inactive && <MarginBar b={b} />}
            <div className="proj">{!inactive && !b.final ? `proj ${signed(b.projMargin)}` : ''}</div>
          </div>

          <div className="side right">
            {opp ? (
              <>
                <div className="team">{opp.name}</div>
                <div className="score">{pts(opp.points)}</div>
                <div className="proj">{b.final ? 'final' : `proj ${proj(opp.projected)}`}</div>
              </>
            ) : survival ? (
              <>
                <div className="team">of {survival.alive} alive</div>
                <div className="score">{ordinal(survival.rank)}</div>
                <div className="proj">{b.final ? 'final place' : `proj ${ordinal(survival.projRank)}`}</div>
              </>
            ) : (
              <div className="team">{b.status === 'eliminated' ? 'Out of this league' : 'No opponent'}</div>
            )}
          </div>
        </div>
      )}

      <footer className="card-foot">
        {me && !inactive ? (
          <>
            <span>
              <b>{me.counts.pre}</b> left
              {me.counts.in > 0 && (
                <>
                  , <b className="live">{me.counts.in}</b> live
                </>
              )}
              {opp && (
                <span className="muted">
                  {' '}
                  · opp {opp.counts.pre} left{opp.counts.in > 0 ? `, ${opp.counts.in} live` : ''}
                </span>
              )}
            </span>
            <span className="muted">
              {b.kind === 'h2h' && (
                <>
                  {record(me.record.w, me.record.l, me.record.t)}
                  {me.record.w + me.record.l + me.record.t > 0 && ` · ${ordinal(me.rank)} of ${b.league.total_rosters}`}
                </>
              )}
            </span>
          </>
        ) : (
          <span className="muted">Nothing to show this week</span>
        )}
        <a href={sleeperLeagueUrl(b.league.league_id)} target="_blank" rel="noreferrer" title="Open in Sleeper">
          Sleeper ↗
        </a>
        {!inactive && (
          <button className="expander" onClick={onToggle}>
            {open ? 'Hide lineups' : 'Lineups'}
          </button>
        )}
      </footer>

      {open && me && <Lineups me={me} opp={opp} />}
    </article>
  )
}

function MarginBar({ b }: { b: LeagueWeek }) {
  // ±40 points fills half the bar.
  const pct = (n: number) => Math.min(50, (Math.abs(n) / 40) * 50)
  const { margin, projMargin } = b
  return (
    <span className="bar" title={`Live ${signed(margin)} · projected ${signed(projMargin)}`}>
      <span className={`bar-fill ${margin >= 0 ? 'pos' : 'neg'}`} style={{ width: `${pct(margin)}%`, [margin >= 0 ? 'left' : 'right']: '50%' }} />
      {!b.final && <span className="bar-proj" style={{ left: `${50 + (projMargin >= 0 ? pct(projMargin) : -pct(projMargin))}%` }} />}
    </span>
  )
}

function Lineups({ me, opp }: { me: TeamWeek; opp: TeamWeek | null }) {
  const rows = me.starters.map((p, i) => [p, opp?.starters[i]] as const)
  return (
    <div className="lineups">
      <div className="lu">
        <div className="lu-row lu-head">
          <span>{me.name}</span>
          <span className="num">Pts</span>
          <span className="num">Proj</span>
          <span className="center">Slot</span>
          <span className="num">Proj</span>
          <span className="num">Pts</span>
          <span className="right">{opp?.name ?? ''}</span>
        </div>
        {rows.map(([mine, theirs], i) => (
          <div className="lu-row" key={i}>
            <Player p={mine} />
            <Points p={mine} />
            <Projection p={mine} />
            <span className="slot">{slotLabel(mine.slot)}</span>
            {theirs ? <Projection p={theirs} /> : <span />}
            {theirs ? <Points p={theirs} /> : <span />}
            {theirs ? <Player p={theirs} right /> : <span />}
          </div>
        ))}
        <div className="lu-row lu-total">
          <span>Total</span>
          <span className="num">{pts(me.points)}</span>
          <span className="num muted">{proj(me.projected)}</span>
          <span />
          <span className="num muted">{opp ? proj(opp.projected) : ''}</span>
          <span className="num">{opp ? pts(opp.points) : ''}</span>
          <span />
        </div>
      </div>
      <div className="bench">
        <BenchList title="My bench" players={me.bench} />
        {opp && <BenchList title="Their bench" players={opp.bench} />}
      </div>
    </div>
  )
}

function Player({ p, right }: { p: PlayerLine; right?: boolean }) {
  if (p.empty) return <span className={`player empty ${right ? 'right' : ''}`}>Empty slot</span>
  return (
    <span className={`player ${right ? 'right' : ''}`}>
      <span className="player-name">
        {p.name}
        {p.injury && <span className="injury">{p.injury.slice(0, 1).toUpperCase()}</span>}
      </span>
      <span className={`player-meta ${p.state === 'in' ? 'live' : ''}`}>
        {p.pos} · {p.team ?? 'FA'} · {p.state === 'bye' ? 'No game' : (p.game?.detail ?? '')}
      </span>
    </span>
  )
}

function Points({ p }: { p: PlayerLine }) {
  if (p.empty) return <span />
  return <span className={`num pts ${p.state === 'in' ? 'live' : ''} ${p.state === 'pre' ? 'muted' : ''}`}>{p.state === 'pre' ? '—' : pts(p.pts)}</span>
}

function Projection({ p }: { p: PlayerLine }) {
  if (p.empty) return <span />
  const settled = p.state === 'post' || p.state === 'bye'
  return (
    <span className="num muted" title={settled ? 'Pregame projection' : 'Live projection'}>
      {proj(settled ? p.proj : p.live)}
    </span>
  )
}

function BenchList({ title, players }: { title: string; players: PlayerLine[] }) {
  const [showAll, setShowAll] = useState(false)
  if (!players.length) return null
  // Hide the IR/taxi/no-projection tail unless asked.
  const relevant = players.filter((p) => p.pts !== 0 || p.proj > 0.5)
  const shown = showAll ? players : relevant
  const hiddenCount = players.length - relevant.length
  return (
    <div className="bench-list">
      <div className="bench-title">{title}</div>
      {shown.map((p) => (
        <div key={p.id} className="bench-row">
          <span className="trunc">
            {p.name} <span className="muted">{p.pos}</span>
          </span>
          <span className={`num ${p.state === 'pre' ? 'muted' : ''} ${p.state === 'in' ? 'live' : ''}`}>{p.state === 'pre' ? proj(p.proj) : pts(p.pts)}</span>
        </div>
      ))}
      {hiddenCount > 0 && (
        <button className="text-btn" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Hide inactive' : `+${hiddenCount} inactive`}
        </button>
      )}
    </div>
  )
}
