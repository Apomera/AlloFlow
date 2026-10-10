# ATC flight motion and paused investigation

Implemented October 5–6, 2026. All changes remain uncommitted.

Aircraft now leave a trail of positions they actually flew. Selecting an aircraft shows a projection that follows its active guidance, gradual turns, speed changes, altitude changes, approach, hold, and go-around. Learners can compare an unsent heading or speed draft with that active path at 10, 30, 60, or 120 flight seconds. A scaled, north-up detail makes the short paths visible within the much larger radar airspace; numeric cards repeat the projected heading, altitude, speed, and distance flown.

The new **Step 10 flight seconds** control advances the complete traffic loop while paused: all aircraft, fuel, runway timers, spawn timers, separation checks, and exercise outcomes. Traffic remains paused afterward. Help, command entry, math, completed exercises, hidden documents, and ended shifts block stepping. Each request belongs to its current game and is discarded when the view ends or becomes hidden.

## Simulation and recovery changes

- Replaced fabricated heading-relative afterglow with actual positions sampled every five flight seconds. Each aircraft retains at most 25 samples from the last two flight minutes.
- Stored the bounded trail and its flight clock in active-shift checkpoints. Legacy saves start without invented history. Invalid, unordered, future, and unsupported old samples are discarded; a stale recovery starts a new trail at its known current position/time.
- Used the existing aircraft integrator on isolated forecast copies. Previewing, changing the horizon, hiding paths, and cancelling drafts do not alter traffic, instructions, runway data, scores, or XP. Heading drafts show their actual approach/hold cancellation behavior; speed drafts retain guidance.
- Stopped live integration at fuel exhaustion, using the same numerical tolerance as the projection. Zero-fuel aircraft stay at their current position. Threshold capture retains priority when reached on the same integration step.
- Matched forecasts and live integration at the first airspace exit, including a turn that would otherwise leave and return during one step. Already-exited aircraft remain at their exit position until the traffic loop handles departure.
- Reset the live frame clock on tab visibility changes, preventing hidden time from becoming a sudden flight jump on return. The playing effect removes its listener during cleanup.
- Placed flight controls and the motion inspector in an independent desktop column. Current-path diagrams and metrics sit together; draft comparison expands to use the panel width. Mobile order keeps the inspector next to command entry. The existing desktop height check passes at 2,342px, with 44px controls retained.
- Added 24 English strings and synchronized the canonical ATC file, desktop bundle, and development catalog. No dependencies were added.

The 120× teaching clock and existing turn/climb/speed rates remain in use. Ten flight seconds correspond to 1/12 of a shift-clock second. A projection follows one aircraft and stops at the threshold, airspace boundary, fuel exhaustion, or selected horizon. It does not resolve other traffic or runway occupancy, and a threshold endpoint does not promise a landing. Wind remains the existing briefing cue. The separate spacing watch retains its existing constant-heading estimate.

## Evidence

Final production SHA-256: `b1db98e0502ca2e561572f8d8b111d56d89fda712aec4a321f68cb84117a7fec`.

| Check | Result |
| --- | --- |
| ATC unit tests | 320 passed across 24 files |
| New simulation browser checks | 16 passed |
| Existing practice browser checks | 17 passed |
| Existing visual browser checks | 22 passed |
| Syntax, tool mirror, and ATC English catalog/namespace parity | Passed; 655 English keys |
| Scoped Git whitespace check | Passed |

Unit regressions cover fuel exhaustion, restored history, and termination at the first airspace exit. The focused browser checks cover projection/live equality, whole-roster stepping, hidden-tab clock recovery, a complete landing through 137 paused steps, modal and shift lifecycle guards, trail recovery, bounded live history, keyboard use, canvas fallback, reduced motion, high contrast, forced colors at 200% zoom, 44px controls, viewport fit, and serious/critical axe findings. Desktop, 390px, and 320px screenshots were visually reviewed. These are installed-Chrome viewport checks; physical mobile devices and student learning outcomes were not evaluated.

Evidence lives in [the final validation folder](validation/20261007T015154371Z/). Its source remains frozen during checks. Earlier failed and partial runs are retained separately and superseded by this completed validation. The final run passes all 55 browser checks with no page errors.

| Visual | Preview |
| --- | --- |
| Desktop active/draft comparison | [Motion panel](validation/20261007T012638719Z/atc-flight-paths-2026-10-05/after-motion-panel-1440.png) |
| Mobile comparison | [390px](validation/20261007T012638719Z/atc-flight-paths-2026-10-05/after-motion-panel-390.png), [320px](validation/20261007T012638719Z/atc-flight-paths-2026-10-05/after-motion-panel-320.png) |
| Desktop console layout | [Console](validation/20261007T015154371Z/atc-visual-design-2026-10-04/after-desktop-layout-probe.png) |
| Actual turn followed by future guidance | [Recorded turn](validation/20261007T012638719Z/atc-flight-paths-2026-10-05/after-recorded-turn-1440.png) |

Baseline captures and the exact before source are saved alongside this report. Baseline source SHA-256: `dcfec232079bf26f28689883e9a570a57c59eef811da83c9d11d72da9ba7df71`.

## Reproduction

Run `node reports/atc-flight-paths-2026-10-05/run-validation.cjs` from the repository root. The runner creates a fresh evidence folder and checks source identity around sequential unit and browser suites. The focused test file is `tests/atctower_flight_paths.test.js`; it adds 35 tests and is included in the standard ATC runner.

The final unit run used `ATC_TEST_POOL=forks` after Windows thread workers twice timed out before importing any tests. The optional environment setting changes only Vitest worker mode; the same 320 tests run with one worker. The failed startup logs remain in the evidence folders.
