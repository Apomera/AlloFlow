# Scale Explorer — Orion in three dimensions

## Experience

- Replaced the spherical cloud of dots with a volume of glowing gas and dark dust. A hollow central region, luminous front, and foreground ridge give the cloud depth when the viewer orbits.
- Four enlarged stellar lights mark the illustrated Trapezium. A larger population of points occupies different depths inside the cloud. Dust and gas attenuate their light along the line of sight.
- Four landmarks approach the Trapezium, cavity, glowing cloud front, and dust ridge. The selected marker uses a leader line to leave the feature visible.
- **Reveal embedded stars** reduces cloud opacity without moving the stars, changing the geometry, or changing the measurement. This is a visibility aid; it is not presented as infrared imagery.
- Saved observations restore the cloud visibility, landmark, magnification, and camera. Notebook exports describe whether the cloud was revealed.
- The measurement reference stays readable during orbit. The cloud also supports the existing orthographic comparison view.

## Scale and scientific scope

The catalog previously assigned Orion 7.6 × 10¹⁷ metres, about 80 light-years. It now uses 2.27 × 10¹⁷ metres, approximately 24 light-years, for M42. NASA's [Night Sky Network reference](https://science.nasa.gov/solar-system/skywatching/night-sky-network/a-flame-in-the-sky-the-orion-nebula/) gives this approximate width. The visible boundary of a nebula is diffuse.

This model interprets the structure rather than reconstructing a measured three-dimensional survey. Gas geometry, depth, colors, and stellar placement are illustrative, and stellar light points are enlarged. Those qualifications appear in the interface.

Sources linked from the landmarks:

- [NASA: Messier 42](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-42/)
- [NASA JPL: A 3-D Journey Through the Orion Nebula](https://www.jpl.nasa.gov/news/nasa-space-telescopes-provide-a-3-d-journey-through-the-orion-nebula/)
- [NASA: Hubble's Nebulae](https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-nebulae/)
- [NASA: Close-Up Images of the Orion Nebula](https://science.nasa.gov/asset/hubble/close-up-images-of-the-orion-nebula/)

## Implementation

A deterministic 96³ density field is packed into a 1152 × 768 RGBA texture (about 3.4 MiB). The cloud shader integrates emission and absorption through the volume. Stars sample the same field for attenuation. Both perspective and orthographic rays are supported. One cloud mesh and one point cloud draw the nebula; there are no new runtime dependencies or remote assets.

The density texture uses ordinary 2D sampling, so the model runs in WebGL 1 as well as WebGL 2. Resources participate in the existing cache and disposal lifecycle. The desktop source mirror and 258 English atlas strings are synchronized.

## Validation

- Four targeted real-WebGL scenarios passed, including a forced WebGL 1 context.
- GPU pixel comparisons verify that orbiting changes the rendered volume and that revealing stars reduces cloud visibility.
- Geometry and star coordinates remain unchanged through reveal, inspection, and orbit. The orthographic comparison retains the catalog ratio.
- Phone keyboard inspection, restored notebook views, exported visibility notes, and context cleanup passed.
- All 107 unit assertions passed across the atlas, notebook, comparison, inquiry, and fullscreen suites. The full run encountered a browser-close timeout in fullscreen cleanup; the focused fullscreen rerun passed all four tests and cleanup. See `unit-results.json` and `fullscreen-results.json`.
- All 29 browser scenarios passed in the full regression run (10.0 minutes, one Chromium worker), covering the atlas, comparisons, inquiry, inspection, landmarks, microbiology, nebula, notebook, planets, and Sun. See `browser-results.txt`.

## Visual evidence

- `before/orion-nebula-review.png` — original point cloud
- `cloud-front.png`, `cloud-side.png` — volume seen from different angles
- `stars-revealed.png` — reduced cloud opacity
- `trapezium.png`, `stellar-cavity.png`, `ionization-front.png`, `dust-ridge.png` — feature inspections
- `phone-trapezium.png` — 320-pixel phone view
- `nebula-solar-system.png` — shared-scale comparison

Preview: http://127.0.0.1:54391/?tool=scaleExplorer&focus=orion-nebula&v=nebula
