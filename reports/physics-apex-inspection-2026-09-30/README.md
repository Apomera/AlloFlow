# Exact apex inspection and motion clarity

The simulator now records the integrator's resolved apex, so learners can inspect the moment with zero vertical velocity. This includes flights that finish within one 0.035 s step. The inspector connects launch, apex, and ground impact with their original times, and places vertical velocity beside vertical acceleration.

## Changes

- Added a canonical apex observation without advancing the projectile or changing its physics model. Near a tick boundary, sampling coalesces the almost identical regular endpoint within event-solver precision; it always retains the actual impact.
- Added timed landmark cards, rising/falling/apex/impact labels, and a compact polite status announcement. Keyboard navigation retains focus and the status DOM node.
- Raised the inspector's range control and force disclosure to 44 px minimum height. Existing theme colors and responsive measurement cards remain consistent.
- Preserved small nonzero readings in inspector, table, selected summary, and canvas. A 5° launch at 5 m/s under 25 m/s² gravity now displays its 0.00380 m apex.
- Exported flight sample CSV numbers at full JavaScript numeric precision. Column names remain the same; apex rows increase the sample count. Existing experiment-log summaries keep their established formatting.
- Older trails without an apex observation keep their highest recorded point. Inspection does not manufacture a sample or alter recorded settings, outcome records, or CSV.
- Added eight English physics strings to both catalogs and the new browser suite to the physics CI workflow.

## Verification

**252 unit tests across 16 files passed** on the final source. Coverage includes real tick-boundary event resolution, short and long vacuum/drag flights, horizontal releases, invalid evidence, captured settings, learning contracts, and CSV exports.

**36 distinct browser cases are verified** across apex inspection, sample selection, energy visuals, flight history, flight integrity, and clarity. The broad run passed 35 cases; an existing near-apex check assumed a nonzero velocity at the highest sampled point. It now checks the exact apex and the neighboring falling observation and passed a focused rerun. The short-flight case also passed a focused rerun with stronger tiny-height checks for canvas, table, summary, and parsed CSV. Initial fixture failures from leaving playback running and an absent text-capture hook were corrected. The complete final five-case apex suite passed after those fixture corrections. No current failing checks remain.

The reproducible visual audit captured **15 screenshots**: nine final width/theme layouts, two previous normal layouts, and four short-flight comparisons. It checks synchronized canvas, graph, table and energy cursors, stable keyboard status, immutable captured evidence, text size, contrast and touch targets.

| Final theme | Minimum text contrast | Minimum text size | Minimum control height |
| --- | ---: | ---: | ---: |
| Default | 5.20:1 | 12 px | 44 px |
| Dark | 6.37:1 | 12 px | 44 px |
| High contrast | 15.30:1 | 12 px | 44 px |

All 1100, 375, and 320 px layouts have zero horizontal overflow and no page errors. Desktop, dark phone, high-contrast phone, and short-flight screenshots were also inspected visually.

Four comparisons against commit a0ec3e9e4b666a2f3ca98800e9a5155a8019354b confirm identical projectile bodies, run logs, final outcomes, metadata, and existing regular samples for the normal vacuum/drag and short-flight fixtures. Only the canonical apex observation is added. In the short fixture, the previous highest-point selection was the launch at y=0; the new selection is t=0.017431148549531345 s, y=0.003798061746947984 m, vy=0.

The numeric CSV values are simulator output; additional serialized digits preserve the recorded numbers and do not imply greater physical accuracy. This remains an idealized projectile model with optional quadratic drag.

## Reproduce

Run from the repository root with installed local dependencies:

~~~powershell
npx vitest run tests/physics_ --maxWorkers=1
npx playwright test tests/e2e/physics-apex-inspection.spec.ts tests/e2e/physics-sample-inspection.spec.ts tests/e2e/physics-energy-visuals.spec.ts tests/e2e/physics-flight-history.spec.ts tests/e2e/physics-flight-integrity.spec.ts tests/e2e/physics-clarity.spec.ts --workers=1 --retries=0
node reports/physics-apex-inspection-2026-09-30/verify-apex.cjs
~~~

The browser fixtures use local React and deterministic animation frames. The audit retrieves its baseline from Git and captures the current source before running; source snapshots and SHA-256 values are saved beside the results. The final source hash is bebc15bbf88758cf07077b989c11b352314f02fccf2bb0d318ad93fc91e4d4ad.

## Screenshots and measured results

- [Desktop inspector](inspector-final-default-1100.png)
- [Dark phone inspector](inspector-final-dark-320.png)
- [High-contrast phone inspector](inspector-final-contrast-320.png)
- [Short-flight previous inspector](short-flight-baseline-default-320.png)
- [Short-flight final inspector](short-flight-final-default-320.png)
- [Measured audit results](apex-results.json)
