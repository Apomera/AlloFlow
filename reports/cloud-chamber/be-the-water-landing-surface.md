# Be the Water: landing ripples on the wave surface

September 19, 2026

Ocean landing rings now follow the rendered wave mesh as they expand, instead of floating on a flat plane above it. A height sampler interpolates the same ocean triangles used for rendering. Each of the three rings has its own small position buffer so different radii can follow different heights. The spray also originates from the sampled water surface.

An extra radial row gives each ring a soft inner and outer edge. The existing three ring draws and pooled spray are retained; there are no new textures. Surface sampling runs only while the brief landing cue is visible. Lake and stream rings reset their vertical deformation to their existing inland plane, with the existing shoreline masks retained.

The cue reads the ocean's actual vertex heights, including during pause and reduced motion. It adds no simulated water and changes no collection, phase, or energy rules.

Validation:

- JavaScript syntax passed; canonical source and desktop mirror match.
- `dev-tools/watercycle_pilot_landing_surface_qa.cjs` passed. Independent downward rays verified ripple vertices stay 0.12 world units above the rendered ocean, within 0.002 units, during pause, expansion, and reduced motion. Checks also covered soft edges, rain rendering, actual collection, cue expiry, snow/land exclusions, camera views, mobile notice accessibility, and disposal of all three ring geometries once. No captured page or WebGL errors.
- `dev-tools/watercycle_pilot_lake_shore_detail_qa.cjs` passed, including actual lake landing, lake/stream/ocean parcel heights, seasonal visibility, motion controls, mobile accessibility, and shared-resource cleanup.
- Normal-motion and reduced-motion landing captures were visually inspected. Screenshots are in `scratch/water-landing-surface-review/`.
- Experience and kernel regressions: 117 passed, zero failed (pilot-landing-surface-regressions.json).
- Existing preview returned HTTP 200 at port 58122.

Source SHA-256: `611c1fdac1badfa165930d49179a7e16934050e406fb5f4df7480b95d64c045a`.
