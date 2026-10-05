# Pass 38 coral branch form candidate

This task-local proposal changes the static branch positions and their normals. It has not been executed, integrated, tested, or visually approved by the authoring agent. The root executor owns those steps.

## Shape

Existing branches use nearly uniform, smoothly tapered tube radii. Interior rings now contract unequally while the broad accepted root rings and all rounded-cap rings retain their original position calculations. This makes the root collar, shoulder, and terminal lobe easier to distinguish. Strongly tapered antler branches receive a deeper waist than the short, fuller finger lobes and upright crown branchlets. A shallow asymmetric angular field breaks the perfect tube cross-section without adding microscopic geometry.

The maximum fractional contraction is 0.22: the shoulder envelope is in [0,1], the waist is at most 0.18, and the angular flute is in [0,0.04]. Every candidate vertex stays on its accepted center-to-vertex radial ray. The original ring center is inside its eight-sided polygon, so inward radial interpolation remains inside the old per-ring local coordinate bounds. The centerlines, first ring, terminal ring, three hemisphere-cap rows, branch endpoint anchors, and original trigonometric seam tolerances remain unchanged. Small ring-centroid shifts are intended when angular contraction differs between sides.

Only interior ring radii change. There is no true root welding, manifold fusion, or reconstruction of branch junction topology. Retaining broad basal collars makes the existing overlaps less tubular, but intersections may remain visible in some camera angles.

## Normals

Each branch accumulates triangle cross products from the actual Float32 position coordinates. Accumulation shares the closing seam and collapsed cap-tip representatives, then normalizes the sum for every copy. This produces area-weighted smooth normals that follow the changed shape and identical normals across those duplicated vertices. The existing analytic normal is only a fallback for a zero-area representative. Candidate checks should demand finite unit normals, correct triangle winding, face alignment, and exact seam/tip normal copies.

Positions on the closing seam and cap pole retain the accepted tiny trigonometric differences; this proposal does not claim exact geometric welding. No attributes, vertex/index counts, materials, programs, textures, draw calls, seeded random calls, colony placement transforms, metadata, or per-frame work are added. Temporary numeric arrays exist only during construction. Pass 37 tissue-color source lines are byte unchanged, and the color and clCoralSurface arrays should remain byte identical to the accepted geometries.

## Required independent validation

Restore the four literal guards to the accepted source and preserve all existing historical fixture checks. Across all 54 standard coral geometries, compare unchanged topology, color, and clCoralSurface arrays; exact accepted basal/cap positions; deterministic repeats; inward radial bounds; and actual current normals against independently accumulated Float32 triangles. Run seeded colony layout and recycling/clearance checks. Inspect ordinary scene views and form close-ups before retaining this design. The appearance claims above describe intent, not a completed visual result.
