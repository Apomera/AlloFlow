# Pass seventeen — silverside prey morphology

The initial `initial-fish-side.png` shows a deep oval body, one triangular dorsal fin, a detached-looking black eye and a broad flat triangular tail. This pass refines `createCLHuntFish` only. The accepted cephalopod shell, eyes, crowns, body surfaces and animation functions are outside the replacement.

## Shape and finish

- A slender, longitudinally tapered body has a short slightly raised snout and a rounded belly. Explicit vertex-color rails carry a narrow silver band and darker upper outline from behind the pectoral region toward the tail. The stripe is integrated into the skin geometry, without a hovering ribbon or texture.
- Two separate dorsal membranes have a visible gap. The rear dorsal starts behind the anal fin's front; the anal base is longer than either dorsal base. Paired pelvic fins sit under the abdomen; paired pectoral fins fan behind the head. Modest alternating vertex tones suggest rays without lines, extra meshes or alpha blending.
- Pale iris tissue and a small dark pupil follow the actual triangulated body's surface. Their construction-only projection avoids floating sphere eyes. Relief is .00025–.0058 local units; there is no painted glint or eye shader.
- The tail has a small rounded peduncle overlapping the body at its unchanged hinge, plus two fuller fork lobes. The shorter lobes and shallower body remove the old oversized triangular profile while remaining inside the old footprint. Body length, rear tail extent and maximum pectoral span are unchanged.

## Biology and limits

Connecticut DEEP describes slender silversides with an upturned mouth, silver stripe, two separated dorsal fins, abdominal pelvic fins, and a long anal fin that starts ahead of the soft dorsal. These are the anatomical cues used here. [Connecticut DEEP, Silversides](https://portal.ct.gov/DEEP/Fishing/Freshwater/Freshwater-Fishes-of-Connecticut/Silversides).

New Jersey's fisheries account describes the Atlantic silverside's short head, large eyes, rounded pale belly, and silver band outlined by a narrow dark stripe. [NJDEP Bureau of Marine Fisheries, Atlantic Silversides](https://www.nj.gov/dep/fgw/artbaitfish15.htm).

The Chesapeake Bay page returned HTTP403 during this pass and is not used as evidence. This is a readable low-cost silverside illustration, not a measured species reconstruction. Fin membranes remain opaque, scales and exact fin-ray counts are omitted, and the unchanged material approximates silver under the existing lighting. All fins except the inherited tail hinge remain static.

## Ownership and cost

`cl-prey-fish`, `cl-fish-body`, `cl-fish-tail`, the `userData.tail` reference, `index*1.7` phase, `YXZ` order and tail anchor z=-.185 are preserved. Each fish still owns two geometries and one shared plain MeshStandardMaterial (roughness .34, metalness .18, DoubleSide). No textures, custom shaders, uniforms, world-RNG calls or per-frame allocation are introduced. Schooling, yaw, prey cues, collision/capture, phase accumulation, reduced motion and cleanup code are unchanged bytes outside the factory.

The existing rig has 1,818 nonindexed vertices /606 triangles. The new topology is expected to contain **2,334 vertices /778 triangles** (body2,160/720; tail174/58), a 28.4% submitted-triangle increase, with the same two draw calls. The proposed verification ceiling is2,500vertices/850triangles. These numbers are construction counts pending the independently run unit checks, not an executed measurement at authoring time.

Both final geometries compute bounding boxes and spheres. `geometry.userData.clFishParts` records semantic `{name,start,count}` ranges only; this adds no GPU attribute or draw. Body ranges: skin, iris-left/pupil-left/iris-right/pupil-right, dorsal-front/dorsal-rear/anal, paired pectoral and pelvic parts. Tail ranges: peduncle, caudal-lower, caudal-upper. Finished geometry remains nonindexed with position, normal and color attributes only.

## Guard and candidate

`apply-fish-finish.cjs` is a standalone exact-text guard around the original fish factory, with a reverse-byte proof, candidate parse, reference-anchor checks, and explicit direct-RNG exclusion. It accepts `--check` to verify without writing, `--candidate` to create an ignored candidate from current source, or no flag to apply. It deliberately accepts disjoint environment changes outside the factory.

`fish-candidate.generated.cjs` was generated textually from the saved pass17 baseline. The script and candidate were authored without executing them, parsing production, running unit checks, launching a browser or touching canonical/mirrors/Git. Root owns guard execution, integration and visual acceptance. The test agent owns new fish CPU and native GPU coverage.

## Verification and visual acceptance criteria

Check every position/color/normal for finite values, normal lengths and nondegenerate faces; the protected two-mesh/one-material ownership; contiguous part ranges; no lost phase/pivot references; and byte-identical source outside the factory. Measure fin basal contacts against actual skin triangles, eye relief against the actual body, and the peduncle leading section within the body through±.36radian tail yaw. Exercise existing moving/reduced-motion/inspection/resume behavior and disposal through the native rendering cases.

The closeup should show a continuous side stripe on both sides, two readable dorsal silhouettes, an anal fin ahead of the rear dorsal, embedded eyes without black floating beads, and two joined tail lobes rather than one large triangle. Inspect the same ordinary scene camera fixtures before/after, and confirm the school remains recognizable at play scale. Detailed fin color rays may be subtle at normal distance; silhouette and stripe carry the improvement.

## Final integrated validation

43 focused unit cases have passing evidence: 39 unchanged cases from the integrated angular-den batch, plus the same four den cases rerun after the final cavity-mouth correction. The unit runs use the prior pass16 30-second CLI ceiling. The initial 41/2 batch is retained in unit-initial.json; the rock test extraction was narrowed to its own function, and the plant assertions/source were unchanged. Four serial Chromium cases passed without retries; six exact-fixture final views were reviewed. All four runtimes match. Fish cost is 2,334 vertices / 778 triangles and 84,024 raw buffer bytes each; dens total 2,260 vertices / 1,208 triangles and 80,480 bytes. Draw and material counts stay fixed. Compared with the original den, the new shelter geometry offsets more triangles than the fish detail adds: 3,280 fewer triangles across the sixteen fish and four dens, with 192,304 additional raw buffer bytes. Applying the existing mineral shader to den stones adds fragment work; FPS and temporal shimmer were not measured.
