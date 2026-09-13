import { useState } from 'react'
import { sleeperLeagueUrl } from '../api/sleeper'
import { proj, pts, record, signed } from '../lib/format'
import { STATUS_LABEL, slotLabel, tone, type LeagueWeek, type PlayerLine, type TeamWeek } from '../lib/model'

type Props = {
  board: LeagueWeek[]
  loadingCount: number
  expanded: Set<string>
  cursor: number
  onToggle: (leagueId: string) => void
  onCursor: (i: number) => void
}

const pad = (n: number) => String(n).padStart(2, '0')

export function LeagueTable({ board, loadingCount, expanded, cursor, onToggle, onCursor }: Props) {
  return (
    <section className="panel">
      <div className="lt lt-head" role="row">
        <span>ST</span>
        <span>LEAGUE</span>
        <span>FMT</span>
        <span className="num">ME</span>
        <span className="num">OPP</span>
        <span className="num">Δ</span>
        <span />
        <span className="num">PRJ</span>
        <span className="num">OPRJ</span>
        <span className="num">PRJ Δ</span>
        <span className="num" title="Starters yet to play / playing, mine then opponent's">
          LEFT/LIVE
        </span>
        <span>OPPONENT</span>
        <span className="num">REC</span>
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
        <div key={`sk-${i}`} className="lt lt-loading">
          <span className="dim">LOADING…</span>
        </div>
      ))}
    </section>
  )
}

function LeagueRow({ b, open, focused, onToggle }: { b: LeagueWeek; open: boolean; focused: boolean; onToggle: () => void }) {
  const t = tone(b.status)
  const inactive = !b.me || b.status === 'nomatch' || b.status === 'eliminated' || b.status === 'notfound'
  const { me, opp, survival } = b
  const cls = (n: number) => (n > 0 ? 'good' : n < 0 ? 'bad' : '')

  return (
    <div className={`lt-group ${open ? 'open' : ''} ${focused ? 'focused' : ''} ${inactive ? 'inactive' : ''}`} data-focused={focused || undefined}>
      <div className="lt lt-row" role="row" onClick={inactive ? undefined : onToggle}>
        <span className={`st tone-${t} ${b.final ? 'final' : ''}`}>{STATUS_LABEL[b.status]}</span>
        <span className="trunc strong" title={b.league.name}>
          {b.league.name.toUpperCase()}
        </span>
        <span className="trunc dim">{b.badges.join(' ')}</span>

        <span className="num strong">{me ? pts(me.points) : ''}</span>
        <span className="num">{opp ? pts(opp.points) : survival ? `${pad(survival.rank)}/${survival.alive}` : ''}</span>
        <span className={`num strong ${cls(b.margin)}`}>{me && !inactive ? signed(b.margin) : ''}</span>
        <span>{me && !inactive && <MarginBar b={b} />}</span>

        <span className="num dim">{me && !b.final ? proj(me.projected) : ''}</span>
        <span className="num dim">{opp && !b.final ? proj(opp.projected) : survival && !b.final ? `${pad(survival.projRank)}/${survival.alive}` : ''}</span>
        <span className={`num ${cls(b.projMargin)}`}>{me && !inactive && !b.final ? signed(b.projMargin) : ''}</span>

        <span className="num">
          {me && !inactive && (
            <>
              {pad(me.counts.pre)}
              <span className="dim">/</span>
              <span className="amber">{pad(me.counts.in)}</span>
              {opp && (
                <span className="dim">
                  {' '}
                  {pad(opp.counts.pre)}/{pad(opp.counts.in)}
                </span>
              )}
            </>
          )}
        </span>

        <span className="trunc dim" title={opp?.name}>
          {opp ? opp.name.toUpperCase() : survival ? 'CUT: LOWEST SCORE' : b.status === 'eliminated' ? 'ELIMINATED' : '—'}
        </span>
        <span className="num dim">
          {me && b.kind === 'h2h' ? (
            <>
              {record(me.record.w, me.record.l, me.record.t)}
              {me.record.w + me.record.l + me.record.t > 0 && ` #${pad(me.rank)}`}
            </>
          ) : (
            ''
          )}
        </span>
        <span className="row-actions">
          <a href={sleeperLeagueUrl(b.league.league_id)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Open in Sleeper">
            ↗
          </a>
        </span>
      </div>
      {open && me && <Lineups me={me} opp={opp} />}
    </div>
  )
}

function MarginBar({ b }: { b: LeagueWeek }) {
  // ±40 points fills half the bar.
  const pct = (n: number) => Math.min(50, (Math.abs(n) / 40) * 50)
  const { margin, projMargin } = b
  return (
    <span className="bar" title={`Live ${signed(margin)} · projected ${signed(projMargin)}`}>
      <span className="bar-mid" />
      <span className={`bar-fill ${margin >= 0 ? 'pos' : 'neg'}`} style={{ width: `${pct(margin)}%`, [margin >= 0 ? 'left' : 'right']: '50%' }} />
      {!b.final && <span className="bar-proj" style={{ left: `${50 + (projMargin >= 0 ? pct(projMargin) : -pct(projMargin))}%` }} />}
    </span>
  )
}

function Lineups({ me, opp }: { me: TeamWeek; opp: TeamWeek | null }) {
  const rows = me.starters.map((p, i) => [p, opp?.starters[i]] as const)
  return (
    <div className="lineups">
      <div className="box">
        <div className="box-row box-head">
          <span>{me.name.toUpperCase()}</span>
          <span>STATUS</span>
          <span className="num">PTS</span>
          <span className="num">PRJ</span>
          <span className="center">POS</span>
          <span className="num">PRJ</span>
          <span className="num">PTS</span>
          <span className="right">STATUS</span>
          <span className="right">{opp?.name.toUpperCase()}</span>
        </div>
        {rows.map(([mine, theirs], i) => (
          <div className="box-row" key={i}>
            <PlayerName p={mine} />
            <Status p={mine} />
            <Points p={mine} />
            <Projection p={mine} />
            <span className="center amber">{slotLabel(mine.slot)}</span>
            {theirs ? <Projection p={theirs} /> : <span />}
            {theirs ? <Points p={theirs} /> : <span />}
            {theirs ? <Status p={theirs} right /> : <span />}
            {theirs ? <PlayerName p={theirs} right /> : <span />}
          </div>
        ))}
        <div className="box-row box-total">
          <span>TOTAL</span>
          <span />
          <span className="num strong">{pts(me.points)}</span>
          <span className="num dim">{proj(me.projected)}</span>
          <span />
          <span className="num dim">{opp ? proj(opp.projected) : ''}</span>
          <span className="num strong">{opp ? pts(opp.points) : ''}</span>
          <span />
          <span />
        </div>
      </div>
      <div className="bench">
        <BenchList title="MY BENCH" players={me.bench} />
        {opp && <BenchList title="OPP BENCH" players={opp.bench} />}
      </div>
    </div>
  )
}

function PlayerName({ p, right }: { p: PlayerLine; right?: boolean }) {
  if (p.empty) return <span className={`trunc bad ${right ? 'right' : ''}`}>-- EMPTY --</span>
  return (
    <span className={`trunc ${right ? 'right' : ''} ${p.state === 'in' ? 'amber' : ''}`}>
      {p.name}
      <span className="dim">
        {' '}
        {p.pos} {p.team ?? 'FA'}
      </span>
      {p.injury && <span className="bad"> {p.injury.slice(0, 1).toUpperCase()}</span>}
    </span>
  )
}

function Status({ p, right }: { p: PlayerLine; right?: boolean }) {
  if (p.empty) return <span />
  const label = p.state === 'bye' ? 'NO GAME' : (p.game?.detail ?? '')
  return <span className={`trunc ${right ? 'right' : ''} ${p.state === 'in' ? 'amber' : 'dim'}`}>{label}</span>
}

function Points({ p }: { p: PlayerLine }) {
  if (p.empty) return <span />
  return <span className={`num ${p.state === 'in' ? 'amber strong' : p.state === 'pre' ? 'dim' : 'strong'}`}>{p.state === 'pre' ? '--' : pts(p.pts)}</span>
}

function Projection({ p }: { p: PlayerLine }) {
  if (p.empty) return <span />
  const settled = p.state === 'post' || p.state === 'bye'
  return (
    <span className="num dim" title={settled ? 'Pregame projection' : 'Live projection'}>
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
      <div className="panel-title">{title}</div>
      {shown.map((p) => (
        <div key={p.id} className="bench-row">
          <span className={`trunc ${p.state === 'in' ? 'amber' : ''}`}>
            {p.name} <span className="dim">{p.pos}</span>
          </span>
          <span className={`num ${p.state === 'pre' ? 'dim' : p.state === 'in' ? 'amber' : ''}`}>{p.state === 'pre' ? proj(p.proj) : pts(p.pts)}</span>
        </div>
      ))}
      {hiddenCount > 0 && (
        <button className="text-btn" onClick={() => setShowAll(!showAll)}>
          {showAll ? '[-] HIDE INACTIVE' : `[+] ${hiddenCount} INACTIVE`}
        </button>
      )}
    </div>
  )
}
