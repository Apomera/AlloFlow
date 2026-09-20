# Be the Water: snow follows trees and rocks

Winter tree snow now follows a copy of the upper canopy geometry instead of using a separate hemisphere. Instance transforms match the crowns with a small scale and height offset. Surface slope, local height, and irregular spatial masks retain patches of visible foliage and break up the snow edge.

Landscape rocks use the same winter activation with a slope-based surface tint. Upward-facing areas receive pale snow while steep sides retain their rock color. The normal is evaluated in world orientation, so rotating a rock does not rotate the direction of snow coverage.

Both effects use the existing winter uniform and static spatial patterns. No new animation, texture, or draw call is added. The tree snow layer replaces its previous geometry and retains the existing seasonal and subsurface visibility behavior. This is illustrative snow cover, not simulated accumulation, snow mass, or melting.

## Validation

- Final pilot experience/kernel regressions: **117 passed, 0 failed** (`pilot-winter-surface-regressions.json`).
- Browser acceptance verified identical canopy/snow local geometry, bounded surface clearance, shared winter activation, snow absence in temperate/desert scenes, forest grounding, crown continuity, seasonal thinning, groundwater hiding, and resource disposal.
- Existing stream and accessibility acceptance passed, including runoff arrival, winter ice, desert visibility, pause/reduced motion, mobile layout, and no page or WebGL errors.
- Winter forest and rock close-ups were visually reviewed.
- Source syntax passed; canonical and desktop copies match; local preview returned HTTP 200.
- Browser acceptance: `dev-tools/watercycle_pilot_winter_surface_qa.cjs`.
- Captures: `scratch/water-winter-surface-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
