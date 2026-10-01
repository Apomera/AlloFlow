# Scale Explorer — solar structure and inspection travel

## Experience

- The Sun has a procedural photosphere with granulation, limb darkening, illustrated sunspot groups, plasma arches, and a faint extended corona.
- Opening the cutaway removes a quadrant to reveal two exposed faces through the core, radiative zone, and convection zone. Moving highlights trace schematic convection paths.
- Six landmarks move the camera to the interior layers, photosphere, sunspots, and a prominence. Interior selections open the cutaway; surface selections close it. Markers are hidden when the body blocks their view.
- Inspection magnification and landmark orientation ease toward their destination. Camera travel can finish while ambience is paused. Manual orbit takes over immediately; reduced-motion mode applies the destination directly.
- Orbit buttons bring an offscreen canvas back into view. A heading gradient keeps text readable over bright close-ups.
- The field notebook retains solar landmarks, cutaway state, and camera orientation. Existing planetary lighting and microscopic scenes remain available.

## Measurement and science

The catalog diameter, 1.392 billion metres, measures the photosphere. Coronal glow and prominences extend beyond that reference without changing the model's scale. Shared-scale comparisons continue to use the actual catalog ratio.

The core boundary is illustrated at 25% of the radius and the base of the convection zone at 70%. These are approximate educational boundaries. Surface detail is enlarged, colors distinguish regions, and motion is slowed and schematic. The model is not a current observation or a physical plasma simulation. The interface makes these limits visible.

Landmark sources:

- [NASA Marshall: The Solar Interior](https://solarscience.msfc.nasa.gov/interior.shtml)
- [NASA: Layers of the Sun](https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/layers-of-the-sun/)
- [NASA APOD: Bright Points on the Quiet Sun](https://apod.nasa.gov/apod/ap100416.html)
- [NASA: Sunspots](https://science.nasa.gov/sun/sunspots/)
- [NASA: Sun Facts](https://science.nasa.gov/sun/facts/)

No new runtime dependencies or remote assets were added. The desktop source mirror and 244 English atlas strings were synchronized.

## Validation

- JavaScript syntax check passed.
- 106 unit checks passed across catalog behavior, notebook persistence, shared-scale comparisons, investigations, and fullscreen state. See `unit-results.json`.
- All 25 browser scenarios passed in the complete real-WebGL run, including the three new solar scenarios. See `browser-results.txt` (5.4 minutes).
- New checks exercise actual WebGL output, photospheric geometry and measurement, all six targets, animation pause, camera interpolation, manual interruption, stopped rendering when idle, reduced motion, phone keyboard use, marker occlusion, notebook restoration, and context cleanup.
- Final desktop, close-up, shared-scale, and 320-pixel phone captures were inspected. Existing atlas, comparison, investigation, inspection, anatomy, microscopy, notebook, and planetary scenarios also passed.

## Visual evidence

- `before/sun-review.png` — previous surface
- `solar-cutaway.png` — complete interior
- `solar-core.png`, `solar-radiative-zone.png`, `solar-convection-zone.png` — interior inspections
- `solar-surface.png`, `solar-photosphere.png`, `solar-sunspots.png` — surface inspections
- `solar-prominence.png` — magnetic arch
- `sun-earth-comparison.png` — measured comparison
- `phone-solar-core.png` — 320-pixel keyboard inspection

Preview: http://127.0.0.1:54391/?tool=scaleExplorer&focus=sun&v=solar
