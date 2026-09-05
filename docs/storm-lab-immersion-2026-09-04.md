# Storm Lab immersion

Implemented locally on September 4, 2026. Public deployment is separate.

## What changed
- The 3D chamber now requests the shared Three.js and OrbitControls loader in a fresh session. Loading failures and WebGL loss show a visible message, a retry action, and a route back to 2D. Retry remounts the canvas; detached renderers dispose their resources.
- Selecting 3D enters a ground-level view inside the storm. Drag to look around; W/A/S/D move, arrow keys look, and Q/E adjust height. Touch buttons provide the same actions. Orbit views remain available, with closer zoom and panning.
- Forest clearing, beach, and suburban street environments surround the viewer. Layered trees sway in wind; wetness accumulates, street surfaces become more reflective, ripples respond to rain, and shoreline waves respond to wind. Bark, foliage, ground, roofing, and cloud detail are generated locally.
- Full-screen viewing keeps the scene and field controls together.
- Weather approaches the selected moisture, temperatures, humidity, wind, updraft, cloud depth, and track smoothly. The chosen transition interval brings the values about 98% of the way to their targets; the response is exponential and independent of frame rate.
- Wind reversals decelerate through zero. The track slider steers the cloud, precipitation column, and impact particles together. Ground accumulation stays in place.
- Reduced motion applies selected weather immediately and keeps ambient movement static. Movement stops when the scene loses focus.
- Changes made during loading, and settings selected during lifecycle playback, survive subsequent renders.

## Model boundaries
This remains an illustrative classroom model. The track control does not solve atmospheric circulation or predict a real storm. The scenery effects do not estimate structural damage, storm surge, flood depth, or tree failure.

Tree Lab informed the approach to layered procedural foliage and shared geometry. Its species, carbon budget, age, and life-cycle state are not coupled to Storm Lab. The environments here are scenery for exploring the existing precipitation model.

## Files
- Source: stem_lab/stem_tool_watercycle.js
- Distribution mirror: desktop/web-app/public/stem_lab/stem_tool_watercycle.js
- Focused unit tests: tests/watercycle_storm_immersion.test.js
- Real WebGL check and local preview: dev-tools/watercycle_storm_immersion_qa.cjs
- Captures and results: scratch/storm-immersion-review/

## Run a local preview
Run node dev-tools/watercycle_storm_immersion_qa.cjs --serve from the repository root, then open:
http://127.0.0.1:8767/?immersive=1

The preview serves local working-tree files on loopback. It does not publish or deploy the site.

## Validation
Unit coverage includes convergence, no overshoot, frame-rate independence, reduced motion, gradual wind reversal, saved-setting bounds, rendering, the precipitation model, the stormwater investigation, and the existing 3D handoff.

The real-browser check exercises a cold engine load, updates during loading, keyboard/pointer/touch navigation, gradual weather and track changes, persistent canvas identity, environment switching, lifecycle playback, reduced motion, phone layout, accessibility, retry, and WebGL context loss.


Final verification: 55 focused unit tests passed in one worker thread. The final real-WebGL run passed all 10 checkpoint groups, including full-screen viewing, phone accessibility, failure retry, and context-loss recovery; no page errors were recorded. The earlier fork-pool runs encountered Windows worker-start timeouts. Source and distribution mirror match; the scoped whitespace check passed. All three final environment captures were visually inspected.
