# Be the Water: downhill runoff and open-water arrival

Runoff now follows a descending teaching path that meets its selected stream, lake, or ocean at the same visible height as the collected water parcel. Short routes no longer overshoot a nearby stream, and their bends shrink with the distance to water. Routes starting outside a lake join just inside its shore instead of crossing to the center.

The parcel finishes the route before switching to its collected-water presentation. Arrival produces gentle inflow rings without rain's airborne spray. Stream rings align with the channel; existing shoreline masks clip inland effects. Moving inflow and seep rings fade before their pooled effect is hidden. Pausing holds the effect, and reduced motion uses static rings.

Runoff labels and instructions now consistently say “open water.” The collection explanation makes clear that water stays liquid as it changes location. This remains a schematic, compressed teaching route, not a terrain-flow solver. Kernel residence times, energy rules, and cycle counts are unchanged.

Route geometry is rebuilt only when a pathway starts or restores. The previous geometry is disposed immediately, and flow tracers share the revised curve. Arrival effects reuse the existing pooled meshes and materials.

## Validation

All 117 existing experience and kernel tests pass. Both browser acceptance scripts pass: monotonic downhill runoff, nearby-stream endpoints, lake shore entry, exact arrival heights, cycle and energy preservation, distinct inflow/seep/rain feedback, pause and reduced motion, cue expiry, both cameras, mobile accessibility, route replacement, and shared-resource cleanup. No page or WebGL errors were observed. Final source syntax is valid and both delivery copies have identical hashes. The first concurrent regression run hit the existing server-render timeout; rerunning after the browser checks finished passed all 117 tests without changing test deadlines.

- Runoff browser acceptance: `dev-tools/watercycle_pilot_runoff_arrival_qa.cjs`.
- Shared groundwater/rain acceptance: `dev-tools/watercycle_pilot_spring_discharge_qa.cjs`.
- Existing regression results: `reports/cloud-chamber/pilot-runoff-arrival-regressions.json`.
- Visual captures: `scratch/water-runoff-arrival-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
