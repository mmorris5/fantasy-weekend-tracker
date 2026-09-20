import { useState } from 'react'
import type { League } from '../api/sleeper'
import { leagueBadges } from '../lib/model'
import { shareLink } from '../lib/prefs'

type Props = {
  username: string
  leagues: League[]
  hidden: string[]
  onHidden: (ids: string[]) => void
  onChangeUser: () => void
  onClose: () => void
}

export function Settings({ username, leagues, hidden, onHidden, onChangeUser, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const hiddenSet = new Set(hidden)
  const toggle = (id: string) => onHidden(hiddenSet.has(id) ? hidden.filter((h) => h !== id) : [...hidden, id])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
        <div className="drawer-head">
          <h2>Leagues</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="muted">Uncheck leagues to hide them from the board.</p>
        <div className="drawer-actions">
          <button onClick={() => onHidden([])}>Show all</button>
          <button onClick={() => onHidden(leagues.map((l) => l.league_id))}>Hide all</button>
        </div>
        <ul className="league-picker">
          {leagues.map((l) => (
            <li key={l.league_id}>
              <label>
                <input type="checkbox" checked={!hiddenSet.has(l.league_id)} onChange={() => toggle(l.league_id)} />
                <span>
                  <span className="league-name">{l.name}</span>
                  <span className="tags">{leagueBadges(l).map((b) => (<span key={b} className="tag">{b}</span>))}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="drawer-foot">
          <span className="muted">
            Showing <b>{username}</b>
          </span>
          <span className="drawer-actions">
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(shareLink(username)).then(() => setCopied(true))
              }}
              title="Link that opens this dashboard for this username"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button onClick={onChangeUser}>Switch user</button>
          </span>
        </div>
      </div>
    </div>
  )
}
