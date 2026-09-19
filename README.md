# Weekend Tracker

A fast dashboard for every Sleeper fantasy football league you're in. Enter your Sleeper username (no login) and see all your matchups on one screen.

Live at **https://mmorris5.github.io/fantasy-weekend-tracker/** — add `?user=yourname` to share a link that opens straight to someone's leagues.

```bash
npm install
npm run dev
```

## What's on screen

- **Matchups**: one row per league with live score, opponent, margin bar (live and projected), and how many starters each side has left. Click a row (or `j`/`k` + Enter) for mirrored lineups and benches.
- **Rooting Guide**: every starter across all your lineups and your opponents', netted by league. Shows who to root for and against.
- **Season**: W/L grid by league and week, plus your overall record.
- Game strip showing each NFL game's score/clock and how many of your (green) and your opponents' (red) starters are in it.

Keyboard: `1`/`2`/`3` tabs · `←`/`→` week · `j`/`k` move · Enter open · `e` expand all · `r` refresh.

## Phones

Below 900px the wide column grid re-flows: each league becomes a stacked card, lineups list your player above your opponent's, and the keyboard status bar drops away. On iOS, Share → *Add to Home Screen* installs it with an app icon and opens it fullscreen (a web manifest covers Android).

## Data

Everything runs in the browser; there's no backend.

- Sleeper public API: leagues, rosters, matchups (live points), players. The player DB is trimmed and cached in localStorage for 24h.
- Sleeper's undocumented `projections` and `schedule` endpoints. Projections are re-scored with each league's own `scoring_settings`.
- ESPN's public scoreboard for kickoff times and game clocks, used to scale projections during live games (falls back to Sleeper's schedule).

Polls every 30s while games are live, every 5 minutes otherwise.
