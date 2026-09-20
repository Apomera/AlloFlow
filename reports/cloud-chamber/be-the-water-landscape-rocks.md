# Be the Water: grounded landscape rocks

Landscape rocks now sample the displayed terrain instead of using a fixed height. Each accepted rock is partly embedded using its transformed geometry's lowest vertex. Four surrounding terrain samples reject placements across sharp steps or unsupported edges. Lake and stream-corridor exclusions keep decoration clear of the water routes.

The field now proposes 38 groups of one larger rock and two smaller fragments, skipping unsuitable placements. Shared rock geometry has coherent irregular relief; varied scales, orientation, muted instance colors, and the existing rock texture provide visible differences between clusters. The field still uses one instanced draw and no new texture. Placement raycasts run only at scene setup.

Existing scenario colors and subsurface visibility apply to the refined field. This is decorative scenery and does not change runoff, infiltration, collision, or kernel rules.

## Validation

- Pilot experience and kernel regressions: **117 passed, 0 failed**. Results: `pilot-landscape-rocks-regressions.json`.
- Browser acceptance verified all placed rocks intersect the terrain without floating or disappearing, clear lake placement, finite instance matrices, mixed sizes and colors, shared texture, winter palette, underground hiding, and single disposal of the new geometry/material.
- Existing stream/terrain checks passed: bank alignment, actual runoff arrival, pause/reduced motion, winter/desert behavior, groundwater cutaway, mobile accessibility, and shared-resource cleanup. No page or WebGL errors were observed.
- Cluster close-up and winter captures were visually reviewed.
- Source syntax passed; canonical and desktop copies match; existing preview returned HTTP 200.
- Browser acceptance: `dev-tools/watercycle_pilot_landscape_rocks_qa.cjs`.
- Captures: `scratch/water-landscape-rocks-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
