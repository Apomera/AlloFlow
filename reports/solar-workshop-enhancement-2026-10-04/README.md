# Solar System: Orbit Workshop position and energy inspection

Verified October 4, 2026. Changes remain uncommitted.

The Orbit Workshop now connects a manually inspected orbital position to readable distance, speed and energy measurements. Native time controls, responsive diagrams and explicit model explanations make the same investigation usable on phones and desktops.

## Changes

- A native elapsed-time slider and four quarter-period anchors inspect one position without changing the shared Orrery clock. The orbit preview and energy marker update together through static redraw; the Workshop has no playback loop of its own.
- Fourteen semantic measurements expose time, true anomaly, distance, speed, potential and kinetic energy, their sum, total energy, period, apsidal distances and speed limits. Raw numerical metadata retains precision before display rounding. Escape speed is explicitly measured at perihelion.
- The energy chart now runs from 0° to 360° true anomaly, with perihelion at both ends and aphelion at 180°. This fixes the reversed apsidal labels in the old chart. Explanations distinguish angular position from elapsed time: equal angle steps do not generally represent equal time.
- The small-perihelion guard no longer substitutes zero for valid model speeds. The reachable `a = .05 AU, e = .99` case produces finite, positive perihelion and escape speeds.
- An optional reference orbit shares the custom orbit's AU scale and fits the frame, fixing clipped large reference paths. An optional distance band uses the actual .75 and 1.7 AU radii, fixing the incorrectly centered annular fill.
- Distance-band results distinguish wholly within, intersecting and outside paths, and report the fraction of the period spent inside. They replace the misleading binary habitability result. Tangency can mean an intersecting path with zero residence time; circles on either boundary are wholly within.
- Two responsive charts sit side by side on wide layouts and stack on narrower layouts. DOM legends and 13px canvas labels identify the paths and energies. Inset outlines keep content and drawing dimensions equal without changing the shared CanvasPanel helper.
- Finite-number validation derives bounded display values from partial or malformed saves without rewriting the original saved fields.

Only six Workshop fields are changed by its controls: `orr_wsb`, `orr_wse`, `orr_wsa`, `orr_wsphase`, `orr_wscompare` and `orr_wshz`. All twelve existing body choices and five presets remain. Choosing a body retains the old behavior of setting `orr_wsb` and clearing custom `orr_wse`/`orr_wsa`; reset clears only those two custom values. Both retain the inspected phase and comparison toggles. Presets change only custom size and eccentricity. Shared time, selection, camera, snapshots, journal, guided progress, other Kepler lessons and Inquiry writing remain intact. Inspection creates no observation or points award.

## Scientific interpretation

The underlying ellipse, solar focus, equal-area timing and period relationship follow the laws described in [NASA's Gravity & Mechanics chapter](https://science.nasa.gov/learn/basics-of-space-flight/chapter3-3/). The Workshop uses an idealized two-body point-mass Sun model with positive semi-major axis and `0 ≤ e ≤ .99`, so every accepted trajectory is bound. It does not simulate escape trajectories or conditions for habitability; marker sizes are illustrative.

The independent checks solve `M = E − e sin E` by bisection, measure Cartesian distance from the Sun, and verify vis-viva speed. Here `M = 2π × elapsed fraction`. Energy is specific energy divided by `GM☉/AU`: with `a` and `r` expressed numerically in AU, `PE = −1/r`, `KE = 1/r − 1/(2a)` and `PE + KE = −1/(2a)`. The band residence fraction follows orbital time through the radial-time cumulative distribution, rather than the area or drawn length inside the annulus. These energy and band equations are independently checked model calculations, not equations attributed to the NASA page.

## Verification

All 110 unit checks passed across six files:

| Suite | Passed |
| --- | ---: |
| Workshop inspection | 18 |
| Control names | 21 |
| Canvas alternatives | 17 |
| Canvas loop | 31 |
| Theme safety | 6 |
| Visual science | 17 |

The new unit cases verify independent position/speed/energy calculations, high eccentricity, low perihelion, 0%/100% boundaries, circle behavior, quarter-time anchors, size scaling, band residence and boundary contact, malformed restores, every preset/body/reset callback, toggle behavior and unrelated-state preservation. See [unit results](unit-results.json) and [unit log](unit-checks.log).

All seven focused browser cases passed in 39.0 seconds. They cover rendered orbital geometry and energy samples, native inspection, common-scale reference/band geometry, changes on the same mounted charts, retained settings across tab navigation, and readable phone layouts in both themes. See the [focused browser log](browser-checks.log).

All five existing Orrery regression cases passed in 22.9 seconds: page overflow at 320px/736px, all teaching tabs at 320px, named and wrapped Workshop controls, animated Kepler canvas naming/reduced motion, and static-chart tab order/Kepler III keyboard operation. See the [regression browser log](regression-browser-checks.log).

All ten visual scenarios passed:

| Layout | Custom orbit / inspection | Minimum enabled DOM text contrast | Minimum control height |
| --- | --- | ---: | ---: |
| 1060px dark | a = 1, e = .30, 25% time | 10.84:1 | 44px |
| 1060px light | a = 1, e = .30, 25% time | 6.96:1 | 44px |
| 736px dark | a = 1, e = .30, 25% time | 10.84:1 | 44px |
| 320px light | a = 1, e = .30, 25% time | 6.96:1 | 44px |
| 320px dark | a = 1, e = .30, 25% time | 10.84:1 | 44px |
| 1060px light | a = .05, e = .99, perihelion | 6.96:1 | 44px |
| 320px dark | Circular Earth, 25% time | 10.84:1 | 44px |
| 1060px dark | a = 1, e = .30, 50% time; Pluto reference | 10.84:1 | 44px |
| 320px light | Hot Jupiter, perihelion | 6.96:1 | 44px |
| 736px dark | Halley-like, 25% time | 10.84:1 | 44px |

There were no recorded errors or page overflow. Both charts' logical drawing dimensions matched their content dimensions. Geometry checks verified the inspected radius, contained endpoints/reference paths, honest .75/1.7 AU band radii, contained and disjoint tags, and all 257 energy samples: finite values, conserved sum, fitted plot coordinates and correctly placed apses. The `a = 1, e = .30` orbit spends 86.64% of its period inside the band; Halley-like spends approximately .55%. See [visual measurements](after-metrics.json), [visual log](visual-checks.log) and the [visual helper](visual-qa.cjs).

Visual captures use fresh mounts at each width with fixed, paused/reduced-motion states. They do not establish live viewport-resize behavior. Contrast measurements cover enabled, visible DOM text. The radial band is an illustrative distance comparison; the historical “Habitable Mars” preset name does not assess conditions for life.

Canonical/mirror syntax, visual-helper syntax, byte parity and scoped whitespace checks passed. See the [final source-check log](final-checks.log). Canonical/mirror SHA-256: `2C5612841FEC0922AD63B5BF110A10B522F3C6CA4EFD257684B7C0ADBBEFCA09`.

## Previews

- [Before desktop dark](before-1060-dark.png) / [before phone light](before-320-light.png)
- [After desktop dark](after-1060-dark.png) / [desktop light](after-1060-light.png)
- [Tablet dark](after-736-dark.png) / [tablet Halley-like](after-736-dark-halley.png)
- [Phone light](after-320-light.png) / [phone dark](after-320-dark.png)
- [Phone circle](after-320-dark-circle.png) / [phone Hot Jupiter](after-320-light-hot-jupiter.png)
- [Highly eccentric small orbit](after-1060-light-high-e.png) / [large Pluto reference](after-1060-dark-reference.png)

## Reproduction

Run jobs serially from the repository root. The report-local Playwright configuration uses one Chromium worker and no retries. Before captures represent the earlier implementation; the visual helper's default mode checks the current source.

```powershell
node --check stem_lab/stem_tool_solarsystem.js
node --check desktop/web-app/public/stem_lab/stem_tool_solarsystem.js
node --check reports/solar-workshop-enhancement-2026-10-04/visual-qa.cjs

node node_modules/vitest/vitest.mjs run tests/solar_system_workshop_inspection.test.js tests/solar_system_control_names_a11y.test.js tests/solar_system_canvas_alternatives_a11y.test.js tests/solar_system_canvas_loop.test.js tests/solar_system_themed_color_safety.test.js tests/solar_system_visual_science.test.js --pool=threads --maxWorkers=1 --no-file-parallelism --testTimeout=180000 --hookTimeout=60000

node node_modules/playwright/cli.js test tests/e2e/108-solar-system-workshop-inspection.spec.ts --project=chromium --config=reports/solar-workshop-enhancement-2026-10-04/playwright.config.ts

node node_modules/playwright/cli.js test tests/e2e/20-solar-system-orrery-responsive.spec.ts --project=chromium --config=reports/solar-workshop-enhancement-2026-10-04/playwright.config.ts --grep 'keeps the Orrery free of horizontal overflow at 320px and 736px|keeps every Orrery teaching tab within 320px|keeps Orbit Workshop controls named and wrapped at 320px|names the animated Kepler canvases and honors reduced motion|keeps static charts out of tab order and makes Kepler III keyboard-operable'

node reports/solar-workshop-enhancement-2026-10-04/visual-qa.cjs

git diff --check -- stem_lab/stem_tool_solarsystem.js desktop/web-app/public/stem_lab/stem_tool_solarsystem.js
Get-FileHash -Algorithm SHA256 -LiteralPath stem_lab/stem_tool_solarsystem.js, desktop/web-app/public/stem_lab/stem_tool_solarsystem.js
```
