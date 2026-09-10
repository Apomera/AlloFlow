# Water Worlds refinement: follow water, revise a design, explain a result

This pass builds on the initial Water Worlds milestone. It preserves the numerical equations and adds ways to inspect their consequences.

## Visible changes

- **Flow paths** overlays directional arrows calculated by the kernel for the next 15-second model step. The renderer does not invent paths. Each cell shows its strongest outgoing transfer, with all routes shown for the selected cell. Very small transfers are hidden to keep the scene readable; arrow size does not encode velocity.
- The selected-cell inspector separates surface water, soil water, and delayed drainage. It shows the remaining soil capacity and the finite storage threshold that allows retention gardens to overflow.
- **What happens next?** gives numerical infiltration, soil drainage, subsurface release, and outgoing surface routes. This provides a text equivalent to the flow arrows.
- **Undo land edit** reverses up to eight edits before another storm or a view reload. It restores a displaced completed result while preserving water and the pinned baseline. Choosing a cover already present leaves the result intact.
- Completed controlled comparisons summarize absolute differences in peak and total outflow. They explicitly bound the observation window and explain that retained water can leave later.
- The scene keeps its terrain proportions on phones, and explanatory labels sit in readable HTML below the canvas. Arrow-key selection stops at row boundaries rather than wrapping to another row.

## Scientific and learning intent

The added diagnostic follows exactly the same rainfall, infiltration, drainage, evaporation, and head-gradient routing calculations as a regular solver step. It probes a copy of the current world. Reading or displaying the diagnostic cannot advance time or alter storage.

The storage inspector helps learners connect a visible wet patch to a process: rain can fill remaining soil space, collect above a depression threshold, or move along a water-surface gradient. Numerical transfer readings support more advanced discussion while the three labeled stores remain available at every learning level.

Undo supports experimentation without forcing a reset. No-op edits preserve evidence. Controlled comparison language separates discharge peaks from cumulative volume instead of treating a single metric as a score.

This remains an illustrative watershed teaching model, not a calibrated flood model. The refinement does not add atmospheric feedback, terrain editing, groundwater pressure, or physically scaled water rendering.

## Verification

The refinement test suite checks that diagnostics reproduce solver transfers and outlet discharge without mutation, dry cells do not manufacture transfers, undo restores exact water and evidence, no-op edits preserve results, history is bounded, and malformed saved time series are rejected safely.

The browser harness also exercises undo, populated flow arrows, accessible transfer text, completed comparison summaries, keyboard edge behavior, light/dark accessibility, and 320/390px layouts. Updated screenshots and machine-readable results are in `water-worlds-implementation/`.

Validation completed: 96 targeted tests passed across seven suites. The initial combined run passed 94 tests but hit a worker-startup timeout on the two-test science suite; that suite passed when retried separately. The final browser run passed all 11 workflow groups with no browser exceptions or axe accessibility violations. Desktop flow and 320px phone screenshots were visually inspected.
