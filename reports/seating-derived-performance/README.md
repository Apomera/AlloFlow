# Seating Chart derived-data performance

Date: 2026-09-19. Local source changes; no deployment.

Seating Chart now memoizes constraint anchor gaps, sorted seats/seat numbers, furniture overlaps, and live pod groups. These depend on room geometry, assignments, constraints, and mode, rather than changing student XP, live signal snapshots, or the currently selected seat. Layout/roster replacements still invalidate the relevant cached results. Public helper APIs and their behavior are unchanged.

## Browser comparison

The fixture uses the actual generated module with production React, synthetic 30-seat and 60-seat rooms, 100 live-prop updates, and 100 seat-selection click events. Helper-entry counters are injected only into the test copy of each generated module.

| Repeated work | Before | After |
| --- | ---: | ---: |
| Pod grouping during 100 live updates | 100 | 0 |
| Anchor checks during 100 live updates | 100 | 0 |
| Furniture-overlap checks during 100 selections | 100 | 0 |
| Anchor checks during 100 selections | 100 | 0 |

Both room sizes produced the same results. This counts avoided computations; it does not measure whole-app latency or Core Web Vitals. No live classroom or AI provider was contacted.

The fixture also verifies live XP updates, seat renumbering after geometry changes, removal of stale overlap warnings, refreshed pod recognition recipients after reassignment, and the empty-layout state. Display text and accessible map labels match the baseline throughout. Geometry/roster changes still invoke the relevant helpers; both versions recognize the newly assigned students in the same order. No page errors occurred.

## Validation

All 34 selected tests passed across seating behavior, map accessibility, and Behavior Lens bridge suites; detailed results are recorded in `tests.json`. The module compiles, passes syntax/whitespace checks, and matches its public and existing app-build mirrors. The root CDN version was refreshed; desktop local module URLs remain intact.

The initial fixture attempted HTML's `.click()` method on SVG groups. It was corrected to dispatch bubbling click events and to respect normalized room bounds. The corrected full browser run passed.

Run `node dev-tools/seating_derived_performance.cjs` to reproduce. The script pins baseline `7e6befa89b51b104862bd1534d7378592d59fa14`; use `SEATING_BASELINE_REF` to compare another baseline. Detailed results are in `browser.json` and `tests.json`.

The local branch also includes the preceding isolated autosave and translation-cache performance changes and their supporting tests/reports, so those changes remain available together without altering the shared checkout's HEAD or index.
