# ChronoGlobe stabilization QA

This checklist covers the current post-feature stabilization pass.

## Critical gameplay flow

Test each case on desktop and mobile:

1. Open the start screen.
2. Start Easy, Medium, Hard, Expert, and Mixed games.
3. Confirm map aids match the active round difficulty.
4. Place a guess.
5. Move the guess before locking.
6. Use a hint and confirm the 8,000-point cap.
7. Lock the answer once and verify scoring occurs once.
8. Continue through every round.
9. Complete the game and share the result.
10. Refresh during guessing and resume.
11. Refresh on a result screen and resume.
12. Start over and confirm the save is deleted.

## Daily Challenge

- Daily Challenge is visible on the start screen.
- The same UTC date produces the same five event and variant IDs.
- The first completed attempt is labeled Official.
- A later attempt on the same UTC date is labeled Practice.
- Share text does not reveal answer locations.
- Hint-assisted rounds include an asterisk.

## Mobile portrait

Target widths:

- 320 × 568
- 375 × 667
- 390 × 844
- 430 × 932

Requirements:

- Start button remains reachable.
- Setup screen can scroll without moving the page behind it.
- Clue, Hint, and Lock remain reachable.
- Result location, distance, score, and Next remain visible.
- Safe-area insets do not cover controls.
- Long explanations can expand and scroll.

## Mobile landscape

Target sizes:

- 667 × 375
- 740 × 360
- 812 × 375
- 844 × 390

Requirements:

- Clue remains readable.
- Hint and Lock remain usable.
- Result panel does not cover Next.
- Next is visible without scrolling.
- Zoom controls do not overlap result actions.
- No horizontal overflow occurs.

## Keyboard and accessibility

- Tab order reaches all setup controls.
- Enter locks only while a valid guess exists.
- Space or Right Arrow advances only from a result.
- Escape closes the active dialog.
- Result focus moves once to the result heading.
- Live announcements include location, distance, score, and tier.
- Reduced motion disables camera animation, pulses, and decorative result motion.

## Failure handling

- Blocking country boundaries does not stop gameplay.
- Blocking reference labels does not stop gameplay.
- A visible message explains that map aids are unavailable.
- Corrupt saved state is discarded safely.
- An expired save is discarded safely.
- Missing variant IDs invalidate the save rather than loading the wrong clue.

## Remaining asset task

The country boundary source now uses the smaller Natural Earth 1:110m dataset and fails safely. The exact GeoJSON file still needs to be vendored into the repository before declaring the application independent of the external boundary host.
