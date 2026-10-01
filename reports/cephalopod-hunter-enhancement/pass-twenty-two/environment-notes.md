# Pass 22 environment: open glass-bottle shelter

The environment agent authored the guarded replacement and independently reviewed the saved source, six CPU test oracles, two new native lifecycle/material oracles and all five final bottle PNGs against their paired baselines. It did not execute the guard/tests/browser or edit the runtime, mirrors or Git. Root integrated and validated the final change. The user's **no commit / no staging** instruction persists.

## Visual change

The baseline bottle consists of a capped cylinder, a separate capped tapered neck and a gray metal cap. Its body and neck reuse one transparent material; the shoulder seam and closed cap are conspicuous in the actual shelf actor's side and mouth views. The native phone composition already fits the whole bottle above the controls, so this candidate retains its original dimensions and frame.

`createCLHuntBottleVisual(THREE)` authors a continuous circular profile with a rounded heel, narrowing shoulder, neck and open rolled mouth, then returns down the inside to a thick base. Two independently owned meshes divide that physical surface into transparent glass walls and an opaque glass finish at the rolled mouth, heel and bottom. Their boundary rings meet at identical positions; no overlapping face, colored mouth disk or detached collar is introduced. The real central opening passes through the neck into the body, ending at the inner floor near local Y=-0.282 rather than at the old cap.

Both surfaces use ordinary `MeshStandardMaterial` with white base and explicitly decoded green vertex colors. The wall is transparent, opacity 0.38, roughness 0.18, metalness 0, `DoubleSide` and `depthWrite:false`. The finish is opaque, roughness 0.30, metalness 0, `FrontSide` with normal depth writing. There are no new textures, shaders, refraction/transmission features, lights, postprocessing, dynamic uniforms or per-frame updates. This is illustrative alpha glass, not a physically accurate optical material. Nested walls can darken where ordinary alpha surfaces overlap, and Three.js mesh sorting is not order-independent transparency.

## Guard and behavior boundary

`apply-bottle-finish.cjs` exactly replaces only the original `makeBottleMesh` function (baseline canonical around lines 13137–13160) with the pure helper and new constructor. Check/candidate/default-apply modes follow the accepted report guard workflow; only root executes them. Reverse substitution must reproduce all original source and EOL bytes, and all full-runtime `Math.random` source lines must remain identical. Disjoint coconut construction and root-owned drop-grounding edits are tolerated because they are outside this exact visual block.

The original root is still a `THREE.Group` rotated around Z by pi/2. Meshes have identity local transforms. Geometry stays within local Y=-0.325..0.619 and radius <=0.22. No local center offset or compensating child rotation is introduced. Consequently the existing pickup reset to an upright root, carry position/wobble, restored sideways drop rotation, initial three-bottle plan, reject-sampled positions, wobble RNG, camouflage/speed modifiers, 120-second expiry, recycling, minimap and scene cleanup retain their original bottle behavior.

All non-carried shelter roots are still grounded by the existing `terrainHeight(x,z)+0.12` update. Since root Z rotation converts local X into world Y, the original circular body remains partially buried by about 0.10 units on a flat shelf. The narrow mouth stays above the sand there. This visual replacement intentionally retains that burial and does not conform a circular body to steep terrain or alter ground rules. Root separately integrated a fix that gives the immediate drop the same terrain+0.12 height before the existing update; that fix is outside this bottle guard.

## Geometry/resource contract

The assembly uses 32 angular samples and a 40-ring authored cross section. Each geometry independently caches its referenced ring vertices. Shared-boundary positions agree exactly, while all resources remain owned by their own mesh and independent from neighboring bottles. The base cap has copied shading vertices to separate its underside normals from the heel while preserving physical closure after position welding.

Root-measured counts for the validated candidate with SHA-256 prefix `993c9e23`:

| Owned slot | Vertices | Triangles | Raw PNC/index bytes |
| --- | ---: | ---: | ---: |
| `cl-glass-bottle-wall` | 960 | 1792 | 45312 |
| `cl-glass-bottle-finish` | 482 | 768 | 21960 |
| Complete bottle | **1442** | **2560** | **67272** |

The ceiling is 1,600 vertices and 2,800 triangles per bottle. PNC means position, normal and color; no UV attribute is needed. Normals, exact local bounding boxes and bounding spheres are computed once. All attributes and index buffers remain static during pause, inspection, resumed motion, reduced motion, carrying and dropping; only the original root transforms change. The existing traversal disposes two distinct geometries and two distinct materials once each, without shared-material cleanup changes. No frame-rate improvement has been measured or claimed.

`geometry.userData.clBottleParts` contains contiguous **index** ranges:

| Component / part | Start | Count | Triangles |
| --- | ---: | ---: | ---: |
| wall / outer-wall | 0 | 2688 | 896 |
| wall / inner-wall | 2688 | 2688 | 896 |
| finish / base-heel | 0 | 576 | 192 |
| finish / rolled-mouth | 576 | 1536 | 512 |
| finish / cavity-floor | 2112 | 96 | 32 |
| finish / base | 2208 | 96 | 32 |

`clBottleVisual` metadata contains version 1, the component name, `sides:32`, the complete radius/axial-height profile and `profileToRing`, an object mapping a numeric profile row to that geometry's actual first vertex index. The wall references rows 3..17 (starts 0..448) and 25..39 (starts 480..928). The finish references rows 0..3 (starts 0..96), 17..25 (starts 128..384) and 39 (start 416).

Actual per-component landmark indices:

| Component | Landmark | Vertex |
| --- | --- | ---: |
| wall | outerBodyRing | 32 |
| wall | shoulderRing | 224 |
| wall | outerNeckRing | 384 |
| wall | innerNeckRing | 544 |
| wall | innerBodyRing | 832 |
| wall | innerFloorRing | 928 |
| finish | outerBaseRing | 0 |
| finish | heelRing | 96 |
| finish | rimOuterRing | 192 |
| finish | rimCrestRing | 256 |
| finish | rimInnerRing | 352 |
| finish | neckJoinRing | 384 |
| finish | innerFloorRing | 416 |
| finish | floorCenter | 448 |
| finish | baseCapRing | 449 |
| finish | baseCenter | 481 |

Each ring starts 32 actual vertices. The floor lies at -0.282 and the underside at -0.325, giving 0.043 axial base thickness. The two geometry partitions are individually open at matching boundary rings; the **combined assembly** forms one position-welded closed shell surrounding a genuine open cavity. Tests must assess closure across both meshes rather than require each transparent/opaque partition to be an independent closed vessel.

## Validation contract

Run exact guard check/candidate modes and CPU tests before integration. Test finite PNC values, unit normals and actual face winding, analytic original envelope, contiguous semantic ranges and position-welded combined closure. Cast real +Y aperture rays through the lip/neck to the floor, and radial rays through body/neck walls, using the actual material sidedness; distinguish a deep opening from a colored cap or shallow lid. Verify exact copied/shared boundary positions, substantial base thickness and no overlapping coplanar faces. Check all three constructed bottles, deterministic no-RNG helper behavior, ordered shelter spawn draws, static arrays and independent disposal.

In the real native renderer, verify transparent wall blending and disabled depth writes, opaque finish depth writes and actual PNC buffer bindings. Exercise unchanged pickup/carry/drop rotation and original expiry/disposal, with the root-owned immediate-grounding regression handled separately. Capture the actual first shelf bottle from the exact baseline oblique, mouth, side, base and phone cameras. Confirm joined shoulder/neck, a readable real mouth, glass/edge contrast, ordinary alpha limitations, original burial and phone fit. Retain any failures and record measured counts and final visual limits after root execution.

## Recorded candidate validation

Root reported actual exit 0 for the guarded bottle candidate and **all six CPU cases passed** at `993c9e23`. Measured resources are two independently owned slots, **1,442 vertices / 2,560 triangles / 67,272 raw PNC/index bytes per bottle**. The CPU oracles directly inspect the real three actors and original ordered spawn draws; the combined position-welded surface and matching boundary edge incidence; finite outward-wound, unit-normal faces without duplicated physical triangles; five actual neck-to-floor rays and body/neck/base wall thickness; preserved sideways dimensions with a clear mouth over the flat shelf; stable independent resources and the strict two-minute expiry boundary.

Independent read-only review found those CPU oracles consistent with the authored geometry. The native pair uses actual GL blending/depth-write and PNC buffer hooks, real pickup/carry/drop/expiry actions and the existing continued carry wobble under reduced motion. Two small coverage suggestions were sent to its author: explicitly require blending disabled for opaque draws, and exactly one final disposal for each tracked owned resource. Both assertions were added before the successful final native run.

## Final recorded validation and independent visual acceptance

The final canonical source SHA-256 is `b34c982127743a9d1f47ed392d0d48d09fa6adba588560bb178ab5e180e5d369`. The saved [CPU report](unit-results.json) records **99/99 cases passed**, including all six bottle cases. The saved [shared native report](browser-results.json) records 15 passes and [mission report](browser-mission-results.json) records two passes: **17 native cases total, with zero unexpected failures, skips, flaky cases or errors**. These are combined simulator-suite totals, not 17 bottle-specific cases. The actual low/balanced shelter pair verifies blended glass with depth writes disabled, opaque finish with blending disabled and depth writes enabled, real PNC bindings, unchanged carry/drop rotation, static buffers and exactly one disposal per tracked owned resource after teardown. All execution was performed by root.

The final [capture report](capture-results.json) records all ten coconut/bottle images with `errors: []`. Root verified exact fixture equality for natural actor transforms, seed/state/wobble, other actors/phases and fixed world cameras. The world remained actually paused; only the native pause veil was hidden. The first bottle retained its original shelf position and partial burial. ReadPixels GPU-stall warnings were recorded, so these captures do not establish any frame-rate improvement.

Independent review accepted all five final bottle views against their paired initials: oblique, mouth, side, base and phone. The continuous body/shoulder/neck silhouette replaces the old detached capped primitives. The mouth view clearly shows the rolled opening; the heel/base remains joined. The whole silhouette fits above the native phone control row without clipping or HUD occlusion. No detached lip, blocked aperture, overlapping surface or new scope-blocking gap was visible.

Candid finish limits remain. Side and oblique views show angular bands through the shoulder/body from the nested ordinary alpha surfaces. The opaque base reads as a solid green disk with a stronger material boundary than the translucent walls. These are stylized glass choices and renderer limitations, not optical refraction or photorealistic glass. Original partial sand burial is preserved; the native ambient view has no added contact shadow and does not prove complete footprint contact on steep terrain. No refraction, added-shadow, full terrain-conformance or FPS improvement claim is made.
