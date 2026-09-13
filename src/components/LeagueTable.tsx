import { useState } from 'react'
import { sleeperLeagueUrl } from '../api/sleeper'
import { ordinal, proj, pts, record, signed } from '../lib/format'
import { STATUS_LABEL, slotLabel, tone, type LeagueWeek, type PlayerLine, type TeamWeek } from '../lib/model'

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
    <section className="league-table" role="table">
      <div className="lt-head" role="row">
        <span>Status</span>
        <span>League</span>
        <span className="num">Me</span>
        <span className="center">Margin</span>
        <span>Opponent</span>
        <span className="center" title="Starters yet to play / playing now">
          Left · Live
        </span>
        <span />
      </div>
      {board.map((b, i) => (
        <LeagueRow
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
        <div key={`sk-${i}`} className="lt-row skeleton">
          <span />
        </div>
      ))}
    </section>
  )
}

function LeagueRow({ b, open, focused, onToggle }: { b: LeagueWeek; open: boolean; focused: boolean; onToggle: () => void }) {
  const t = tone(b.status)
  const inactive = !b.me || b.status === 'nomatch' || b.status === 'eliminated' || b.status === 'notfound'
  return (
    <div className={`lt-group ${open ? 'open' : ''} ${focused ? 'focused' : ''} ${inactive ? 'inactive' : ''}`} data-focused={focused || undefined}>
      <div className="lt-row" role="row" onClick={inactive ? undefined : onToggle} tabIndex={-1}>
        <span>
          <span className={`pill tone-${t} ${b.final ? 'final' : ''}`}>{STATUS_LABEL[b.status]}</span>
        </span>

        <span className="league-cell">
          <span className="league-name">{b.league.name}</span>
          <span className="badges">
            {b.badges.map((x) => (
              <span key={x} className="badge">
                {x}
              </span>
            ))}
            {b.me && b.kind === 'h2h' && (
              <span className="badge record-badge">
                {record(b.me.record.w, b.me.record.l, b.me.record.t)}
                {b.me.record.w + b.me.record.l + b.me.record.t > 0 && ` · ${ordinal(b.me.rank)}`}
              </span>
            )}
          </span>
        </span>

        <span className="score-cell num">
          {b.me && (
            <>
              <span className="score">{pts(b.me.points)}</span>
              <span className="sub">{b.final ? b.me.name : `proj ${proj(b.me.projected)}`}</span>
            </>
          )}
        </span>

        <span className="margin-cell">{b.me && !inactive && <MarginBar b={b} />}</span>

        <span className="score-cell">
          {b.opp ? (
            <>
              <span className="score">{pts(b.opp.points)}</span>
              <span className="sub" title={b.opp.name}>
                {b.final ? b.opp.name : `proj ${proj(b.opp.projected)} · ${b.opp.name}`}
              </span>
            </>
          ) : b.survival ? (
            <>
              <span className="score">
                {ordinal(b.survival.rank)} <span className="muted">of {b.survival.alive}</span>
              </span>
              <span className="sub">
                {b.final ? 'final place' : `proj ${ordinal(b.survival.projRank)}`} · chop line is last place
              </span>
            </>
          ) : (
            <span className="muted">{b.status === 'eliminated' ? 'Out of this league' : '—'}</span>
          )}
        </span>

        <span className="left-cell center">{b.me && !inactive && <LeftCounts me={b.me} opp={b.opp} />}</span>

        <span className="row-actions">
          <a href={sleeperLeagueUrl(b.league.league_id)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Open in Sleeper">
            ↗
          </a>
          {!inactive && <span className="chevron">{open ? '▾' : '▸'}</span>}
        </span>
      </div>
      {open && b.me && <Lineups me={b.me} opp={b.opp} />}
    </div>
  )
}

function MarginBar({ b }: { b: LeagueWeek }) {
  // Scale: ±40 points fills half the bar.
  const pct = (n: number) => Math.min(50, (Math.abs(n) / 40) * 50)
  const live = b.margin
  const projected = b.projMargin
  const label = b.kind === 'guillotine' ? 'vs last' : ''
  return (
    <span className="margin">
      <span className="bar">
        <span className="bar-mid" />
        <span className={`bar-fill ${live >= 0 ? 'pos' : 'neg'}`} style={{ width: `${pct(live)}%`, [live >= 0 ? 'left' : 'right']: '50%' }} />
        {!b.final && <span className={`bar-proj ${projected >= 0 ? 'pos' : 'neg'}`} style={{ left: `${50 + (projected >= 0 ? pct(projected) : -pct(projected))}%` }} />}
      </span>
      <span className="margin-text">
        <b className={live > 0 ? 'good' : live < 0 ? 'bad' : ''}>{signed(live)}</b>
        {!b.final && <span className="muted"> proj {signed(projected)}</span>}
        {label && <span className="muted"> {label}</span>}
      </span>
    </span>
  )
}

function LeftCounts({ me, opp }: { me: TeamWeek; opp: TeamWeek | null }) {
  return (
    <span className="left-counts">
      <span title="My starters: yet to play · playing">
        <b>{me.counts.pre}</b>
        <span className="sep">·</span>
        <b className="state-in">{me.counts.in}</b>
      </span>
      {opp && (
        <>
          <span className="vs">vs</span>
          <span title="Opponent starters: yet to play · playing" className="muted">
            {opp.counts.pre}
            <span className="sep">·</span>
            {opp.counts.in}
          </span>
        </>
      )}
    </span>
  )
}

function Lineups({ me, opp }: { me: TeamWeek; opp: TeamWeek | null }) {
  const rows = me.starters.map((p, i) => [p, opp?.starters[i]] as const)
  return (
    <div className="lineups">
      <div className="lu-grid">
        <div className="lu-head">
          <span>{me.name}</span>
          <span className="num">{pts(me.points)}</span>
          <span />
          <span className="num">{opp ? pts(opp.points) : ''}</span>
          <span className="right">{opp?.name}</span>
        </div>
        {rows.map(([mine, theirs], i) => (
          <div className="lu-row" key={i}>
            <PlayerCell p={mine} />
            <PointsCell p={mine} />
            <span className="slot">{slotLabel(mine.slot)}</span>
            {theirs ? <PointsCell p={theirs} /> : <span />}
            {theirs ? <PlayerCell p={theirs} right /> : <span />}
          </div>
        ))}
      </div>
      <div className="bench">
        <BenchList title="My bench" players={me.bench} />
        {opp && <BenchList title="Their bench" players={opp.bench} />}
      </div>
    </div>
  )
}

function PlayerCell({ p, right }: { p: PlayerLine; right?: boolean }) {
  if (p.empty) return <span className={`player empty ${right ? 'right' : ''}`}>Empty slot</span>
  return (
    <span className={`player ${right ? 'right' : ''} state-${p.state}`}>
      <span className="player-name">
        {p.name}
        {p.injury && <span className="injury">{p.injury.slice(0, 1)}</span>}
      </span>
      <span className="player-meta">
        {p.pos} · {p.team ?? 'FA'} · {p.state === 'bye' ? 'No game' : (p.game?.detail ?? '')}
      </span>
    </span>
  )
}

function PointsCell({ p }: { p: PlayerLine }) {
  if (p.empty) return <span className="pts-cell" />
  return (
    <span className={`pts-cell num state-${p.state}`}>
      <span className="pts-main">{p.state === 'pre' ? '—' : pts(p.pts)}</span>
      <span className="pts-proj">{p.state === 'post' || p.state === 'bye' ? `proj ${proj(p.proj)}` : `→ ${proj(p.live)}`}</span>
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
        <span key={p.id} className={`bench-item state-${p.state}`}>
          <span>
            {p.name} <span className="muted">{p.pos}</span>
          </span>
          <span className="num">{p.state === 'pre' ? `(${proj(p.proj)})` : pts(p.pts)}</span>
        </span>
      ))}
      {hiddenCount > 0 && (
        <button className="link bench-more" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Hide inactive' : `+${hiddenCount} with no projection`}
        </button>
      )}
    </div>
  )
}
