# Raptor Lab: inspect anatomy in the live 3D scene

This pass gives the frozen study camera focused views of the wing feathers, tail feathers, head and beak, and feet and talons. Learners can inspect a visible structure, try a maneuver, then compare the same region with its original simulation readings.

## Experience

- The **Inspect** selector switches between **Whole bird**, **Wing feathers**, **Tail feathers**, **Head and beak**, and **Feet and talons**. Selecting a region fits the camera to the current rendered geometry, including folded-wing and foot morphs. Other parts of the bird remain visible in context.
- The selected region is named in the header and framed with quiet corner marks. The frame follows camera changes and never appears in the saved JPEG. It is a visual framing guide, not an X-ray or a visibility guarantee through intervening geometry.
- Initial views respond to pose: an extended wing starts from above, a folded wing from the side, tucked feet from below, and perched feet from above the foot level. Close-ups support orbiting below the bird; the existing terrain clearance remains in effect. Presets, drag, arrow keys, and view distance remain available.
- Prompts connect visible structure with an action to try next: inspect a folded wing before takeoff, compare tail spread during a turn or pull-up, examine the hooked beak from different views, or compare tucked and extended feet. Owl head prompts distinguish facial feathers from the visible feather tufts on a Great Horned Owl.
- Changing focus does not change the bird's pose, materials, animation, physics, or simulation clock. Closing study restores the original flight camera. There is no automatic orbit or new animation loop.
- **Keep moment** captures the selected region and records its label. **Match saved view** restores that region along with the orbit, elevation, and distance. Different regions cannot be reported as matching merely because the angles match.
- Region labels accompany image alternative text, comparison captions, field-notebook readings, text downloads, and visual-report captions. Notebook copies retain the original image and inspection context. Existing valid camera records without a region remain whole-bird views; unknown region identifiers disable camera matching while preserving the saved observation.

## Implementation

Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop distribution: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Dedicated coverage: `tests/e2e/raptor-study-anatomy.spec.ts`.

The study camera measures a selected subtree of the existing bird model using current morph weights and world transforms. Bounds are cached until the frozen pose or selected region changes. The framing overlay uses two non-interactive SVG paths; it adds no meshes, GPU materials, network assets, or render loop. Cleanup removes the selector handler and frame. A small diagnostic `studyFocus` field exposes the current region for browser verification.

Saved views gain an optional validated `focus` identifier and moments gain a translated `focusLabel`. Old records remain readable. The existing two-moment and JPEG-size limits are preserved. The canonical and desktop files are synchronized after verification. Shared host, harness, catalogs, language packs, and coordination files are outside this change. No commit, push, or deployment is performed.

## Scientific references

The short prompts describe visible features and invite comparisons; they do not infer force, hearing ability, or biological performance from the simulated image.

- [Cornell Lab: Everything You Need To Know About Feathers](https://academy.allaboutbirds.org/feathers-article/) supports the wing-feather surface, tail-steering context, and distinction between Great Horned Owl feather tufts and ears.
- [Cornell Lab: Great Horned Owl](https://www.allaboutbirds.org/guide/Great_Horned_Owl) describes facial disc feathers directing sound toward the ears.
- [Illinois Department of Natural Resources: Illinois Raptors](https://dnr.illinois.gov/education/wildaboutpages/wildaboutbirds/wildaboutbirdsraptors.html) provides the hooked-beak and talon context.

The model is simplified. Cropped images are framed individually, so their displayed sizes are not a common measurement scale. Existing comparison and report cautions remain in place.

## Validation and artifacts

The first visual run exposed an unsuitable overhead starting angle for a folded wing. A pose-dependent side view corrected it; the flying-foot starting angle was also moved below the bird after visual inspection. The refined three-scenario run passed.

The combined regression run passed 10 scenarios, exceeded the three-minute total allowance on the lengthy owl/fullscreen scenario, and skipped the following serial scenario. Its trace showed the geometry, accessibility, fullscreen, restart, and console-error assertions succeeding near the time limit. Only that scenario's total allowance was raised to five minutes; individual action and assertion limits were unchanged. Both affected scenarios passed in the targeted follow-up with no retries. **All 12 unique scenarios were validated across those runs**, not in one clean combined run. Scoped axe checks reported zero violations. Syntax and whitespace checks passed, and both distribution files are byte-identical. `verification.json` records the runs and final source hash.

New real-WebGL checks cover the projected geometry of all four regions, meaningful enlargement, frozen pose and material state, exact flight-camera restoration, changing frame positions, no idle rendering, below-body view capture and matching, folded owl geometry, phone and short-fullscreen layouts, reduced motion, forced colors, scoped accessibility, cleanup, comparison labels, notebook transfer, exports, restoration, valid legacy camera metadata, and unknown region identifiers.

```powershell
npx playwright test tests/e2e/raptor-study-anatomy.spec.ts tests/e2e/raptor-study-mode.spec.ts tests/e2e/raptor-study-observations.spec.ts tests/e2e/raptor-study-report.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list --output=reports/raptor-3d-anatomy-2026-09-27/final-browser-results
```

- `peregrine-head.png`, `peregrine-wing.png`, `peregrine-tail.png`, and `peregrine-feet.png`: live focused views.
- `owl-wing.png`, `owl-head.png`, and `owl-feet.png`: perched anatomy.
- `owl-head-phone.png` and `owl-feet-fullscreen.png`: responsive layouts.
- `tail-comparison.png` and `tail-observations.html`: the actual saved comparison and downloaded report, using illustrative notes.
- `translation-keys.json`: 24 new literal translation keys with English fallbacks; shared language-pack integration remains pending.

These are local Chromium/WebGL checks and visual review, not physical-device benchmarking or a measured classroom engagement result. The broader unit suite was not rerun; earlier Raptor reports document its existing baseline failures.
