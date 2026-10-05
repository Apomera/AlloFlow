# Solar System: Kepler Inquiry enhancement

Verified October 3, 2026. Changes remain uncommitted.

Kepler Inquiry now supports a controlled comparison: choose the setting to investigate, save a frozen baseline, change the model, and compare the resulting measurements. Changing a held setting shows a clear warning. Restore held settings changes only those two settings and keeps the trial setting, writing, saved observations, baseline, and other Solar System work.

## What changed

- Rebuilt the Inquiry panel with readable light/dark surfaces, a diagram and measurement workspace, six current readings, a semantic Baseline/Current table, labelled native controls, and a phone layout.
- Corrected closest/farthest endpoints relative to the occupied focus. Circular orbits, labels, and the major-axis ruler fit inside the drawing.
- Drew baseline and current curves at a common linear distance scale around the same star focus. Solid/dashed keys distinguish the curves. An explicit notice explains when a much smaller curve can be hidden by the enlarged star marker.
- Corrected the old parabolic/hyperbolic classification for high but sub-unit eccentricities. Every selectable orbit is a bound ellipse (including the circular case). The model note distinguishes separate ideal orbits with different masses from a sudden mass-loss simulation.
- Preserved hypothesis, explanation, legacy observation entries, and ungraded exploration. New observations retain frozen input settings, the selected variable, and whether held settings changed. Short periods use five decimal places below 0.1 year so mass effects remain visible.
- Rendered partial/invalid saved inputs safely without silently rewriting saved work. Invalid legacy numeric readings display as unavailable while stored records remain intact.

The scientific corrections were checked against [NASA's description of Kepler's laws](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/) and [JPL's eccentricity definition](https://ssd.jpl.nasa.gov/glossary/eccentricity.html). The central mass model assumes an orbiting object of negligible mass.

## Verification

- **47 unit checks passed** across Inquiry (12), control names (21), SVG names (4), mobile visual clarity (4), and theme color safety (6). Inquiry tests execute real production callbacks and verify independent numerical relationships, geometry, restoration, logging, retained work, and malformed saved records.
- **5 focused Chromium cases passed**: saved baseline and restoration; size/mass comparisons; circle and high-e geometry; and keyboard/readability/containment in both 320px themes.
- **2 existing responsive Chromium cases passed**: all nine teaching tabs fit at 320px, and the main Orrery remains free of horizontal overflow at 320px and 736px. This brings the browser total for this pass to **7 cases**.
- **5 visual layouts passed**: 1060px dark/light, 736px dark, and 320px light/dark. Each captured a circular reference and a highly elongated current orbit. No horizontal overflow or runtime errors; active button/select/range heights are at least 44px; table text and SVG labels fit.
- Minimum sampled active HTML text contrast: **10.84:1 dark / 6.98:1 light**. Disabled controls were excluded from contrast sampling. Phone browser checks additionally require at least 12px active HTML text.
- Syntax, final source/mirror parity, and scoped whitespace checks are recorded in `final-checks.log`.

The SVG-name regression check now checks every declaration for a name instead of asserting an obsolete fixed SVG count. Its Inquiry fixture uses the actual `orr_tab: 8` route. Chromium geometry comparisons account for the browser's single-precision SVG `baseVal` coordinates; the unit geometry checks retain stricter precision.

## Previews and results

| Layout | Before | After |
| --- | --- | --- |
| Desktop dark, circular | [Before](before-1060-dark-circle.png) | [After](after-1060-dark-circle.png) |
| Desktop dark, elongated | [Before](before-1060-dark-elongated.png) | [After](after-1060-dark-elongated.png) |
| Phone light, circular | [Before](before-320-light-circle.png) | [After](after-320-light-circle.png) |
| Phone light, elongated | [Before](before-320-light-elongated.png) | [After](after-320-light-elongated.png) |

The old Inquiry panel used its dark palette even in the light theme. The new panel follows the actual host theme; the current visual helper explicitly sets both the tool theme and host context.

- [Unit results](unit-results.json) / [unit log](unit-checks.log)
- [Focused browser log](browser-checks.log)
- [Visual metrics](after-metrics.json) / [visual log](after-visual.log)
- [Responsive regression log](regression-browser-checks.log)

Run checks serially:

```powershell
node node_modules/vitest/vitest.mjs run tests/solar_system_kepler_inquiry.test.js tests/solar_system_control_names_a11y.test.js tests/solar_system_svg_names_a11y.test.js tests/solar_system_mobile_visual_clarity.test.js tests/solar_system_themed_color_safety.test.js --pool=threads --maxWorkers=1 --no-file-parallelism --testTimeout=60000 --hookTimeout=60000
node node_modules/playwright/cli.js test tests/e2e/104-solar-system-kepler-inquiry.spec.ts --project=chromium --config=reports/solar-kepler-inquiry-enhancement-2026-10-03/playwright.config.ts
node node_modules/playwright/cli.js test tests/e2e/20-solar-system-orrery-responsive.spec.ts --grep 'keeps every Orrery teaching tab within 320px|keeps the Orrery free of horizontal overflow at 320px and 736px' --project=chromium --config=reports/solar-kepler-inquiry-enhancement-2026-10-03/playwright.config.ts
node reports/solar-kepler-inquiry-enhancement-2026-10-03/visual-qa.cjs
```
