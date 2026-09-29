# Galaxy Black Hole Lab: continuous debris and fragment inspection

Debris now keeps moving throughout the modeled observation. Previously, breakup shortened some orbital runs to 12 seconds after disruption, and an outward parcel could stop at its own preview boundary while playback continued. Fragment paths now cover the complete center observation, with an additional short interval after center capture. Captured parcels stop at the horizon; outside parcels continue to evolve.

The new **Inspect debris** panel lets you select any modeled fragment or pick the nearest or farthest surviving parcel. A violet ring marks it in the scene, its recent trail becomes violet, and its distance line and current position appear on the playback chart. The readout gives its distance, inward or outward motion, and bound or unbound energy. **Follow selected fragment** centers the camera on that parcel. Selecting **All debris** restores framing of the stream.

Selection pauses playback. It survives replay, backward seeking, and switching to Light bending. Before breakup, the inspector identifies the fragment as part of the intact object. After capture, it removes the ring and chart dot and offers backward inspection. Resetting or changing the release clears the selection. The native selector supports keyboards, and a live announcement reports selections without announcing every animation frame.

![Selected parcel on a phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-debris-2026-09-29/selected-fragment-390.png)

## Simulation and performance

The same Schwarzschild equations and fixed RK4 integration step remain in use. Scalar calculations replace temporary vectors inside integration. Outer fragment paths store one sample per eight integration steps; paths within three horizon radii retain every step. Exact capture samples are retained, and scene, chart, and inspector compare the same absolute crossing time.

The numerical checks compare sparse interpolation with dense integration, verify energy conservation and analytical radial fall, and check continued motion beyond the former exit cutoff. Preparing 48 stellar parcels took **76.1 ms** for the orbital example and **103.6 ms** for a 120-unit observation in the local Chromium test. These measurements describe this machine and test environment.

Object dimensions, deformation, parcel offsets, and playback time remain illustrative. The model does not include material hydrodynamics or light emitted by the debris. Energy classification describes the modeled trajectory's conserved energy; it does not promise survival. Schwarzschild motion can reach the horizon despite angular momentum or bound energy, as described in [David Tong's general relativity notes](https://www.damtp.cam.ac.uk/user/tong/gr/grhtml/S1.html).

## Validation

- **86 checks passed** across physics, optics, mode smoke tests, visual layout, and readability contracts. The final run collected 66 checks; the separately run readability file passed its remaining 20 checks.
- The new WebGL suite passed selection, nearest/farthest picking, scene/chart agreement, individual camera tracking, restoring stream framing, capture, replay, rewind, keyboard selection, view preservation, long observations, and graphics-context recovery.
- Desktop, 390-pixel, and 320-pixel layouts passed without horizontal overflow. The 320-pixel right-to-left layout also passed. Visual inspection verified the scene marker and chart legend.
- Existing placement, throwing, comparison, distance-chart, follow-camera, playback, reduced-motion, context recovery, and cleanup checks passed in the broader browser suite.
- Both Galaxy source copies match. The scoped whitespace check passed.

Records: [validation summary](./validation-summary.json), [86 Galaxy checks](./galaxy-tests.json), [debris browser checks](./debris-browser-results.json), and [existing interaction checks](./regression/browser-results.json).
