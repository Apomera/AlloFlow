# CoasterLab station explorer — 2026-09-07

Station view now opens a compact explorer with Overview, Platform, and Forecourt shots. Platform framing brings the canopy, boarding gates, and signs closer. Forecourt framing uses a higher viewing angle to show paving, benches, and planting.

The active shot refits after viewport resizing. Dragging or scrolling releases that automatic framing and clears the selected preset, so the user can orbit freely. Choosing a preset recenters the view. Switching camera modes, fitting the whole track, starting a run, or returning to editing closes the explorer.

A visible Done button restores Build and returns keyboard focus to the Station view entry button. Explorer controls stay within the phone viewport and have space reserved above the framed scene. Each shot has a short live description and an explicit pressed state.

Validation:
- 266 unit tests passed across CoasterLab, perspective framing, and visual presentation.
- The final Chromium/Three.js browser test passed, checking keyboard shot selection, closer framing, responsive portrait layout, manual orbit preservation, preset recovery, Done/focus behavior, and unchanged analysis.
- Desktop and phone captures reviewed visually.
- JavaScript syntax and targeted git diff whitespace checks passed.

Browser spec: `tests/e2e/coaster-station-explorer.spec.ts`.
Final screenshots: `scratch/coaster-station-explorer-final/`.
