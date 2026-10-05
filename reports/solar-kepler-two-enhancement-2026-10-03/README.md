# Solar System: Kepler II inspection enhancement

Completed and verified October 3, 2026. Changes remain uncommitted.

The Kepler II lesson now connects equal-time sectors, an inspected orbit position, numerical measurements, and correctly labeled graphs. Students can compare intervals directly and inspect the orbit without relying on animation.

## Changes

- Native controls provide an orbit-time scrubber, interval picker, previous/next intervals, perihelion and aphelion anchors, and a circular reference. The selected interval has an outlined sector, a matching table row, and a polite status summary.
- Eight measurements show elapsed time, distance, total speed, transverse speed, specific angular momentum, interval angle, swept area, and duration. Calculations retain full precision before display rounding.
- The speed and conservation graphs use elapsed time consistently: perihelion occurs at 0% and 100%, and aphelion at 50%. Their vertical scale contains the full speed range, including eccentricity 0.95.
- Responsive canvas geometry keeps labels at an actual 13px logical size. Light and dark surfaces, clear legends, readable measurements, and controls at least 44px high improve desktop and phone inspection.
- The semantic interval table scrolls within a focusable region on phones. Opaque pinned interval headers preserve row identity when the remaining measurements scroll horizontally.
- Local playback starts paused, resumes from the inspected position, and respects reduced motion. Measurements return when playback is paused. Inspection updates only the four Kepler II settings; shared time, camera, evidence, and Inquiry writing are preserved.
- Shared canvas cleanup now clears a canceled animation-frame handle. This allows control changes and resumed playback to repaint the existing canvases reliably.

## Scientific interpretation

The model solves Kepler's equation using elapsed time, rather than treating orbit angle as time. Equal-time sectors have equal mean-anomaly increments and normalized area `pi * sqrt(1 - e^2) / n`. Their true angles and midpoint speeds differ for eccentric orbits.

The readings distinguish total speed from its transverse component. With semi-major axis `a` and circular reference speed `v0 = sqrt(GM/a)`, normalized distance times normalized transverse speed equals the constant specific angular momentum: `(r/a) * (v_perp/v0) = h/(a*v0) = sqrt(1 - e^2)`.

The lesson explains that equal area applies within one orbit; changing eccentricity changes the total ellipse area. A circular orbit has no distinct closest or farthest position, so its 0% and 50% anchors are described as reference positions. The arrow indicates direction only, and Sun/planet marker sizes are illustrative. The interpretation follows [NASA's explanation of Kepler's laws](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/) and [orbital motion](https://science.nasa.gov/learn/basics-of-space-flight/chapter3-3/).

## Verification

All 87 focused unit checks passed across the new Kepler II inspection suite and the control-name, canvas-alternative, canvas-loop, and theme-safety suites. See [unit results](unit-final-results.json) and [unit log](unit-final-checks.log).

All 17 final Chromium checks passed in serial runs: seven Kepler II cases and ten existing Kepler III/Orrery regressions. They cover independent orbital math, polygon area, high-eccentricity curve containment, actual canvas text sizes, repeated phase/shape/sector changes on the same mounted canvases, playback continuity, reduced-motion freezing, preserved saved work, native keyboard controls, and both phone themes. See [Kepler II results](browser-final-checks.log) and [neighboring lesson results](regression-browser-checks.log).

The browser fixtures explicitly put canvases in the viewport before polling their geometry. Batched failure collections validate every sampled point and font requirement without creating thousands of individual assertion steps. Playback is exercised with a controlled browser clock; a separate [real-clock diagnostic](playback-diagnostic.log) also confirms advancing phases after the redraw fix. Earlier diagnostic logs retain the initial failures and test setup issues.

Seven final visual scenarios passed automated checks and were inspected visually:

| Layout | Orbit | Minimum measured HTML text contrast | Minimum control height | Page overflow |
| --- | --- | ---: | ---: | --- |
| 1060px dark | e = 0.60, 25% time | 10.44:1 | 44px | None |
| 1060px light | e = 0.60, 25% time | 6.96:1 | 44px | None |
| 736px dark | e = 0.60, 25% time | 10.44:1 | 44px | None |
| 320px light | e = 0.60, 25% time | 6.96:1 | 44px | None |
| 320px dark | e = 0.60, 25% time | 10.44:1 | 44px | None |
| 1060px light | e = 0.95, perihelion | 6.96:1 | 44px | None |
| 736px dark | Circular reference, 25% time | 10.44:1 | 44px | None |

Both phone themes retain every interval name at maximum table scroll. The table's 660px content scrolls within a 270px local viewport. All sampled sector vertices and graph curves stay inside their frames. Visual captures use paused states and fresh mounts at each width; animation is verified separately, and live viewport resizing is not covered. Contrast measurements cover enabled, visible HTML text. See [visual measurements](after-metrics.json) and [visual log](visual-checks.log).

Both JavaScript syntax checks, scoped tracked-file whitespace checks, new-file whitespace checks, and source/mirror byte parity passed. Canonical and desktop files share SHA-256 `D363FE0137BED13BEF3A0051F45783952F4FB415030AED8CC7AB962A7920E498`. See [source verification](final-checks.log).

## Previews

- [Desktop dark](after-1060-dark.png) / [desktop light](after-1060-light.png)
- [Tablet dark](after-736-dark.png)
- [Phone light](after-320-light.png) / [phone dark](after-320-dark.png)
- [Phone light table scrolled right](after-320-light-table-end.png) / [phone dark table scrolled right](after-320-dark-table-end.png)
- [Highly elongated orbit](after-1060-light-high-e.png) / [circular reference](after-736-dark-circle.png)
- [Before desktop](before-1060-dark.png) / [before phone](before-320-light.png)

## Reproduction

Run verification jobs serially from the repository root. The report-local Playwright configuration uses one Chromium worker and retains the repository's base configuration.

```powershell
node node_modules/vitest/vitest.mjs run tests/solar_system_kepler_two_inspection.test.js tests/solar_system_control_names_a11y.test.js tests/solar_system_canvas_alternatives_a11y.test.js tests/solar_system_canvas_loop.test.js tests/solar_system_themed_color_safety.test.js --pool=threads --maxWorkers=1 --no-file-parallelism --testTimeout=180000 --hookTimeout=60000

node node_modules/playwright/cli.js test tests/e2e/106-solar-system-kepler-two-inspection.spec.ts --project=chromium --config=reports/solar-kepler-two-enhancement-2026-10-03/playwright.config.ts

node node_modules/playwright/cli.js test tests/e2e/105-solar-system-kepler-three-inspection.spec.ts tests/e2e/20-solar-system-orrery-responsive.spec.ts --project=chromium --config=reports/solar-kepler-two-enhancement-2026-10-03/playwright.config.ts --grep 'native world selection and semantic table inspection|the responsive log plot uses the same world positions|inspecting and clearing worlds preserves|320px (light|dark) inspection has readable|keeps static charts out of tab order and makes Kepler III keyboard-operable|keeps every Orrery teaching tab within 320px|keeps the Orrery free of horizontal overflow at 320px and 736px|names the animated Kepler canvases and honors reduced motion|keeps Kepler evidence readouts synchronized with eccentricity controls'

node reports/solar-kepler-two-enhancement-2026-10-03/visual-qa.cjs
```
