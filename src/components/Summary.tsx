import { proj, pts } from '../lib/format'
import type { LeagueWeek } from '../lib/model'

const pad = (n: number) => String(n).padStart(2, '0')

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
      <Cell label="REC NOW" hint={`${h2h.length} H2H`}>
        <Record {...now} />
      </Cell>
      <Cell label="REC PROJ" hint={`${closeGames} WITHIN 10`}>
        <Record {...projected} />
      </Cell>
      <Cell label="REC FINAL" hint={`${settled.w + settled.l + settled.t}/${h2h.length} SETTLED`}>
        <Record {...settled} />
      </Cell>
      {guillotine.length > 0 && (
        <Cell label="GUILLOTINE" hint={guillotine.map((g) => `${pad(g.survival?.rank ?? 0)}/${g.survival?.alive ?? 0}`).join(' ')}>
          <span className={atRisk ? 'bad' : 'good'}>
            {guillotine.length - atRisk}/{guillotine.length} SAFE
          </span>
        </Cell>
      )}
      <Cell label="PTS" hint={`PROJ ${proj(totalProj)}`}>
        {pts(totalPts)}
      </Cell>
      <Cell label="STARTERS LEFT/LIVE/DONE" hint={`OPP ${oppLeft} LEFT+LIVE`}>
        {left}
        <span className="dim">/</span>
        <span className="amber">{playing}</span>
        <span className="dim">/</span>
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
      <span className="dim">-</span>
      <span className="bad">{pad(l)}</span>
      {t > 0 && (
        <>
          <span className="dim">-</span>
          {pad(t)}
        </>
      )}
    </span>
  )
}
