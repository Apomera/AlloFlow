# Water Worlds

Water Worlds is an open-ended watershed investigation inside the Water Cycle tool. Choose **Water Worlds** in the mode bar. It complements Explore, Be the Water, Storm Lab, and Steward with a persistent water model and editable land cover.

## Try the first investigation

1. Select a ground cell in the valley, with the ground-cell selector, or using the canvas arrow keys.
2. Set a cell or its surrounding patch to paving, meadow, woodland, or a retention garden. Stream beds stay connected.
3. Choose rainfall intensity and duration, then start a storm. Pause, advance 15 model minutes, or finish the run.
4. Pin the completed run as a baseline.
5. Change ground cover and choose **Replay baseline weather**. This restores the baseline's initial water stores and rainfall while retaining the new ground cover.
6. Compare the flow graph, peak discharge, total outflow, and storage change. Completed baseline replays also summarize absolute changes and remind learners that stored water can leave after the observation window. Record an explanation and download the investigation data.

Each run includes the specified rain plus 60 minutes of drainage. **Start another storm** begins with the water left in the valley, allowing exploration of antecedent wetness. **Replay baseline weather** instead restores the recorded starting water for a controlled land-cover comparison. These are different experiments and are labeled accordingly.

Up to eight land edits can be undone before starting a storm or leaving the view. Undo restores cover and any completed result displaced by that edit without changing water or the pinned baseline. Choosing the existing cover is a no-op and preserves the result. Starting a storm, resetting, or reopening the view clears undo history.

Changing cover after a completed run clears its current-run display while preserving the pinned baseline. Pin a result before changing the design if it should remain available for comparison. Baseline records are detached copies; later runs and edits cannot rewrite their evidence. Pausing an active run does not permit land editing; finish it first to keep the run's inputs interpretable.

## Revisit and explain a storm

After a run finishes, **Revisit this storm** lets learners inspect any whole model minute, including the moment rain stops. The landscape, gauges, and selected-cell readings show that time. The graph adds an inspection cursor and shades the rainfall period. The comparison and exported evidence continue to describe the completed run.

Inspection reconstructs the state from the recorded starting water and weather using the same solver; it does not rewind the saved world. Land editing, reset, undo, and baseline pinning are disabled during inspection. **Return to final state** enables them again. Starting another storm always uses the actual final water, even when viewing an earlier minute.

With a baseline pinned, **Highlight changed land** marks cells whose cover differs from the baseline. A numerical count accompanies the dashed outlines. The comparison label checks the recorded rainfall and starting water, rather than relying only on a replay flag.

**Choose an investigation** offers ground-cover comparisons, retention gardens, consecutive storms, or a learner’s own question. Prompts adapt to Notice, Investigate, and Model without changing conditions or writing. Consecutive-storm prompts explicitly distinguish changed initial water from a controlled land-cover comparison.

**Download readable report** produces a plain-text report with learner writing, current/baseline results, units, observation durations, model boundaries, and current-run minute samples. The JSON export remains available and includes the chosen question, learning level, and number of changed land-cover cells.

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
