# Pass nineteen — grouper morphology and visible heading

The grouper is an untouched weak point beside the newly finished fish, crab and clam prey. Its former model is an ellipsoid, cone tail and two yellow spheres; both eyes lie on the same lateral side at different heights. The head faces local +X, while pursuit uses Three's +Z-facing `lookAt`. Patrol assigns `patrolAngle + PI/2`, so the former +X snout points opposite the actual `(sin(angle),cos(angle))` movement. The shape obscures the direction of a nearby threat.

The bounded improvement authors the grouper in **+Z forward**, adds a stocky tapered body and broad head, an actually recessed mouth, paired attached eyes, gill-cover relief, continuous dorsal fin, paired pectoral and pelvic fins, an anal fin, and a rounded caudal fin. The only update-code change is patrol yaw from `gr.patrolAngle + Math.PI / 2` to `gr.patrolAngle`. Pursuit/search `lookAt` and movement remain unchanged.

## Anatomy references and limits

[NOAA Fisheries' red grouper account](https://www.fisheries.noaa.gov/species/red-grouper) identifies a robust body and large mouth, with a lower jaw that can project beyond the upper jaw. Those cues support a broad head and a restrained projecting lower lip rather than the old featureless oval.

[Florida Museum's goliath grouper account](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/goliath-grouper/) describes a broad head with small eyes, continuous dorsal fins, rounded pectorals larger than the pelvic fins, a rounded tail and muted brown/olive mottling. These are useful illustrative shape cues. The simulator's generic “Grouper” label is retained; this pass does not identify it as a red or goliath grouper, reproduce measured proportions, claim exact fin-ray counts, or add species-specific teeth/scales. Only morphology descriptions are used from those pages.

The model remains stylized and static. The small rest gape is not a bite timer, and the fin/eye detail is for recognition rather than a new tactical cue. There is no independent tail beat, jaw opening, transparency, texture, flashing, added light or material shader. Correct visible heading is the gameplay-readability improvement.

## Exact source scope

At authoring time the primitive construction occupies canonical lines12848–12870, before the existing `grouper.position.set(-25, 1.8, -20)` and `grouper.userData` initialization. The replacement inserts `createCLHuntGrouperGeometry(T,kind,side)` immediately before that local construction. Kind is `body`, `tail` or `eye`; side is-1/+1 only for the eyes.

The existing four mesh slots and transforms stay intact: body identity; tail position(-1.5,0,0) and rotation.z=-PI/2; eyes at(.9,+/-.25,.35). Geometry is authored in the grouper root frame and converted into those original child frames. This avoids changing unrelated references or transform ownership while making the visible animal face+Z. Final names are `cl-grouper-body`, `cl-grouper-tail`, `cl-grouper-eye-left` and `cl-grouper-eye-right`.

The second exact guard changes only the patrol-yaw line at16220. The detection helpers at14925–14935 evaluate distance, vertical separation, cover and ink; they do not use visual yaw. The position-based pursuit at14937–14946 remains byte-identical, as do all state transitions, random patrol turns, spawn metadata, home/cooldown values, damage, attack distance and sight memory. The existing search scan uses root yaw, which now correctly represents the model's forward axis. The accepted cephalopod factory and all prey/environment blocks remain outside both edits.

## Geometry and resources

All four meshes own separate indexed position/normal/color buffers and independently owned opaque white MeshStandardMaterials. The former two Basic yellow eye materials become ordinary lit Standard eye materials. Body roughness stays.55, tail.6; the new eye surfaces use.36. No custom hooks, maps, uniforms, groups, shader changes, RNG draws or per-frame arrays are introduced. The body and tail use DoubleSide for thin membranes. Every final geometry computes its normals and both bounding box and sphere.

Measured final construction counts:

| Mesh | Vertices | Triangles | Parts |
| --- | ---: | ---: | --- |
| Body |460|638|skin, mouth-recess, dorsal, anal, pectoral-left/right, pelvic-left/right, gill-left/right|
| Tail |83|107|peduncle, caudal|
| Left eye |81|112|iris, pupil|
| Right eye |81|112|iris, pupil|
| Total |705|969|4draws,4materials,4owned geometries|

The former primitives measured 228 vertices, 282 triangles and 8,988 raw geometry bytes. The final model uses 705 vertices, 969 triangles and 31,194 bytes; draw and material allocation counts remain four. The approved ceilings are 1,600 vertices and 2,600 triangles. These measured topology and buffer counts are not an FPS benchmark.

`geometry.userData.clGrouperParts` provides contiguous `{name,vertexStart,vertexCount,indexStart,indexCount}` spans. `clGrouperGeometry` records `kind`, `side`, `authoredFrame:'grouper-root'`, `forward:[0,0,1]`, `rootAnchor`, and `rootRotationZ`. This is CPU metadata, with no new buffer attribute or draw.

The mouth shares the skin's front ring and closes at a recessed interior pole. Fin bases sit on longitudinal skin edges. Gill and eye relief sample actual body triangles, avoiding ideal-ellipse attachment gaps. The peduncle overlaps the rear body. Eye iris and pupil share their aperture seam; no glowing eye or fake highlight is added.

## Guard and acceptance

`apply-grouper-finish.cjs` embeds the exact original construction and its replacement, plus the exact original/updated patrol-yaw lines. It reverses both edits and requires the full original bytes, allowing independent approved changes elsewhere. It parses the complete candidate and audits four independent geometries/materials, finite attributes, unit normals, semantic part counts and the resource ceiling. `--check` does not write; `--candidate` writes an ignored `grouper-candidate.generated.cjs`; default invocation applies canonical source. Root alone executes or integrates it.

The author has written only this note and the guarded script. No canonical/mirror/test/index changes, validation execution or browser/GPU work occurred during authoring. Root and the test agent own integrated CPU/GPU and visual evidence.

Acceptance should use actual geometry in world space, since legacy child transforms intentionally remain. Check finite unit normals/outward face agreement, all part bounds/counts, eye bilateral placement and shallow skin attachment, shared mouth seam and unobstructed front recess, attached fins and tail overlap, deterministic construction, independent cleanup and unchanged source outside the two guards. Check+Z snout alignment with travel at several patrol headings and with pursuit/search `lookAt`, while preserving random calls, path, damage and timers.

Capture matched side and three-quarter views, a frontal mouth/eye view, and a normal encounter at player distance on desktop/phone. The visible nose should follow patrol motion; the broad body and rounded tail should distinguish this predator from the slender silversides. Pause/inspection should freeze the entire rig, and reduced motion must preserve existing behavior. No new animation system is included.

## Final integrated validation

Root integrated both exact guarded stages and verified all four runtimes. The grouper candidate passed six CPU cases; the final integrated batch passed 52 cases. Eleven Chromium scenarios passed without retries, skips or flaky results. Root and independent review accepted all six matched desktop/phone captures. The real baseline grouper reproduction recorded health 100 → 65 without ink, then 65 → 30 despite one accepted cloud and a consumed charge. The unchanged strict regression now passes after the ink phase move.

Actual grouper resources: 705 vertices, 969 triangles, 31,194 raw geometry bytes, four meshes/materials/geometries. Other model and environment regions remain exact. Full hashes, initial defect, native scope and limitations are recorded in validation-summary.json.
