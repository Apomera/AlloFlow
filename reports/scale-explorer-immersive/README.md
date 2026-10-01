# Scale Explorer: immersive scale atlas

## What changed

The default experience is now a Three.js atlas. The existing catalog, size comparisons, estimation activities, guided tours, personal height, shared links, read-aloud integration, and accessible chart remain connected to the same data.

- Six destinations cover matter, microscopic life, familiar objects, landscapes and planets, stellar distances, and galaxies.
- Models replace the emoji stage: double helices, molecular bonds, probability clouds, cell membranes, biconcave blood cells, insects, animals, structures, terrain, globes, stars, spiral galaxies, and a cosmic web.
- Scroll and arrow keys travel through scale; drag and W/A/S/D orbit; R resets the camera; Home returns to human scale. All navigation also has ordinary controls that work by keyboard and touch.
- Objects can be selected directly in 3D, from a destination selector, or from the searchable list. Adjacent-destination buttons make the next smaller and larger objects easy to reach.
- Earth uses a locally bundled NASA Blue Marble mosaic. The Moon reuses the existing local LRO map. Stars use a procedural surface shader.
- Reduced motion disables ambient movement and uses instant camera moves. The 2D chart is selected automatically if 3D initialization fails or the WebGL context is lost.
- Offscreen and hidden scenes stop rendering. Only ten recently viewed models are cached; evicted geometry, materials, textures, and shaders are disposed. Leaving 3D also disposes the renderer and releases its context.
- Travel takes a fixed duration rather than a fixed number of frames. Custom-height changes now refresh comparison and estimate calculations.
- Source and desktop copies are synchronized. New English strings are registered in the available string mirrors; astronomy assets are included in fresh desktop packaging.

## Scientific interpretation

The number attached to each object is its stated width, height, length, or distance. Model dimensions change by `10^(objectExponent - viewExponent)`, using coordinates near the origin to avoid GPU precision loss. Measurement guides follow those model dimensions.

This is an illustrated atlas. The arrangement of neighboring objects is not their physical location. Perspective changes apparent size when orbiting; the 2D chart and numerical comparisons provide a direct comparison. Colors, internal details, landscapes, and galaxy distributions are illustrative. Atomic clouds represent concepts rather than photographed surfaces; distance entries are rulers. Solar System orbit spacing and planet markers are explicitly labeled as schematic. NASA imagery is a historical composite, not live imagery.

## Preview

Run `node dev-tools/scale_explorer_preview.cjs` from the repository root. The script prints a loopback URL and serves only an explicit list of preview assets. It includes dark, light, and high-contrast preview themes.

## Verification

- Existing science, accessibility, sharing, personalization, mirror, and fullscreen regressions: 89 passing tests (`unit-results.json`).
- `tests/e2e/scale-explorer-atlas.spec.ts` exercises real WebGL output, destination travel, pointer and keyboard orbiting, chart switching, disposal, phone layout, every catalog destination, custom height, comparison, and context loss. It also asserts a maximum of ten cached models.
- Screenshots in this directory show the desktop layout, phone layout, cells, DNA, atoms, Earth, the Sun, the Milky Way, and the cosmic web.

Commands:

```text
node dev-tools/sync_scale_explorer_atlas.cjs
node node_modules/vitest/vitest.mjs run tests/scale_explorer.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1
node node_modules/@playwright/test/cli.js test tests/e2e/scale-explorer-atlas.spec.ts --workers=1
```

## Sources and credits

- [NASA Blue Marble](https://svs.gsfc.nasa.gov/2915): Earth texture. Full local asset credits are in `stem_lab/assets/astronomy/ATTRIBUTION.md`.
- [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720): existing Moon texture.
- [NASA: How big is space?](https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/): observable-universe size and expansion context.
- [Three.js picking](https://threejs.org/manual/pages/picking.html) and [cleanup](https://threejs.org/manual/pages/cleanup.html): rendering implementation references. The app continues to use its bundled r128 runtime.
