# Be the Water: groundwater returning to the surface

Groundwater routes now meet the selected water target at the correct visible height. Previously a minimum route length could overshoot a nearby stream, and discharge could place collected water at the preceding frame's underground position.

## Changes

- Short groundwater routes finish at their selected stream, lake, or ocean target.
- The route endpoint uses the same displayed water height as the collected parcel. The route geometry and its flow tracers follow the adjusted curve.
- The final underground position is completed before the parcel changes to its surface-water presentation.
- Actual groundwater discharge produces a gentle, slower ripple without airborne spray. Its first paused frame is large enough to show around the enlarged teaching parcel. Existing shoreline clipping applies.
- Rain retains its separate splash and spray. Checkpoint restoration does not invent discharge feedback. Pausing holds the cue, reduced motion uses static rings, and the seep cue expires after 2.4 simulation seconds.
- Route geometry is replaced only when a pathway starts or restores, and its old geometry is disposed. The existing pooled ripple meshes are reused.

This corrects the scene's geometry and transition feedback. It does not add a spring-flow solver or change the kernel's residence-time, energy, or cycle-count rules. The route remains a schematic teaching path; groundwater may discharge into streams, lakes, or coastal water.

## Validation

- Existing experience and kernel regressions: **117 passed, 0 failed**.
- `dev-tools/watercycle_pilot_spring_discharge_qa.cjs` passed nearby-stream, lake, and ocean endpoints; actual discharge at matching heights; cycle and energy preservation; distinct rain/seep cues; pause, reduced motion, and expiry; both camera views; restore exclusions; mobile accessibility; geometry replacement and final cleanup. No observed page or WebGL errors.
- Visual captures: `scratch/water-spring-discharge-review/`.
- Canonical source and desktop mirror are synchronized.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
