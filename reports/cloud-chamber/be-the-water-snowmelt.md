# Be the Water: mountain snow and melting

Mountain relief now includes narrow, coherent gullies. Winter snow is shaded per fragment using relative height and slope, with a varied snow boundary, exposed steep faces and subtle drift detail. Temperate and desert scenes retain their snow-free palettes. The relief and snow cover are illustrative scenery, not simulated erosion, snow accumulation or a measured snowline.

A real snow-to-rain transition now starts a brief melting illustration: the existing crystal shrinks and fades while rounded highlights draw inward and the raindrop grows to its usual display size. The existing inward energy cue and melting explanation remain visible. Follow view places the illustration on the parcel; Water view uses a small preview in front of the camera.

The cue lasts 1.6 seconds of active simulation time and holds during learning pauses or when the document is hidden. Reduced motion shows a static intermediate shape until the cue expires. Reset and checkpoint restoration clear it; simply restoring rain does not create a false melting event. Shared crystal, drop and reflection resources are reused and disposed once.

This is a visual explanation of the model's existing phase change. It adds no simulated water, energy, phase delay or new transport rule. Crystal/drop sizes and transition timing remain teaching-scale illustrations. Ground snow storage and catchment snowmelt are not added by this change.

## Verification

- The pilot experience and kernel regression suites passed after the final relief adjustment; results are in `pilot-snowmelt-regressions.json`. The existing snow-rendering source assertion was updated for the new height-and-slope shader.
- The final `dev-tools/watercycle_pilot_snowmelt_qa.cjs` run passed seasonal snow-uniform and finite-height checks, a real snow-to-rain transition, energy direction, paused and reduced-motion shapes, first-person preview, expiry and normal rain-size restoration, checkpoint exclusion, mobile overflow, active-notice accessibility and shared resource disposal.
- No page, WebGL or shader errors occurred in the final browser run.
- Winter and temperate ridge views and both melting camera views were visually reviewed in `scratch/water-snowmelt-review`. Ridge captures use a fixed inspection camera; melting captures use the learner cameras.
- JavaScript syntax passed; canonical and desktop source copies are synchronized.
