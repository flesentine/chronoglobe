# Canonical content migration

ChronoGlobe currently ships its gameplay data through the legacy seed-array generator in `facts/facts-final.js`.

The migration adds a canonical event model beside that generator without changing production gameplay.

## Files

- `facts/canonical-events.js` converts the first 150 seed rows into 150 canonical event objects.
- `facts/canonical-validation.js` validates structure, identity, coordinates, variants, duplicates, and exact legacy parity.
- `tools/canonical-parity.html` displays the release gate and editorial warnings.

## Current canonical shape

Each canonical event contains:

- `eventId`
- canonical place and coordinates
- category and era
- historical context
- migration metadata
- Easy, Medium, Hard, and Expert variants
- stable variant IDs

The initial migration intentionally preserves the current player-visible content exactly. It does not improve clue wording yet.

## Activation gates

Production must remain on `facts/facts-final.js` until:

1. canonical event count is exactly 150
2. canonical variant count is exactly 600
3. all event and variant IDs are unique
4. all required fields and coordinates validate
5. canonical expansion has zero mismatches against the legacy runtime dataset
6. duplicate coordinates are reviewed
7. Expert reuse and generic-hint warnings have an editorial plan
8. browser smoke tests pass after activation

## Editorial work after parity

The first review order is:

1. structural errors
2. coordinate conflicts
3. all Expert clues
4. duplicate-place and duplicate-coordinate findings
5. remaining Easy, Medium, and Hard clues

The parity report treats Expert reuse and the generic Expert hint as warnings because they accurately represent the current product. They become content-improvement work after the safe migration baseline is established.

## Production switch

The eventual switch should replace the legacy expansion with:

```js
window.CHRONO_FACTS = window.ChronoCanonical.expandAll(
  window.CHRONO_CANONICAL_EVENTS
);
```

That switch must be a separate, reversible commit after the parity report passes.