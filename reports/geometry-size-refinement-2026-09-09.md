# Sculpt size refinement — 2026-09-09

Moved Grow and Shrink into Size & shape and renamed the remaining rotation section Rotation. Added proportional resize cards that preview the actual resulting dimensions in display units before each action.

Resize factors offer ×1.05, ×1.15, ×1.25, ×1.5 and ×2, plus a saved custom factor from 1.01 to 4. Grow multiplies by the factor; Shrink divides by it. A Grow–Shrink pair restores the original dimensions when neither action encounters a size limit. Each action remains independently undoable.

Previews use the same proportional limit calculation as the applied resize, flag changes that stop at a limit, and disable further movement in that direction at the limit. Locked parts cannot resize. Part position, rotation and other group members remain unchanged.

Source: `stem_lab/stem_tool_geosandbox.js` and its matching public copy.

## Validation

- 49 tests passed across Sculpt resize, editor and rotation suites. Covered previews at whole-sculpture scale, reciprocal changes, custom-factor drafts and validation, proportional limits, torus minimum gap, locks, group preservation, and Undo.
- Browser checks passed at 1440, 390 and 320 pixels wide. Verified previews against real mesh dimensions, custom factors, inverse resizing, Undo, limit and lock disabling, persistence, and responsive cards. No page errors or failed requests occurred in the successful run.
- Visually reviewed desktop and narrow-phone resize panels.
- Syntax and scoped formatting checks passed. Source/public SHA-256 hashes match.
- Restarted the existing localhost preview server after it was found stopped.

Evidence: `scratch/geometry-size-refinement-2026-09-09/browser-results.json`, browser script and adjacent screenshots. Physical headset behavior was outside this browser editing pass.
