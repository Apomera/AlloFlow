# ATC deep visual enhancement — October 4, 2026

The ATC tool now uses a cohesive navy and mint visual system across the airport briefing, practice pathway, live console, and debrief. Clearer headings, restrained surfaces, aligned flight values, and distinct action treatments make the important decisions easier to find.

## What changed

- Rebuilt the welcome hierarchy and career metrics. Replaced the fictional traffic illustration with a schematic generated from the selected airport's actual runway configuration. Airport cards now show the same runway geometry and expose their selected state to assistive technology.
- Added native SVG symbols for each practice skill and aircraft instruction. Decorative symbols remain hidden from assistive technology; existing text names and keyboard commands remain available.
- Reworked the desktop console so separation watch and runway status fill the space beneath the radar, alongside the aircraft controls. Runway entries share columns where desktop width allows. Phones retain the radar → strips → commands → separation → runway → radio order.
- Separated callsigns, route/state, aligned altitude/speed, and fuel/arrival metadata in flight strips. Improved radar reference marks and wind text, and removed decorative terrain and restricted-area labels that did not affect the simulation.
- Added a clear debrief outcome header and a desktop reflection/evidence workspace. Reflection remains first in document order and on phones.
- Kept 44 px controls, visible keyboard focus, reduced motion, forced colors, and the custom black/yellow display mode. Added a separate border token for interactive controls; the checked strip and command boundaries measure at least 3.54:1 against their surfaces.
- Fixed keyboard scrolling of locked flight strips during command entry. The list becomes a labeled, focusable scroll region while its aircraft-selection buttons are disabled; cancel leaves the original instruction and user pause unchanged.

## Measured layouts

Measurements use installed Chrome, the actual React tool host, and the fixed crossing-priority exercise.

| Measure | Before | After |
| --- | ---: | ---: |
| Desktop console document height at 1440 px | 2539 px | 2098 px |
| Radar document top at 390 px | 834.89 px | 808.67 px |
| Radar document top at 320 px | 942.39 px | 916.17 px |

The desktop console is 441 px shorter (17.4%). The phone radar appears about 26 px earlier. The complete phone console grows slightly as flight metadata and command destinations receive clearer spacing; it has no horizontal overflow at either checked width.

## Visual evidence

- [Airport briefing](after-welcome-1440.png)
- [Desktop console](after-playing-1440.png)
- [Phone aircraft controls](after-controls-320.png)
- [Practice pathway](after-pathway-1440.png)
- [Completed desktop debrief](after-completed-debrief-1440.png)
- [Completed phone debrief](after-completed-debrief-390.png)
- [Custom high contrast](after-custom-high-contrast-1440.png)
- [Forced colors at 200%](after-forced-colors-playing-200percent.png)

The completed debrief follows a real six-second separation exercise; it is not a fabricated result state. The note in the screenshot was entered through the actual reflection field.

## Validation

The focused visual suite verifies 22 checks on the final production source. It covers actual airport selection and launch, all four runway counts, keyboard disclosures, genuine exercise completion, desktop/390/320 layouts, accessible command entry and keyboard scrolling, minimum touch heights, axe serious/critical findings, control contrast, custom high contrast, forced colors at 200%, and reduced motion with real traffic continuing when resumed.

An initial command-entry check incorrectly expected a modal dialog; it was corrected to the existing inline form. The next run exposed and led to the locked-list keyboard fix. After that fix, the full final-source run passed 21 checks and one locator matched both the labeled section and its nested scroll region. The locator was narrowed to the actual list and that check was selectively rerun on the identical source. Both runs are retained, and the combined result preserves this provenance.

The canonical tool and desktop mirror match exactly. All three ATC English namespaces match, with 498 keys. The combined ATC unit suite passes 228 tests in 20 files.

All seven existing browser suites were rerun against the unchanged final source and passed 147 regression checks. Together with the 22 focused checks, this pass verifies **169 browser checks**, with zero browser runtime errors. [Validation summary](validation-summary.json), [regression source verification](regression-run-verification.json), [focused results](browser-qa-results.json), and [unit output](unit-tests.txt) retain the evidence. The final source SHA-256 is `b7417987e07ff085d8ab90ed1030a19e7a153a6c637f2b6689f2d56ee42aaf64`.

Run the verification and browser suites from the repository root:

```text
node reports/atc-visual-design-2026-10-04/verify.cjs
node reports/atc-deep-dive-2026-10-03/run-tests.cjs
node reports/atc-visual-design-2026-10-04/browser-qa.cjs
node reports/atc-visual-design-2026-10-04/run-regressions.cjs
node reports/atc-visual-design-2026-10-04/collect-results.cjs
```

Production changes are confined to the canonical ATC tool, its shipped desktop mirror, and the ATC English namespace/catalog. No deployment or commit was performed.
