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
          <div className="panel-title">LEAGUES</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ESC
          </button>
        </div>
        <p className="dim">UNCHECK LEAGUES TO HIDE THEM FROM THE BOARD.</p>
        <div className="drawer-actions">
          <button onClick={() => onHidden([])}>SHOW ALL</button>
          <button onClick={() => onHidden(leagues.map((l) => l.league_id))}>HIDE ALL</button>
        </div>
        <ul className="league-picker">
          {leagues.map((l) => (
            <li key={l.league_id}>
              <label>
                <input type="checkbox" checked={!hiddenSet.has(l.league_id)} onChange={() => toggle(l.league_id)} />
                <span>
                  <span className="strong">{l.name.toUpperCase()}</span>
                  <span className="dim">{leagueBadges(l).join(' ')}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="drawer-foot">
          <span className="dim">
            USER <span className="amber">{username.toUpperCase()}</span>
          </span>
          <span className="drawer-actions">
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(shareLink(username)).then(() => setCopied(true))
              }}
              title="Link that opens this dashboard for this username"
            >
              {copied ? 'COPIED' : 'COPY LINK'}
            </button>
            <button onClick={onChangeUser}>SWITCH USER</button>
          </span>
        </div>
      </div>
    </div>
  )
}
