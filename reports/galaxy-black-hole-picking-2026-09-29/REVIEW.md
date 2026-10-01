# Black hole lab: direct fragment inspection

## What changed

After breakup, click or tap a visible fragment to pause and inspect it. The selected fragment stays linked to the scene ring, trajectory chart, readout, and follow camera. Soft particles have a 24 px fallback target, with the horizon blocking pieces behind it. Camera dragging starts after 6 px of movement, so a tap does not rotate the view. A drag remains a drag even when the pointer returns to its starting point.

With the scene focused, `[` and `]` cycle through outside fragments. Escape returns to All debris or cancels an active gesture. Picking is available in the object experiment while Move camera is active. Placement and aiming retain their existing gestures.

The inspector now shows the selected fragment's modeled radius in km, local tidal gradient, and static-clock reference factor. “Jump to this horizon crossing” goes to that fragment's exact capture time when its path crosses within the observation. Measurements hide before breakup and after capture. The main controls identify their references as center values.

The selection ring texture now uses sRGB encoding so its violet color matches the inspector and chart.

## Verification

- 89 passing checks across physics, optics, modes, readability, and visual layout.
- Real WebGL mouse and touch picking at 1440, 390, and 320 px; no horizontal overflow.
- Horizon occlusion tested by projecting a far-side parcel through the black hole and clicking that position.
- Small pointer motion, camera dragging, drag cancellation, keyboard wrapping, and Escape checked.
- Picking pauses a running experiment and keeps the transport controls synchronized.
- Individual capture shortcut checked before breakup and at the exact crossing; local values checked against the model state.
- Light-bending view preserves selection; mode exit removes the new APIs.
- Full debris, distance chart, follow camera, and launch-planning regressions pass.
- Desktop, phone, and right-to-left inspector screenshots reviewed.
- Primary source and desktop mirror match; seven new English keys align with both UI registries and the flat catalog.

One combined browser run failed while measuring the aiming marker. An isolated rerun passed. The gesture check now waits two animation frames after changing interaction mode, allowing the camera and marker to update before measurement; the final combined run passes.

## Interpretation of the measurements

The radius is the Schwarzschild areal coordinate, not proper radial distance. The static-clock factor is the stationary reference `sqrt(1 - Rs/r)` outside the horizon; it excludes the fragment's motion and light travel time. The tidal value uses the existing model's local radial gradient. Black hole mass classes remain 10 and 4,000,000 solar masses.

The object paths use the existing nonrotating model. Object sizes, breakup offsets, material deformation, and playback time remain illustrative. These additions improve inspection of that model without adding fluid or material mechanics.

## Saved evidence

- [Automated checks](galaxy-tests.json)
- [Picking browser results](picking-browser-results.json)
- [Debris regression](regression/debris-browser-results.json)
- [Combined browser regression](regression/browser-results.json)
- [Desktop scene](picked-fragment-1440.png)
- [Phone inspector](local-metrics-320.png)
- [Right-to-left inspector](metrics-rtl-320.png)

The existing local preview serves the new code at http://127.0.0.1:60416/. Refresh the page to load this pass.
