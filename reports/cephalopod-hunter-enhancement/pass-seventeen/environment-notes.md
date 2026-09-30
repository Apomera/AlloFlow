# Pass seventeen: den stone finish

The baseline den reads as a pale manufactured slab resting on two smooth ovals, with a flat dark rectangle behind it. The first finish improved the mineral palette, but matched entrance and phone images still showed a lid over two eggs. That shape was not accepted as sufficient. The second guarded refinement replaces the oval forms with grounded, angular stones and a connected shallow interior, while retaining the shelter indicator and rules.

## Geometry and appearance

`apply-den-finish.cjs` is the first-stage input. `refine-den-forms.cjs` guards its exact helper text and cavity material, replacing only those regions in `stem_lab/stem_tool_cephalopodlab.js`. The revised pillars use five unequal eight-corner profiles with broad flat soles; the canopy uses four unequal profiles and a thicker, chipped outline. Side panels and end caps have separate vertices for readable large faces. Deterministic profile offsets vary the four arches without consuming random values.

The stronger forms stay inside each original stone's local axis-aligned box, rather than its ellipsoid. Their exact lowest and highest Y bounds remain unchanged. Together with unchanged transforms, the box constraint preserves the original inner doorway clearance planes and exterior extent. Actual triangle intersections test that the canopy still overlaps both pillar surfaces. Normals and culling bounds are computed once. Stone attributes remain position, normal and UV; topology changes intentionally. There is no frame-time geometry update.

The three stones in each den share one opaque, rough material. Four subdued, decoded earth/olive colors connect the dens to the adjacent reef. Supported renderers reuse the accepted `shadeCLHuntRockSurface` hook and `cl-rock-surface-v1` cache key; the existing `reefSurface` hook remains the fallback when standard derivatives are unavailable. Neither hook adds textures or material uniforms.

The existing dark entrance mesh becomes a connected 19-vertex interior. Both front and rear opening rims lead inward to a narrower, darker central wall; sides, floor and ceiling reveal its depth. Its local X/Y extent stays inside the old 2 × 1.5 footprint; its final world-relative depth is −0.40 to +0.17, inside the stone envelopes. The same one Basic material is now opaque white with restrained vertex colors, darkening toward the inner wall, and remains double-sided. No image texture or additional material is needed. This is an illustrative visual cavity, not a physically simulated interior or new shadow pass.

The first angular-form captures showed a substantial silhouette and opening improvement, but the front reveal extended over both stone shoulders as pointed dark wedges and exposed a small floor lip. `refine-den-mouth.cjs` changes only the front layer from local Z +0.39 to +0.16, seating it farther inside the stones. The inner layer at 0, rear layer at −0.41, all X/Y values, colors, topology, and stone geometry remain exact. Counts and resource budgets do not change. Its separate candidate is `den-mouth-candidate.generated.cjs`.

## Protected behavior and resource budget

All three guarded scripts prove that reversing their exact replacements recovers the entire input source, including independently integrated fish work. The refinement reads the first script's helper literal as its exact expected input. Guards do not require a whole-file baseline hash. The scripts preserve line endings and parse the candidate before writing it.

The four seeded den positions, all four yaw RNG calls, pillar/lintel transforms, radius, metadata, glow geometry/material, and glow references remain unchanged. The later first-den relocation to `(0, -8)` and `cl-home` name, terrain grounding, true-height shelter predicate, regeneration, predator behavior, recycling, and minimap remain outside the patch. Den stones are not inserted into any collision or camouflage arrays. New names identify only visual objects (`cl-den`, `cl-den-rock`, `cl-den-rock-material`).

| Resource, all four dens | Original | First finish | Revised forms |
| --- | ---: | ---: | ---: |
| Meshes / maximum ordinary draws | 20 | 20 | 20 |
| Materials | 12 | 12 | 12 |
| Vertices | 4,436 | 4,600 | 2,260 |
| Triangles | 7,240 | 7,488 | 1,208 |
| Raw attribute/index storage | 185,392 bytes | 192,128 bytes | 80,480 bytes |

Each revised den still has five children: two pillars (176 vertices/80 triangles each), canopy (144/64), interior (19/30), and unchanged glow ring (50/48). Total: 565 vertices and 302 triangles per den. The interior adds a 19-element RGB color attribute; the reduced stone topology more than offsets it. No light, texture, material, shader hook, uniform, render pass, or mesh is added by the refinement. The accepted rock fragment shading costs more than the original flat standard material; resource counts are not a performance measurement.

## Checks and review status

The first finish's `guard-den-finish.json`, CPU results and six captures are retained as separate evidence. Root integrated the angular-form candidate, then the isolated mouth-depth correction, and synchronized the four runtimes. `guard-den.json` contains the combined final stages; the author did not write production source.

`tests/cephalopodlab_den_geometry.test.js` retains four focused cases: twelve deterministic stone shapes, finite normals/topology/bounds and joined panels; doorway/footing, connected depth-darkened interior, and actual ray-triangle contact; seeded placement, ring identity, shared materials and exact resource budget; and the bundled r128 rock shader/fallback without buffer mutation. The contact check now raycasts both the actual pillar top and canopy underside above each pillar center, requiring more than 0.005 units of overlap. This detects floating roofs that bounding boxes would miss. Tests explicitly replace obsolete sphere UV/index/radial contracts with the approved angular-form envelope, exact vertical bounds, grounding and panel-joint contracts.

Root ran the integrated 43-case unit batch and refreshed all four den cases after the final mouth correction. Low and balanced native cases passed, including a real bound RGB cavity attribute and color-enabled program. Root and independent review accepted the fresh entrance, three-quarter and phone views: the canopy and supports meet, the front reveal no longer projects over the shoulders, and the dark opening remains readable. The shelter remains an illustrative three-stone arch with a shallow interior. Shelter behavior code is byte-identical outside the visual patch.

## Final integrated validation

43 focused unit cases have passing evidence: 39 unchanged cases from the integrated angular-den batch, plus the same four den cases rerun after the final cavity-mouth correction. The unit runs use the prior pass16 30-second CLI ceiling. The initial 41/2 batch is retained in unit-initial.json; the rock test extraction was narrowed to its own function, and the plant assertions/source were unchanged. Four serial Chromium cases passed without retries; six exact-fixture final views were reviewed. All four runtimes match. Fish cost is 2,334 vertices / 778 triangles and 84,024 raw buffer bytes each; dens total 2,260 vertices / 1,208 triangles and 80,480 bytes. Draw and material counts stay fixed. Compared with the original den, the new shelter geometry offsets more triangles than the fish detail adds: 3,280 fewer triangles across the sixteen fish and four dens, with 192,304 additional raw buffer bytes. Applying the existing mineral shader to den stones adds fragment work; FPS and temporal shimmer were not measured.
