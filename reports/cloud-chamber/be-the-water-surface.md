# Be the Water: surface refinement

The ocean now combines its existing geometric swell with finer procedural ripple normals. Warped wave directions and varying strength break up the pattern, and detail fades with viewing distance. A view-dependent sky-color reflection gives the surface more depth without a reflection render pass or additional textures. Ripple strength responds to the scenario wind; reflected color responds to the climate.

The tropical sky uses a softer blue-to-haze palette. The sunlit-water teaching marker has a thinner, warm-colored outline and a much lighter fill so it leaves more of the water surface visible. The marker's radius and the evaporation region are unchanged.

These changes refine rendering, not the fluid or water-cycle model. Sky reflection is an approximation and does not reflect scene objects. The ripple clock follows simulation time, freezes when paused, and holds its current pattern under reduced motion.

Validation: 77 pilot-experience regression tests pass. `node dev-tools/watercycle_pilot_surface_qa.cjs` covers live shader compilation in all four climates, finite normals, climate-driven uniforms, pause and reduced motion, follow and water-level views, a 390px phone view, and exactly-once surface geometry/material disposal. Source and desktop copies match. Screenshots are saved in `scratch/water-surface-review` and were reviewed in Chromium with SwiftShader; hardware GPU performance was not benchmarked.
