import { useState } from 'react'

type Props = { initial?: string; error?: string; loading?: boolean; onSubmit: (username: string) => void }

export function Setup({ initial = '', error, loading, onSubmit }: Props) {
  const [value, setValue] = useState(initial)
  return (
    <div className="setup">
      <form
        className="setup-card"
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) onSubmit(value.trim())
        }}
      >
        <div className="brand">
          <span className="brand-mark">WT</span>
          Weekend Tracker
        </div>
        <p className="muted">Every Sleeper league on one screen. Enter your Sleeper username — no login, read-only public data.</p>
        <input autoFocus placeholder="Sleeper username" value={value} onChange={(e) => setValue(e.target.value)} spellCheck={false} autoComplete="off" />
        <button type="submit" className="primary" disabled={loading || !value.trim()}>
          {loading ? 'Looking up…' : 'Load my leagues'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
