const KEYS: [string, string][] = [
  ['1-3', 'tabs'],
  ['←→', 'week'],
  ['j/k', 'move'],
  ['↵', 'open'],
  ['e', 'expand all'],
  ['r', 'refresh'],
]

export function StatusBar({ source, leagues }: { source: string | undefined; leagues: number }) {
  return (
    <footer className="statusbar">
      {KEYS.map(([k, label]) => (
        <span key={k}>
          <kbd>{k}</kbd>
          {label}
        </span>
      ))}
      <span className="spacer" />
      <span className="muted">
        {leagues} leagues · Sleeper{source === 'espn' ? ' + ESPN' : ''}
      </span>
    </footer>
  )
}
