# Kelp frond silhouette

The accepted pass-fifteen captures show better rooted motion, but kelp still reads as a lone, tall blade. This pass adds four alternating, curved, folded leaves to each existing kelp mesh. It is a stylized scene improvement, not a claim to model a particular kelp species.

## Scope and preservation

`apply-kelp-fronds.cjs` appends a kelp-only geometry block inside `createCLHuntPlantGeometry`. It guards the original topology line exactly, reverses the one insertion to prove that all other source text remains identical, restores the original line endings, and parses the candidate. Its default mode only checks; `--candidate` writes `kelp-candidate.generated.cjs`, and only root's explicit `--apply` can update the canonical source. A disjoint approved animal-model edit does not invalidate these local guards.

The entire original 19-row, three-column central kelp ribbon remains intact: the original 57 vertices, all position/normal/color/UV values, and the original 72 triangles remain as exact prefixes. This keeps the basal row, current height, existing silhouette spine and established rooting behavior. Four added seven-row, three-column ribbons attach to edge vertices on original rows 4, 7, 10 and 13, alternating sides. Each added leaf's base center copies its parent vertex exactly; its base color also matches that attachment. The wider middle, shallow central fold, curved outline and narrow non-collapsed tip create a readable frond shape. Every leaf remains below the original blade height.

Variation uses only the existing plant index. No random calls, objects, materials, attributes, textures, lights or render passes are added. The 80 seagrass meshes and their full geometry remain unchanged. All 525 seeded plant draws, 105 placements, yaw angles, phases, heights, instance matrices, root offsets, material properties and substrate metadata are preserved. The existing substrate radius stays 1.4; geometry does not add canopy-based cover or collision behavior. The static visual footprint is bounded below 1.25 m from the mesh origin; the measured maximum is 1.1723468254 m across all 25 variants.

The pass-fifteen flex shader, per-material uniforms and frame loop are untouched. Leaves share the original height-based deformation. Identical attachment coordinates therefore remain identical after bending, world rotation and translation. Normals and rest bounds are recomputed after all leaves are appended; original ribbon normals remain identical because added triangles use their own vertex indices. The existing kelp bound expansion still adds the full ±0.12H X and ±0.035H Z motion allowance to the complete new rest box, then encloses that box in the culling sphere. Root, pause, inspection, reduced-motion and resumed-motion contracts remain unchanged.

## Resource budget

| Resource | Before | Candidate |
| --- | ---: | ---: |
| Kelp vertices / triangles per mesh | 57 / 72 | 141 / 168 |
| Plant meshes / materials | 105 / 105 | 105 / 105 |
| Unique plant vertices | 4,065 | 6,165 |
| Maximum submitted plant vertices | 19,905 | 22,005 |
| Maximum submitted plant triangles | 24,200 | 26,600 |
| Attribute bytes | 178,860 | 271,260 |
| Index bytes | 30,000 | 44,400 |
| Instance matrix bytes | 35,840 | 35,840 |
| Combined raw buffers | 244,700 | 351,500 |

The increase is 106,800 raw buffer bytes. The existing draw ceiling, 105 independent motion uniforms and per-vertex shader cost are unchanged; there are more submitted vertices only when the additional kelp geometry is visible. These are geometry submission ceilings, not measured GPU frame times.

## Validation plan and status

The guarded check constructs baseline and candidate scenes with bundled r128 and identical seeded randomness. It compares every grass attribute/index/bound, every original kelp attribute/index prefix, plant transforms, metadata, materials, instance matrices and initial uniform values. It checks the actual construction budget and deterministic fingerprints before root integration.

`tests/cephalopodlab_kelp_fronds.test.js` adds three focused cases using strict native assertions in the exhaustive loops. They cover protected grass and central-ribbon fingerprints, finite normals and nondegenerate triangles across 75 kelp variants/heights, attachment and palette continuity, leaf taper/fold/outline, deterministic output, unchanged base/root positions, and all leaf vertices inside the existing expanded bounds while the actual shader kernel bends them. An explicit candidate-source environment variable supports checking the ignored candidate before integration; normal runs read canonical source.

The guarded candidate check passed against baseline `370db22149565f8f90605053afb16190b121c2b4effb7781ff1c7276fdd1095e`. It verified the exact preservation and resource counts above; the smallest triangle double-area was 0.0007085458, above the unchanged nondegeneracy threshold. The ignored kelp-only candidate SHA is `8edc03b1f7393da9675c3b62e0c08175e85d5743a91e2d7bfe33d267a89e8850`. All three focused candidate cases passed (191 ms, 69 ms, 1,521 ms; suite 5.68 seconds). Protected fingerprints are grass `c70667ade1521cb02324cecefe784c82f5579f4e0f67000ddc0221b211fb6691` and original kelp prefix `7303381a48058e243908182d076a8d74208380a7c1918d063d042f074e75df28`.

The test agent owns narrow migrations of the existing kelp count and single-ribbon assumptions. Existing flex, seeded placement, grounding, native GPU, motion-setting and cleanup assertions remain. Root owns canonical integration, mirror synchronization, browser execution and matched visual acceptance. The candidate CPU results do not establish final integrated browser or visual acceptance.

Final integrated validation: 70 latest focused unit cases and four serial native browser cases passed, without browser retries. Seven final views were accepted using actual scene lighting/fog and original seeded placement. The one initial normal-oracle failure was resolved with an inward finite difference at the clamped blade tip; production and the strict normal threshold were unchanged. All four runtime copies match. This does not establish FPS or temporal shimmer.
