# Cephalopod Hunter — pass 43

Irregular mineral fragments now collect around large reef rocks. Their varied silhouettes, local stone colours and subtle contact shadows soften the transition to the sand. Each fragment is bedded against the actual terrain and follows its owner when the endless world recycles.

## Implementation

- One retained InstancedMesh owns one static geometry and one opaque Standard material. Each flattened, eroded fragment uses 240 non-indexed vertices / 80 triangles; averaged normals and linear vertex tint provide mineral shading.
- Low / balanced / high quality allocate 4 / 8 / 12 fragments per rock. The current 45-rock scene therefore reserves 180 / 360 / 540 slots; terrain and spacing filters leave some inactive. The isolated CPU fixture contains 44 rocks.
- A deterministic integer hash chooses two irregular pockets using cached rock hull edges. Rejection sampling separates fragments; smaller-quality layouts are exact subsets of larger ones. No gameplay RNG calls are added.
- The existing spawn and sandy mission route stay clear. Steep or curved shelf walls are omitted. Transformed fragment vertices determine terrain contact with 0.009 units of bedding.
- Ordinary frames do not upload instance buffers. The pool refreshes after actual rock recycling and keeps its geometry, material and array identities. Its color buffer is reserved to full capacity, including initially inactive slots.
- Balanced and high quality cast shadows through the existing shadow pass; low quality omits those casts. This adds one main colour batch plus the shadow-pass batch where enabled. No hardware frame-rate or audio-quality improvement is claimed.
- Three exact guarded changes add the factory, initial scene placement and recycled-rock update. Reversing them recovers the entire accepted pass42 source exactly. Animal geometry, strike behavior, navigation rules and gameplay RNG sequences remain unchanged.

## Verification

- refined-rubble.json: 6/6 new checks pass. Covers geometry/normals, nonzero capacity-sized instance colours, deterministic quality subsets, hull clearance, actual-vertex terrain bedding, route clearance, retained buffers, moved roots, shelf filtering, baseline restoration and independent disposal.
- refined-existing.json: 67/67 targeted existing checks pass, including habitat composition/placement, rock navigation/materials, sand, lighting/particles, paused cameras, target presentation and historical cuttlefish/prey comparisons.
- verified-native.json: 6/6 browser scenarios pass, one worker, no retries or skips. Desktop balanced and phone low/reduced motion verify native movement, pause/inspection, actual production rock recycling, colour capacity, deep terrain contact, compiled/linked shaders, bound instance attributes, retained buffers, stable uploads and disposal once. Existing navigation and targeting/strike-commitment scenarios pass.
- Native recycling is requested by translating the actual player to a distant coordinate. The production update loop and rock placement RNG run unchanged. This is an explicit test fixture, not a claim that the player traversed that distance using input.
- baseline-review-views and final-review-views contain four matched pairs. They retain all environment and animal meshes; only the diagnostic camera changes and UI overlays are hidden. The scene is paused synchronously before the first active tick. Exact camera, target and all original world transforms/visibility match. comparison-verification.json records this proof.
- source-audit.json: all four runtime mirrors match and pass node --check. Scoped git diff --check passes. Work remains uncommitted.
- The above is a targeted 73-check CPU result, not a full repository-suite claim. Five historical Humboldt fingerprint failures reported in pass42 were not rerun here.

## Development evidence

The capacity regression intentionally failed on the initial draft: Three.js r128 setColorAt allocated colours from mesh.count, which was initially zero. Explicit full-capacity allocation fixes it. color-capacity-regression.json preserves the failing test and source.

The first visual draft used overly regular spacing. initial-rubble-runtime.js and current-views retain that superseded version. The accepted source varies spacing and size and casts balanced/high shadows. final-views captures that source but has overly tight detail/phone framing; the gallery uses the improved camera framing in final-review-views.

The initial native run passed four existing scenarios and failed the two new capacity assertions because they assumed 44 rocks. The live scene has 45. native-test-refinement.json records the test correction to derive allocation from the actual scene, and verified-native.json is the accepted six-scenario result. Runtime source did not change between those runs.

Two historical fingerprint paths use the strict pass43 inverse before applying their existing reference adapters; their golden hashes are unchanged. The rock-navigation test now extracts the exact collision function body, so its allocation guard does not accidentally scan the newly adjacent decorative factory. The allocation assertion and live resolver are unchanged. test-reference-migrations.json records these narrow migrations.

Baseline SHA-256: 4f9b97974777ae1fbcab0d25cacca3b057646f8c077c7c9f8b84574ccf47c4c9
Final SHA-256: d9449284702fcfd30a7046083c2d3f4ca8fac77bc0ddf9eba60779744e07b409
