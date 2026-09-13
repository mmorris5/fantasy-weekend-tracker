import { ago, useNow } from '../lib/format'

export type Tab = 'matchups' | 'rooting' | 'season'
const TABS: { id: Tab; label: string }[] = [
  { id: 'matchups', label: 'Matchups' },
  { id: 'rooting', label: 'Rooting Guide' },
  { id: 'season', label: 'Season' },
]

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
  const now = useNow()
  return (
    <header className="topbar">
      <div className="brand">Weekend Tracker</div>
      <nav className="tabs">
        {TABS.map((t, i) => (
          <button key={t.id} className={p.tab === t.id ? 'active' : ''} onClick={() => p.onTab(t.id)} title={`Press ${i + 1}`}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="spacer" />
      {p.tab !== 'season' && (
        <div className="week-picker">
          <button onClick={() => p.onWeek(p.week - 1)} disabled={p.week <= 1} title="Previous week (←)">
            ‹
          </button>
          <select value={p.week} onChange={(e) => p.onWeek(Number(e.target.value))}>
            {Array.from({ length: p.maxWeek }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
          <button onClick={() => p.onWeek(p.week + 1)} disabled={p.week >= p.maxWeek} title="Next week (→)">
            ›
          </button>
        </div>
      )}
      <div className={`sync ${p.live ? 'is-live' : ''}`}>
        {p.live && <span className="live-dot" />}
        <span>{p.live ? 'Live' : 'Updated'}</span>
        <span className="muted">{p.fetching ? 'refreshing…' : ago(p.updatedAt, now)}</span>
      </div>
      <button className="icon-btn" onClick={p.onRefresh} title="Refresh (r)">
        ↻
      </button>
      <button className="user-btn" onClick={p.onSettings} title="Leagues & account">
        {p.username} ⚙
      </button>
    </header>
  )
}
