# Be the Water: sunlight on a moving water surface

The sunlight-zone boundary and its fill now follow the rendered ocean mesh. Triangle interpolation weights are cached once for each marker vertex, then read from the existing ocean positions. This keeps the marker attached to paused and reduced-motion waves as well as moving water, without maintaining a separate animation clock.

A small radial texture replaces the flat additive disk with a soft, fading highlight. The boundary and fill brighten when liquid water enters the model's faster-evaporation zone. The label sits near the edge rather than directly over the starting parcel. The marker hides when the parcel becomes airborne.

The highlight is a teaching guide, not a physical sunlight or shadow simulation. Its center and 26-unit radius are unchanged. The kernel still adds energy outside the zone at its existing lower rate. No simulation thresholds or timing rules are changed. Source comments now describe this correctly.

## Validation

- Final checks: **117 experience and kernel tests passed**. Browser acceptance passed ocean-triangle alignment, zone feedback, the unchanged evaporation-rate ratio, pause and reduced motion, both camera views, vapor visibility, mobile accessibility, and geometry/texture cleanup. No page or WebGL errors were observed.
- Existing experience and kernel report: `pilot-sunlight-surface-regressions.json`.
- Browser acceptance: `dev-tools/watercycle_pilot_sunlight_surface_qa.cjs` checks actual ray intersections with the ocean, inside/outside feedback, evaporation rates, paused and reduced-motion surfaces, both camera views, vapor visibility, mobile accessibility, and resource cleanup.
- Visual captures: `scratch/water-sunlight-surface-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
