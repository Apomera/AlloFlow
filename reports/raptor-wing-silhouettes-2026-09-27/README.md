# Raptor Lab: continuous, distinctive wing outlines

This pass removes the blunt outer edge that remained exposed beyond the layered feathers. The falcon model now tapers to a pointed tip; the owl's broad wing finishes in a rounded cap. Long feathers and shorter overlapping layers extend farther toward the tip and follow the same surface, so the outer wing reads as one coherent shape.

In **Inspect → Wing feathers**, the flying falcon and owl now each have a short observation prompt directing attention to their wing shape and inviting a comparison with the other bird. Perched birds retain the folded-wing and takeoff prompt. Existing kept moments can preserve the views across flights, with the existing different-flight comparison context.

## Geometry

The shared wing sampler narrows both the leading and trailing edges around their midpoint and reduces the tip's cross-sectional curvature with its width. The final row retains a small nonzero width to avoid degenerate triangles. The owl redistributes its existing outer vertices toward the curved end, including at low quality.

Wing mesh counts, vertex counts, material counts, textures, draw calls, and animation loops are unchanged. The existing long-feather and covert arrays cover more of the outer wing; no additional feathers are allocated. The same surface sampler feeds the static folded-wing morph, preserving attachment during perching and takeoff. Slotted-primary families keep their existing shape and separate finger feathers; a red-tailed hawk serves as a regression control.

The geometry is a visual interpretation, not an aerodynamic solver or a specimen reconstruction. Species measurements and flight physics are unchanged. The shape references are Cornell's [Peregrine Falcon identification guide](https://www.allaboutbirds.org/guide/Peregrine_Falcon/id), which describes pointed wings, and [Great Horned Owl identification guide](https://www.allaboutbirds.org/guide/Great_Horned_Owl/id), which describes broad, rounded wings.

## Verification

New coverage in `tests/e2e/raptor-wing-silhouettes.spec.ts` exercises falcon and owl models at low and high quality and a low-quality hawk control. It checks the terminal edge width and curvature, the broader owl versus narrower falcon outer wing, coverage by the layered feathers, mirrored open and folded geometry, finite mesh data, unchanged mesh budgets, frozen readings, no idle redraws, perching, takeoff, stable geometry-buffer versions, phone/reduced-motion behavior, and clean console output. Prompt checks verify that the flying and resting instructions match the visible pose.

The initial browser run lost its WebGL context during startup, before the scene's ready hook, and timed out with four serial cases skipped. A fresh browser with the same source and assertions passed all five geometry cases in 1.5 minutes. A separate CPU check of the actual surface-construction functions also found finite positions and unit normals for low/high falcon and owl meshes. The final combined run, including the two observation prompts and the existing feather-depth, study-anatomy, and flight-continuity suites, passed all 14 scenarios in 6.7 minutes with no retries or skipped cases. Results and the final source hash are recorded in `verification.json`.

```powershell
npx playwright test tests/e2e/raptor-wing-silhouettes.spec.ts tests/e2e/raptor-feather-depth.spec.ts tests/e2e/raptor-study-anatomy.spec.ts tests/e2e/raptor-flight-continuity.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-wing-silhouettes-2026-09-27/final-browser-results
```

These are local Chromium/WebGL checks and visual inspection, not physical-device frame-rate measurements. The earlier broad unit-suite baseline failures were not revisited. Canonical source: `stem_lab/stem_tool_raptorhunt.js`; desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. The shared harness, host, catalogs, and language packs are untouched. Two new translation keys have English fallbacks; language-pack integration remains pending in `translation-keys.json`. No commit, push, or deployment was performed.

## Visual review

`peregrine-before.png` and `owl-before.png` preserve the previous pass's whole-bird screenshots. The new `*-flight.png`, `*-wing.png`, and `*-folded.png` captures show the finished silhouette, focused wing, and perched pose for each tested species/quality combination. The low-quality owl's folded view uses a phone viewport. Views are framed independently by the study camera; the captures are not scale measurements.

Existing regression tests also regenerate their own Raptor artifacts. The new screenshots were visually inspected for tip continuity, feather coverage, and folded-wing appearance.
