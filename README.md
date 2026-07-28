# ChronoGlobe

ChronoGlobe is a browser-based history geography game. Read a historical clue, explore the globe, place a guess, and earn points based on distance from the correct location.

Live site: https://flesentine.github.io/chronoglobe/

## Current release

- App version: `1.9.0`
- Content version: `canonical-150-expert-v1`
- 150 historical events
- 600 playable variants: 150 each for Easy, Medium, Hard, and Expert
- All 150 Expert clues and hints have completed editorial review
- Canonical runtime with validated legacy fallback

## Features

- Interactive globe with difficulty-based map aids
- Distance scoring up to 10,000 points per round
- Five-, ten-, and fifteen-round games
- Easy, Medium, Hard, Expert, and Mixed modes
- Daily Challenge with deterministic UTC-date decks
- Resume support for unfinished games
- Hint score caps, streaks, final rankings, and shareable result glyphs
- Recent-event avoidance for better replayability
- Reduced-motion and mobile-layout support

## Run locally

For the full local server with cached live satellite tiles:

```bash
python3 server.py 8080
```

Then open `http://localhost:8080`.

For the same static-server setup used by Playwright:

```bash
npm install
npm run serve
```

Then open `http://127.0.0.1:4173`.

## Browser tests

```bash
npx playwright install chromium
npm test
```

Focused commands:

```bash
npm run test:smoke
npm run test:mobile
```

## Release diagnostics

- Release readiness: https://flesentine.github.io/chronoglobe/tools/release-readiness.html
- Canonical validation: https://flesentine.github.io/chronoglobe/tools/canonical-parity.html
- Expert editorial review: https://flesentine.github.io/chronoglobe/tools/expert-review.html
- Facts inventory: https://flesentine.github.io/chronoglobe/tools/facts-inventory.html
- Persistence: https://flesentine.github.io/chronoglobe/tools/persistence-test.html
- Replayability: https://flesentine.github.io/chronoglobe/tools/replayability-test.html

## Remaining manual release steps

1. Run **Actions → Vendor country boundaries → Run workflow** to commit `data/country-boundaries.geojson`. Gameplay already has a remote fallback, so this is a resilience improvement rather than a hard blocker.
2. Run **Actions → Browser smoke tests → Run workflow** and confirm the Playwright suite passes. Connector-created commits have not produced visible status checks, so CI success has not yet been independently confirmed.
