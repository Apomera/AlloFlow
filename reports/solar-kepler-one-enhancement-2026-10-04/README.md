# Solar System: Kepler I focal-proof inspection

Verified October 4, 2026. Changes remain uncommitted.

The Kepler I lesson now lets learners stop at a position, compare distances to both foci, and inspect the constant sum directly. Readable measurements and reference positions replace dependence on the old moving canvas's tiny pixel labels.

## Changes

- Native controls provide eccentricity, elapsed orbit time, local play/pause, an axes-and-center toggle, and perihelion, aphelion and minor-axis vertices. All seven existing eccentricity presets remain available.
- Eight semantic measurements expose time, both focal distances, their sum, semi-minor axis, center-to-focus offset, perihelion and aphelion. Raw numerical values retain precision before display rounding.
- A four-row reference table connects each named position with its actual time and focal distances. It scrolls locally on phones, with opaque pinned position names and keyboard focus.
- Responsive diagram geometry keeps the ellipse's semi-major axis fixed when eccentricity changes within a layout. Focus and endpoint labels sit outside the complete ellipse contour and do not overlap, including the circle, Venus and Earth presets.
- Scientific wording now distinguishes center-to-focus distance `c = ae` from the separation between foci `2c`. Only `e = 0` is circular. In the circle, both foci and the center coincide; the second focus is labeled accordingly rather than depicted as a separate empty location.
- Playback starts paused and respects reduced motion. Paused measurements return after inspection captures the animated position. The canvas remains a named, nonfocusable image, with the existing polite evidence description.
- K1's physical canvas border is replaced by an inset outline so the drawing and content dimensions agree without changing the shared CanvasPanel helper.

Inspection changes only `orr_k1e`, `orr_k1phase`, `orr_k1playing` and `orr_k1axes`. Shared Orrery time, selected/compared worlds, camera, snapshots, journal entries, guided progress, Kepler II/III settings and Inquiry writing are preserved. Derived validation clamps display values without silently rewriting malformed restored saves. Inspection does not award points or create observations.

## Scientific interpretation

The lesson follows the ellipse model with the Sun at one focus and a constant sum of distances to the two foci, described in [NASA's explanation of orbits and Kepler's laws](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/). With distances normalized to semi-major axis `a`, the model uses `b/a = sqrt(1 - e²)`, `c/a = e`, `q/a = 1 - e` and `Q/a = 1 + e`. Cartesian focal distances satisfy `(r₁ + r₂)/a = 2` throughout the orbit. Orbit time is mean anomaly divided by `2π`; the top and bottom minor-axis vertices occur at `(π/2 - e)/(2π)` and `(3π/2 + e)/(2π)`, rather than at quarter periods except in the circle. Marker sizes are illustrative, and near-circular foci retain their true separation.

## Verification

The final unit run passed 108 checks across six files:

| Suite | Passed |
| --- | ---: |
| Kepler I inspection | 16 |
| Canvas alternatives | 17 |
| Canvas loop | 31 |
| Control names | 21 |
| Theme safety | 6 |
| Visual science | 17 |

The new unit cases use an independent bisection solver and Cartesian distances for the focal proof. They cover minor-axis timing, 0%/100% boundaries, all presets, axes, playback modes, reduced motion, malformed saved data and preservation of unrelated work. Legacy fixtures now verify rendered evidence and normalized measurements instead of removed drawing literals. See [unit results](unit-results.json) and [unit log](unit-checks.log).

All seven focused browser cases passed in 19.4 seconds. They check actual rendered geometry, reference values, labels, repeated control changes on the same canvas, live playback continuity, reduced-motion freezing, and both phone themes. The five existing Orrery browser regressions passed in 21.4 seconds. See the [focused browser log](browser-checks.log) and [regression browser log](regression-browser-checks.log).

All ten visual scenarios passed after the fixed-semi-major-axis and inset-outline corrections:

| Layout | Orbit | Minimum enabled DOM text contrast | Minimum control height |
| --- | --- | ---: | ---: |
| 1060px dark | e = .500, 25% time | 10.84:1 | 44px |
| 1060px light | e = .500, 25% time | 6.96:1 | 44px |
| 736px dark | e = .500, 25% time | 10.84:1 | 44px |
| 320px light | e = .500, 25% time | 6.96:1 | 44px |
| 320px dark | e = .500, 25% time | 10.84:1 | 44px |
| 1060px light | e = .980, perihelion | 6.96:1 | 44px |
| 736px dark | Circular reference, 25% time | 10.44:1 | 44px |
| 320px light | Venus e = .007, 25% time | 6.96:1 | 44px |
| 320px dark | Earth e = .017, 25% time | 10.84:1 | 44px |
| 320px dark | Circular reference, 25% time | 10.44:1 | 44px |

Those captures had no errors or page overflow. The canvas's logical drawing width and height matched its content width and height in all ten scenarios, avoiding border-induced distortion. The phone table's 620px content scrolled inside a 270px viewport, with position names pinned at maximum scroll in all five phone scenarios. Geometry checks covered focal distances, point/anchor containment, label containment, disjoint label bounds and labels outside the full ellipse. See [visual measurements](after-metrics.json) and [visual log](visual-checks.log).

Visual captures use paused, reduced-motion states and fresh mounts at each width. They do not establish animation behavior or live viewport-resize behavior. Contrast measurements cover enabled, visible DOM text. Playback validation comes from the browser suite; live viewport resizing is not claimed.

Canonical/mirror syntax, byte parity and scoped whitespace checks passed on the final revision. See the [final source-check log](final-checks.log). Final canonical/mirror SHA-256: `622721A5639688A5A08E8D8ED9AB83605A578EAB07D3C0FC3FA20D868246FF7D`.

## Previews

- [Before desktop dark](before-1060-dark.png) / [before phone light](before-320-light.png)
- [After desktop dark](after-1060-dark.png) / [desktop light](after-1060-light.png)
- [Tablet dark](after-736-dark.png) / [tablet circle](after-736-dark-circle.png)
- [Phone light](after-320-light.png) / [phone dark](after-320-dark.png)
- [Phone Venus](after-320-light-venus.png) / [phone Earth](after-320-dark-earth.png) / [phone circle](after-320-dark-circle.png)
- [Phone table scrolled right, light](after-320-light-table-end.png) / [dark](after-320-dark-table-end.png)
- [Venus table scrolled right](after-320-light-venus-table-end.png) / [Earth table](after-320-dark-earth-table-end.png) / [circle table](after-320-dark-circle-table-end.png)
- [Highly elongated ellipse](after-1060-light-high-e.png)

## Reproduction

Run jobs serially from the repository root. The report-local Playwright configuration uses one Chromium worker and no retries. The before captures were made from the earlier implementation; the visual script's default mode checks the current source.

```powershell
node --check stem_lab/stem_tool_solarsystem.js
node --check desktop/web-app/public/stem_lab/stem_tool_solarsystem.js

node node_modules/vitest/vitest.mjs run tests/solar_system_kepler_one_inspection.test.js tests/solar_system_canvas_alternatives_a11y.test.js tests/solar_system_canvas_loop.test.js tests/solar_system_control_names_a11y.test.js tests/solar_system_themed_color_safety.test.js tests/solar_system_visual_science.test.js --pool=threads --maxWorkers=1 --no-file-parallelism --testTimeout=180000 --hookTimeout=60000

node node_modules/playwright/cli.js test tests/e2e/107-solar-system-kepler-one-inspection.spec.ts --project=chromium --config=reports/solar-kepler-one-enhancement-2026-10-04/playwright.config.ts

node node_modules/playwright/cli.js test tests/e2e/20-solar-system-orrery-responsive.spec.ts --project=chromium --config=reports/solar-kepler-one-enhancement-2026-10-04/playwright.config.ts --grep 'keeps static charts out of tab order and makes Kepler III keyboard-operable|keeps every Orrery teaching tab within 320px|keeps the Orrery free of horizontal overflow at 320px and 736px|names the animated Kepler canvases and honors reduced motion|keeps Kepler evidence readouts synchronized with eccentricity controls'

node reports/solar-kepler-one-enhancement-2026-10-04/visual-qa.cjs
```
