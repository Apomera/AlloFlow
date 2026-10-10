# Cephalopod Hunter — pass 44

Large reef rocks now carry irregular pale mineral seams, softer secondary deposits and mottled earthy variation. Their broad color structure complements the existing fine rock relief and nearby rubble. Rock shapes, navigation boundaries and camouflage tints remain unchanged.

## Implementation

- The color field is baked once into the existing 425 vertices of each reef rock. It follows the same local bedding coordinates as the rock form, with a wandering seam and irregular interruptions rather than evenly repeated stripes.
- One RGB Float32 color attribute adds 5,100 bytes per rock: 229,500 bytes across the native 45-rock scene. No meshes, materials, triangles, textures, uniforms or animation callbacks are added. The existing Standard material enables vertex colors; its derivative-filtered grain shader remains byte exact.
- Vertex values are linear multipliers, so some exceed one; the resulting material-color products stay between zero and one across the checked rock palettes. The original material tint remains available for camouflage and rubble matching.
- Position, normal, index and UV arrays, root transforms, geometry ownership, shadow settings, roughness and shader fallback selection remain byte exact. The collision hulls and rubble instance matrices/colors also match the prior build exactly.
- No gameplay RNG calls are added. All three shader-capability branches retain their seeded placements and random draw sequences.
- Three narrow source edits add the color factory, call it during construction and enable the existing material color channel. Their strict inverse recovers the entire accepted pass43 runtime.

## Verification

- baseline-existing.json: 77/77 targeted existing checks passed before editing.
- final-mineral.json: 5/5 new checks pass. Covers full source restoration, seeded spawn equivalence across three shader-capability profiles, effective albedo bounds, all 180 size/form color fields, seam/pole closure, bounded edge transitions, unchanged buffers and collision/rubble data, independent ownership and disposal.
- final-existing.json: 77/77 targeted existing checks pass, covering rock materials/navigation, reef placement, habitat, rubble, sand, lighting, particles, paused cameras, target presentation and historical anatomy/prey comparisons.
- native-accepted-results.json combines eight passing native scenarios at the same final runtime SHA. Six existing navigation, targeting/strike commitment and rubble scenarios passed in final-native.json; the two new mineral scenarios passed in verified-mineral-native.json after their test camera probe was corrected. Both runs used one worker, zero retries/skips.
- The new desktop balanced and phone low/reduced-motion scenarios verify linked/compiled shaders and bound color buffers through native movement, paused View changes, inspection and actual reef recycling. All rock buffers remain byte exact with color versions at zero; geometry/material disposal occurs once.
- The native recycling fixtures translate the actual player to a distant coordinate to trigger the unchanged production recycler. They leave the rocks, placement RNG and update callback intact; this is not a claim of input-driven traversal over that entire distance.
- baseline-views reuses the accepted pass43 images at the exact starting SHA, with image hashes reverified. final-views contains four fresh native captures at identical frozen scene/camera poses. All environment and animal meshes remain visible; overlays alone are hidden. comparison-verification.json verifies exact world/camera/target matches.
- source-audit.json: four identical runtime mirrors pass node --check; scoped git diff --check passes. No staging, commit, push or deployment.
- No hardware frame-rate or audio-quality result is claimed. These 82 CPU checks are targeted, not a full repository-suite run. Five historical Humboldt fingerprint failures documented in pass42 were not rerun here.

## Review history

candidate-views and initial-mineral-runtime.js retain the initial, overly subtle color field. Rendered inspection led to wider seams and stronger bounded contrast. visual-refinement.json records the exact adjustment; acceptance uses final-* evidence.

The first native run passed all six existing scenarios but the two new tests read a nonexistent recorder.camera property. The recorder stores the scene only. The new probe now captures the real camera argument from the mesh render hook; assertions and production code were unchanged. Only those two affected scenarios were rerun. native-test-refinement.json records the correction; verified-mineral-native.json is their accepted result.

candidate-existing.json passed 76 checks and failed one historical habitat fingerprint because its pass37 inverse could not remove the later color factory. That fingerprint now applies the exact pass44 inverse first; its original golden value is unchanged. Five historical comparison paths in total received narrow inverse-chain migrations. Live checks remain on current code except the explicitly historical pass37 form suite, whose accepted old source remains reconstructed as before. The new finish suite independently proves current geometry matches pass43. test-reference-migrations.json records every change.

Baseline SHA-256: d9449284702fcfd30a7046083c2d3f4ca8fac77bc0ddf9eba60779744e07b409
Final SHA-256: d93976fa207ae4fade26d361453042c2a8d0216f18c1c3932dcfac15eda3aed7
