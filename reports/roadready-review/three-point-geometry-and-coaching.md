# Three-point geometry, contact recovery, and coaching

Reviewed 2026-09-19. Local changes only; no commit or deployment performed.

## Improvements

- The starting car now sits wholly in the right-hand lane. The turning model uses the car's body center, a 42-unit wheelbase, and a 0.4-radian steering limit so the guided forward–reverse–forward path is feasible within the training road.
- Curb and road-edge checks use the complete rotated 60-by-28 car body and the visible curb's inner edges. A contact stops the car at its last clear pose rather than bouncing it or allowing body overlap.
- Continued pressure toward a contacted edge cannot creep the car inward or repeatedly deduct points. Moving clear allows recovery and a later, separate contact to count normally.
- Live coaching gives approach, braking, gear/direction, recovery, and finishing cues. Each phase requires travel in its intended direction and a stop. Completion requires straightened wheels and the entire stopped car in the opposite lane, facing left.
- Scores use current state throughout contact processing and completion, and reset clears the score, contacts, phase, and phase distance.
- The instructions describe this training exercise instead of asserting an exact real-world examination requirement.

## Validation

- 115 unit/render tests passed across the maneuver geometry, existing stopping and controls behavior, and view smoke coverage. The five maneuver tests were rerun successfully after tightening the contact hold.
- A deterministic simulation followed the live coach through all three phases with no contact, reaching a stopped finish in the upper lane in about 60 simulated seconds.
- Eight distinct Chromium scenarios passed across the run and targeted rerun: braking/reset regressions, controller/settings/pause behavior, touch controls, curb contact/recovery/scoring, and the phone layout. The contact scenario verified one penalty while holding the accelerator, reverse recovery, rejection of a lower-lane finish, retained 85/100 completion, and reset.
- The first contact browser check caught a small inward creep after impact. The contact latch now blocks further approach to that edge, and the strict stationary-position assertion passes.
- Reviewed the 320px layout in `threepoint-live-coach-320.png`.
- JavaScript syntax, canonical/desktop mirror byte parity, and targeted Git whitespace checks passed.

The complete clean maneuver was tested in simulation. The browser contact/completion scenario seeds selected poses through test-only hooks and uses real keyboard events to exercise contact and recovery.
