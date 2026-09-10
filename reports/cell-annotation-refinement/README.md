# Cell simulator annotation refinement

Selected and controlled organisms now draw after their neighbors, with quieter background organisms. Drawing order changes do not reorder or mutate the simulated population.

Anatomy labels use two ordered columns with larger text and 26px label surfaces. The layout fits the available canvas area, accounts for the HUD and utility controls, and keeps label boxes separate. Connector lines and anchor dots are static; all connectors draw before label surfaces so a later line cannot cover a label's text.

Player feedback occupies the upper annotation band, while the target caption occupies the lower band. Structure missions outline the next selectable label instead of drawing a compass ring over its words. Food and light markers keep their directional behavior. Existing anatomy click regions follow the new label geometry.

## Validation

- 21 unit checks passed: annotation geometry, canvas lifecycle, and play tutorial contracts. Geometry checks cover 320px, 390px, and 1200px widths at 1x and 2x pixel densities across rotated anchor arrangements.
- 3 new browser checks passed: selected Amoeba at 1200px, controlled Amoeba at 390px, and Plant Cell at 320px. Checks cover non-overlapping labels, separation from player and target captions, label click-to-explain, and page overflow.
- 5 existing browser regressions passed for onboarding, input/mechanism feedback, mission comparison, mobile pathogen guidance, and mobile anatomy/control interaction. The mobile anatomy/control regression was repeated successfully after changing structure target outlines.
- Source syntax and diff whitespace checks passed. The desktop public copy matches the source byte for byte.
- Desktop and narrow-phone captures were visually reviewed; the review led to replacing the structure ring that obscured the Cell Wall label.

## Previews

- [Selected Amoeba, desktop](observe-amoeba-1200.png)
- [Controlled Amoeba, phone](play-amoeba-390.png)
- [Plant Cell, narrow phone](play-plantcell-320.png)

Screenshots show a randomized live teaching model, paused for inspection. Logs: unit-final.log, browser-final.log, regression.log, structure-target-regression.log.
