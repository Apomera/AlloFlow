# Black hole lab: fragment motion

## Changes

- A selected outside fragment has a direction arrow that follows the tangent of its drawn path, including the illustrative vertical offset. The horizon blocks arrows belonging to hidden fragments.
- The inspector shows local speed as a fraction of the speed of light and a fragment-clock reference that includes motion. Existing stationary clock and tidal references remain available for comparison.
- “Show motion direction” updates immediately, preserves playback and selection, and keeps its preference through replay. The scene refreshes when it comes back into view.
- The selection ring keeps a 44 px sprite width through zoom changes and across desktop and phone layouts. A dark border improves its contrast against bright debris and disk surfaces. Arrow length is illustrative.
- Capture hides the arrow and outside measurements. Rewind restores the same direction and values; switching between the object and light-bending views preserves the experiment.

The source and desktop mirror match. Four new motion labels are present in both UI registries and the flat English catalog. Changes remain uncommitted.

## Physics interpretation

These measurements use the existing nonrotating Schwarzschild geodesic model. Let `r` be radius in horizon radii, `f = 1 - 1/r`, `E` the conserved dimensionless energy per unit mass, and `L` the model's angular momentum. Transforming the model velocity into the local stationary observer's orthonormal frame gives:

```
v_radial / c     = (dr/dtau) / E
v_transverse / c = sqrt(f) L / (r E)
speed / c       = sqrt(1 - f/E²)
d tau / dt      = f/E
```

These are derived from the Schwarzschild conserved quantities and the stationary observer's frame described in [Cole Miller's geodesics lecture](https://www.astro.umd.edu/~miller/teaching/astr680/lecture07.pdf). The last factor compares the fragment's proper time with Schwarzschild coordinate time. It includes motion; the stationary reference is `sqrt(f)`. Both exclude light travel time and received-frequency effects.

The arrow uses the tangent of the rendered coordinate path. Its length does not encode speed. Object dimensions, deformation, breakup offsets, and playback time remain illustrative; this pass does not add material or fluid dynamics. Stationary observer measurements are omitted at and inside the horizon.

## Verification

- 93 passing checks across physics, optics, modes, readability, and visual layout.
- Analytical circular and retrograde speeds checked at 4, 5, and 8 horizon radii; moving clocks checked against the circular result.
- Rest, radial infall from infinity, the approach to the horizon, and captured parcels checked.
- The actual rendered arrow was compared with two neighboring rendered positions: tangent dot product exceeds 0.99999.
- The selection sprite remained 44 px wide across zoom changes and at 1440, 390, and 320 px viewports.
- Mouse/touch picking, horizon occlusion, keyboard cycling, cancellation, and exact capture navigation pass.
- Motion preference, paused redraw, replay, rewind, optical view switching, and mode cleanup pass.
- Full debris, launch planning, distance chart, and follow camera browser regressions pass.
- Desktop, phone, and right-to-left layouts checked for overflow and reviewed visually.

## Evidence

- [Automated checks](galaxy-tests.json)
- [Motion browser results](motion-browser-results.json)
- [Picking browser results](picking-browser-results.json)
- [Debris regression](regression/debris-browser-results.json)
- [Launch and camera regression](regression/browser-results.json)
- [Desktop scene](motion-scene-1440.png)
- [Phone scene](motion-scene-320.png)
- [Phone measurements](motion-values-320.png)
- [Right-to-left inspector](motion-rtl-320.png)

Refresh the existing local preview at http://127.0.0.1:60416/ to load this pass. Release an object, move beyond breakup, select an outside fragment, and enable Show motion direction.
