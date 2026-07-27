# Package E — Result experience

Package E makes round results authoritative, responsive, and accessible without changing the distance formula or hint scoring rules.

## Result commitment

Scoring, streaks, totals, and the round-result record are committed synchronously before any camera or decorative animation begins.

The game transitions to `result` immediately after the authoritative result is stored. Camera failure cannot prevent the score or Next action from appearing.

## Reveal behavior

- Result information appears immediately.
- Next appears immediately with a short 300 ms accidental-input guard.
- Reduced-motion users receive no guard.
- Old round timers are cleared before a new round begins.
- Camera movement uses a conservative answer-centered strategy based on distance.
- Camera calls are wrapped so failures remain recoverable.

## Responsive result panel

The result panel always exposes:

- correct location
- distance
- awarded score and round cap
- accuracy tier and streak outcome
- Next action

Historical context is visible on larger layouts. On mobile it uses a two-line preview with a `Why this place?` control. On very short landscape layouts it remains collapsed unless explicitly opened.

A marker legend identifies:

- cyan — player guess
- gold — correct answer

## Accessibility

- A single polite live region announces each completed result.
- The result heading receives focus once after stable rendering.
- The announcement includes location, distance, points, and accuracy tier.
- Explanation expansion uses `aria-expanded` and `aria-controls`.
- Reduced-motion disables auto-rotation, camera animation duration, pulsing rings, result entrance animation, and score sounds used as flourish.

## Camera strategy

- close guesses use a close answer view
- regional misses use a medium answer view
- large misses use a wider globe view
- all camera operations fall back safely if the renderer rejects a movement

Perfect simultaneous framing of the guess and answer is intentionally deferred in favor of reliability.

## Acceptance targets

- scoring is applied once
- result text is independent of animation
- Next cannot be skipped by the original Lock action
- camera errors do not block progression
- result controls remain usable in portrait and short landscape
- reduced-motion retains all information
