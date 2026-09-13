# Garden and shipping preset corrections

Prepared September 12, 2026. The supplied patch modifies only the two existing lesson definitions; other presets and runtime engine behavior are preserved. The parent task applies production changes and synchronizes mirrors.

## Geometry Garden

The old nested model filled all 125 positions with glass before attempting to place its gold center. The first-fill-wins loader therefore discarded every gold cube. Six disjoint shell fills now contain exactly 98 glass cells, leaving the 27 inner positions for the 3 by 3 by 3 gold cube. The complete touching model measures 125, with the correct material breakdown. Dialogue explicitly explains this combined measurement.

Two other geometry contacts corrupted advertised measurements: the L-shaped model touched the long 24-volume gold slab, and the compact 24-volume model touched a decorative bed and bench. Moving the L one cell along z and relocating the bed leaves clear gaps without changing the teaching dimensions. Expected independent occupied counts are 1, 5, 15, 45, 24, 24, 24, 72, 125, and 85.

Ground extends to x = 54, providing support beyond the hidden monument's x = 52 extent. A level stone turn at x = 43..45, z = 7..12 joins the approach at x = 46..54, z = 10..12. This passes around the screen wall instead of asking learners to jump over it or walk through the monument. All nine guides stand on clear ground; eight activity arrivals avoid body-column collisions.

Eight optional discovery activities progress through unit cube, row, top-surface area, layers, equal volumes, composition, nested cubes, and the hidden stepped monument. They contain hints, self-review evidence, and reflections, with no scored questions or scripted unlocks. Descriptions distinguish three-dimensional block models from the length or area they illustrate. The hidden monument has layer counts 45, 21, 15, 3, and 1: 85 occupied cubic units. It is described as a stepped approximation, not an exact pyramid or a shape requiring calculus to understand.

The corrected Garden contains 1,891 separately batched ground cells and 470 other cells, leaving 1,030 places within the 1,500 construction-block limit.

## Real-World Packing & Shipping

The usable shipping interior is 6 by 2 by 3, with volume 36. Its displayed three axis-aligned 2 by 2 by 2 boxes occupy 24. The remaining 12 positions form a strip only one unit deep, so a fourth whole box cannot fit. Corrected questions teach the dimension constraint and distinguish the volume quotient from an actual packing arrangement. A finite search across every integer-aligned placement confirms the maximum of three boxes.

The original spawn was inside the first packed box. It now starts in the clear aisle at [5, 2.6, 10]. The packing expert moves from the roof to the open front, and the design guide stands beside the raised work platform. The design prompt describes a solid 36-unit-cube package model and explicitly excludes the protected platform from its volume.

The corrected shipping lesson contains 625 ground cells and 244 other cells, leaving 1,256 construction places.

## Artifacts and verification

- `geometry-garden-corrected.json` and `real-world-corrected.json` are the complete reviewable fixtures.
- `prepare-preset-corrections.cjs` recreates these fixtures from the current authored source.
- `apply-preset-corrections.cjs` previews and syntax-checks by default; `--apply` updates the canonical core only.
- `tests/geometry_world_preset_correctness.test.js` reads the production definitions and checks component counts, shell material ownership, hidden layers, supported bounds, clear reachable NPCs and activity arrivals, the continuous detour, and the exact packing maximum. Its production run follows parent application.
