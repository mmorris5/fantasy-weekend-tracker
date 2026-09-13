import type { Game, GameIndex } from '../api/games'
import type { LeagueWeek } from '../lib/model'

/** Scoreboard grid with how many of my / my opponents' starters are in each game. */
export function GameStrip({ games, board }: { games: GameIndex | undefined; board: LeagueWeek[] }) {
  if (!games?.games.length) return null

  const exposure = new Map<string, { mine: number; theirs: number }>()
  const bump = (game: Game | null, key: 'mine' | 'theirs') => {
    if (!game) return
    const e = exposure.get(game.id) ?? { mine: 0, theirs: 0 }
    e[key]++
    exposure.set(game.id, e)
  }
  for (const b of board) {
    b.me?.starters.forEach((p) => bump(p.game, 'mine'))
    b.opp?.starters.forEach((p) => bump(p.game, 'theirs'))
  }

  // Live games first, then upcoming, then finals.
  const order = { in: 0, pre: 1, post: 2 }
  const sorted = [...games.games].sort((a, b) => order[a.state] - order[b.state] || (a.kickoff ?? 0) - (b.kickoff ?? 0))

  return (
    <section className="panel">
      <div className="panel-title">
        NFL <span className="dim">· MINE/OPP STARTERS PER GAME</span>
      </div>
      <div className="games">
        {sorted.map((g) => {
          const e = exposure.get(g.id)
          const scored = g.homeScore !== null && g.awayScore !== null
          return (
            <div key={g.id} className={`game state-${g.state}`}>
              <span className={scored && g.awayScore! > g.homeScore! ? 'lead' : ''}>
                {g.away.padEnd(3)} {scored ? String(g.awayScore).padStart(2) : '  '}
              </span>
              <span className={scored && g.homeScore! > g.awayScore! ? 'lead' : ''}>
                {g.home.padEnd(3)} {scored ? String(g.homeScore).padStart(2) : '  '}
              </span>
              <span className="game-detail">{g.detail}</span>
              <span className="game-exp" title={`${e?.mine ?? 0} of my starters, ${e?.theirs ?? 0} opponent starters`}>
                <span className="good">{e?.mine ?? 0}</span>
                <span className="dim">/</span>
                <span className="bad">{e?.theirs ?? 0}</span>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
