# Scale Explorer: selectable worlds and retraceable journeys

## What changed

- Planets can be selected directly in the Solar System scene. A hover highlight names the world and its orbital radius.
- Small markers receive a 12-pixel mouse target or a 22-pixel touch target. The rendered bodies and orbital distances remain unchanged. The unresolved inner cluster leads into the inner-system view.
- Dragging, pinching, cancelled touches, and empty-space clicks do not select worlds.
- An action beside the scene links the Sun's galactic neighbourhood to the Solar System, and selected Earth/Jupiter markers to their detailed globes. It states the change in powers of ten using the existing catalog dimensions.
- A route trail restores each departure's landmark, zoom, camera direction, lighting, cutaway, cloud setting, neighbours and measurement toggle.
- Returning places keyboard focus on the canvas. Route snapshots stay separate from saved notebook observations.
- Selecting the current globe retains the return path. Choosing a different destination starts a fresh route.
- Routes are session-only and bounded to six departures; saved notebook behavior is unchanged.

## Validation

- 120 unit checks passed across seven suites on the final source.
- 30 browser scenarios passed across atlas rendering, comparisons, galaxies, inspection, landmarks, navigation, notebooks, orbits and the new journeys.
- The four journey scenarios passed again after the final current-world route fix. They cover direct picking, hover, nested viewpoint restoration, notebook isolation, phone touch tolerance, keyboard return, pinch/cancel behavior and explicit destination changes.
- Screenshots reviewed: hover-jupiter.png, jupiter-entry.png, phone-earth-entry.png and galaxy-system-earth-route.png.
- Syntax and scoped whitespace checks passed. Translation keys have consistent fallbacks; all four English catalogs parse successfully.
- Root and desktop sources are identical. SHA-256: a78eb6580c3f5d7c3306edd1954d1253e31caa9e8b9ce67984006e73280d1e94.

See browser-results.txt, final-journey-results.txt, and unit-results.json for results. source-before.js is the local baseline for this enhancement.

[Open the Solar System preview](http://127.0.0.1:54391/?tool=scaleExplorer&focus=solar-system&v=journeys).

All changes remain uncommitted.
