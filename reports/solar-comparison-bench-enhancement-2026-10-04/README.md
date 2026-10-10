# Solar System comparison bench enhancement

Started October 4, 2026; completed October 5. This task created no commits.

The size and gravity comparison now presents a shared portrait scale, diameter and gravity ratio cards, two measurement charts, and a readable exact-values table. Solid and striped bars identify the selected worlds without relying on color alone. The Uranus–Neptune pair explicitly explains the smaller world's stronger listed gravity, and Mercury–Mars explains equal gravity at the displayed precision. A restored repeated-world pair shows a clear instruction and cannot save evidence.

Portrait diameters use an unrounded 128px maximum, with a disclosed 3px floor for very small bodies. The numeric ratios, meters, exact table and saved observations all use twice the existing rounded model radii. The floor changes only the illustration; rings remain illustrative. The source data and moon-count review date remain those of the existing model. The physical parameters reference is [JPL planetary physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html). The comparison retains standard Earth gravity for its illustrative 70kg weight-force calculation and notes the atmospheric reference level used for giant planets.

The controls have visible labels and a text Swap action. On phones they stack vertically. The exact table scrolls within a named keyboard-focusable region, retaining sticky measurement names. The measurement builder also supplies its theme palette when reused in the selected-world sidebar.

Saved selections resolve current translated names, stable world keys, lowercase keys and legacy translation-key aliases. Unknown values display a placeholder without modifying saved state during rendering. Explanation drafts accept only an own string value in a non-array map; malformed saved data remains untouched until an explicit action. Pair-specific explanations survive swaps and question changes. A synchronous guard prevents repeated activations from saving duplicate evidence; revised explanations can be saved again.

## Evidence

- [Desktop before](before-comparison-1060-dark-Earth-Jupiter-pair.png)
- [Phone before](before-comparison-320-light-Earth-Jupiter-pair.png)
- [Finished comparison bench](after-comparison-bench.png)
- [Phone table scrolled to the second world](after-comparison-320-light-Earth-Jupiter-table.png)
- [Pluto visibility floor](after-comparison-320-dark-Pluto-Jupiter-floor.png)
- [Narrow sidebar reuse](after-comparison-320-dark-Saturn-Earth-sidebar.png)
- [Verification summary](verification-summary.json)
- [Visual metrics for all 14 states](after-metrics.json)
- [Visual QA helper](visual-qa.cjs)
- [Browser configuration](playwright.config.ts)

## Verification

All 58 distinct unit checks pass across six files: 19 new comparison cases and 39 existing science, color, table and learning-journey cases. All 13 browser scenarios pass: eight new comparison cases and five existing scenarios. Browser coverage includes 320px sidebar portrait bounds, exact meter proportions, native keyboard table scrolling, same-world handling, aliases, malformed drafts, retained learning state, revised explanations and batched duplicate saves without repeated XP.

The 14 visual states cover desktop dark/light, tablet counterexample, phone dark/light, swapped worlds, Pluto's floor, equal gravity, repeated worlds, invalid selections, malformed drafts, a saved explanation, a table scrolled to its final column, and two narrow sidebar pairs. All checked states have no document overflow or captured runtime errors. The minimum measured enabled DOM text contrast is 6.94:1 or higher, and the minimum control/link height is 44px. These computed color checks supplement inspection of the rendered gradients and portraits. Desktop, phone table and Saturn sidebar screenshots were inspected directly.

Canonical and desktop source files are byte-identical, with SHA-256 `90b6c6cebd25d0f8119b4cee0bf47da56f2eb615d0f2a8a9038d33fcf1d5b55d`. Syntax, scoped source whitespace and the scoped Git whitespace check pass.

Earlier attempt logs are retained. A session refresh interrupted the first unit command; the final evidence combines the complete existing-file results with a separate complete new-suite run. One new multi-fixture restoration case initially exceeded its 30-second runtime limit and passed with a 120-second allowance. Initial browser failures exposed an unrealistically exact CSSOM serialization assertion, corrected to less than 0.001px while model metadata remains exact and actual geometry is checked within 0.04px. The next run identified that a gradient-only stage had a transparent computed fallback in light mode; the stage now declares its dark base color explicitly. The final browser run passes all 13 cases.
