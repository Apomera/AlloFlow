# Water Worlds

Water Worlds is an open-ended watershed investigation inside the Water Cycle tool. Choose **Water Worlds** in the mode bar. It complements Explore, Be the Water, Storm Lab, and Steward with a persistent water model and editable land cover.

## Try the first investigation

Start with **Choose an investigation** and **My prediction** above the landscape. A three-step pathway follows the experiment from a question to evidence; writing is optional. Storm playback sits directly above the scene, and stream comparisons sit below it.

1. Select a ground cell in the valley, with the ground-cell selector, or using the canvas arrow keys.
2. Choose a cover card to read how it affects infiltration and surface storage. Select **Edit area** to target one cell or the surrounding 3 × 3 patch. Amber dashed outlines preview only cells that would change; the readout gives their count and area. Choose **Apply** to change the ground. Edge patches clip to the valley, and stream beds stay connected.
3. Choose rainfall intensity and duration, then start a storm. Pause, advance 15 model minutes, or finish the run.
4. Pin the completed run as a baseline.
5. Change ground cover and choose **Replay baseline weather**. This restores the baseline's initial water stores and rainfall while retaining the new ground cover.
6. Compare the flow graph, peak discharge, total outflow, and storage change. Completed baseline replays also summarize absolute changes and remind learners that stored water can leave after the observation window. Record an explanation and download the investigation data.

Each run includes the specified rain plus 60 minutes of drainage. **Start another storm** begins with the water left in the valley, allowing exploration of antecedent wetness. **Replay baseline weather** instead restores the recorded starting water for a controlled land-cover comparison. These are different experiments and are labeled accordingly.

Up to eight land edits can be undone before starting a storm or leaving the view. Undo restores cover and any completed result displaced by that edit without changing water or the pinned baseline. Choosing the existing cover is a no-op and preserves the result. Starting a storm, resetting, or reopening the view clears undo history.

Changing cover after a completed run clears its current-run display while preserving the pinned baseline. Pin a result before changing the design if it should remain available for comparison. Baseline records are detached copies; later runs and edits cannot rewrite their evidence. Pausing an active run does not permit land editing; finish it first to keep the run's inputs interpretable.

Choosing a card or edit area only previews a design; it does not alter water, recorded results, or the baseline. Apply is disabled during a run, while inspecting recorded time, or when no cells would change. The Differences view keeps its analytical map clear and directs learners to Surface water to see the planned footprint. **Look inside this ground** reveals the three water stores; **How these covers behave** explains the selected cover’s model parameters. Cover-card explanations are also available to screen readers.

For the consecutive-storm investigation, the pathway only moves to explanation after a completed later storm with the same recorded rainfall and ground cover as the baseline. If those also changed, it explains why the learner cannot attribute the result only to water left by the earlier storm.

## Revisit and explain a storm

The playback bar separates **Rainfall** from the following **60 minutes of drainage**. Its progress and explanation follow the displayed minute, including recorded-time inspection. Reaching the end means the observation window has ended; water still in the valley can keep moving. **Highest sampled flow** jumps to the earliest highest outlet reading in the saved minute samples. The peak gauge includes the solver's smaller time steps, so it can differ from the sampled value. The shortcut is disabled when no positive outlet flow was sampled.

After a run finishes, **Revisit this storm** lets learners inspect any whole model minute, including the moment rain stops. The landscape, gauges, and selected-cell readings show that time. The graph adds an inspection cursor and shades the rainfall period. The comparison and exported evidence continue to describe the completed run.

Inspection reconstructs the state from the recorded starting water and weather using the same solver; it does not rewind the saved world. Land editing, reset, undo, and baseline pinning are disabled during inspection. **Return to final state** enables them again. Starting another storm always uses the actual final water, even when viewing an earlier minute.

With a baseline pinned, **Highlight changed land** marks cells whose cover differs from the baseline. A numerical count accompanies the dashed outlines. The comparison label checks the recorded rainfall and starting water, rather than relying only on a replay flag.

**Choose an investigation** offers ground-cover comparisons, retention gardens, consecutive storms, or a learner’s own question. Prompts adapt to Notice, Investigate, and Model without changing conditions or writing. Consecutive-storm prompts explicitly distinguish changed initial water from a controlled land-cover comparison.

**Download readable report** produces a plain-text report with learner writing, current/baseline results, units, observation durations, model boundaries, and current-run minute samples. The JSON export remains available and includes the chosen question, learning level, and number of changed land-cover cells.

## Keep field observations

**Follow this patch** shows the selected cell's surface water, soil water, and delayed storage. Add an optional note and save the reading. During playback, **Pause and save observation** freezes the run and captures the actual model time. Inspection of a completed run can also be saved without changing its result.

Each observation preserves its cell, ground cover, elapsed/model minute, weather, local depths, valley totals, and stream flow. Up to six observations remain available through new storms, land edits, resets, and mode changes. The count is visible; reaching the limit requires removing an observation before adding another. Observation numbers stay fixed when an earlier one is removed. Notes remain editable.

Select **Compare** on two cards to see the second selected reading minus the first. The explanation distinguishes the same place over time, different places in the same setup, and different storm setups. Surface, soil, and delayed-water differences are depths over one cell; stream-flow differences describe the valley outlet. A difference alone does not establish a cause.

**Revisit** is available after the current run finishes, when its recorded starting world and weather exactly match the observation and the minute has been reached. It restores the selected cell and inspection minute without rewinding the actual world. Observations from other setups keep their readings even when they cannot be revisited in the current scene.

Both downloads include saved observations, their notes, units, and recorded conditions. Exports stay available when only observations remain. Restoring a saved session recomputes readings from the recorded starting state and weather; legacy sessions without observations open with an empty notebook.

The section-navigation buttons move keyboard focus between the valley, storm settings, ground inspector, and field notes. **See saved observations** and **Return to the valley** support the same route from the capture area and notebook.

## Compare water across the landscape

Complete a baseline replay to unlock **Differences** beside the other scene views. Choose surface, soil, or delayed subsurface water. The map shows current minus baseline depth at the same elapsed minute and follows the inspection timeline. Signed cell markers and a complete keyboard-scrollable table complement the colors.

The scale is fixed: differences smaller than 0.05 mm are neutral, and color intensity saturates at ±10 mm. Selected-cell readings retain two decimal places, while exported final differences retain full precision in JSON. The whole-valley difference converts cell depths to cubic metres. More water in a store is not automatically a better outcome; the explanations prompt learners to consider other stores and the next storm.

Differences require matching initial water and rainfall and a completed controlled replay. A consecutive storm with different starting water does not qualify. Starting a new run returns the scene to surface water. Exports continue to describe the completed result, including final cell differences when eligible, regardless of which inspection minute is displayed.

## Equal rain, different timing

**Mean rainfall** sets the average intensity over the storm. Choose steady rain, a heavier first half, or a heavier second half. Varying patterns use 1.5 times the mean in one half and 0.5 times the mean in the other. Total rain remains mean × duration / 60; the instantaneous peak can reach 150 mm/h. These simple prescribed patterns are illustrative, not calibrated design storms.

Pin a baseline, choose another pattern, and use **Test rainfall timing**. This restores baseline ground cover and initial water, fixes baseline mean rain and duration, and changes only the pattern. Any current land edits are replaced by the baseline cover. The usual **Replay baseline weather** continues to retain current cover and restore the baseline's complete weather pattern for a land-cover comparison. Timing tests have their own comparison label and do not unlock the cover-only Differences map.

The next-storm and recorded-rainfall diagrams show both half-storm intensities and total depth. Timeline inspection displays the rain actually falling at that minute. The timing question offers prompts for Notice, Investigate, and Model; JSON and readable reports retain the recorded pattern. Older saved runs without a pattern remain steady-rain runs and replay exactly.

## Learning and access

The learning selector offers Notice, Investigate, and Model. Notice emphasizes describing changes, Investigate emphasizes fair comparisons and evidence, and Model exposes water accounting. New sessions default to Notice for early grades and Model for high-school grade labels; saved choices take precedence. Every level runs the same physics and remains independently selectable.

The scene has surface-water, soil-moisture, and flow-path views. Flow arrows show each cell’s strongest outgoing transfer, with all routes drawn for the selected cell. Transfers are calculated by the kernel for the next 15-second model step under current forcing; they are not decorative particles or velocity measurements. Very small transfers are hidden in the picture, while the selected-cell transfer text includes all outgoing routes. The water-store inspector explains remaining soil capacity, finite retention thresholds, and delayed release to streams. The selected-cell inspector reports surface depth, soil fill, and optional below-ground storage readings. Pointer interaction has an equivalent native selector, and arrow keys select cells while the canvas is focused. All mode destinations remain visible on narrow phones. Pause freezes the model and picture; step controls support self-paced observation without camera motion.

The notebook records a prediction and explanation without grading either. Export is JSON containing the terrain/model version, physical units, starting/final water states, forcing, minute samples, baseline, result, and learner writing. This first release uses English interface text; the two new mode-navigation strings are registered in the English source and desktop mirror. It does not add translated language packs.

## Follow water through a patch

Open **What happens next?** in the ground inspector. **Across ground**, **Into soil**, **Delayed water**, and **To air** highlight and explain the selected pathway. The pathways operate together; choosing one changes only what the inspector emphasizes.

The layered diagram compares current surface, soil, and delayed storage with the values after the next **15 model seconds**. Transfer depths come from the same solver step. Small nonzero transfers use a less-than label instead of appearing to be exactly zero. The preview uses rain reaching the valley at the displayed minute, including recorded-time inspection. Before a storm, or after the observation window, it uses no new rain. It never advances the live world or changes saved evidence.

Surface connections show all calculated inflows and outflows for the cell, including flows too small for the landscape arrows. Choose a connection to inspect its source or destination. The explorer stays open, keyboard focus returns to its heading, and the new location is announced. Water leaving through the valley outlet has no destination-cell button.

**Check this cell’s water balance** accounts for initial storage, rain, surface inflow/outflow, delayed-water exchange, and losses to air. Infiltration and soil drainage move water between stores within the cell and cancel from its total. Delayed release is pooled and shared among stream cells; the diagram does not imply a resolved underground route. All values are water depths spread over an equal-area cell, rather than soil-layer thickness or water-table height.

## Landscape visuals

The landscape uses textured ground, mixed tree crowns, dry stream-bed stones, planted retention rims, layered soil edges, and shaded water with reflections. The **Show ground-cell grid** checkbox reveals the editable cell boundaries without changing water or recorded evidence. Analytical soil and difference views retain their own cell boundaries.

Visual details use stable variation and remain still while paused. Canvas backing resolution follows display pixel density up to 2×, with the same logical interaction coordinates. Terrain, soil bands, plants, and water depth are illustrative rather than measured geometry.

## Physical scope

The watershed has 12 × 8 equal cells, each 20 m × 20 m, totaling 3.84 hectares. Elevation is in metres, local water stores are millimetres over a cell, and time is in minutes. Gauge volumes are cubic metres and outlet discharge is cubic metres per second. The numerical step is 0.25 model minutes; playback changes how quickly these fixed steps are displayed.

The kernel tracks surface water, soil water, delayed subsurface storage, rainfall input, evaporation/transpiration loss, and outlet flow. Combined outgoing transfers are bounded by available water. Infiltration depends on ground cover and current soil filling; water above field capacity drains into delayed storage. That storage releases water to stream cells. Surface routing is a bounded head-gradient approximation over fixed terrain. Retention gardens have finite depression storage and can overflow.

The domain balance is:

`initial water + rainfall − outlet flow − evaporation = current water`

Internal transfers cancel. Rainfall is prescribed and evaporation leaves the local domain; evaporated water does not automatically rain back onto the valley. Mild evaporative demand is held constant. Parameters are illustrative, not calibrated to a site. Delayed subsurface storage is not resolved aquifer hydraulics. Terrain sculpting, atmospheric feedback, snow, erosion, pollutant transport, and numerical coupling to the legacy Steward/Storm Lab models are outside this first milestone. The scene exaggerates water depth and terrain height for visibility.

## Related science refinements

The existing middle-school condensation explanation now distinguishes a rising air parcel's cooling from the surrounding atmosphere's temperature profile. The high-school evaporation explanation distinguishes saturation vapor pressure from the factors determining evaporation. The pilot no longer converts liquid rain directly into snow simply for crossing its freezing altitude; it permits supercooled liquid and explicitly leaves refreezing exposure/ice pellets outside that parcel model. Existing snow-melting behavior remains available.

## Implementation and verification

- `stem_lab/water_worlds_kernel.js` is a deterministic kernel with no renderer or DOM dependency.
- `stem_lab/water_worlds_view.js` supplies the React interface, canvas landscape, charts, notebook, and scoped styles.
- `stem_lab/stem_tool_watercycle.js` supplies mode navigation and lazy loading through the existing resilient script loader.
- Both new modules are included in `build.js` and mirrored under `desktop/web-app/public/stem_lab/`.

Run the model and relevant legacy regression checks:

```text
node node_modules/vitest/vitest.mjs run tests/water_worlds_kernel.test.js tests/water_worlds_refinement.test.js tests/water_worlds_inquiry.test.js tests/water_worlds_spatial.test.js tests/water_worlds_rainfall.test.js tests/watercycle_pilot_kernel.test.js tests/watercycle_science.test.js tests/watercycle_land_surface.test.js tests/watercycle_investigation.test.js tests/watercycle_precipitation_lab.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node dev-tools/water_worlds_qa.cjs
node dev-tools/watercycle_investigation_qa.cjs
node dev-tools/watercycle_pilot_controls_qa.cjs
```

The new browser check loads sibling modules through the actual mode, exercises storm/pause/step/comparison/export/persistence and keyboard controls, checks light/dark accessibility including contrast, tests 320/390px layout and mode visibility, and checks the paused reduced-motion canvas. Its screenshots and example data are written to `reports/water-worlds-implementation/`. This harness does not certify every production-host integration or device.

For a local interactive preview:

```text
node dev-tools/water_worlds_qa.cjs --serve
```

This serves the isolated water-cycle preview at `http://127.0.0.1:8768/`. It does not publish changes to a remote site.
