# Be the Water: sloping beach profile

The dry beach and wet sand now use continuous sloping profiles in place of vertical extruded faces. A flat interior joins a smooth descending rim, transitioning from the existing upper beach height through darker wet sand to a submerged outer edge. Colors darken down each profile, and sand bump strength is reduced so fine texture does not overwhelm the slopes.

The profiles follow the existing coastal curve. They reuse the two existing sand meshes, materials, and textures, with no extra draw calls or animation. The stream-bank setup samples the new surfaces automatically. Existing terrain shader wrappers still provide the stream opening and groundwater cutaway. The upper meadow and hardpan retain their previous terrain shapes.

This changes decorative terrain, not erosion, tides, or the water-cycle kernel. The original landing outline remains authoritative; this is not a new terrain collision model.

## Validation

- Browser beach acceptance checks monotonic descending slopes, finite upward-facing normals, a bounded dry/wet join, submerged outer edge, color gradient, and cleanup.
- Existing coastal acceptance checks actual ocean-triangle alignment, pause, reduced motion, sunlight feedback, evaporation rate ratio, both cameras, and mobile accessibility.
- Stream-terrain acceptance passed bank-to-land height agreement, winter/desert presentation, groundwater cutaway, actual runoff arrival, and resource cleanup with no page or WebGL errors.
- Canonical and desktop copies match; source syntax passed. The local preview was restarted at its existing address and returned HTTP 200.
- Browser acceptance: `dev-tools/watercycle_pilot_beach_profile_qa.cjs`.
- Captures: `scratch/water-beach-profile-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.

Final validation: 117 pilot experience/kernel tests passed with zero failures (pilot-beach-profile-regressions.json). Final beach browser acceptance passed. Coastal close-up and learner water-view screenshots were visually reviewed.
