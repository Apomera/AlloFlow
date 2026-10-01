# Tectonics lab: 3D clarity refinement

## Plate boundary block

- Plate A/B labels and motion arrows make convergence, divergence, and sideways slip readable from an oblique view. Matching bands move with the transform plates so students can compare displacement across the fault.
- Oceanic and continental plates have distinct crust and mantle layers. Solid cut faces follow the cutaway slider. The overriding plate tapers at the trench instead of intersecting the descending slab.
- The full descending slab fits inside the mantle envelope. Its top remains aligned with the earthquake plane. The mantle uses subdued rock colors; the guide identifies it as mostly solid.
- The spreading ridge has solid new crust around a narrow melt fissure. Arc volcanoes have shaped flanks and recessed craters.
- Camera framing adapts to the viewport and boundary geometry. Depth captions retain a readable screen size, and leaders point to their actual depths on the exposed face. Feature captions avoid the depth scale, plate identities, and one another during rotation.
- Earthquake markers show internal locations through the rock. Slicing still removes markers on the discarded side, and annotations draw above the markers. The guide explains this convention.
- Camera turns and earthquake updates reuse rock geometry. Cutaway caps and textures are disposed with the scene.

## Volcano cutaway

- Camera framing follows viewport size, rotation, composition, and the cut, keeping the full block visible on phones.
- Anatomy labels have clearer capsules and spacing, including the magma chamber label below the phone view.
- Rock and magma textures are smoother, with subtle lamination on exposed rock faces.

## Verification

The geometry tests use the bundled Three.js implementation and real mesh transformations; only canvas painting and the WebGL renderer are stubbed in that suite. Separate Chromium captures use real WebGL with local React and Three.js assets.

- All 372 existing checks across eight focused suites passed, including reruns of two mirror checks after the source copies were synchronized. A subsequent 190-check subset also passed after the earthquake visibility change.
- All 14 new geometry and annotation checks passed, including the rotated desktop and phone label collision regression, internal marker visibility, retained clipping, and mesh reuse.
- All 11 real React/Chromium idle and interaction checks passed on the final source. The harness waits for a gesture's complete achievement batch and audio tail before taking a stationary-input baseline.
- Seven volcano WebGL capture scenarios completed without browser errors or lost contexts: compositions, rotation, closed/cutaway views, light/dark themes, and phone framing.
- The final plate-browser run passed 42 of 43 checks, including every visual/label check and the shallow-earthquake fixture, with no runtime or WebGL errors. Its keyboard check hit a 10-second timeout. An isolated run on the identical source passed all six control checks with a 60-second bound, including exact camera restoration after ArrowRight and Home, scale toggling, and 2D fallback cleanup. Static review found no keyboard/camera defect.
- The source, public desktop asset, and local build copies have the same SHA-256: `09b2e08358e78b1c4014d69fda46416e9648f339e9cc7aa425ef346f590ca92d`. JavaScript syntax and the whitespace delta from the saved starting source passed.

Run from the repository root:

```powershell
npx vitest run tests/platetectonics_3d_clarity.test.js --maxWorkers=1 --testTimeout=30000
node dev-tools/tectonics_3d_visual_qa.cjs --final
node dev-tools/tectonics_3d_visual_qa.cjs --final --controls-only
node dev-tools/tectonics_vent_visual_qa.cjs after
node dev-tools/tectonics_idle_reward_qa.cjs
```

Plate captures and reports are in `scratch/tectonics-3d-review/final/`. Volcano captures are in `scratch/tectonics-vent-refinement/`. The saved starting source and earlier captures allow comparison.
