# Cephalopod Hunter — pass 23

The Humboldt squid now has a continuous attached muscular funnel with a narrowed nozzle, rolled outlet and actual recessed interior. Four small olive floats join the existing kelp blade bases. A nearby untouched clam no longer hides a failed prey strike: the existing miss or rock-obstruction explanation remains visible unless the player is actually gathering the clam.

The funnel keeps its original attachment frame and tint response. The squid's mantle, eyes, fins, arms, cupped suckers and directed strike clock remain protected, along with the eleven other complete animal rigs. Kelp retains all original 141 vertices and 504 indices byte for byte, all seagrass buffers, its existing shader and the ordered 525 plant-spawn random draws. No new texture, shader, light or per-frame geometry buffer is introduced. Prior pass 21/22 work is retained.

## Verified results

- **164 distinct unit cases across 30 files pass.** The first batch passed 140 cases but an obsolete delimiter prevented the three strike-clock cases from loading and left four files unreported. The corrected production-step boundary and those four files passed in a 24-case supplement. The unchanged runtime strike-render phase matches saved original b34 bytes. A final six-case kelp run verifies the permanent original-factory fixture, replacing an ignored-author-script dependency; those six are counted once. Original failure evidence is retained. During the final fixture run, five cases passed and the phase-sweep case exceeded its 30-second allowance at 37.1 seconds; the final 90-second allowance passes all six with the same assertions and samples. The first attempt is retained separately.
- **19 Chromium cases pass**, one worker, zero retries, no skips or flaky outcomes. Coverage includes actual linked programs, indexed surface submission, blend/depth state, live motion, inspection, reduced motion, phone framing, resource disposal, failed-strike explanations, complete clam meals, directed club contact, propulsion, selected-prey capture and mission rules.
- **Nine matched natural desktop/phone views accepted by root and an independent reviewer.** Fixed seed 2743, twenty counted 50ms steps, identical player/siphon frames, all 105 plant roots, twelve shelters, other actor phases and fixed world cameras. Only the native pause veil is hidden; actors and scenery are never moved or hidden for these images. Browser diagnostics contain no errors; screenshot readback reports ordinary ReadPixels performance warnings.
- Saved original feedback tests reproduce four CPU failures and two native visible-feedback failures, while their capture/full-meal controls pass. Final checks retain the original 200ms contact, 650ms recovery and 1800ms message interval.

Permanent regression fixtures are stored under tests/fixtures: the original twelve-rig protected fingerprints and the exact original kelp factory. Six earlier whole-rig fingerprints exclude only Humboldt's changed cl-siphon subtree, measured from saved original b34; other species' literal fingerprints remain intact. Three kelp topology expectations were updated narrowly. The funnel's dedicated physical oracle independently checks its closed indexed wall, consistent normals, attachment and five real aperture rays.

## Measured geometry cost

| Geometry | Original | Enhanced |
| --- | --- | --- |
| Humboldt funnel | 4 meshes, 274 vertices, 380 triangles, 11,048 bytes | 1 mesh, 578 vertices, 1,152 triangles, 27,720 bytes |
| One kelp | 141 vertices, 168 triangles, 7,212 bytes | 277 vertices, 424 triangles, 14,732 bytes |

Full Humboldt rig: 28 to 25 meshes, 10 to 8 owned materials, 283,936 to 300,608 geometry-buffer bytes. The 25 kelp plants add 188,000 bytes while retaining their 25 meshes/materials. Combined added attribute/index storage is 204,672 bytes (about 200 KiB). These are measured geometry costs, not a frame-rate benchmark.

The arm crown still partly masks the funnel aperture in natural close views. Eight-sided float facets and the existing foliage alpha overlap are visible at the closest camera; their detail is subtle at phone/reef distance. The initial camera set and images are retained separately; the final matched set uses more useful underside and blade-base angles. One baseline capture stalled before its first render, with no browser error, and is retained separately from the successful comparison runs.

## Paired views

| View | Before | After |
| --- | --- | --- |
| squid-profile | [Original](initial-squid-profile.png) | [Enhanced](squid-profile.png) |
| squid-funnel-oblique | [Original](initial-squid-funnel-oblique.png) | [Enhanced](squid-funnel-oblique.png) |
| squid-funnel-mouth | [Original](initial-squid-funnel-mouth.png) | [Enhanced](squid-funnel-mouth.png) |
| squid-underside | [Original](initial-squid-underside.png) | [Enhanced](squid-underside.png) |
| kelp-reef | [Original](initial-kelp-reef.png) | [Enhanced](kelp-reef.png) |
| kelp-bladder | [Original](initial-kelp-bladder.png) | [Enhanced](kelp-bladder.png) |
| kelp-blades | [Original](initial-kelp-blades.png) | [Enhanced](kelp-blades.png) |
| squid-phone | [Original](initial-squid-phone.png) | [Enhanced](squid-phone.png) |
| kelp-phone | [Original](initial-kelp-phone.png) | [Enhanced](kelp-phone.png) |

## Working tree and preview

All four runtime copies share SHA256 22314e02f0487b3ac626f26450392da440b2ea04ed0e1118b1326d4898d51c7e. All twelve pre-existing translation wrappers remain in each. Task-owned files are unstaged and have no new commits; no push or deployment was performed. The user's no-commit instruction remains in force.

[Open the current local Humboldt preview](http://127.0.0.1:50807/__harness?species=humboldtSquid&mode=observe&pass=23). HTTP200 and served runtime hash verified. [Validation summary](validation-summary.json) records counts, preservation boundaries and the report paths; local detailed logs retain every executed batch.
