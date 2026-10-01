# Pass 21 reef environment: barrel sponge

Root integrated the guarded sponge replacement and ran the validation recorded below. The environment agent authored the guard and reviewed the saved source, tests and PNGs; it did not execute tests or modify the runtime, mirrors or Git. The user explicitly requested **no commit**.

## Why this prop

The baseline `makeSpongeMesh` constructor was an open 14-sided cylinder, a separate torus, a near-black flat disk just below the opening and ten box ridges. Each sponge owned 13 meshes, geometries and materials. Its shape looked constructed from separate primitives and its apparent cavity was shallow.

Coral colonies already have three curved growth forms and the accepted v14 surface finish. Seagrass already has seven instanced folded blades and the accepted v15 root-fixed flex; kelp additionally has attached ribbons from pass 16. Those accepted helpers and all their shader hooks remain outside this candidate.

The replacement builds one continuous, thick-walled barrel with ten broad rooted flutes, a gently uneven rounded lip and a genuinely descending inner bowl. Restrained baked vertex tones give the shoulder, lip, valleys and bowl different light responses. The design is an illustrative barrel sponge, not an exact species reconstruction. Smithsonian describes sponge bodies as tubes or sacks, with inlet pores and larger outlet openings called oscula; an osculum is not a mouth. [Smithsonian Qrius, About Sponges: Feeding](https://qrius.si.edu/taxonomy/term/11906).

## Source boundary and unchanged behavior

`apply-sponge-finish.cjs` replaces only the exact original `makeSpongeMesh` constructor with the pure `createCLHuntBarrelSpongeGeometry(THREE, variant)` helper and the new constructor. The original function begins around canonical line 13171 and ends immediately before `makeShelterMesh`. Exact substring matching makes the guard tolerate disjoint conch, prompt and other source edits while rejecting a changed sponge baseline. Reverse substitution must recover the original source and original EOL bytes. Full-runtime `Math.random` lines must remain identical, and the candidate must parse before it can be written.

The root stays a `THREE.Group` in the original frame. `spawnShelter`, initial three-sponge plan, rejection-sampled locations, original wobble draw, metadata assignment, static state, pickup prohibition, 0.45 camouflage bonus, 1.5-unit shelter radius, vertical aura limits, shelter den/regeneration rules, minimap identity, recycling and teardown are untouched. The visual variant derives from the existing `shelters.length`; the helper consumes no RNG. Original `updateGround` continues to position each non-carried shelter at `terrainHeight(x,z)+0.12`.

Only the mesh geometry reaches down to local Y=-0.12, so its basal skirt meets the terrain height at the root center while the gameplay root keeps its original position. The skirt is horizontal and does not conform its entire footprint to a steep slope. The upper lip remains near local Y=1.60 (analytic maximum <=1.608), retaining the old world height after the existing +0.12 offset. Horizontal radius stays below 0.59. No placement, collision, footprint detector or AI rule is introduced.

## Geometry and resource contract

The helper authors 24 cross-section rings with 40 angular samples, wrapping index edges without an angular seam duplication. The profile proceeds from the basal ring up the outside, over the rounded lip and down into the bowl. A shallow floor fan closes the interior; an independently shaded basal fan closes the underside. The latter uses 40 copied shading vertices at exactly the original basal positions, preserving a closed physical surface after position welding.

Root-confirmed topology: **1,002 vertices / 1,920 triangles / 47,592 raw attribute-and-index bytes per sponge**. PNC means position, normal and color attributes; there are no UVs or textures. Ceilings are 1,700 vertices and 2,600 triangles. The three real sponges retain independent resources. Each root contains one mesh named `cl-barrel-sponge`, one geometry and one opaque `MeshStandardMaterial` with white base, vertex colors, roughness 0.94 and metalness 0. Surface colors are explicitly decoded from sRGB before entering the linear vertex-color buffer. There are no shaders, uniforms, lights, postprocessing, frame updates or new callbacks. No measured frame-rate claim follows from reducing the visual slots.

`geometry.userData.clSpongeParts` contains contiguous **index** ranges:

| Part | Start | Count | Triangles |
| --- | ---: | ---: | ---: |
| outer-wall | 0 | 2400 | 800 |
| rim | 2400 | 1440 | 480 |
| inner-wall | 3840 | 1680 | 560 |
| floor | 5520 | 120 | 40 |
| base | 5640 | 120 | 40 |

`geometry.userData.clSpongeVisual` stores version, deterministic variant/form, 40 sides, 24 rings, 10 flutes, the authored radius/height/flute-weight profile and actual vertex landmarks:

| Landmark | Vertex index |
| --- | ---: |
| baseRing | 0 |
| outerShoulderRing | 240 |
| rimOuterRing | 400 |
| rimCrestRing | 520 |
| rimInnerRing | 640 |
| innerFloorRing | 920 |
| floorCenter | 960 |
| baseCapRing | 961 |
| baseCenter | 1001 |

Each ring landmark denotes its first of 40 actual vertices. `localFloorY` is 0.22 and `localRootY` is -0.12. These metadata values are references for meaningful tests of the actual mesh; they do not affect shelter behavior. Normals and exact local bounds are computed once during construction. All geometry attributes remain static thereafter. The existing scene traversal disposes the sole owned geometry and material once, without shared-material deduplication changes.

## Validation contract

Run the exact guard in check and candidate modes, then test the candidate before production integration. Verify deterministic finite PNC values, outward triangle winding and unit normals, analytic height/radius limits, welded physical closure, contiguous semantic ranges, actual rolled rim contacts and a real open aperture above the descending floor. Use rays through actual wall/floor faces to distinguish cavity depth and wall thickness from a flat shadow disk. Check zero helper RNG calls, all three actual static actors and independent disposal, preserving the original spawn draw sequence and shelter state.

Capture the real sponge from an oblique view, above the osculum, low at its sand contact and at the native phone viewport, using identical before/after fixture fields and world phases. Confirm the cavity reads as descending volume, the lip does not detach and the broad flutes remain attached to the basal skirt. Exercise the existing aura inside/outside 1.5 units and unchanged G-key pickup exclusion with the actual actor. Repeat pause/inspection/resume and teardown checks where appropriate; this geometry itself is static and adds no animation semantics.

Record measured counts, native errors and visible limitations after root runs. Do not claim biological pore-scale relief: the candidate uses broad geometry and low-frequency baked tones, with no new texture or custom surface shader.

## Recorded validation and independent visual acceptance

Root's final integrated source was reported as SHA-256 prefix `a7c1436b`. The saved [CPU report](unit-results.json) records **84/84 cases passed**, including all **five sponge cases**. Those sponge cases cover the actual three actors and ordered spawn draws, finite normals/winding and welded closure, real cavity/wall/rim rays, actual rooted flutes and the grounded envelope, static non-expiry and independent disposal. No sponge oracle was weakened during review.

The saved native reports record **14 cases passed, zero unexpected failures, skips, flaky cases or errors**: [shared native suite](browser-results.json), 9 cases; [predator suite](browser-predator-results.json), 3 cases; [mission suite](browser-mission-results.json), 2 cases. These are combined simulator-suite totals, not 14 sponge-specific cases. All test execution was performed by root.

The final [capture report](capture-results.json) records 12 images and `errors: []`. Root verified the exact before/after fixture JSON, including seed 2743, 20 counted simulation steps, natural actor transforms and world cameras. Only the native pause veil was hidden; the actual world remained paused. The capture report also records ReadPixels GPU-stall warnings, so this evidence does not establish a frame-rate improvement.

Independent review accepted all seven sponge views against their paired baselines: oblique, top, sand, reef, phone, natural third-sponge shelf and shelf-base. The rounded uneven lip joins the body; integrated broad flutes replace detached box ribs. The top view clearly reveals descending volume and warm interior shading instead of the baseline flat black disk. The natural shelf pair shows the lower skirt reaches farther toward the sand with a continuous basal outline. No detached lip, inverted surface or new visual gap was found that blocks this bounded geometry pass.

The original first sponge naturally sits at x=28.618 on the existing 24..47 shelf drop-off. Its background is a steep sand bank, so its horizontal lower ring still cannot make complete terrain contact around the footprint. The matched natural third-sponge shelf images clarify the improvement on ordinary ground; they do not prove slope conformance. Coral overlaps the first sponge's lower front in several views, and phone controls obscure most basal contact. The upper body and opening remain legible on the phone. Surface finish is intentionally smooth and illustrative, with broad flutes and baked tones; no pore-scale detail, species-exact reconstruction or full slope-contact claim is made.
