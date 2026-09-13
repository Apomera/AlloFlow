# Be the Water: coastal water and foam

Three bands of thin, elevated shoreline lines have been replaced with broken mesh ribbons. Soft edges and irregular gaps make the foam read as patches on water. Cached ocean-triangle weights keep the ribbons attached to the actual wave surface, with a small offset to avoid surface overlap. Their subtle opacity variation uses the ocean's existing ripple clock.

The turquoise coastal shelf now uses subdivided geometry with an offshore alpha fade instead of a flat, uniformly translucent sheet. It follows the same ocean surface. Pause and reduced motion hold both the geometry and their appearance consistently.

The change retains three foam draws and one coastal-shelf draw, adds no textures, and samples triangle weights only at setup. Vertex heights update from existing ocean vertices without per-frame raycasts. The coastline's broader terrain terraces are unchanged. Foam and shallow-water color are illustrative; this does not add a wave-breaking or bathymetry solver.

## Validation

- Final pilot experience and kernel regressions: **117 passed, 0 failed**. Results: `pilot-coastal-water-regressions.json`.
- Two obsolete source assertions, each applied to both delivery copies, were updated from the former line/flat-sheet implementation to cached surface updates, shared timing, and shelf fading.
- Browser acceptance passed ocean-triangle alignment for foam and shelf, finite geometry, fade bounds, shared timing, animation, pause, reduced motion, and resource disposal exactly once.
- Existing sunlight feedback, evaporation rate ratio, phase visibility, both learner cameras, and mobile accessibility passed. No page or WebGL errors were observed.
- Coastal close-up and learner water-view captures were visually reviewed.
- Source syntax passed, delivery copies match, and the existing preview returned HTTP 200.
- Browser acceptance: `dev-tools/watercycle_pilot_coastal_water_qa.cjs`.
- Captures: `scratch/water-coastal-water-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
