# Geometry World preview navigation refinement

Proposed structures can now be inspected by dragging to orbit, pinching or scrolling to zoom, and choosing Angle, Front, Side, or Top. Fit model restores the complete view. Camera controls are collapsed by default to keep the review clear.

The camera fits the model into the space left by the review card, including after resize, orientation changes, expanded controls, and fullscreen. On phones, the redundant Build tools shortcut is hidden during review; Back to tools stays available in the card and restores the dock. Repeated zoom preserves the model's screen position and a stable clipping range.

Review gestures cannot place blocks, change material selection, capture the cursor, or trigger the world's Undo shortcuts. Back, Cancel, Escape, and Apply release camera ownership and restore the earlier pose. Lesson changes and tool unmount release listeners and pointer capture without moving the new scene to a stale camera position. Preview lighting follows the structure.

## Validation

- 243 passing targeted tests across 16 files; zero failures or pending tests. The final zoom suites supersede their earlier run.
- 23 distinct passing Chromium browser checks with no reported page errors. Mouse, keyboard, actual two-finger touch events, fullscreen, responsive framing, Apply, lesson loading, and actual React unmount were exercised.
- Canonical and desktop source copies match. JavaScript syntax and scoped git whitespace checks pass.
- The first UI run exceeded its default timeout; the complete targeted rerun passed with a longer timeout. The first browser script was corrected to reopen the starter tool after Cancel.

The browser checks use the current local source in a minimal React/Three.js host with software WebGL. The deployed Gemini Canvas app and a physical printer were not tested. These changes have not been committed or deployed.

## Screenshots and evidence

- [Desktop camera controls](02-angle-controls.jpg)
- [Phone preview with more model space](07-phone-full-width-review.jpg)
- [Expanded phone controls](08-phone-full-width-controls.jpg)
- [Short landscape layout](06-short-landscape-review.jpg)
- [Verification summary](verification.json)
- [Change diff for this pass](changes.diff)

Browser checks can be repeated with `node reports/geometry-world-preview-navigation-2026-09-12/browser.cjs`, `lifecycle-browser.cjs`, and `phone-browser.cjs` in the same report folder. Targeted unit results are in `final-tests.json` and `zoom-tests.json`.
