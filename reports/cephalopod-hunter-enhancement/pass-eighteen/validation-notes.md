# Crab and clam validation

Execution is owned by the main task. This file initially records test intent and fixture limits; it does not claim a passing run.

## Focused CPU coverage

- `tests/cephalopodlab_crab_geometry.test.js` extracts the actual crab construction and geometry helper, using bundled Three r128. Six scenarios protect the four spawn RNG draws, all three prey configurations, fallback type, existing body/eye/leg/claw/shell child order and transforms, finite bounds, unit normals, winding, semantic part spans, vertex colors, static buffers and independent disposal. Contact checks use actual cap vertices and incident cross-sections against carapace triangles at the full existing leg lift, count the real walking/support appendages, test a ray-clear pincer opening, and check shell lip and spire joining.
- `tests/cephalopodlab_clam_geometry.test.js` extracts the actual eight-clam constructor. Five scenarios cover the original food locations and drill constants, two opaque independently owned valves, finite outward-wound walls and welded physical closure, real ray-intersected wall thickness, posterior hinge samples through the complete opening range, rim compatibility, deterministic/static resources and capture disposal.
- The upper clam's posterior hinge is its actual child origin. Tests sample authored vertices, transform them through actual mesh matrices, and check that opening lifts the front while holding the rear fixed. They do not use a replacement visual model.

## Native browser pair

`tests/e2e/cephalopod-crab-clam-visuals.spec.ts` contains exactly two cases, one at low quality and one balanced. Video and trace are disabled, and retries are zero. The main task runs one worker serially.

The fixtures use existing scene actors. The baseline inventory showed that seed 2741 has six rock and four red crabs, while seed 2742 has six rock and four hermits. Low quality uses the former; balanced uses the latter. No actor subtype is fabricated. The initial capture inventory misses are retained as discovery evidence, not application failures.

Both cases record real `onAfterRender` submissions and inspect native shader compile/link status, actual enabled/bound position/normal/color attributes, and normal matrices where the material uses them. The balanced case additionally exercises all four hermit shell render meshes. They retain the ten-crab/eight-clam population, relocate existing specimens into a controlled approach, move incidental rocks out of the food path, and defer predator attacks. This checks the real visual and input/capture paths rather than natural spawn visibility or encounter balance.

The counted simulation clock advances in 50 ms steps. Ordinary controls start drilling, pause/cancel it, restart and cancel through movement, enter inspection, orbit, resume, change reduced motion, finish one clam meal, and capture a red crab or hermit. The surviving clam must receive fresh native draws after its neighbor is eaten. The hermit must leave exactly one free conch shelter, while the red crab leaves none. Resource listeners distinguish eaten ownership from surviving actors and final unmount cleanup.

## Preserved behavior and limits

- Crab walking and leg lifting already continue under reduced motion. This pass preserves that behavior; inspection and ordinary pause freeze them. The tests do not introduce a new reduced-motion rule.
- Inspection camera smoothing uses render time while simulation state is paused. Camera checks therefore advance counted render steps after orbit controls while requiring prey state and geometry to remain frozen.
- Static geometry means object/attribute/index identities, array bytes and upload versions remain unchanged. It does not mean live actors stop moving.
- Native submissions and linked programs establish actual GPU participation. They do not establish biological photorealism, frame-rate improvement, or perceptual quality; the main task's fixed-view before/after captures address appearance.
- The CPU shells are physical surface models. Position welding is used only to test closure across intentionally duplicated shading vertices, with a tolerance well below visible shell thickness.
- No whole-animal or unrelated plant baseline was changed. The production guards own exact source-isolation proof, and existing gameplay regressions remain separate evidence.

## Execution evidence

The main task's first correctly selected clam run recorded four passes and one failure in the winding/normal consistency case. Diagnosis localized the issue to the thin rim's shading normals; duplicating only its valid shading vertices resolved it without loosening the assertion. `unit-clam-results.json` retains that initial result. The earlier `unit-clam-initial.json` selected an incorrect filename and contains zero tests; it is a command-selection failure, not test evidence.

Crab CPU and native browser runs passed. Initial failures, their diagnosis and subsequent passing evidence remain separate records.

## Final integrated validation

46 distinct focused unit cases have passing evidence: 41 retained unchanged, plus all five clam cases refreshed after the final exterior-tone polish. Four distinct browser scenarios pass: two unchanged target/mission cases and two refreshed native low/balanced cases. No browser retries, skipped or flaky cases. Nine final fixed-camera images were reviewed by root and independent reviewers. All four runtime hashes match.

The initial clam suite produced four passes and one real rim-normal failure. Separating the valid rim shading vertices resolved every measured failing face while leaving physical surfaces, closure and hinge exact. Final valves each contain 526 vertices / 954 triangles; the pair uses 49,320 raw buffer bytes. The final color polish changes only two exterior vertex-tone strings. The opened camera was refreshed in both baseline and final; every other saved fixture field stayed exact. Sand hides part of the half-buried lower bowl, and the thin hinge is best read from the side. Complete resource measurements and source hashes are in validation-summary.json.
