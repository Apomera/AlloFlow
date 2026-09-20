# Three-point and backing input support

Reviewed 2026-09-19. Changes are local; no commit or deployment performed.

## Improvements

- Three-point-turn and straight-backing drills now read the shared Road Ready input runtime, including configured controller bindings, analog steering, selected Drive/Reverse gear, and proportional throttle and braking. Existing keyboard acceleration and full braking remain covered by regressions.
- Both drills offer on-screen hold controls, Pause/Resume, and Controls settings. Driving buttons follow the shared input-mode visibility preferences, and the existing summary Reset button remains available.
- The shared input reader suspends simulation while settings are open. New attempts and resets require neutral inputs. Window/tab interruptions pause practice, and paused drills cannot advance their stage or complete.
- The driving status explains paused/settings/neutral states, selected gear, and rejected moving gear changes. Control hints reflect configured bindings and omit the parking-only Park action in these drills.
- Completion disables the movement controls. Reset clears the existing drill state and returns through the same neutral-input gate.

## Validation

- 129 unit and render tests passed across analog maneuver input, shared drill keys, stopping behavior, parking pause/controller behavior, and view smoke coverage.
- Ten Chromium scenarios passed, including real keyboard events, simulated controller motion and steering in both drills, held-trigger resets, settings suspension, focus interruption, on-screen hold cancellation, paused backing completion, and parking regressions.
- Verified the completed touch-control layout at 320px with no horizontal overflow; screenshot: `maneuver-touch-controls-320.png`.
- JavaScript syntax, canonical/desktop mirror byte parity, and targeted Git whitespace checks passed.

Controller checks use a simulated standard gamepad. Physical controller hardware was not tested. On-screen hold controls were exercised with keyboard activation and pointer events.
