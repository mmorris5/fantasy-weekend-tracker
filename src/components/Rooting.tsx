import { useMemo, useState } from 'react'
import type { Game } from '../api/games'
import { pts } from '../lib/format'
import type { LeagueWeek, PlayerState } from '../lib/model'

type Row = {
  id: string
  name: string
  pos: string
  team: string | null
  state: PlayerState
  game: Game | null
  avgPts: number
  forMe: string[]
  against: string[]
}

export function Rooting({ board }: { board: LeagueWeek[] }) {
  const [onlyRemaining, setOnlyRemaining] = useState(true)

  const rows = useMemo(() => {
    const map = new Map<string, Row & { ptsSum: number; ptsN: number }>()
    const add = (b: LeagueWeek, side: 'forMe' | 'against') => {
      const team = side === 'forMe' ? b.me : b.opp
      for (const p of team?.starters ?? []) {
        if (p.empty) continue
        const prev = map.get(p.id) ?? { id: p.id, name: p.name, pos: p.pos, team: p.team, state: p.state, game: p.game, avgPts: 0, forMe: [], against: [], ptsSum: 0, ptsN: 0 }
        map.set(p.id, { ...prev, [side]: [...prev[side], b.league.name], ptsSum: prev.ptsSum + p.pts, ptsN: prev.ptsN + 1 })
      }
    }
    for (const b of board) {
      if (b.status === 'eliminated') continue
      add(b, 'forMe')
      add(b, 'against')
    }
    return [...map.values()].map((r) => ({ ...r, avgPts: r.ptsSum / r.ptsN }))
  }, [board])

  const visible = onlyRemaining ? rows.filter((r) => r.state === 'pre' || r.state === 'in') : rows
  const net = (r: Row) => r.forMe.length - r.against.length
  const stateOrder = { in: 0, pre: 1, post: 2, bye: 3 }
  const byImpact = (a: Row, b: Row) => Math.abs(net(b)) - Math.abs(net(a)) || stateOrder[a.state] - stateOrder[b.state] || (a.game?.kickoff ?? 0) - (b.game?.kickoff ?? 0)

  const rootFor = visible.filter((r) => net(r) > 0).sort(byImpact)
  const rootAgainst = visible.filter((r) => net(r) < 0).sort(byImpact)
  const wash = visible.filter((r) => net(r) === 0).sort(byImpact)

  return (
    <section className="rooting">
      <div className="toolbar">
        <span className="muted">Every starter in your lineups and your opponents', netted across leagues</span>
        <label className="toggle">
          <input type="checkbox" checked={onlyRemaining} onChange={(e) => setOnlyRemaining(e.target.checked)} />
          Only players still to play or live
        </label>
      </div>
      <div className="rooting-cols">
        <RootList title="Root for" tone="good" rows={rootFor} net={net} />
        <RootList title="Root against" tone="bad" rows={rootAgainst} net={net} />
      </div>
      {wash.length > 0 && <RootList title="Wash · you start and face them equally" tone="neutral" rows={wash} net={net} />}
    </section>
  )
}

function RootList({ title, tone, rows, net }: { title: string; tone: string; rows: Row[]; net: (r: Row) => number }) {
  return (
    <div className="panel">
      <div className={`panel-title ${tone}`}>
        {title} <span className="muted">{rows.length}</span>
      </div>
      <div className="root-row root-head">
        <span className="num">Net</span>
        <span>Player</span>
        <span>Status</span>
        <span>Leagues</span>
        <span className="num">Avg pts</span>
      </div>
      {rows.length === 0 && <div className="root-row muted">No players</div>}
      {rows.map((r) => (
        <div key={r.id} className="root-row">
          <span className={`num strong ${tone}`}>{signed(net(r))}</span>
          <span className={`trunc ${r.state === 'in' ? 'live' : ''}`}>
            {r.name}
            <span className="muted">
              {' '}
              {r.pos} {r.team ?? 'FA'}
            </span>
          </span>
          <span className={`trunc ${r.state === 'in' ? 'live' : 'muted'}`}>{r.state === 'bye' ? 'No game' : r.game?.detail}</span>
          <span className="root-leagues" title={[...r.forMe.map((l) => `+ ${l}`), ...r.against.map((l) => `− ${l}`)].join('\n')}>
            {r.forMe.map((l, i) => (
              <span key={`f${i}`} className="tag good">
                {l}
              </span>
            ))}
            {r.against.map((l, i) => (
              <span key={`a${i}`} className="tag bad">
                {l}
              </span>
            ))}
          </span>
          <span className="num">{r.state === 'pre' ? '--' : pts(r.avgPts)}</span>
        </div>
      ))}
    </div>
  )
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)
