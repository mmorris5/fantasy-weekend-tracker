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
        <h1>Weekend Tracker</h1>
        <p className="muted">Every Sleeper league on one screen. Enter your Sleeper username to get started. No login needed.</p>
        <input autoFocus placeholder="Sleeper username" value={value} onChange={(e) => setValue(e.target.value)} spellCheck={false} />
        <button type="submit" disabled={loading || !value.trim()}>
          {loading ? 'Looking up…' : 'Load my leagues'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
