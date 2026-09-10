# Geometry World art direction — matched render review

The new natural materials read more clearly at the normal Showcase distance. Brick mortar no longer dominates the roof as a dark lattice, wood grain remains visible in both quality profiles, and the stable material variation makes repeated blocks less uniform. Meadow has better depth from the richer distant terrain and vegetation. The authored build colors and the established sRGB output pipeline remain consistent with the baseline.

The main actionable issue in the first after set is the straight rectangular edge of the Studio contact helper, most visible in `after-pavilion-studio-saver.png`. The Studio owner is correcting its texture filtering and checking caption contrast in a separate final verification. These matched captures intentionally preserve the initial after implementation so that the comparison remains reproducible. Do not use them as evidence that the later Studio correction has been verified.

## Evidence

- `before-*.png`: eight frozen-source screenshots, pavilion and nine-material gallery, Meadow/Studio, Balanced/Saver.
- `after-*.png`: the same eight views with each exact baseline position, quaternion, and FOV restored and asserted.
- `baseline-results.json` and `after-results.json`: successful actual Chromium/WebGL runs with no page, console, or shader errors.
- `baseline-stl-results.json`: actual exports and full mesh buffer/transform hashes from the frozen before sources match the after fixtures exactly.
- `capture-comparison.json`: paired render counters and map usage.
- `before-stem_tool_geometryworld*.js` and `after-stem_tool_geometryworld*.js`: the exact served source snapshots; each run records their SHA-256 hashes.

All images use a 1200 × 820 viewport at DPR 1. The gallery intentionally retains the original fixture's half-unit gap between its half-height plinth and sample cubes so that before and after geometry is identical. That gap is not a contact-shadow regression.

## Geometry and print invariants

| Fixture | Printed triangles | STL bytes | SHA-256 before and after |
|---|---:|---:|---|
| Pavilion | 634 | 31,784 | `fcec4a5158452565fde809e983647bb251a48c40dcb2ef5365f7594dfdab7398` |
| Materials | 576 | 28,884 | `16094d34395d7fd6573072f71643b5075ff51b2e2a6f972ecc482883b683efe9` |

Within each after fixture, actual STL bytes, full geometry position/index buffers, mesh transforms, and history also remain identical through all four combinations of look and graphics profile. The optional bevel-material counter originally used an incorrect property path and was removed from the report rather than treating its zero as a measured result; the harness path is corrected for future use.

## Cost and material observations

At the matched pavilion Meadow view, Balanced grows from 13,190 to 14,850 rendered triangles and from 1,512 to 1,516 draw calls. Saver falls from 13,190 to 12,650 triangles, with 1,515 calls. Studio adds one two-triangle decorative helper. These are instantaneous render counters, not a frame-time benchmark.

All 146 natural-material pavilion surfaces use normal and roughness maps in Balanced; both map counts are zero in Saver. The painting and small color variation still improve Saver's appearance without those shader texture reads. The shared map construction is in the frozen after core around `makeSurfaceRoughnessTexture` (line 4405), material assignment (4459), and profile updates (3469). The richer stone, brick, and wood paintings start around lines 4124, 4270, and 4302.

Gold and diamond remain relatively flat at the overview distance. This is unchanged from the baseline and does not warrant disturbing the verified color pipeline during this focused pass. Any later reflective-material refinement should be judged at both close and normal Showcase distances with the same print and Saver checks.

## Reproduction

`capture-after.cjs` captures current sources while matching the saved baseline cameras. `verify-baseline-stl.cjs` explicitly serves the preserved before source files and exports only the two fixtures. The original `capture-baseline.cjs` freezes whatever source is current when launched; do not rerun it over these baseline artifacts after implementation changes.
