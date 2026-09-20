# Road Ready drill stopping and backing completion

Reviewed 2026-09-19. Changes are local; this pass did not commit or deploy.

## Improvements

- Space now brakes in the three-point-turn and straight-backing drills, including while acceleration is held. Direction changes first stop the car before allowing movement in the opposite direction. Releasing both pedals settles speed to zero.
- Both drills clear held inputs when reset. Three-point stage transitions now require the car to stop.
- Straight backing finishes only after stopping in the target zone, with the whole car inside the cone lane and its heading aligned with the lane. Feedback explains whether to stop, straighten, center the car, or correct an overshoot. Returning toward the target clears obsolete target feedback.
- Backing scores and cone-contact history use current state throughout the simulation and final result. Reset clears the score, contacts, completion, and queued inputs together.
- The canonical source and desktop STEM mirror are identical.

## Verification

- 126 unit and render tests passed across drill stopping, shared drill keys, handling clarity, and Road Ready view smoke coverage.
- Five initial Chromium scenarios passed: both drills' braking/reset behavior, backing score retention and stopped completion, and both parking drills' focus safety.
- After refining target feedback, the three affected drill scenarios passed again, including overshoot recovery, two cone penalties retained in an 80/100 final result, and clean reset.
- One intermediate browser run missed the first key press during startup. The test now waits for the drill's first rendered frame instead of relying solely on the harness's fixed delay; the final three-scenario run passed.
- Final JavaScript syntax, source/mirror byte parity, and targeted Git whitespace checks passed.

Browser tests use actual keyboard events for driving, braking, and resets. Selected car positions are seeded through test-only hooks to reach contact and finish conditions without waiting through the entire backing distance.
