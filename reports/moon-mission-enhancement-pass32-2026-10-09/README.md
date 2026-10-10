# Moon Mission — pass 32

October 9, 2026. Changes remain uncommitted.

## Improvements

- Landing results wrap at readable sizes (minimum 12 CSS pixels), with a clear status accent and separate touchdown, fuel, score and next-action rows.
- Actual earned points appear below the landed craft in the space freed by flight controls. Saved scores remain authoritative; legacy percentage fuel and missing values retain their correct labels.
- Completed 3D views fit the actual lander and ground marker between the measured result card and any earned-point strip. Chase, landing and overhead cameras keep the hardware visible on phones. Live-flight and recorded-review framing retain their previous bounds.
- Hard-landing text explicitly states the strict vertical and lateral limits. Retry, EVA, rewards, recording and physics retain their existing behavior.

## Verification

Four focused Chromium workflows passed through the direct Playwright API, using the real browser harness and expect matchers. These are API workflow results, not Playwright CLI worker results.

| Final attempt | Saved states | Screenshots | Coverage |
| --- | ---: | ---: | --- |
| `direct-outcome2d-3` | 9 | 7 | Phone/desktop success and impact, legacy fuel, missing records, scrubber, Return to touchdown, Retry → Begin |
| `direct-outcome3d-2` | 6 | 6 | Actual 3D geometry clear of card and viewport edges, phone/desktop, three camera modes |
| `direct-outcomelive-1` | 1 | 1 | Genuine 300 m practice descent through throttle controls, contact, score parts, receipt, history and XP |
| `direct-native-1` | 6 | 5 | Active paused flight, phone/desktop resize, camera changes, actual WebGL context loss |

All 22 states and 19 screenshots were retained. Text measurements check 12px minimum, horizontal bounds and intersections. Native measurements project 2,925 visible hardware vertices and 64 ground-ring vertices through the camera that actually rendered the scene. Screenshot review covered result composition, camera views, replay and retry.

The integrated flight used normal simulation time and the visible throttle control. Contact occurred at 29.366 s, 2.665 m/s down and 4 m/s sideways, with 76.738 s of hover reserve. The independently checked score was 60/C (10 + 0 + 30 + 20); the saved receipt correctly rounds reserve to 77 s. One history entry was created, with XP unchanged at 42.

`tests/moonmission_landing_restore.test.js`: all 7 tests passed with Vitest's thread pool. The initial fork-pool attempt could not start its worker; that failure is retained in `unit.log`, and the successful run is in `unitthreads.log`.

### Preserved work

Canonical and desktop/public runtime copies are identical: SHA-256 `af1691011a2c4b8bbbf035d36ac658d570e1cc57c41b6e6e9594170f988043e1` (1,422,957 bytes). Ten scoped replacements reverse byte-for-byte to accepted pass 31. All 125 prior test files and the scoped Git index remain unchanged. Both JavaScript syntax checks and scoped `git diff --check` passed. The new focused spec is `tests/e2e/moon-mission-descent-outcome.spec.ts`.

No staging, commit, push, deployment or full build was performed.

## Iteration and limits

Initial result checks passed, but screenshot review found that the larger result card covered the 3D craft. The final camera change reserves the measured card bounds; the final native workflow verifies real projected geometry.

The second 2D attempt completed all workflow assertions and screenshots, then disk-full errors prevented the final cleanup log from being saved. Its process subsequently exited, confirmed in `cleanup-recovery.json`. A verified private source duplicate was removed to recover space; the third 2D attempt passed and completed cleanup. The interrupted evidence is retained.

Arbitrarily long grades in imported saves can still exceed available vertical card space. Normal generated grades (A+ through D), normal saved results and missing grades are covered. No broad-suite, audio, performance or physical-model improvement is claimed for this visual/readability pass.

## Evidence

- `results.json`: accepted workflow counts and browser versions.
- `verification.json`: source equality, reversibility, prior-test hashes, syntax, diff and index checks.
- `runtime.diff` and `integration.json`: this pass's scoped source edits.
- Each final attempt retains its verified spec, process log, direct result, metrics and PNGs.
- `direct-outcomelive-1/live/flight-control-trace.json`: actual flight and control trace.

To rerun one workflow from the repository, set `PLAYWRIGHT_BROWSERS_PATH` to the installed browser cache and `MM_DESCENT_HUD_REPORT_DIR` to a fresh output directory, then run `node --max-old-space-size=512 reports/moon-mission-enhancement-pass32-2026-10-09/run-workflow.cjs outcome2d` (or `outcome3d`, `outcomelive`, `native`). Run one browser workflow at a time.
