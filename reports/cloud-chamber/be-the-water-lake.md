# Be the Water: lake and shoreline

The inland lake now has a darker centre, lighter shallows, subtle ripple normals and an approximate sky reflection. A textured shoreline and 48 instanced stones surround the existing circular water boundary, with a gap at the stream outlet. Winter uses cooler water, shore and stone colours; the lake and its shore remain hidden in the desert basin.

Stream banks, stones, ice and flow streaks no longer extend across the open lake. Stream reeds inside the lake are suppressed. The existing terrain cutout texture now includes the lake's 34-unit-radius basin: visual review found that the meadow otherwise concealed most of the water surface. This mask follows the existing landing boundary and switches off in the desert.

Collected water now sits above the rendered lake or nearby stream surface instead of using the ocean's display height everywhere. Kernel altitude, landing boundaries and state-transition rules are unchanged. The nearest stream surface sample supplies the stream display height; this is a visual correction, not a new hydraulic model.

The depth colours are illustrative rather than measured bathymetry. The shoreline, ripples and approximate reflection do not add fluid dynamics, erosion or measured lake depth to the simulation. Ripple time follows simulation elapsed time and holds during pauses and reduced motion.

## Verification

- Pilot experience and kernel regression results are recorded in `pilot-lake-regressions.json`.
- The final `dev-tools/watercycle_pilot_lake_qa.cjs` browser run passed checks for the unchanged lake radius, finite geometry, open outlet, correct lake/stream/ocean parcel heights, unchanged kernel altitude, paused/reduced-motion ripples, both camera modes, an actual rain-to-lake landing, winter/desert visibility, mobile overflow, accessibility of the canvas container, and shared resource cleanup.
- No page, shader or WebGL errors occurred in the final browser run.
- Follow view, Water view and winter screenshots were visually reviewed in `scratch/water-lake-review`.
- JavaScript syntax passed. Canonical and desktop source SHA-256 hashes match.
- Existing preview returned HTTP 200 at `http://127.0.0.1:58122/?immersive=1&cloud=1`.
