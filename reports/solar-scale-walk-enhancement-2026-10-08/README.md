# Solar System scale-walk enhancement — October 8, 2026

The scale-walk planner now guides learners through placing one world at a time and makes the crowded inner planets easier to inspect. Changes remain uncommitted.

## Changes

- **Stop guide:** select a world or use Previous/Next. A highlighted card shows the total distance from the Sun, the gap from the preceding marker, and the model diameter. The map and full nine-row table highlight the same stop.
- **Inner-planets view:** switch between the full Sun-to-Neptune map and a magnified Sun-to-Mars segment. Both remain linear and display the corresponding meter range. Physical measurements and saved evidence do not change when inspecting another stop or map view.
- Selecting an outer planet restores the whole map. If an outer stop is selected while switching to the inner view, a named button brings it back onto the whole map.
- **Keyboard navigation:** both launcher buttons focus the planner heading after it renders. Close returns focus to the connected launcher. Pending focus is canceled when the planner is hidden.
- **Readability:** scoped 13px minimum text, 44px controls, wrapping phone controls, themed maps, and a wider desktop map column. The narrow-screen map retains contained horizontal scrolling.
- The original one-scale diameter/distance calculation and immutable saved-journal observations are preserved. Gaps are explicitly described as straight-line placement distances, not current separations between planets.
- The canonical script and desktop public copy are identical.

## Verification

The authoritative final result and source fingerprint are in [verification-summary.json](verification-summary.json). The finalizer writes that file only after checking that all evidence matches the final source, the desktop mirror matches, and syntax and scoped whitespace checks pass.

- **19 focused unit tests:** ten production-callback scale-walk cases and nine gravity-lab regressions. Coverage includes exact map geometry and gaps, navigation boundaries, malformed saved selections, shared scaling, and journal preservation. See [unit-results.json](unit-results.json).
- **Four native Chromium cases:** desktop and 320px phone layouts in light and dark themes, including both launchers, keyboard stop navigation, whole/inner views, off-map recovery, save behavior, type/control sizes and overflow. See [visual-results.json](visual-results.json).
- The stop cards, maps and phone table were visually inspected. Screenshot review led to a wider desktop map column so the final marker fits without scrolling at the tested desktop width.
- This is focused verification of the changed behavior, not a full repository test run. Unit suites and browser checks run sequentially with one worker/browser to limit memory use.

## Previews

- [Dark desktop stop guide](walk-1060-dark-100m-stop.png)
- [Dark desktop inner map](walk-1060-dark-100m-inner-map.png)
- [Light phone stop guide](walk-320-light-100m-stop.png)
- [Light phone placement table](walk-320-light-100m-table.png)

## Reproduction

Run sequentially from the repository root with the project's Node runtime and installed Playwright Chromium:

```text
node --max-old-space-size=64 reports/solar-scale-walk-enhancement-2026-10-08/run-checks.cjs visual
node --max-old-space-size=64 reports/solar-scale-walk-enhancement-2026-10-08/run-checks.cjs unit-walk
node --max-old-space-size=64 reports/solar-scale-walk-enhancement-2026-10-08/run-checks.cjs unit-gravity
node --max-old-space-size=64 reports/solar-scale-walk-enhancement-2026-10-08/finalize-report.cjs
```
