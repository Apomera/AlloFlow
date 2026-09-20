# Be the Water: whitewater texture refinement

September 19, 2026

Whitewater now combines warped broad patches with finer foam strands and clearer gaps of water between them. Subtle cool shading separates the thinner edges from the brighter patches. Fine contrast fades with viewing distance to reduce distracting grain, while the broad patches remain readable.

The texture uses the existing downstream clock and whitewater mesh. Existing slope-based strength, bank masking, pause, reduced motion, and seasonal visibility are retained. No geometry, textures, or simulated water were added; this remains an illustrative flow cue.

Validation:

- JavaScript syntax passed; canonical and desktop source copies match.
- Ran the existing `dev-tools/watercycle_pilot_stream_riffle_qa.cjs` with its optional capture directory set to `scratch/water-stream-whitewater-review`. It passed surface alignment, shared clocks, flow cues, pause, reduced motion, runoff collection, winter/desert visibility, groundwater cutaway, mobile accessibility, and cleanup checks. No captured page or WebGL errors.
- Visually reviewed the close river capture and wider learner Follow view. Fresh captures preserve the previous texture's images for comparison.
- First experience/kernel run: 116 passed; one server-rendering test failed after 38.5 seconds. The full rerun passed all 117 tests with zero failures (pilot-stream-whitewater-regressions-retry.json).
- Existing preview returned HTTP 200 at port 58122.

Source SHA-256: `ef1bd353eafade03b5b8e810a5db1152570f7ab60f26a040c403507bb4912211`.
