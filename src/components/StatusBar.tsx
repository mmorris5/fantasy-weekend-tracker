const KEYS: [string, string][] = [
  ['1-3', 'TABS'],
  ['←→', 'WEEK'],
  ['J/K', 'MOVE'],
  ['↵', 'OPEN'],
  ['E', 'EXPAND ALL'],
  ['R', 'REFRESH'],
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
      <span className="dim">
        {leagues} LEAGUES · SLEEPER{source === 'espn' ? ' + ESPN' : ''}
      </span>
    </footer>
  )
}
