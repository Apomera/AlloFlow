# Solar System: Kepler III inspection enhancement

Completed and verified October 3, 2026. Changes remain uncommitted.

The Kepler III lesson now connects a world's plotted position with its orbital measurements. A native picker, chart interaction, and semantic table row buttons share the same selected world. The panel retains all fourteen existing bodies, including the dwarf planets and comets.

## Changes

- Responsive chart geometry keeps axis labels and body labels at a readable 13px logical size. Axes show orbit size in AU and period in years with physical tick values on logarithmic spacing. All labels appear on wide plots; small plots show the selected body's label.
- Six selected measurements show orbit size, listed period, predicted period, T², a³, and T²/a³ with units. Derived values use the listed inputs before display rounding.
- Native selection and row buttons provide alternatives to clicking plotted points. Enter/Space cycle worlds, Escape clears chart selection, and the Clear button returns focus to the picker. Selection is announced through a polite status region.
- Light and dark surfaces, stronger numeric contrast, readable headings, and 44px controls improve inspection.
- The complete comparison table scrolls within its own focusable region on phones. Opaque pinned body headers retain every world's identity beside its ratio when scrolling right. Row and column header semantics are preserved.
- Inspection updates only `orr_k3hover`. Existing clock, camera, orbital snapshots, mission evidence, and Inquiry predictions, explanations, and experiment logs are preserved.

The lesson states the Sun-centered AU/year approximation and distinguishes semi-major axis from current distance to the Sun. It explains how rounded inputs and the simplified model affect small differences between listed and predicted periods. The mathematical interpretation follows [NASA's explanation of Kepler's laws](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/).

## Verification

54 unique focused unit checks passed across the Kepler III inspection, control-name accessibility, canvas alternatives, and theme safety suites. The first combined run passed 53; one existing journal rendering case exceeded its 60-second timeout and passed when rerun alone with a longer limit. After the pinned-column refinement, the 16 Kepler III and theme checks passed again. See [unit run](unit-checks.log), [isolated retry](unit-retry.log), and [final focused rerun](unit-final-checks.log).

All 8 final Chromium checks passed: five inspection cases and three existing Orrery keyboard/responsive regressions. They exercise pointer and keyboard selection, independent geometry/math checks, retained saved work, table semantics, native phone controls, actual chart text size, label containment and separation, computed text contrast, and visible pinned names/ratio text at maximum phone table scroll. An earlier browser run lost a worker during the saved-work case; its isolated rerun and the complete final run both passed. See [final browser results](browser-final-checks.log).

Five final visual layouts passed automated checks and were inspected visually:

| Layout | Minimum tested HTML text contrast | Minimum control height | Page overflow | Plot labels |
| --- | ---: | ---: | --- | ---: |
| 1060px dark | 10.44:1 | 44px | None | 14 |
| 1060px light | 6.96:1 | 44px | None | 14 |
| 736px dark | 10.44:1 | 44px | None | 14 |
| 320px light | 6.96:1 | 44px | None | 1 selected |
| 320px dark | 10.44:1 | 44px | None | 1 selected |

Both phone themes retain all 14 body headers and complete ratio cells inside the table viewport at maximum horizontal scroll. The table remains locally scrollable; the document fits the viewport. See [measured visual results](after-metrics.json) and [visual check log](visual-checks.log).

Canonical and desktop-mirror JavaScript syntax checks, scoped `git diff --check`, and byte parity passed. Both files have SHA-256 `594DF6BA1FD47CFDD66DB17E5D735679E9824AFBE0D4BB1B98555454E693FAEC`. See [final source checks](final-checks.log).

## Previews

- [Desktop dark](after-1060-dark.png) / [desktop light](after-1060-light.png)
- [Tablet dark](after-736-dark.png)
- [Phone light](after-320-light.png) / [phone dark](after-320-dark.png)
- [Phone light table scrolled right](after-320-light-table-end.png) / [phone dark table scrolled right](after-320-dark-table-end.png)
- [Before desktop](before-1060-dark.png) / [before phone](before-320-light.png)

## Reproduction

Run suites serially from the repository root. The report-local Playwright config uses one Chromium worker and preserves the repository's base configuration.

```powershell
node node_modules/vitest/vitest.mjs run tests/solar_system_kepler_three_inspection.test.js tests/solar_system_control_names_a11y.test.js tests/solar_system_canvas_alternatives_a11y.test.js tests/solar_system_themed_color_safety.test.js --pool=threads --maxWorkers=1 --no-file-parallelism --testTimeout=180000 --hookTimeout=60000

node node_modules/playwright/cli.js test tests/e2e/105-solar-system-kepler-three-inspection.spec.ts tests/e2e/20-solar-system-orrery-responsive.spec.ts --project=chromium --config=reports/solar-kepler-three-enhancement-2026-10-03/playwright.config.ts --grep 'native world selection and semantic table inspection|the responsive log plot uses the same world positions|inspecting and clearing worlds preserves|320px (light|dark) inspection has readable|keeps static charts out of tab order and makes Kepler III keyboard-operable|keeps every Orrery teaching tab within 320px|keeps the Orrery free of horizontal overflow at 320px and 736px'

node reports/solar-kepler-three-enhancement-2026-10-03/visual-qa.cjs
```
