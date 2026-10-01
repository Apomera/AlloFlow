# Scale Explorer: sunlight and planetary landmarks

Earth, the Moon and Jupiter now have interactive sunlight controls. A 0–180° slider and Full light, Half light and Crescent presets move the actual directional light relative to the observer. The camera can still orbit freely, and the bodies retain their measured diameters. Earth’s atmospheric rim responds to the same sunlight direction. Softer surface reflections preserve the detail in the existing NASA mosaics.

Eight new landmarks turn the camera toward specific features: the Pacific, Sahara, Greenland, Tycho, lunar maria and highlands, Jupiter’s Great Red Spot, and its belts and zones. Markers follow the texture coordinates and hide on the far side. Planetary surfaces keep a stable orientation, and their diameter rulers face the camera without crossing the globe during polar inspection.

Notebook entries save the lighting angle with the feature, orbit and magnification. Returning restores them together, and downloaded notes include the lighting setting. Older entries use the default 45° angle. Selecting a destination from farther down the page returns the scene to view.

If a surface image fails to load, the procedural globe and sunlight controls remain available. Geographic landmark controls are disabled until the corresponding image is ready. Rendering still pauses offscreen and releases its resources on unmount.

## Scientific scope

These are educational lighting views from a freely chosen position. They do not represent today’s sky or a live weather map. The displayed illuminated fraction uses the standard distant-view approximation `(1 + cos(angle)) / 2`; the perspective close-up can show a different apparent fraction. The atmospheric rim is illustrative and lunar relief is enhanced. The fixed source images do not animate changes in weather, ice or storms.

The landmark notes link to primary sources:

- [NASA Earth facts](https://science.nasa.gov/earth/facts/) and the [Blue Marble mosaic](https://svs.gsfc.nasa.gov/2915/).
- [NASA Greenland ice sheet](https://science.nasa.gov/resource/land-ice-greenland/).
- [NASA Tycho crater](https://science.nasa.gov/photojournal/the-floor-of-tycho/) and [Moon facts](https://science.nasa.gov/moon/facts/).
- [LRO lunar maps](https://svs.gsfc.nasa.gov/4720/) and [NASA Jupiter facts](https://science.nasa.gov/jupiter/jupiter-facts/).
- [NASA Moon phases](https://science.nasa.gov/moon/moon-phases/) explains the lighting geometry.

Existing asset provenance remains in `stem_lab/assets/astronomy/ATTRIBUTION.md`. This pass adds no image downloads or external runtime dependency.

## Verification

The numerical, notebook, comparison and fullscreen suites passed **98 checks**. All **16 browser scenarios** passed without retries, including the full catalog, comparisons, inspection, landmarks, notebook and planetary features. Syntax, whitespace and source/desktop parity checks passed. The restarted local preview returned HTTP 200.

The planetary browser tests inspect actual light direction, GPU pixel brightness, unchanged object dimensions, surface alignment, hidden far-side markers, comparison lighting, phone controls, saved views, exported notes, missing imagery, and WebGL cleanup. Full browser regression results are recorded in `browser-results.txt`.

Run these suites sequentially to avoid software GPU contention:

```text
node --check stem_lab/stem_tool_scaleexplorer.js
node dev-tools/sync_scale_explorer_atlas.cjs
node node_modules/vitest/vitest.mjs run tests/scale_explorer.test.js tests/scale_explorer_notebook.test.js tests/scale_explorer_comparison.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1 --testTimeout=30000
node node_modules/@playwright/test/cli.js test tests/e2e/scale-explorer-planets.spec.ts tests/e2e/scale-explorer-comparison.spec.ts tests/e2e/scale-explorer-notebook.spec.ts tests/e2e/scale-explorer-landmarks.spec.ts tests/e2e/scale-explorer-inspection.spec.ts tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --reporter=list
```

Screenshots: [Earth crescent](earth-crescent.png), [Sahara](earth-landmark.png), [Tycho](moon-landmark.png), [Great Red Spot](jupiter-landmark.png), [phone lighting controls](phone-lighting.png).

[Open the Earth preview](http://127.0.0.1:54391/?tool=scaleExplorer&focus=earth&v=planetary).
