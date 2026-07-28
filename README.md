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
- Vendored Natural Earth country boundaries with a remote emergency fallback
- Locked Node 22 / Playwright 1.55.0 release-test toolchain
- Immutable GitHub Action pins with weekly Dependabot review

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
npm ci
npm run serve
```

Then open `http://127.0.0.1:4173`.

## Release preflight and browser tests

Run repository consistency checks without opening a browser:

```bash
npm run preflight
```

Preflight verifies the release versions, canonical script order, production file references, JavaScript syntax, editorial and diagnostic assets, the vendored boundary data, the committed dependency lock, repository ignore rules, Dependabot coverage, immutable GitHub Action pins, test-discovery thresholds, and the weekly browser-workflow schedule.

Install Chromium and run the complete release test command:

```bash
npx playwright install chromium
npm test
```

`npm test` runs preflight first and then the full Playwright suite. To run browser tests without repeating preflight:

```bash
npm run test:browser
```

Focused commands run preflight before their selected suite:

```bash
npm run test:smoke
npm run test:mobile
npm run test:diagnostics
```

## Continuous verification

The Browser smoke tests workflow runs on:

- every push to `main`
- every pull request
- manual workflow dispatch
- a weekly Monday schedule

CI installs only locked dependencies, runs preflight, discovers the Playwright suite, verifies minimum test and file coverage, installs Chromium, and then runs the browser suite. Failures retain screenshots, traces, video, console logs, JSON results, and the HTML report. Release-verification artifacts are retained for 14 days.

The workflow uses immutable commit SHAs for external GitHub Actions. Dependabot checks npm and GitHub Actions dependencies weekly so proposed updates can be reviewed before pins change.

## Release diagnostics

- Release readiness: https://flesentine.github.io/chronoglobe/tools/release-readiness.html
- Canonical validation: https://flesentine.github.io/chronoglobe/tools/canonical-parity.html
- Expert editorial review: https://flesentine.github.io/chronoglobe/tools/expert-review.html
- Facts inventory: https://flesentine.github.io/chronoglobe/tools/facts-inventory.html
- Persistence: https://flesentine.github.io/chronoglobe/tools/persistence-test.html
- Replayability: https://flesentine.github.io/chronoglobe/tools/replayability-test.html

## Remaining manual release step

Run **Actions → Browser smoke tests → Run workflow** and confirm the complete Playwright suite passes. Connector-created commits have not produced visible status checks, so CI success has not yet been independently confirmed.