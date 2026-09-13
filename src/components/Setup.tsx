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
          WKND<span>TRKR</span>
        </div>
        <pre className="dim">
          {`EVERY SLEEPER LEAGUE. ONE SCREEN.
NO LOGIN. READ-ONLY PUBLIC DATA.`}
        </pre>
        <label className="prompt">
          <span className="amber">SLEEPER USER&gt;</span>
          <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} spellCheck={false} autoComplete="off" aria-label="Sleeper username" />
        </label>
        <div className="setup-foot">
          <button type="submit" disabled={loading || !value.trim()}>
            <kbd>↵</kbd>
            {loading ? 'LOOKING UP…' : 'LOAD'}
          </button>
          {error && <span className="bad">ERR: {error.toUpperCase()}</span>}
        </div>
      </form>
    </div>
  )
}
