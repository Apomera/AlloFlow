# Water Cycle diagram clarity

This pass improves the existing Explore simulation and its guide.

- Evidence captions keep readable text, stay inside the canvas, and clear the overlaid controls. Rounded backings and plain leaders keep moved captions connected to their process.
- The existing key explains parcel location, water direction, and heat cues. The guide identifies latent heat absorption or release, explains invisible vapor, and gives the enlarged markers a clear scale caveat.
- Active journey titles and handoffs name the current step, including Plant uptake, River runoff, and Aquifer flow. Root uptake shows liquid movement into xylem before a separate transpiration step.
- Restored paused maps paint an initial frame. Control changes and visibility restoration repaint without advancing a paused parcel; switching from the paused map restarts the 3D journey driver.

## Visual review

Matched 320px crops expose the original clipping and overlay collisions. The final crops show the complete captions.

| Diagram | Before | After |
| --- | --- | --- |
| Condensation | [Hidden heat caption](before-condensation-light-320.png) | [Visible heat and droplet captions](condensation-light-320.png) |
| Infiltration | [Clipped soil caption](before-infiltration-light-320.png) | [Complete soil caption](infiltration-light-320.png) |

Additional captures:

- [Desktop diagram and guide](evaporation-light-1280.png)
- [Root uptake on a phone](plant-uptake-light-320.png)
- [Dark transpiration and guide](transpiration-dark-320.png)
- [Forced-color guide](infiltration-forced-colors-320.png)
- [Keyboard focus](guide-keyboard-focus-light-320.png)
- [3D root-uptake guide](playback-guide-root-uptake.png) and [transpiration guide](playback-guide-transpiring.png)

## Verification

Final runtime SHA-256: `9f068f4432fd54895dcba3895b889144c32ccaae7b16d5650ff14328733adaa6`.

| Verification | Passed |
| --- | ---: |
| Unique focused unit tests | 119 |
| Diagram browser assertions | 601 |
| Playback browser assertions | 139 |
| Scoped accessibility audits | 5 |

The final browser reports record the exact source hash and matching public mirror. Each harness owns an isolated browser and closes it after the run.

- [Unit results](unit-results.json): 119 unique focused tests passed. These execute the layout and plant-evidence helpers and cover the existing diagram, phase, label, subsurface, and view-handoff contracts.
- [Diagram results](results.json): actual drawn caption bounds, control-overlay clearance, native process selection, paused frames, guide layout, light/dark/contrast/forced-color settings, keyboard focus, and scoped axe audits.
- [Playback results](playback-results.json): initial paused paint, forced redraw, hidden/visible restoration, paused 2D to active 3D, paused 3D, six process guides in both views, and active-step naming.

The unit summary counts repeated checks once. Its [initial](unit-initial-results.json) and [follow-up](unit-followup-results.json) reports retain the old placement assertion and unsuccessful larger-run renderer attempts. The placement assertion was updated for the new layout behavior. The renderer passed in an [isolated retry](isolated-render-retry.json) in 9.39 seconds; its assertions and 15-second deadline were retained.

The initial browser records are retained for traceability. The first diagram run included incorrect fixture expectations for vadose infiltration versus selected deep recharge; the final harness sets parcel progress to check soil storage, deep recharge, and groundwater discharge separately. The forced-color text finding was corrected with system colors.

## Reproduce

From the repository root:

```powershell
node dev-tools/watercycle_diagram_clarity_qa.cjs
node dev-tools/watercycle_diagram_playback_qa.cjs
node node_modules/vitest/vitest.mjs run tests/watercycle_evidence_callout_layout.test.js tests/watercycle_label_placement.test.js tests/watercycle_2d_process_evidence.test.js tests/watercycle_2d_visual_refinement.test.js tests/watercycle_canvas_loop.test.js tests/watercycle_matter_energy.test.js tests/watercycle_readable_ink.test.js tests/watercycle_stage_label_ground.test.js tests/watercycle_route_2d_consistency.test.js tests/watercycle_3d_handoff.test.js tests/watercycle_subsurface_gate.test.js --maxWorkers=1
```

The diagram harness reuses the committed before captures when the original scratch inputs are absent. It tests canvas pixels through instrumented drawing calls; its axe audit covers the existing HTML guide. These checks serve different parts of the interface.
