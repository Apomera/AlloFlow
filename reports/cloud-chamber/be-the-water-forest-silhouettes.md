# Be the Water: forest silhouettes and footing

Tree bases now sample the displayed terrain instead of using a fixed elevation. Four surrounding samples reject candidates on steep or uneven footing. Trunks are slightly embedded, with flared bases and subtle vertical color shading.

Lower and upper crowns vary independently in width and height between trees. Coordinate-based canopy deformation keeps duplicated triangle corners together, replacing the previous vertex-index deformation that could separate adjoining faces. Vertex colors shade the lower foliage more deeply. Winter snow caps use the actual revised crown height so they overlap the foliage rather than floating above it.

The forest retains 68 trees and the same four instanced fields. The two foliage layers still share one geometry. No textures or per-frame terrain queries are added. Existing winter/desert palettes, desert thinning, and underground hiding remain in use. These are visual tree models, not changes to plant uptake or transpiration physics.

## Validation

- Browser acceptance checks grounded trunk bases, coincident shared canopy corners, varied crown proportions, finite matrices/normals, winter snow-to-crown overlap, desert thinning, subsurface hiding, and shared geometry cleanup.
- The same fixture checks stream-bank alignment, runoff arrival, pause/reduced motion, seasonal visibility, groundwater cutaway, and mobile accessibility.
- Source syntax passed and canonical/desktop copies match. The preview returned HTTP 200.
- Browser acceptance: `dev-tools/watercycle_pilot_forest_silhouettes_qa.cjs`.
- Captures: `scratch/water-forest-silhouettes-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.

Final validation: 117 pilot experience/kernel tests passed, zero failures (pilot-forest-silhouettes-regressions.json). Final browser acceptance passed with no page or WebGL errors. Temperate and winter forest close-ups were visually reviewed.
