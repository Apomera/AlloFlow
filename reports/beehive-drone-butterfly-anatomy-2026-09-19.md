# Butterfly anatomy in the paused meadow

The butterfly close-up now offers **Forewings**, **Hindwings** and **Antennae** buttons directly in the scene. Selecting a feature reveals two labeled pointers and a short explanation; selecting it again hides the labels.

## Implementation

- Pointer endpoints come from the actual avatar meshes, transformed through their wing pivots and the active camera. They follow the selected visible butterfly when graphics quality changes.
- Two callouts at a time keep the view readable. The 44-pixel controls fit a phone, support Enter and Space, expose their selected state and work in forced colors. A live text explanation provides the learning content without requiring the canvas image.
- Selection stays in local interface state. Leaving butterfly observation or resuming flight clears it. It does not modify animal positions, course randomness, energy, score, telemetry or decisions.
- Fixed the shared paused context-loss transition: it now redraws the 2D scene immediately, clearing any old observation overlay without waiting for flight to resume.
- Source and desktop copies are synchronized; no new textures, models or external asset requests are needed.

## Scientific scope

The wing-pair and thorax statements were checked against [London Zoo's butterfly anatomy information](https://www.londonzoo.org/whats-here/habitats/butterfly-paradise/butterfly-facts). The scent-sensing explanation follows the [American Museum of Natural History's anatomy reference](https://www.amnh.org/exhibitions/butterflies/anatomy), now also linked in the activity. Both were checked on 2026-09-19.

The existing notice remains: this is an enlarged, illustrative model, not a species identification or a regional wildlife survey. The numbered pointers identify paired features in the current view.

## Validation

- **19 focused unit tests passed:** five anatomy-layout tests, eight butterfly-observer tests and six WebGL runtime tests. The default process worker timed out before executing tests; the same suites passed using `--pool=threads`. Results: `scratch/bee-butterfly-anatomy-unit-threads.log`.
- **Three final browser checks passed:** desktop anatomy alignment and unchanged flight evidence; phone keyboard controls, framing, light/dark themes, forced colors, scoped axe checks and actual canvas-label cleanup; the existing plant-observer phone and fallback regression. Results: `scratch/bee-butterfly-anatomy-final-browser.log`.
- JavaScript syntax, scoped whitespace checks and source/desktop hash parity passed.
- Visually reviewed desktop forewing labels, phone antenna labels and the corrected 2D fallback.

Previews are in `scratch/beehive-flight-deck/`: `butterfly-anatomy-fore-desktop.png`, `butterfly-anatomy-antennae-mobile.png` and `butterfly-anatomy-fallback-mobile.png`.
