# Package A — Dataset truth

Package A establishes what the current ChronoGlobe clue library actually contains before IDs, deck generation, scoring, or UX behavior are changed.

## Live inventory

Open:

`/tools/facts-inventory.html`

On GitHub Pages:

`https://flesentine.github.io/chronoglobe/tools/facts-inventory.html`

The report loads the same seed and generation scripts as the game and calculates:

- total seed count
- number of seeds currently activated
- number of ignored seeds after the first 150
- runtime clue count
- difficulty counts
- category distribution
- era distribution
- duplicate place names
- duplicate coordinate pairs
- clue and hint length statistics
- the current method used to construct Expert records

The report can download its findings as JSON.

## Known generator behavior

The current generator:

1. reads `window.CHRONO_SEEDS`
2. takes only the first 150 seed rows
3. creates Easy, Medium, Hard, and Expert records from each active seed
4. therefore produces 600 runtime clue records

Expert is not currently an independently authored clue tier. It reuses the base event clue, changes the visible category to `Mystery`, changes the era to `Hidden`, and uses one generic hint.

## Package A does not change

- gameplay
- scoring
- map behavior
- clue selection
- layouts
- difficulty presentation

## Next gate

Before stable IDs are assigned, verify from the inventory that:

- the repository contains the expected seed count
- the first 150 seeds are the intended active event set
- every active seed has valid place and coordinate data
- duplicate places and coordinates are intentional or reviewed
- the seed structure is reliable enough to serve as the canonical event basis

Only after that review should Package B add stable event IDs, variant IDs, event-level decks, and repeat prevention.
