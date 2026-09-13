# Be the Water: stream and runoff visuals

The watershed stream now has darker water with subtle animated ripple normals and an approximate sky reflection. Twenty-eight short, non-glowing streaks replace the bright flow dots. Their direction follows the existing stream curve, and their lateral positions and lengths vary. Textured wet banks and 56 instanced stones give the water a clearer edge against the landscape. Winter retains its ice skin and slower flow, with cooler bank and stone colors; the stream remains absent in the desert basin.

The runoff teaching route uses a thinner blue guide and smaller flow tracers. Its path, collection target selection, transition rules and water-cycle kernel are unchanged.

Visual review found that meadow terrace faces concealed a section of the stream. A static 512-square channel mask now opens a narrow corridor through terrain along the same stream curve used for landing detection. It switches off in the desert. This is a rendering correction, not simulated terrain erosion. The mask is shared across the terrain materials and disposed once during scene cleanup.

Ripples and flow use simulation elapsed time, so pauses hold them still. Reduced motion holds the ripple time and shows static flow streaks. The wave normals, wet banks and water appearance are illustrative; this change does not add hydraulic depth, discharge, erosion or fluid dynamics to the model.

## Verification

- All 117 pilot experience and kernel regression tests passed after the final channel correction: `pilot-stream-regressions.json`.
- `dev-tools/watercycle_pilot_stream_qa.cjs` passed browser checks for finite geometry, moving/paused/reduced-motion flow and ripple time, both learner camera modes, an actual runoff-to-liquid transition, winter ice, desert visibility, mobile overflow, accessibility of the canvas container, and shared geometry/texture disposal including the channel mask.
- No page, shader or WebGL errors occurred in the final browser run.
- Both learner views and temperate/winter detail captures were visually reviewed in `scratch/water-stream-review`. Detail captures use a fixed inspection camera; learner-view captures use the actual controls.
- JavaScript syntax passed. Canonical and desktop source hashes match.
- Existing local preview returned HTTP 200 at `http://127.0.0.1:58122/?immersive=1&cloud=1`.
