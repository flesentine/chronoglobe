# Package F — Persistence and resume

ChronoGlobe now stores one versioned unfinished game in local storage.

## Saved data

- save schema, application, and content versions
- save timestamp
- active game configuration
- exact round deck by stable event and variant IDs
- current round and stable phase
- score totals and hint-adjusted maximum
- current guess and hint state
- streak and best streak
- completed result records and distances

## Save points

The game saves after:

- game creation
- placing or moving a guess
- revealing a hint
- committing a result
- advancing to the next round
- opening or closing the game menu
- page hide or backgrounding

## Restore rules

- `revealing` and `paused` are never restored as unstable phases.
- A paused result restores to `result`; other interrupted states restore to `guessing`.
- The saved deck must resolve against current stable variant IDs.
- Duplicate event IDs, missing variants, invalid coordinates, incompatible versions, malformed saves, and saves older than 30 days are rejected and removed.
- Finished games clear the active save.
- Starting a new game or choosing Start over clears the previous save.

## Diagnostic page

`/tools/persistence-test.html`
