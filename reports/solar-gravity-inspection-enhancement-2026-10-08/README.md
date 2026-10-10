# Solar System: Gravity Drop inspection — October 8, 2026

The Gravity Drop lab now makes acceleration easier to compare and repeat. All changes remain uncommitted.

## Changes

- Added a distance-versus-time chart using the existing vacuum model. Earth and the selected world share both axes; solid/dashed curves remain distinguishable without color. Curves include exact arrival points and stop rising at the drop endpoint.
- Connected the chart cursor and circular markers to the existing keyboard-accessible slider and checkpoints. The shafts, chart and exact distance readings show the same instant. Results remain hidden until a prediction is chosen and the model runs.
- Added **Try another prediction**, which returns focus to the prediction choices and preserves mass, height, journal entries and other learning work.
- Fixed reduced-motion setup: balls stay at the release point before Run. Replaying a saved inspection clears its current saved status so the new observation can be saved.
- Raised lab text to at least 13px and controls to at least 44px. Force labels wrap, endpoint labels sit below the shafts, and shared release-height text stays clear of the balls. Chart markers stay circular and axis labels align at every tested width.
- Reused the reviewed gravity map in the legacy properties comparison, removing a conflicting Jupiter value.
- Kept the canonical script and desktop public copy identical.

## Verification

[verification-summary.json](verification-summary.json) records the final source fingerprint and authoritative result. The finalizer checks that unit and browser evidence matches the final source, confirms the mirror, and runs syntax and scoped whitespace checks before writing this summary.

- **33 focused unit tests:** nine new production-callback and chart-geometry tests, five existing gravity-model checks, and nineteen comparison navigation regressions. See [unit-results.json](unit-results.json).
- **Four Chromium cases:** 1060px dark Mars, 1060px light Jupiter, 320px dark Pluto and 320px light Jupiter. Each checks keyboard inspection, capped distances, replay/save behavior, retry focus and preservation, reduced-motion setup, typography, control sizes, chart marker/tick geometry, overflow and page errors. See [visual-results.json](visual-results.json).
- Screenshots were visually inspected. The first capture exposed stretched markers and a crowded release label; both were corrected and all four cases rerun.
- This is focused verification of the changed behavior, not a full repository test run. The combined unit attempt ran out of memory after 26 passing cases; its log is retained as `unit-log.txt`. Final unit results aggregate three separate runs, each using one worker with a smaller heap. Browser runs use one browser at a time.

## Previews

- [Light desktop chart](gravity-1060-light-Jupiter-chart.png)
- [Dark phone chart](gravity-320-dark-Pluto-chart.png)
- [Light phone setup](gravity-320-light-Jupiter-setup.png)
- [Light phone inspector](gravity-320-light-Jupiter-inspection.png)

## Reproduction

Run sequentially from the repository root, using the project's Node runtime and existing Playwright Chromium installation:

```text
node --max-old-space-size=64 reports/solar-gravity-inspection-enhancement-2026-10-08/run-checks.cjs visual
node --max-old-space-size=64 reports/solar-gravity-inspection-enhancement-2026-10-08/run-checks.cjs unit-chart
node --max-old-space-size=64 reports/solar-gravity-inspection-enhancement-2026-10-08/run-checks.cjs unit-model
node --max-old-space-size=64 reports/solar-gravity-inspection-enhancement-2026-10-08/run-checks.cjs unit-comparison
node --max-old-space-size=64 reports/solar-gravity-inspection-enhancement-2026-10-08/finalize-report.cjs
```
