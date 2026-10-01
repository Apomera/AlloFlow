# Solar System Orrery visual enhancement — September 30, 2026

This second visual pass improves the Orrery world navigator and the live orbit readings. It builds on the [first explorer enhancement](../solar-visual-enhancement-2026-09-30/README.md).

## Findings and changes

- The world selector previously placed a small label, select, and two help messages in one wrapping row. The new navigator gives the selected world its own cached portrait, classification, and name, alongside a native selector and its orbital period in Earth years. The selector has a minimum 44px height. At phone widths, the layout stacks and the help wraps.
- Major worlds reuse the explorer's existing portrait cache, matched by stable world keys. Comets and other dwarf planets retain decorative symbols and show their correct classifications and periods. Clearing selection restores the all-worlds view and removes the selected-world readings.
- The live readings previously appeared as one small sentence. Distance and orbital speed now have separate cards, larger tabular numbers, explicit units, and a clear orbital-phase row. Dark and light themes use solid, readable surfaces.
- The complete original reading remains available to assistive technology. Its larger visual copies are hidden from the accessibility tree to avoid repeating announcements. The existing paused/live announcement behavior and keyboard help remain in place.
- The visible values use the same orbital calculations and existing 180ms DOM update as the accessible summary. Their IDs remain text leaves so playback can update them without replacing their DOM nodes. This pass adds no animation loop, network asset, or WebGL resource.
- The map's scale explanation had no surface of its own and blended into the space background in light mode. It now has a themed surface, readable text, and padding while preserving its wording and note semantics.

The canvas, instrument rail, scientific model, and selection callbacks retain their existing behavior. The canonical and desktop tool modules are byte-identical.

## Visual evidence

The before screenshots record the tool immediately before this second pass. Screenshots use the real local tool module and compiled application stylesheet in the repository's GL harness.

| Layout | Before | After |
| --- | --- | --- |
| Desktop, dark | [1180px baseline](before-1180-dark.png) | [1180px enhanced](after-1180-dark.png) |
| Desktop, light | — | [1180px enhanced](after-1180-light.png) |
| Tablet, dark | — | [736px enhanced](after-736-dark.png) |
| Phone, light | [320px baseline](before-320-light.png) | [320px enhanced](after-320-light.png) |

## Verification

The focused unit run passed 79 of 80 tests across five files: canvas loops, canvas alternatives, control names, mobile clarity, and visual science. The sole failure is an existing static scanner limitation: the drone specimen canvas sets its accessible label beyond the scanner's 12-line inspection window. The original HEAD source produces the same failure; no canvas creation site changed in these visual passes. See [unit results](orrery-focused-unit-tests.json), [unit log](orrery-focused-unit-tests.log), and [baseline comparison](canvas-classification-baseline.json).

All six targeted Orrery browser regressions passed: mobile overflow, mobile guidance, selection after Escape, focus return to the selector, live readings, and keyboard world cycling. The live-reading test now compares the three visible text leaves with the complete accessible sentence after orbital jumps, playback, and keyboard phase-slider input. It also checks that their DOM nodes remain in place during playback.

The initial browser run passed five tests and failed the old 230px mobile console-height budget. The larger readings raise the console to about 288px, with no overlap. The revised regression retains containment and disjointness checks, caps the console below 300px, and requires it to remain shorter than the map. The affected test passed its final isolated run. Both the [original browser log](orrery-responsive-browser-tests.log) and [final mobile log](orrery-mobile-guidance-final.log) are preserved.

The visual browser review passed all four layout/theme cases. It checked native keyboard selection, clearing and restoring selection, Mercury's aphelion jump, Saturn's portrait and period, and the comet/dwarf fallback badges. Visible paused readings matched the complete status sentence. No browser runtime errors or horizontal page overflow were recorded.

| Width | Theme | Document width | Minimum reading number size | Scale-note text contrast |
| --- | --- | --- | --- | --- |
| 1180px | Dark | 1180px | 19px | 12.02:1 |
| 1180px | Light | 1180px | 19px | 7.26:1 |
| 736px | Dark | 736px | 19px | 12.02:1 |
| 320px | Light | 320px | 18px | 7.26:1 |

Measurements are saved in [after-metrics.json](after-metrics.json). Reproduce the current visual checks from the repository root with:

```powershell
npx vitest run tests/solar_system_canvas_loop.test.js tests/solar_system_canvas_alternatives_a11y.test.js tests/solar_system_control_names_a11y.test.js tests/solar_system_mobile_visual_clarity.test.js tests/solar_system_visual_science.test.js --maxWorkers=1 --testTimeout=30000
npx playwright test tests/e2e/20-solar-system-orrery-responsive.spec.ts --workers=1 --retries=0 --reporter=list --grep "mobile stage guidance|selected-world DOM readouts|keyboard users cycle|Orrery free of horizontal overflow|returns focus to the world selector|reselects a world normally" --output=reports/solar-orrery-visual-enhancement-2026-09-30/browser-final-results
node reports/solar-orrery-visual-enhancement-2026-09-30/visual-qa.cjs
```

This report documents local implementation verification. The saved baseline images are historical review evidence.
