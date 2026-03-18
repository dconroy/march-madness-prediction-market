# March Madness 2026 Market Bracket (MVP)

A fast, read-only MVP that renders a deterministic NCAA men&rsquo;s bracket for 2026 using Polymarket prediction market probabilities as the primary signal (no database, no auth).

## Run locally

```bash
npm install
npm run dev -- --port 3000
```

Visit: `http://localhost:3000`

First load may take a few seconds because it fetches public Polymarket data.

## How it works

1. `src/lib/polymarket.ts` fetches:
   - Round-of-64 matchup participants + Polymarket game event slugs (from the public Polymarket bracket page).
   - Tournament title odds (from Polymarket gamma API).
   - Round-of-64 game moneyline probabilities (from Polymarket gamma API, per game event slug).
2. `src/lib/bracket.ts` deterministically simulates downstream rounds by repeatedly advancing the higher-implied win probability.
3. `src/app/BracketClient.tsx` exposes a toggle:
   - `game`: uses game-level probabilities when available; otherwise shows unavailable.
   - `fallback`: uses title-odds-derived head-to-head probabilities when game-level markets aren&rsquo;t available.

## Deterministic bracket + fallback heuristic

The MVP auto-advances every game using higher implied win probability.

Fallback heuristic (when enabled):
- Polymarket&rsquo;s title odds provide each team&rsquo;s probability to win the whole tournament (`pTeam`).
- Head-to-head is approximated as:
  - `P(A wins) = pA / (pA + pB)`
  - `P(B wins) = 100 - P(A wins)`

Tie-breakers (rare):
- lower seed advances; if still tied, alphabetical team name advances.

## Where to plug in alternate endpoints

All data access lives in `src/lib/polymarket.ts`. To swap sources later:

- Update `POLYMARKET_BRACKET_URL` (used to discover Round-of-64 teams/seeds and each matchup&rsquo;s Polymarket game event slug).
- Update `TITLE_EVENT_SLUG` (used to fetch the title odds market: `2026-ncaa-tournament-winner`).
- Keep or adjust these helpers:
  - `getTitleMarkets()` (title odds -> `TitleOdds[]`)
  - `getGameMarkets()` (game event slugs -> win probabilities)
  - `parsePolymarketBracketPageForRd64()` (bracket parsing -> seed/team/slot mapping)

The inference engine is in `src/lib/bracket.ts` and is deterministic given the inputs + selected probability mode.

## Assumptions + mapping

1. **Bracket layout assumption**: region seed matchups use the standard NCAA Round-of-64 seed pairing order per region (`1v16`, `8v9`, `5v12`, `4v13`, `6v11`, `3v14`, `7v10`, `2v15`), and Final Four matchups are assumed as `East vs West` and `South vs Midwest`.
2. **Game mapping assumption (Round-of-64 only)**:
   - The app parses `https://polymarket.com/sports/cbb/bracket` to find each Round-of-64 pairing&rsquo;s Polymarket game event slug.
   - For each event slug, it queries the gamma API and selects the two-outcome market whose `outcomes` exactly match the two team names from the bracket page.
3. **Title-to-team matching**:
   - Title odds often use school names (e.g. `Duke`), while game outcomes use full team names with nicknames (e.g. `Duke Blue Devils`).
   - The inference engine matches them via a simple substring heuristic (after normalization).

## Limitations

- Only **Round-of-64** uses game-level market probabilities in this MVP. Later rounds are inferred from title odds (or marked unavailable in game-only mode).
- If Polymarket naming doesn&rsquo;t match exactly (nicknames, punctuation, etc.), some matchups may show as unavailable.
- This MVP doesn&rsquo;t model correlated outcomes; it only advances using independent per-game probabilities.

## Endpoints used (exact)

1. Bracket discovery:
   - `https://polymarket.com/sports/cbb/bracket` (HTML parsing for Round-of-64 teams/seeds + event slugs)
2. Title odds:
   - `https://gamma-api.polymarket.com/events?slug=2026-ncaa-tournament-winner`
3. Game odds per Round-of-64 matchup:
   - `https://gamma-api.polymarket.com/events?slug=${gameEventSlug}`
   - where `gameEventSlug` looks like `cbb-<team1>-<team2>-YYYY-MM-DD`

## GitHub Pages

This project is configured for a static export (builds to `out/`), so it can be deployed to GitHub Pages.

1. Push commits to `main` (the workflow runs automatically).
2. In your repo’s GitHub Pages settings, publish from the `gh-pages` branch, root folder.
3. The deployment assumes a standard project-pages URL prefix: `https://<user>.github.io/<repo-name>/`.
