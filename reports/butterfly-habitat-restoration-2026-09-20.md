# Butterfly Habitat Lab: restoration investigation

Learners can redesign a fourth plot, predict which feeding resources it will offer, then fly to it, land, and examine the result. The three original reference patches retain their observations. A separate comparison table records the latest examined version of each planting plan.

## Experience

- Compare a mown plot, established flowering wild bergamot, and established milkweed with bergamot.
- Record a prediction before applying a plan. Applying a plan pauses flight and does not create an observation.
- Visit and examine the plot to receive explanatory feedback and record its resource availability. A new prediction leaves earlier observations intact until it is tested.
- The same activity works in 3D and the fallback map, with keyboard and touch controls.
- Saved state version 2 preserves planting choices, pending predictions, and completed comparisons. Version 1 journals migrate to an unmodified mown plot. Restoration observations never inflate reference-journal progress.
- The reference journal is labeled explicitly. Action feedback uses one live announcement region, with a local visible explanation in the design activity.

## Visual implementation

The fourth plot has a distinct border and updates visibly when a plan is applied. Its alternatives use the existing plant builder and shared geometry. Instanced plant groups switch visibility inside the current world; changing a plan does not replace the renderer or reset the flight session. The scene owns and disposes its resources as before. The new design panel and comparison table adapt to narrow screens and explicit high-contrast mode.

## Science

The choices show mature summer plantings, not instant biological growth. The model compares the presence of nectar and monarch caterpillar host leaves; it does not estimate abundance or survival. The resource relationships were checked against [Xerces' Mid-Atlantic guidance](https://www.xerces.org/publications/plant-lists/monarch-nectar-plants-mid-atlantic) and [USDA NRCS monarch habitat information](https://www.nrcs.usda.gov/programs-initiatives/monarch-butterflies).

## Verification

Twenty-one model checks passed across the existing Butterfly Lab suite and the new restoration suite. These cover valid and invalid predictions, physical observation requirements, the three resource outcomes, preserving prior trials, independent reference observations, flight pausing, navigation to the plot, and save migration/validation.

All five final browser checks passed in the local Chromium/WebGL harness, including:

- Existing free flight, keyboard controls, exact pausing, camera/map switching, all three reference visits, and paused context-loss recovery.
- Applying each restoration design inside the same 3D renderer, collecting observations only after visits, preserving earlier trials, and bounding geometry allocation across design changes.
- Restoring a pending prediction on a phone-size fallback map, collecting its result, preserving reference-journal progress, keyboard plan selection, and explicit high-contrast mode.
- Scoped axe WCAG checks across the desktop and mobile workflows, with no reported violations.
- An explicit check that paused 3D scenes do not keep rendering.

The first browser run exposed an existing timing limitation: frames slower than 50 ms discarded simulation time, causing long guided flights. The runtime now consumes elapsed time in small substeps, capped at 250 ms per rendered frame, and avoids redundant redraws while paused. Two additional model tests check equivalent progress at 60 and 10 frames per second, bounded catch-up, and stopping substeps when guidance arrives. The previously timed-out reference itinerary passed in the final run without increasing test timeouts.

Runtime syntax, focused whitespace checks, and source/desktop byte parity passed. The 3D mixed-planting view, desktop comparison activity, and mobile design layout were inspected visually.

Evidence:

- `scratch/butterfly-restoration-final-unit.log` — 21 passed.
- `scratch/butterfly-restoration-final-browser.log` — 5 passed.
- `scratch/butterfly-habitat/restoration-mixed-3d.png`.
- `scratch/butterfly-habitat/restoration-comparison-desktop.png`.
- `scratch/butterfly-habitat/restoration-mobile.png`.
- `scratch/butterfly-habitat/restoration-map-mobile.png`.

This update is implemented locally and mirrored into the desktop public assets; no deployment was published.

Changed runtime files: `stem_lab/stem_tool_butterfly.js` and its desktop public mirror. Added model tests in `tests/butterfly_restoration.test.js`, updated the saved-state assertion in `tests/butterfly_habitat.test.js`, and extended `tests/e2e/butterfly-habitat.spec.ts` with desktop and mobile restoration workflows. Shared Bee Lab code and app loading code are unchanged in this enhancement.
