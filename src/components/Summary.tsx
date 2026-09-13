import { proj, pts, record } from '../lib/format'
import type { LeagueWeek } from '../lib/model'

export function Summary({ board }: { board: LeagueWeek[] }) {
  const h2h = board.filter((b) => b.kind === 'h2h' && b.opp)
  const guillotine = board.filter((b) => b.kind === 'guillotine' && b.status !== 'eliminated')

  const now = { w: 0, l: 0, t: 0 }
  const projected = { w: 0, l: 0 }
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
  const anyStarted = h2h.some((b) => b.started || b.final)
  const closeGames = h2h.filter((b) => !b.final && Math.abs(b.projMargin) < 10).length

  return (
    <section className="summary">
      <Stat label={anyStarted ? 'Right now' : 'This week'} hint={`${h2h.length} head-to-head`}>
        {anyStarted ? <Record w={now.w} l={now.l} t={now.t} /> : <span className="muted">Not started</span>}
      </Stat>
      <Stat label="Projected" hint={`${closeGames} within 10 pts`}>
        <Record w={projected.w} l={projected.l} />
      </Stat>
      <Stat label="Final" hint={`${settled.w + settled.l + settled.t} of ${h2h.length} settled`}>
        <Record w={settled.w} l={settled.l} t={settled.t} />
      </Stat>
      {guillotine.length > 0 && (
        <Stat label="Guillotine" hint={guillotine.map((g) => `${g.survival?.rank ?? '–'}/${g.survival?.alive ?? '–'}`).join(' · ')}>
          <span className={guillotine.some((g) => g.status === 'danger' || g.status === 'chopped') ? 'bad' : 'good'}>
            {guillotine.filter((g) => g.status !== 'danger' && g.status !== 'chopped').length}/{guillotine.length} safe
          </span>
        </Stat>
      )}
      <Stat label="My points" hint={`proj ${proj(totalProj)}`}>
        {pts(totalPts)}
      </Stat>
      <Stat label="My starters" hint={`opponents have ${oppLeft} left or live`}>
        <span className="triple">
          <span>
            <b>{left}</b> left
          </span>
          <span>
            <b className="state-in">{playing}</b> live
          </span>
          <span>
            <b>{done}</b> done
          </span>
        </span>
      </Stat>
    </section>
  )
}

function Stat({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{children}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

function Record({ w, l, t = 0 }: { w: number; l: number; t?: number }) {
  const [rw, rl, rt] = record(w, l, t).split('–')
  return (
    <span className="record">
      <span className="good">{rw}</span>–<span className="bad">{rl}</span>
      {rt !== undefined && <>–{rt}</>}
    </span>
  )
}
