# Recorded physics graphs: visual clarity and navigation

The velocity graphs now put the selected reading, time, and motion phase above the curve. Students can jump to launch, the recorded apex, and ground impact directly from the graph controls. The same original sample remains selected in the canvas, inspector, energy chart, and table.

## Changes

- Show one prominent velocity reading with explicit units. Small nonzero values retain three significant figures instead of rounding to zero. Launch and final readings remain visible as labelled reference values.
- Add recorded-moment buttons with original timestamps, keyboard activation, and pressed states. Phone layouts use two columns with the impact button across the next row.
- Mark the canonical recorded apex with a fixed dashed guide. Unfinished and legacy flights use the highest supported recorded point when a matching apex observation is unavailable.
- Show the flight's captured angle, initial speed, gravity, mass, height, run, and drag setting above the graphs. Editing the next launch's controls preserves these recorded settings.
- Include the highest point, canonical apex, and selected observation in the representative velocity curves, energy bands, and table rows. The time control and CSV retain every original sample.
- Label launch, apex, and impact rows in the table. Opening the table reveals it, brings the selected row into view, and focuses the labelled section. Scrolling respects reduced-motion preferences.
- Add two physics strings to both catalogs, synchronize the desktop source, and add the graph browser checks to physics CI.

## Verification

- **Unit tests: 294 tests passed across 17 files.** The 42 new recorded-moment cases cover vacuum and drag, short flights, horizontal release, paused and unfinished flights, legacy metadata, unsupported samples, exact apex matching, and preservation of recorded evidence.
- **Focused browser checks: 58 tests passed across 11 files.** These comprise five new graph cases, nine energy cases, and 44 existing cases covering apex inspection, history, flight integrity, sample inspection, contrast, controls, comparison, clarity, and layout.
- The energy assertions now require the highest recorded point, matching apex, and selected observation in every band. They check SVG point counts and recorded energy geometry. The full nine-case energy suite was rerun after replacing its old 81-point limit with the bound that includes those observations.
- **Visual audit: 11 configurations passed, with 23 PNGs.** Two baseline captures at 1100 and 320 px precede nine final combinations of default, dark, and contrast themes at 1100, 375, and 320 px.
- **Recorded evidence: 22 actual flights, 121 selections, and 152 complete CSV checks.** Every configuration records a vacuum flight and a drag flight. Body state, original points, captured settings, apex metadata, run log, and last-flight results match the pinned baseline exactly. Every CSV row retains its original numerical values.
- Source, mirror, auditor, styles, harness, and the complete physics catalog namespace stayed unchanged throughout the audit. The audit records every requested translation key and the full catalog hashes before and after capture. No browser page errors, page overflow, graph overflow, control overflow, or clipped SVG labels were found.

The measured text and controls cover the graph time control, velocity cards, captured settings, sampling guidance, table action, flight history, and flight table. This is a focused rendered audit of those regions.

| Theme | Viewport | Minimum text | Minimum SVG text | Minimum text contrast | Minimum target dimensions | Page overflow |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| default | 1100 | 12.00 px | 22.15 px | 5.20:1 | 82.00 × 44.00 px | 0 px |
| default | 375 | 12.00 px | 20.42 px | 5.20:1 | 82.00 × 44.00 px | 0 px |
| default | 320 | 12.00 px | 16.62 px | 5.20:1 | 82.00 × 44.00 px | 0 px |
| dark | 1100 | 12.00 px | 22.15 px | 6.79:1 | 82.00 × 44.00 px | 0 px |
| dark | 375 | 12.00 px | 18.76 px | 6.79:1 | 82.00 × 44.00 px | 0 px |
| dark | 320 | 12.00 px | 14.95 px | 6.79:1 | 82.00 × 44.00 px | 0 px |
| contrast | 1100 | 12.00 px | 22.15 px | 15.30:1 | 82.00 × 44.00 px | 0 px |
| contrast | 375 | 12.00 px | 20.15 px | 15.30:1 | 82.00 × 44.00 px | 0 px |
| contrast | 320 | 12.00 px | 16.34 px | 15.30:1 | 82.00 × 44.00 px | 0 px |

All final measured text is at least 12 px. Text contrast is at least 4.5:1 in default and dark themes and 7:1 in the contrast theme. Measured controls are at least 44 px in both dimensions. Velocity cards share a row on desktop and stack on phones.

## Screenshots and evidence

| Theme | Width | Controls | Graphs |
| --- | ---: | --- | --- |
| default | 1100 px | [Time controls](graphs-final-default-1100-time-control.png) | [Velocity graphs](graphs-final-default-1100-component-graphs.png) |
| default | 375 px | [Time controls](graphs-final-default-375-time-control.png) | [Velocity graphs](graphs-final-default-375-component-graphs.png) |
| default | 320 px | [Time controls](graphs-final-default-320-time-control.png) | [Velocity graphs](graphs-final-default-320-component-graphs.png) |
| dark | 1100 px | [Time controls](graphs-final-dark-1100-time-control.png) | [Velocity graphs](graphs-final-dark-1100-component-graphs.png) |
| dark | 375 px | [Time controls](graphs-final-dark-375-time-control.png) | [Velocity graphs](graphs-final-dark-375-component-graphs.png) |
| dark | 320 px | [Time controls](graphs-final-dark-320-time-control.png) | [Velocity graphs](graphs-final-dark-320-component-graphs.png) |
| contrast | 1100 px | [Time controls](graphs-final-contrast-1100-time-control.png) | [Velocity graphs](graphs-final-contrast-1100-component-graphs.png) |
| contrast | 375 px | [Time controls](graphs-final-contrast-375-time-control.png) | [Velocity graphs](graphs-final-contrast-375-component-graphs.png) |
| contrast | 320 px | [Time controls](graphs-final-contrast-320-time-control.png) | [Velocity graphs](graphs-final-contrast-320-component-graphs.png) |

- Baseline: [desktop controls](graphs-baseline-default-1100-time-control.png), [desktop graphs](graphs-baseline-default-1100-component-graphs.png), [phone controls](graphs-baseline-default-320-time-control.png), [phone graphs](graphs-baseline-default-320-component-graphs.png).
- [Phone flight table with the recorded apex selected](graphs-final-default-320-table.png).
- [Structured measurements and preserved evidence hashes](graphs-results.json).
- [Reproducible visual and recorded-evidence audit](verify-graphs.cjs).

## Source provenance

- Baseline commit: `b26843288dd5b17f9997b5be9a2fbbac7f3ed696`.
- Baseline source SHA-256: `77cc2ca00d6eedbbd6012d58fcc7d0b841e3cf2a35b5bf3f1536b650d6315e45`.
- Final source and desktop mirror SHA-256: `15f24f1deac8988eb79cc35b19bd490efb88ea2333510f63093450fe72356151`.
- Auditor SHA-256: `b45f703d8f05bdc25e29a7b7ca8ed8723492b32108575cbc73b2652003f972b9`.

The baseline and final pages use the same frozen fixture dependencies. The audit records source and dependency hashes before execution and verifies them again when it finishes.

## Reproduce

Run from the repository root:

```powershell
npx vitest run tests/physics_ --maxWorkers=1
npx playwright test tests/e2e/physics-graph-landmarks.spec.ts tests/e2e/physics-energy-visuals.spec.ts --workers=1 --retries=0
$env:PHYSICS_EXPECT_SOURCE_SHA256='15f24f1deac8988eb79cc35b19bd490efb88ea2333510f63093450fe72356151'
node reports/physics-graph-landmarks-2026-09-30/verify-graphs.cjs
```

The physics CI workflow also includes the existing browser suites. Browser validation and visual capture were run sequentially in this shared Windows workspace.
