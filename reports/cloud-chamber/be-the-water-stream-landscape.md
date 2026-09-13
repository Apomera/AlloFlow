# Be the Water: stream banks, shallow water, and riffles

This landscape pass gives the existing lake-to-ocean stream more visible structure:

- Bank colors graduate from dark wet margins through damp gravel to drier upper edges. Texture coordinates repeat along the banks rather than stretching across the entire river.
- A single instanced layer adds 144 small gravel pieces between the larger bank stones, reusing their geometry and material.
- Small gravel shelves vary with the channel's bends, adding asymmetry without changing the landing channel or its water surface.
- Cross-channel shading follows the actual curved water mesh, giving the center a darker appearance and the edges muted shallow-water tones. Fine gravel-like shading fades with distance.
- Broken ripple crests mark steeper reaches outside the lake. They share the water shader's simulation clock, hold during pauses, and remain still with reduced motion. Winter suppresses them beneath the existing ice presentation; the desert retains its dry basin.

The riffles use one mesh and material, with geometry prepared once. The bank and water shading reuse existing meshes and textures; gravel adds one instanced draw call with shared resources. The stream route, landing detection, runoff paths, and kernel rates are unchanged. Shallow-water color and riffles are visual cues, not computed depth, discharge, erosion, or sediment transport. This is a first landscape refinement toward the proposed watershed sandbox, not a terrain-editing or hydrodynamic solver.

## Validation

- Existing pilot experience and kernel regressions: **117 passed, 0 failed** (`pilot-stream-landscape-regressions.json`).
- Final browser acceptance passed bank/water attributes, finite gravel and riffle geometry, shared water/riffle timing, pause and reduced motion, both learner cameras, actual runoff arrival, winter ice, desert visibility, mobile accessibility, and shared-resource cleanup. No page or WebGL errors were observed. Close-up and winter captures were visually reviewed; source syntax is valid and both delivery copies match.
- Browser acceptance: `dev-tools/watercycle_pilot_stream_landscape_qa.cjs`.
- Visual captures: `scratch/water-stream-landscape-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
