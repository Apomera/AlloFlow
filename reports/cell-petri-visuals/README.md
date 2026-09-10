# Cell simulator: petri dish visual pass

The live dish now uses softer mint illumination, concentric glass reflections, and a calmer dark teal HUD. Eleven organism body shapes receive a clipped directional surface treatment, clear refractive edges, and sparse fixed texture at useful zoom levels. The rendering keeps existing organism shapes, target identities, motion, selection, and biological learning mechanisms.

Euglena chloroplast orientation is stable across frames instead of being randomized on every draw. The visual texture uses fixed positions and adds no simulation state or animation loop.

At widths up to 640px, zoom and speed occupy separate footer controls with 44px buttons. The movement pad and prediction lock sit above the footer. Desktop controls retain their familiar placement. The duplicate canvas magnification badge was removed because it overlapped the accessible zoom control.

## Verification

- 21 unit tests passed across specimen visibility, canvas ref stability, render warnings, and play tutorials.
- 3 new browser checks passed at 1200px, 390px, and 320px: no page overflow, no utility/pad overlap, touch button sizing, pause/resume, and no browser exceptions.
- 5 existing browser regressions passed: visible coach mark, input/mechanism/result cues, mission comparison handoff, mobile pathogen key, and mobile controls/learning-card layout.
- JavaScript syntax and diff whitespace checks passed; source and desktop mirror are byte-identical.

## Previews

- [Desktop dish](observe-1200.png)
- [Phone play](play-390.png)
- [Narrow phone play](play-320.png)
- [Original desktop dish](before-observe-1200.png)
- [Original phone play](before-play-390.png)

Screenshots use a live randomized population, so organism locations differ between captures. These are schematic teaching visuals.

Reproduce with the Playwright configs in this directory. Unit output: unit.log; browser output: visual-final.log and regression.log.
