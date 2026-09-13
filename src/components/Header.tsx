import { ago, useNow } from '../lib/format'

export type Tab = 'matchups' | 'rooting' | 'season'
const TABS: { id: Tab; label: string }[] = [
  { id: 'matchups', label: 'MATCHUPS' },
  { id: 'rooting', label: 'ROOTING' },
  { id: 'season', label: 'SEASON' },
]

const clockFmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

type Props = {
  tab: Tab
  onTab: (t: Tab) => void
  week: number
  maxWeek: number
  onWeek: (w: number) => void
  live: boolean
  fetching: boolean
  updatedAt: number
  onRefresh: () => void
  username: string
  onSettings: () => void
}

export function Header(p: Props) {
  const now = useNow(1000)
  return (
    <header className="topbar">
      <div className="brand">
        WKND<span>TRKR</span>
      </div>
      <nav className="fkeys">
        {TABS.map((t, i) => (
          <button key={t.id} className={p.tab === t.id ? 'active' : ''} onClick={() => p.onTab(t.id)}>
            <kbd>{i + 1}</kbd>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="spacer" />
      {p.tab !== 'season' && (
        <div className="week-picker">
          <button onClick={() => p.onWeek(p.week - 1)} disabled={p.week <= 1} aria-label="Previous week">
            ◂
          </button>
          <select value={p.week} onChange={(e) => p.onWeek(Number(e.target.value))} aria-label="Week">
            {Array.from({ length: p.maxWeek }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                WK {String(w).padStart(2, '0')}
              </option>
            ))}
          </select>
          <button onClick={() => p.onWeek(p.week + 1)} disabled={p.week >= p.maxWeek} aria-label="Next week">
            ▸
          </button>
        </div>
      )}
      <div className="sync">
        {p.live ? <span className="live">● LIVE</span> : <span className="dim">IDLE</span>}
        <span className="dim">UPD {p.fetching ? '…' : ago(p.updatedAt, now)}</span>
      </div>
      <div className="clock">{clockFmt.format(now)}</div>
      <button onClick={p.onRefresh}>
        <kbd>R</kbd>REFRESH
      </button>
      <button onClick={p.onSettings} className="user-btn">
        <span className="dim">USER</span> {p.username.toUpperCase()}
      </button>
    </header>
  )
}
