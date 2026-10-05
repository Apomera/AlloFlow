# Cephalopod Hunter — pass 42

The cuttlefish now has one continuous funnel with a rolled outlet, recessed cavity and ventral slope. The full opening clears the head while the base remains embedded. Switching View while paused changes the camera immediately and updates target-marker orientation in the same event.

## Implementation

- One opaque Standard-material funnel mesh replaces four meshes and three materials. The new geometry has 578 vertices and 1,152 triangles. Triangle count increases while mesh/material counts decrease; no hardware performance gain is claimed.
- Shared indexed rings join the outer muscle, lip and cavity. Linear vertex colours shade the wall and recess; existing animal tint remains active. Buffers stay static and independently owned.
- Full-animal review caught the first proposal intersecting the head. The final ventral slope preserves its attachment and topology while exposing both complete outlet rings. Initial proposal and renders remain as superseded evidence.
- Paused View retains terrain/rock camera constraints, with an immediate snap and billboard refresh. Active interpolation, inspection, reduced motion, actors, game time, strike commitment and cooldowns remain unchanged.
- Eleven other complete species and all non-funnel cuttlefish anatomy match the actual prior factory over four live poses. The narrow reverse adapter recovers the exact entire accepted pass41 runtime.

## Verification

- final-new-cpu.json: 12/12 pass. Tests cover topology, cavity depth, head attachment and outlet clearance, static arrays, tint, ownership, disposal, all-species equivalence and paused camera behavior.
- final-existing-cpu.json: 59/64 pass. The five failures are pre-existing Humboldt historical fingerprints. The original baseline was 48/53. comparison-verification.json verifies identical assertion messages. Original golden values were not replaced.
- Combined final CPU result: 71/76 pass, with those same five pre-existing failures. This is not a clean full-suite pass.
- baseline-camera-regression.json: immediate View, rock-clearance and terrain-clearance checks fail on the unchanged starting source; the other three pass. All six pass on the final source.
- final-native.json: 7/7 real-browser scenarios pass, one worker, retries zero, no skips. Desktop balanced and phone low/reduced motion cover native keyboard and Tools-menu View events, frozen actors/HUD, inspection, linked shaders, bound position/normal/color attributes, retained buffers and disposal exactly once. Existing target following, reach transitions and paused committed strikes also pass.
- final-model and final-detail: six captures paired with exactly equal original actor and camera transforms. Shaders compile/link; resources remain stable; page errors and post-unmount context leaks are empty.
- final-natural: two native cuttlefish dives at 51 controlled 0.05-second ticks. Movement and Side view use W/Space/V handlers. Full scene/interface remain visible; only the pause veil is hidden. No sound-quality or hardware-FPS claims.
- source-audit.json: four identical runtime mirrors, all pass node --check; scoped git diff --check passes. No staging, commit, push or deployment.

## Evidence and scope

gallery.html contains before/after sliders and native environment views. Diagnostic comparisons mask environmental meshes; the isolated funnel also masks the animal. Lighting, materials and actor transforms are not changed by capture.

baseline-model/failure.json retains an initial browser/context closure after two images. Exact cause is unestablished. An attached retry on identical source completed all views; baseline-recovery.json and its receipt record this.

current-model, current-detail, current-native.json and candidate-initial-runtime.js describe the earlier proposal before the clearance correction. Acceptance uses final-* evidence.

Historical test adapters undo this pass only in existing golden-comparison paths. Live geometry, shading, ownership and animation checks remain on the current implementation. test-reference-migrations.json records those changes; original golden bytes remain unchanged.

Baseline SHA-256: 212a92ee1d0be28ef01f56a540486065d394d14e48e2bc63a3df8d5a2d05a6ba
Final SHA-256: 4f9b97974777ae1fbcab0d25cacca3b057646f8c077c7c9f8b84574ccf47c4c9
