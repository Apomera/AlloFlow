# Scale Explorer: realism pass

## What changed

- The opening view isolates one specimen. **Size neighbors** restores the surrounding scale neighborhood; **Measurement** toggles the dimension bracket. Both controls expose their pressed state.
- Dragging and orbit buttons can turn all the way around a model. Camera framing gives long DNA and hair specimens more room, and keeps the camera above the ground in terrestrial scenes.
- The human figure loads the app's existing MakeHuman CC0 body surface, rendered as a bronze study. A tapered procedural figure remains available if the model or loader cannot load.
- Biological surfaces use finer geometry, varied roughness, and locally generated relief. Red blood cells have a biconcave profile. Mitochondria reveal membrane folds in a cutaway. Viruses and pollen have distinct surfaces. DNA has paired bases and offset backbones.
- Whale and elephant anatomy use smooth, tapered cross-sections. The whale has flukes, flippers, a dorsal fin, and ventral grooves in an underwater setting.
- Terrestrial scenes have a textured ground, grass, fog, and shadows. Sequoias have branching trunks and instanced needle foliage. Mountain terrain has height-dependent snow and rock colors; canyon strata use height-dependent color variation.
- Earth uses the bundled NASA Blue Marble map and an atmospheric rim. The Moon also uses the bundled LOLA elevation map for relief. Jupiter now uses a locally bundled Hubble global map and an oblate shape. Planetary light is directional, with a dark night side.
- The galaxy combines star populations, a warm central concentration, and a procedural spiral dust layer. Microscopic backgrounds use soft membranes in place of wireframe cages.
- Opaque materials stay opaque. A bounded model cache, explicit resource disposal, reduced motion, offscreen suspension, and context-loss fallback remain in place. Shadow maps and instanced foliage are explicitly released.
- The desktop public source is synchronized. Build asset copying includes the astronomy textures and the shared human surface. The loopback preview serves GLB assets with the correct content type.

## Scientific scope

These are educational 3D illustrations. Biological colors, anatomy details, terrain, and galaxy structure are approximations rather than measured reconstructions. The human surface is generic. The source cards identify the anatomical cutaway and the image sources.

The stated dimension is the normalization axis, and the ruler measures that dimension. Neighboring objects share the same scale conversion. Camera framing adapts for unusually long specimens; the numerical sizes and comparisons are unchanged. Atlas positions are a browsing arrangement, not physical locations. Atomic clouds and orbital diagrams retain their conceptual-model explanations.

## Sources

- Human surface: the existing [MakeHuman provenance](../../stem_lab/assets/anatomy/body-surface/ATTRIBUTION.md), CC0. No new external model dependency.
- Earth: [NASA Blue Marble](https://svs.gsfc.nasa.gov/2915).
- Moon: [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720).
- Jupiter: [NASA / STScI Hubble global map, 2015](https://svs.gsfc.nasa.gov/12021). The 1024 × 512 JPEG is bundled without alteration; credit is in both astronomy attribution files.
- Rendering references: [Three.js materials](https://threejs.org/manual/pages/materials.html), [shadows](https://threejs.org/manual/pages/shadows.html), and [color management](https://threejs.org/manual/pages/color-management.html). Implementation uses the app's pinned r128 API.

## Verification

Commands from the repository root:

```text
node dev-tools/sync_scale_explorer_atlas.cjs
npx vitest run tests/scale_explorer.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1
npx playwright test tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --reporter=list --output=reports/scale-explorer-realism/test-results
node dev-tools/scale_explorer_visual_review.cjs
```

The visual-review command defaults to the user's preview on port 54391. Set `SCALE_PREVIEW_URL` to use another local preview.

- `unit-results.json`: **89 / 89 passed**.
- Final real WebGL suite: **3 / 3 passed** (3.9 minutes), without retries. The first case captured the desktop/model views and checked interaction; the second visited every destination on a phone; the third blocked the model and Earth image to verify the procedural fallback.
- The phone case was also rerun after adding an explicit imagery-ready assertion following cache eviction: **1 / 1 passed** (27.5 seconds including setup). Its final screenshot contains the loaded NASA Earth map.
- Real WebGL tests cover detailed human asset loading, NASA texture completion, nonblank scenes, keyboard/drag/full orbit, neighbor/measurement controls, phone layout, every catalog destination, personal height, comparisons, cache bounds, context loss, missing-asset fallback, and context release on unmount.
- `*-review.png`: still visual reviews used to refine the final composition. `desktop.png`, `phone.png`, and named model screenshots come from the browser regression suite.
- `visual-errors.json`: browser errors from the still-scene review.

The user's preview remains at `http://127.0.0.1:54391/`. This work has not been published.
