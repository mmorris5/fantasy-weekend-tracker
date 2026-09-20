import { proj, pts } from '../lib/format'
import type { LeagueWeek } from '../lib/model'

const pad = (n: number) => String(n)

export function Summary({ board }: { board: LeagueWeek[] }) {
  const h2h = board.filter((b) => b.kind === 'h2h' && b.opp)
  const guillotine = board.filter((b) => b.kind === 'guillotine' && b.status !== 'eliminated')

  const now = { w: 0, l: 0, t: 0 }
  const projected = { w: 0, l: 0, t: 0 }
  const settled = { w: 0, l: 0, t: 0 }
  for (const b of h2h) {
    if (b.started || b.final) {
      if (b.margin > 0) now.w++
      else if (b.margin < 0) now.l++
      else now.t++
    }
    if (b.projMargin >= 0) projected.w++
    else projected.l++
    if (b.final) {
      if (b.margin > 0) settled.w++
      else if (b.margin < 0) settled.l++
      else settled.t++
    }
  }

  const mine = board.flatMap((b) => (b.me ? [b.me] : []))
  const totalPts = mine.reduce((s, t) => s + t.points, 0)
  const totalProj = mine.reduce((s, t) => s + t.projected, 0)
  const left = mine.reduce((s, t) => s + t.counts.pre, 0)
  const playing = mine.reduce((s, t) => s + t.counts.in, 0)
  const done = mine.reduce((s, t) => s + t.counts.post, 0)
  const oppLeft = h2h.reduce((s, b) => s + (b.opp?.counts.pre ?? 0) + (b.opp?.counts.in ?? 0), 0)
  const closeGames = h2h.filter((b) => !b.final && Math.abs(b.projMargin) < 10).length
  const atRisk = guillotine.filter((g) => g.status === 'danger' || g.status === 'chopped').length

  return (
    <section className="summary">
      <Cell label="Right now" hint={`${h2h.length} head-to-head`}>
        <Record {...now} />
      </Cell>
      <Cell label="Projected" hint={`${closeGames} within 10 pts`}>
        <Record {...projected} />
      </Cell>
      <Cell label="Final" hint={`${settled.w + settled.l + settled.t} of ${h2h.length} settled`}>
        <Record {...settled} />
      </Cell>
      {guillotine.length > 0 && (
        <Cell label="Guillotine" hint={guillotine.map((g) => `${pad(g.survival?.rank ?? 0)}/${g.survival?.alive ?? 0}`).join(' ')}>
          <span className={atRisk ? 'bad' : 'good'}>
            {guillotine.length - atRisk}/{guillotine.length} safe
          </span>
        </Cell>
      )}
      <Cell label="My points" hint={`proj ${proj(totalProj)}`}>
        {pts(totalPts)}
      </Cell>
      <Cell label="Starters" hint={`opponents: ${oppLeft} left or live`}>
        {left}
        <span className="muted">/</span>
        <span className="live">{playing}</span>
        <span className="muted">/</span>
        {done}
      </Cell>
    </section>
  )
}

function Cell({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="cell">
      <div className="cell-label">{label}</div>
      <div className="cell-value">{children}</div>
      {hint && <div className="cell-hint">{hint}</div>}
    </div>
  )
}

function Record({ w, l, t }: { w: number; l: number; t: number }) {
  return (
    <span>
      <span className="good">{pad(w)}</span>
      <span className="muted">–</span>
      <span className="bad">{pad(l)}</span>
      {t > 0 && (
        <>
          <span className="muted">–</span>
          {pad(t)}
        </>
      )}
    </span>
  )
}
