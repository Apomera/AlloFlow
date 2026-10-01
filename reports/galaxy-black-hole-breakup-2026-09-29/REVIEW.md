# Black Hole Lab: clearer falling objects and breakup

## Changes

- **Surviving debris stays visible.** Probe and astronaut fragments previously shared materials with the intact object. Hiding the center also set surviving parts' opacity to zero. Fragments now have independent materials, with color and opacity evaluated at each part's own radius.
- **Stars dissolve into a glowing stream.** A smooth transition replaces the abrupt switch from a solid surface to debris. Forty-eight deterministic parcels fill the star's volume. Soft emission replaces the bright, solid beads, and the initial camera distance includes the enlarged stellar envelope.
- **The marker follows the debris.** After breakup, it tracks the surviving parcels' centroid and shows their count. The readout gives their distance range and how many have crossed the horizon. The intact object's trail ends at breakup; each parcel continues its own trail.
- **Key moments are directly accessible.** Timeline buttons jump to release, breakup, closest approach, center capture, or the end of the observation when those events occur within the modeled interval. Selecting a moment pauses playback. Step back complements Step forward.
- **Rewind restores appearance as well as position.** The stellar transition, each fragment's opacity, and its color are calculated from the selected time.

![Timeline controls](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-breakup-2026-09-29/event-navigation.png)

## Verification

- **38 focused tests passed:** 20 object-dynamics tests, 12 optics tests, and 6 Galaxy mode checks. New numerical checks locate the actual radial turning point, omit nonexistent events, and keep bookmarks within playback.
- The real Chromium/WebGL object suite passed with no page or console errors. It covers pointer placement, aiming, cancellation, touch, replay, backward scrubbing, all three objects, mass changes, capture/orbit/escape presets, reduced motion, context recovery, and cleanup.
- New browser regressions verify that trailing parts remain visible after center capture, their opacity matches their own radius, the stellar transition rewinds exactly, and event navigation pauses at the requested time.
- The optical browser suite passed: switching views preserves the experiment, paused rendering stays idle, context recovery succeeds, and layouts fit at 1440, 390, and 320 pixels. The measured shadow radius was 70.5 pixels versus a predicted 70.35 pixels.
- Active stellar debris and the event controls also passed a separate check at 1440, 390, and 320 pixels, with no horizontal overflow.
- The two Galaxy source copies match. English catalogs parse, and 11 new labels were registered. The scoped whitespace check passed.

Results: [focused tests](./vitest-results.json), [object browser checks](./browser-results.json), [optical browser checks](./optical-browser-results.json), [active phone layouts](./responsive-events.json).

## Model limits

This pass changes presentation and inspection controls; it does not change the underlying Schwarzschild trajectory equations. Object sizes, breakup thresholds, deformation, gas emission, and playback timing remain illustrative. The parcels do not model fluid pressure, collisions, or stellar self-gravity. Dropped objects are still drawn geometrically; the separate Light bending view computes disk and sky light paths.

No commit was created.
