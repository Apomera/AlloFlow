# Cephalopod Hunter — pass 24

Completed 2026-10-01. Unstaged and uncommitted by user request.

The existing 25 kelp and 80 grass actors now form five rock-rooted groves with open sand between them. Placement reserves the starting area, mission route, rotated den approaches and placed shelters, checks actual reef vertex extents with expanded plant/flex clearance, and keeps roots on the shallow terrain. Original heights, yaw, phase, meshes, materials, buffers and random draw order remain intact. A bounded full-perimeter fallback handles blocked preferred crescents; streamed grass preserves its original logical recycling coordinates and draw sequence.

The same three lights now provide a clearer key, cooler fill, and smooth depth/night changes. Existing sand relief, caustics, surface glow and light planes respond to downwelling light. The backdrop matches fog on downward rays, preventing a visible water-column band. Terrain updates copy floor positions into the existing caustic array rather than allocate a replacement. No scene geometry, textures, lights, fullscreen passes or post-processing were added.

All four runtime copies have SHA-256 `3f8aa5f3215d33df0f7dbccc60fc495f71f2b5754a482cd3d482bd8446e28937`. The 12 pre-existing translation wrappers per runtime and all prior pass21–23 uncommitted changes are preserved. Source changes are confined to guarded habitat/lighting hunks with reverse-byte proofs. Actor models, other world roots, physics, AI, ink, shelter and mission rules are unchanged.

## Verification

- 67 distinct focused CPU cases across 13 files passed in documented batches; 16 relevant cases reran against the final canonical source.
- 14 distinct native Chromium cases passed, one worker and zero automatic retries, skips or flaky results in the complete selections. These include actual low/balanced plant, sand and water submissions, all105 visible/clear plants, stable buffers, exact resource cleanup, phone pixels, pause/inspection/reduced motion, and existing reef/foraging/eye regressions.
- Seven matched natural desktop/phone pairs retain the same seed, 20 counted simulation steps, nonplant actors/phases and world cameras. Plant positions intentionally change. Only the native pause veil is hidden; no actors or scenery are moved or hidden for natural composition.
- Three separate day/night/deep images use an exact reversible state-reference exposure and existing dive controls. Eleven existing light planes are compiled/drawn in a separate forced-effects diagnostic. These do not claim natural shaft visibility on software/low-power devices. The native spec prepares its diagnostic source automatically on a fresh checkout; retain `prepare-lighting-diagnostic.cjs` with it.

## Phone-sized software measurement

Same natural common-octopus seed2741, balanced quality,390×844 DPR1,10 warmup frames and60 controlled samples per source. Actual served-source hashes, nonplant construction, camera trajectory and static ownership are verified.

| Measurement | Before | After |
|---|---:|---:|
| Render CPU median / p95 | 4.00 / 8.20 ms | 4.00 / 5.90 ms |
| Production update-through-render CPU median / p95 | 7.30 / 13.90 ms | 7.25 / 11.80 ms |
| Actual GL draws per frame | 205–206 | 209–210 |
| Scene ArrayBuffer storage | 6,577,014 bytes | 6,577,014 bytes |
| Scene texture texel estimate | 524,288 bytes | 524,288 bytes |

The layout submits six more plant actors and four more draws in this view. More visible existing plants populate ten more renderer geometry-cache entries, bounded by the same480 owned geometries; textures/programs remain3/24 and caches do not grow during measurement. CPU spans include harness overhead and do not measure GPU completion, presentation, physical-phone FPS or establish a hardware speedup. Texture figures omit render targets and driver overhead.

## Retained findings and limits

The first lighting CPU fixture selected a recycling loop instead of shimmer; its extraction was corrected. A legacy streamed-den fixture was extended to execute the actual habitat helper with its empty plant pools, preserving all den/RNG assertions. An unchanged rock test exceeded the default timeout and passed the same assertions with a90-second budget. Native clearance initially used transformed local-box corners for irregular rocks; it now independently scans actual world vertices at the same margin. A phone pixel selector was corrected. The day/depth diagnostic caught an existing caustic-array replacement, fixed by the in-place copy. Initial results remain saved.

Independent visual review caught a hard blue backdrop band; fog parity and the gradient were corrected before final acceptance. One later worker failed before test execution, and one result write hit transient ENOSPC; both attempts remain recorded and were rerun after space became available. This task removed no files.

Groves remain illustrative, with the accepted procedural plant/model geometry and ordinary alpha limits. The phone HUD still covers a substantial portion of the view. Saturated streamed or deep sites can keep pooled plants hidden until a valid shelf site is available; all105 opening plants are visible and clear in the natural native cases. No physical-phone performance claim.

Preview: [http://127.0.0.1:59304/__harness?species=humboldtSquid&mode=observe&pass=24](http://127.0.0.1:59304/__harness?species=humboldtSquid&mode=observe&pass=24).

Evidence: `validation-summary.json`, `unit-summary.json`, `browser-candidate-summary.json`, `browser-natural-results.json`, `browser-legacy.json`, `capture-results.json`, `benchmark-results.json`, `benchmark-audit-amended.json`, `resource-integrity.json`, and the guarded author scripts.
