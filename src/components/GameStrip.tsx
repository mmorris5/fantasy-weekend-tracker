import type { Game, GameIndex } from '../api/games'
import type { LeagueWeek } from '../lib/model'

/** Horizontal scoreboard with how many of my / my opponents' starters are in each game. */
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
    <section className="game-strip" aria-label="NFL games">
      {sorted.map((g) => {
        const e = exposure.get(g.id)
        const showScore = g.homeScore !== null && g.awayScore !== null
        return (
          <div key={g.id} className={`game-chip state-${g.state}`}>
            <div className="game-teams">
              <span className={showScore && g.awayScore! > g.homeScore! ? 'lead' : ''}>
                {g.away} {showScore && g.awayScore}
              </span>
              <span className={showScore && g.homeScore! > g.awayScore! ? 'lead' : ''}>
                {g.home} {showScore && g.homeScore}
              </span>
            </div>
            <div className="game-meta">
              <span className="game-detail">{g.detail}</span>
              {e && (
                <span className="game-exposure" title={`${e.mine} of my starters, ${e.theirs} opponent starters`}>
                  <span className="good">{e.mine}</span>/<span className="bad">{e.theirs}</span>
                </span>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
