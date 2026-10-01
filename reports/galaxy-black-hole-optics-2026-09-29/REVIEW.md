# Black Hole Lab: a view with computed light bending

## Result

The lab now has an **Object experiment** view and a **Light bending** view. The latter forms the disk image and background sky from the same Schwarzschild light paths. Its far-side disk images change with camera inclination, and the shadow follows the predicted photon-capture boundary.

Switching views pauses the experiment and preserves its release, timeline, and camera position. Animating the optical disk leaves the object's experiment time unchanged. The existing placement, throwing, fragmentation, and replay controls remain in Object experiment.

![Disk viewed near its edge](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-optics-2026-09-29/optical-edge.png)

## What the learner can explore

- **Change the viewing angle.** The far side of the disk appears above and below the shadow when viewed near its edge. The above-disk view shows how that structure changes with inclination.
- **Hide the disk.** This exposes the lensed background and the full capture shadow.
- **Show the sky grid.** A regular angular grid makes the background's distortion easier to follow.
- **Show the frequency-shift map.** Orange indicates redshift, pale colors indicate little shift, and blue indicates blueshift. The model includes the disk's circular motion and gravitational frequency shift.
- **Pause and inspect.** Camera controls remain active while paused. An unchanged paused optical image is not redrawn every animation frame.

The disk now fits phone widths. Star filtering keeps unresolved background sources compact, and filtering of the disk's fine bands reduces interference patterns in the image.

## Model

Distances use the Schwarzschild horizon radius, Rs. The observer is stationary at 20 Rs, and the geometrically thin disk extends from 3 to 12 Rs. Zoom changes the field of view while the observer's radius stays fixed.

Each ray lies in a plane. With inverse radius u = 1/r and impact parameter b, the integrated equations are:

```text
d²u/dφ² = 1.5u² − u
(du/dφ)² + u²(1 − u) = 1/b²
```

An RK4 integration builds a table before rendering. The renderer uses this table for both disk-plane intersections and the direction of escaping sky light. Samples are concentrated near the critical impact parameter, b = 3√3/2 Rs. The equations and planar-ray construction follow the Schwarzschild treatment in [Bruneton's rendering paper](https://ebruneton.github.io/black_hole_shader/paper.pdf). This implementation uses its own integrator, table layout, shader, and illustrative scene.

For disk emission, the map combines a stationary observer with emitters on circular Schwarzschild orbits. The appearance uses a procedural gas texture and a display color palette. The distinction between the event horizon, capture shadow, and bent disk images follows [NASA's black hole anatomy guide](https://science.nasa.gov/universe/black-holes/anatomy/).

## Verification

**All 35 focused tests pass:** 12 optical-model tests, 17 object-trajectory tests, and 6 Galaxy mode smoke tests. An initial mode setup exceeded its 10-second hook timeout; the final run passed with a 60-second setup allowance. The assertions were unchanged.

The numerical checks cover capture and escape around the critical impact parameter, conservation of the null-geodesic invariant, weak-field deflection, behavior near the photon sphere, table encoding, and Doppler/gravitational frequency shifts. Existing orbit, fall, throw, and fragment checks also pass.

The optical browser run uses Chromium with SwiftShader and verifies:

| Check | Result |
| --- | --- |
| Shadow radius with the disk hidden | 70.5 pixels measured; 70.35 predicted for the finite observer and current field of view |
| Symmetry of the nonrotating shadow | Passed |
| Paused image rendering | No additional draws while the image is unchanged |
| Returning to an object experiment | Release, time, and camera preserved |
| Animating the optical disk | Object experiment time unchanged |
| WebGL context loss and restoration | Recovered |
| Layouts at 1440, 390, and 320 pixels | No horizontal overflow |
| Mode exit | Optical resources and canvas API disposed |
| Browser page and console errors | None |

The drawing buffer is capped at 1000 × 720 pixels and a pixel ratio of 1.25. The path textures occupy about 1 MiB and are reused across views. The final software-renderer run opened the optical view in about 1.3 seconds, including state updates and shader startup. Camera checks measured pairs of animation frames; they are diagnostic samples, not a hardware-independent FPS guarantee.

The source and desktop plugin are synchronized. Eighteen new English strings are registered in both UI registries and the Galaxy catalog. Other locales currently use the English fallback for these entries.

The full object-experiment browser run also passes placement, throwing, fragment replay, touch, reduced motion, and drag cleanup. Its final result is saved in `object-experiment-browser-results.json`.

Detailed results are in `vitest-results.json` and `browser-results.json`. Screenshots include the angled, edge, above-disk, sky-grid, shadow, frequency-map, restored-context, and phone views.

## Limits and next work

This is a nonrotating optical model. It does not implement Kerr spin. The table resolves up to four disk-plane crossings over an angular budget of 4π; it does not resolve the infinitely fine hierarchy of photon subrings.

The sky and gas texture are illustrative. Star filtering and brightness are approximations, and the disk palette is not a calibrated spectrum. The model does not include a thick turbulent plasma, absorption through a volume, light-travel delays, or a time-dependent fluid simulation.

**Dropped objects still use the existing experiment rendering.** Showing their received light consistently would require tracing their changing shapes along retarded trajectories, including Doppler shifts, secondary images, and delays. That is the next substantial optical extension. Synchronized saved-release comparisons would also make the object experiment more useful for investigation.

## Reproduce

```text
node dev-tools/galaxy_black_hole_qa.cjs --optics
node dev-tools/galaxy_black_hole_qa.cjs
node dev-tools/galaxy_black_hole_qa.cjs --serve --optics
```

The preview and browser checks load the actual plugin, React, Three.js, and app stylesheet in a small local host. They do not verify a full application deployment.
