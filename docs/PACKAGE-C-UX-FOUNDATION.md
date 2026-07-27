# Package C — Visible UX foundation

Package C introduces a deliberate setup flow while preserving the existing scoring and result model.

## Included

- Start screen before gameplay
- Accessible radio controls for difficulty and round count
- First-session defaults of Easy and 5 rounds
- Remembered difficulty, round count, and sound preference
- Read-only current-game status during play
- In-game menu with Resume, How to play, Sound, and New game
- New-game confirmation after meaningful progress
- Tap elsewhere to reposition the existing guess marker
- Expert-specific presentation that removes category and era from the layout
- Play Again returns through the same setup and initialization path
- Menu pauses map input and gameplay shortcuts

## Preserved

- Existing distance formula
- Existing score values
- Existing streak rule
- Existing result dock
- Existing map camera behavior
- Existing hint behavior and no hint penalty

## Manual acceptance checks

1. Opening the site shows setup before a round begins.
2. Easy and 5 rounds are selected on a new browser profile.
3. Start creates the full deck and enters Round 1.
4. In-game settings are read-only.
5. Tapping another map location moves the guess rather than creating a second guess.
6. Menu blocks map interaction.
7. Starting over after placing a guess requires confirmation.
8. Cancel returns to the paused game.
9. Expert hides category and era without leaving empty metadata space.
10. Play Again returns to setup rather than bypassing initialization.
11. Scoring output remains unchanged from Package B.
