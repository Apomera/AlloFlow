# Pass eighteen: clam shell detail

The existing reef already has curved coral growth, filtered coral pores, mineral rock shading, folded kelp and terrain-conforming sand and caustics. This pass leaves that work alone and improves a remaining close-up seabed prop: clam prey built from two smooth hemispheres and three separate torus arcs.

## Shape and finish

`apply-clam-finish.cjs` replaces only the exact visual construction inside the clam spawn callback. Its nested `createCLHuntClamValveGeometry(THREE,upper)` builds an outer valve, a recessed inner surface and their connected perimeter in one static indexed buffer. Each shell has a broad, slightly asymmetric outline, a shallow bulge and seven restrained growth ridges sampled directly into its surface. The ridges have no detached mesh, shadow pass or animated displacement.

Twenty-four angular samples, sixteen outer radial rings and four inner radial rings provide the outline and relief. Three posterior perimeter samples form a flat hinge line. The rear wall closes to zero thickness there; the constructor omits its zero-area faces while retaining separate exterior/interior vertices for their opposing normals. The shell is geometrically closed at the coincident hinge positions rather than sharing those indexed vertices.

The upper shell stays at child index one. Its vertex Z coordinates are shifted by +0.29 and its mesh is positioned at Z −0.29, leaving the closed shell in the original neighborhood while putting the existing rotation origin on the posterior hinge. The unchanged negative X drill angle lifts the front rim; all three hinge samples remain fixed. The lower valve uses the same construction with shallower, mirrored height. Both are flatter than the original hemispheres, and the lower shell remains partly under the terrain through the unchanged group grounding.

Exterior tones use decoded muted beige, pale mineral and subdued olive-grey colors. Subtle alternating growth tones accompany the geometric ridges. The inner surface has a restrained pale finish with a small violet tint near its rear edge. The two ordinary Standard materials use white base color, vertex colors, roughness 0.78 and zero metalness. They have the same finish but are independently owned, so the existing traversal disposes each material once. There is no new shader, texture, uniform, light or render pass.

The visual reference is [NOAA Fisheries' hard clam/Northern quahog profile](https://www.fisheries.noaa.gov/species/hard-clam-northern-quahog/seafood), verified during this pass. It describes thick pale shells with concentric outer growth rings, a hinged bivalve construction and violet interior markings. Those features inform the illustrated geometry. This does not claim an exact species reconstruction or a biologically complete exposed animal; NOAA describes adults burrowing into sediment, while the simulator keeps shells visible as understandable prey targets.

## Protected behavior and construction contract

The guard allows independent changes outside the old clam visual block. Reversing its exact replacement must recover the entire original source byte for byte, including line endings and any unrelated crab work. It checks the original group-position statement and both drill/cancellation assignments explicitly. `--check` validates only, `--candidate` writes an ignored full candidate, and the default mode applies the guarded replacement; root owns all execution and integration.

All eight groups, initial coordinates, later mission relocation, `alive`/`drillProgress` metadata, terrain grounding, recycling, targeting, radius/range checks, duration, rewards, drilling and cancellation remain outside the patch. Construction consumes no dive RNG. Only mesh/group names are added: `cl-prey-clam`, `cl-clam-lower` and `cl-clam-upper`; the later `cl-mission-clam` name assignment remains intact. The upper child's rotation and all gameplay decisions are unchanged.

Both valve geometries and both materials are distinct within a clam and across its neighbors. Each geometry has only static position, normal and color attributes, an index, a computed box and sphere, and inspection metadata. `clClamParts` records exterior/interior/rim index ranges. `clClamValve` records the valve side, hinge Z, the three hinge columns, angular count, radial rows and outer/inner rim starts. No geometry array is updated during drilling: the existing mesh rotation does the work.

The paired closed valves fit within the original ±0.4 horizontal envelope and −0.4 to +0.45 vertical envelope, relative to the unchanged clam group. The construction target is at most 1,100 vertices and 2,000 triangles per pair. The first construction has 964 vertices and 1,908 triangles, with two meshes and two independently owned materials, replacing five meshes and four materials. It adds actual shell/interior detail while reducing ordinary draw count. These counts are not an FPS claim.

## Thin-rim normal refinement

Root's first integrated five-case CPU run passed four cases and failed the winding/normal case. A separate diagnostic measured 482 vertices and 954 triangles per valve and localized all 21 disagreeing triangle normals per valve to the connecting rim. Exterior and interior triangles had no failures. The initial normal calculation averaged the broad shell surfaces and narrow perimeter wall through shared rim vertices; opposing smooth surface normals could turn against the thin wall. The strict test exposed a production shading problem and remains unchanged.

`refine-clam-rim.cjs` guards the entire original authored helper, including its normal calculation, without executing the first patch script. It then duplicates only vertices referenced by already valid rim faces, copies each position/color exactly and redirects only that rim index range. The existing surfaces, physical faces, dimensions, relief, hinge and material ownership remain exact. The new rim has its own shading normals; closed geometric edges still join at identical positions. Copying only referenced vertices avoids allocating unused zero-normal vertices where the wall closes to the hinge line.

The old exterior/interior vertex ranges, outer/inner rim starts and all hinge samples remain unchanged. `clClamParts.rim` records the appended shading-vertex range. The refinement adds 44 referenced vertices per valve, keeping the pair under the 1,100-vertex ceiling with unchanged triangle count. Root measured 526 vertices per valve, or 1,052 per pair, before updating that deliberate exact count in the test. Winding, physical closure, normals, hinge and envelope checks retained their strict assertions and passed. The first failing run and its localized diagnostic remain evidence.

## Verification status

The author wrote only guarded scripts, an ignored diagnostic helper and this note. No production runtime, mirror, index or browser was changed by the author, and no unit/browser/capture process was run by the author. Root and the test agent own integration, measured counts, geometry/winding/bounds and hinge checks, native shader/resource checks, actual drill/cancel/capture/disposal checks and matched visual review. The existing coral/rock/plant shaders and gameplay regions should remain exact after integration.

## Final integrated validation

46 distinct focused unit cases have passing evidence: 41 retained unchanged, plus all five clam cases refreshed after the final exterior-tone polish. Four distinct browser scenarios pass: two unchanged target/mission cases and two refreshed native low/balanced cases. No browser retries, skipped or flaky cases. Nine final fixed-camera images were reviewed by root and independent reviewers. All four runtime hashes match.

The initial clam suite produced four passes and one real rim-normal failure. Separating the valid rim shading vertices resolved every measured failing face while leaving physical surfaces, closure and hinge exact. Final valves each contain 526 vertices / 954 triangles; the pair uses 49,320 raw buffer bytes. The final color polish changes only two exterior vertex-tone strings. The opened camera was refreshed in both baseline and final; every other saved fixture field stayed exact. Sand hides part of the half-buried lower bowl, and the thin hinge is best read from the side. Complete resource measurements and source hashes are in validation-summary.json.
