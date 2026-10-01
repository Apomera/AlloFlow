# Raptor Lab: layered wings and feather relief

This pass gives the live 3D bird more visible feather depth in Studio, Habitat, and normal flight. Two staggered rows of shorter feathers overlap the existing long wing feathers. Their tapered edges, slight tonal variation, and raised surfaces make the wing structure easier to distinguish. The same surfaces follow the existing folded-wing morph when the bird perches.

The feather material now uses shared normal and roughness maps. A broad curve across each vane remains visible at ordinary inspection distances, while fine shaft and barb detail is filtered as the bird recedes. These maps apply to the layered wing feathers, slotted primaries, and tail. Species colors, field marks, tail bands, wing silhouette, flight mechanics, and study controls retain their existing behavior.

The regression pass also exposed a head close-up with insufficient clearance above the controls. Study framing now projects all eight corners of the selected region's bounds onto the camera axes, accounting for depth and viewing angle before choosing the minimum distance. The existing distance slider still controls intentional zooming. This corrects the framing calculation rather than relaxing the geometry-clearance assertion.

## Implementation and cost

- Added feathers remain inside the existing single feather mesh on each wing. They add no meshes, materials, draw calls, animation loops, or per-frame geometry uploads.
- Geometry scales with the selected quality: 28 added coverts per wing at low quality, 45 at balanced, and 56 at high. These counts are rendering detail levels, not species feather counts. Each wing's batched feather mesh has 798, 1,281, or 1,596 vertices respectively, including its original long feathers.
- Two 256-by-512 canvas textures are generated once per scene and shared across the feather materials. They use linear encoding for normal/roughness data, mipmaps, and capped anisotropic filtering. The existing color atlas keeps its sRGB encoding. Existing cleanup disposes the added textures.
- The static folded positions and normals include the new layers automatically. They use the same pose interpolation and stay paused with the bird. Feather patterns are generated deterministically. Three.js resource allocation may consume random values for object identifiers, so identical seeded scenery across revisions is not asserted.

The treatment is a simplified visual interpretation of overlapping wing contour feathers. [Cornell Bird Academy's feather guide](https://academy.allaboutbirds.org/feathers-article/) describes coverts as overlapping contour feathers on the wing and explains their relationship to the flight-feather attachment region. This model is not a specimen-level anatomical reconstruction.

Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Dedicated checks: `tests/e2e/raptor-feather-depth.spec.ts`. No new UI strings, language-pack changes, shared host edits, or harness changes are needed. No commit, push, or deployment was performed.

## Validation

The initial pixel comparison showed that fine surface relief alone disappeared at the tested inspection distance. A broader vane curve corrected it without changing the test threshold. All three refined WebGL scenarios passed without retries (58.7 seconds), covering the peregrine at low quality, red-tailed hawk at high quality, and Great Horned Owl at low quality.

The new checks verify a visible rendered difference when the added layers are enabled, a visible contribution from the normal map, unchanged draw-call count, finite geometry and morph normals, shared textures, stable frozen flight readings, folded-wing attachment, no vertex reuploads during folding, phone/reduced-motion presentation, Habitat rendering, clean shader/console output, restart, and texture disposal. Existing flight continuity, resting-tail, anatomy, and Studio regressions are recorded in `verification.json` along with source parity and syntax checks.

The first regression run passed eight scenarios, failed the head-framing assertion, and skipped the remaining two serial anatomy cases. After correcting the framing calculation, the final nine-scenario feather/anatomy/Studio run passed cleanly in 2.9 minutes without retries. Together with the five flight-continuity and resting-tail cases that passed before that camera-only correction, **14 unique scenarios were validated across runs**. Geometry and materials were unchanged after those five passed. Scoped axe checks reported zero violations; both source files passed syntax checks, scoped whitespace checks passed, and their SHA-256 hashes match.

```powershell
npx playwright test tests/e2e/raptor-feather-depth.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-feather-depth-2026-09-27/refined-browser-results
npx playwright test tests/e2e/raptor-flight-continuity.spec.ts tests/e2e/raptor-tail-rest.spec.ts tests/e2e/raptor-study-anatomy.spec.ts tests/e2e/raptor-study-studio.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-feather-depth-2026-09-27/regression-browser-results
npx playwright test tests/e2e/raptor-feather-depth.spec.ts tests/e2e/raptor-study-anatomy.spec.ts tests/e2e/raptor-study-studio.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-feather-depth-2026-09-27/final-browser-results
```

Screenshots were visually reviewed. These checks exercise local Chromium/WebGL, including low and high graphics quality. They do not establish frame rates on physical devices. The added geometry and texture samples have a cost despite the unchanged draw-call count. The broad unit suite was not rerun; previous Raptor reports document its existing baseline failures.

## Review images

For each of `peregrine`, `redTail`, and `greatHorned`:

- `*-wing.png`: the layered wing close-up.
- `*-single-layer-control.png`: the same frozen pose, camera, and new material with the added covert geometry temporarily excluded by the test. This is a controlled comparison, not a historical screenshot.
- `*-flight.png`: the whole bird from above.
- `*-folded.png`: the layers following the resting wing; the owl capture uses a phone viewport.
- `*-habitat.png`: the same resting inspection with the environment restored.

Existing regression tests also regenerate their own dedicated Raptor screenshots.
