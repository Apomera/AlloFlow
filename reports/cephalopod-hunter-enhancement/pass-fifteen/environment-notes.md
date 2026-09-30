# Rooted seagrass and kelp flex

The existing plants already have tapered, folded ribbon geometry. Their visible weakness was motion: each whole mesh rotated rigidly, leaving the blades looking like flat panels. This pass changes their pose in the vertex shader so the roots stay fixed while the upper blade bends and a slow wave travels along it. This is decorative underwater motion, not a simulated current field.

## Implementation and boundaries

`apply-plant-flex.cjs` inserts three helpers next to `createCLHuntPlantGeometry`, adds one persistent motion uniform to each existing plant record, and replaces the two rigid-sway assignments. The script guards five exact text blocks, restores the original line endings, parses the candidate, and reverses its edits to prove all other source text unchanged. Root applies it to the canonical file and syncs mirrors.

The existing plant vertex positions, normals, colors, UVs, indices, instance matrices, material properties, names, substrate metadata, root heights, placement and random draws are preserved. The construction check evaluates both source versions with bundled Three.js r128 and the same seed. It verifies all 525 placement/height/yaw/phase random draws, all 105 plant transforms and metadata, and byte-identical geometry and instance arrays. Rock/coral finishes, reef grounding, depth placement, recycling and camouflage rules are outside the patch.

The rooted envelope is `t²`, where `t` is blade height fraction. The two perpendicular displacements are bounded by 0.12 and 0.035 times original blade height; their combined displacement cannot exceed 0.125 times height. Both displacement and slope are zero at the root. Existing simulation clocks remain 1 radian/second for grass and 0.8 for kelp. A slower secondary phase and the immutable grass instance translations add variation without random draws. Mesh rotation Z stays zero.

The shader computes the analytic derivatives of each wave and applies the inverse-transpose shear to object normals before r128's instance and model normal transforms. The fragment shader, light setup and render passes remain untouched. Grass keeps its existing disabled frustum culling. Kelp's local bounding box expands by the full X/Z displacement limits and its sphere encloses that box, avoiding disappearances at the camera edge.

`clPlantMotion` is an independent `{ value: THREE.Vector4 }` captured by each material hook, also held on the corresponding plant record. Its components are primary phase, secondary phase, immutable height, and enabled flag. The material cache key is `cl-plant-flex-v15`. The shader markers are `clPlantOffset` and `clPlantSlope`.

The simulation's existing pause/inspection guard freezes the entire uniform. Reduced motion disables displacement and preserves the two phases; subsequent reduced-motion updates remain exactly static. Resuming restores the pose for current simulation time. Phases are wrapped to one revolution before uploading, avoiding large shader time values during long dives.

## Cost and preservation evidence

The dry-run construction comparison reports identical before/after totals:

| Resource | Before and after |
| --- | ---: |
| Plant meshes/materials | 105 / 105 |
| Unique geometry vertices | 4,065 |
| Maximum submitted vertices, including 7 grass instances | 19,905 |
| Maximum submitted triangles | 24,200 |
| Geometry attributes | 178,860 bytes |
| Geometry indices | 30,000 bytes |
| Instance matrices | 35,840 bytes |
| Combined raw buffers | 244,700 bytes |

These are all-plant submission ceilings, not a claim that every kelp strand is visible in every frame. Existing culling still determines actual submissions. There are no new meshes, draws, vertices, attributes, textures, lights or render passes. The added uniform payload is 105 vec4 values: 1,680 logical bytes, excluding JavaScript/driver overhead. Each submitted vertex evaluates two sine and two cosine functions plus scalar arithmetic and the shear normal correction. There is no added fragment work. Live CPU work updates the existing uniform vectors without allocations.

## Validation

The new focused unit file executes the actual injected GLSL wave function as scalars and checks displacement bounds, root/slope anchoring and finite-difference derivatives. It compares corrected normals to finite-difference surface tangents through instance/model transforms, tests kelp bounds against posed vertices, and verifies uniform identity, recompiles, long-dive phase wrapping and reduced-motion stability. The existing plant-geometry unit keeps all construction and grounding checks, with its old rigid-rotation motion oracle replaced by the new uniform contract.

The existing plant browser test retains its rendering, grounding, immutable-buffer and disposal checks; only its rigid-motion expectations change. The new shell/plants browser cases owned by the test agent additionally inspect real native GPU programs and uniform uploads at low and balanced quality, pause/inspection/reduced-motion/resume behavior, root placement, stable resource identities and cleanup. Browser execution and visual acceptance are root-owned; preparation and dry-run checks alone do not establish their outcome.

Final integration passed the complete 61-case focused CPU batch and five serial native browser cases, without retries. The four plant close-ups retain exact seeded placement, instance matrices, cameras, lights and fog at the two review times. Roots stay anchored while upper blades curve differently between the frames. The new uniforms and shaders were observed in submitted native programs; mathematical normals and roots are covered by CPU checks. No FPS or GPU vertex-readback claim is made.
