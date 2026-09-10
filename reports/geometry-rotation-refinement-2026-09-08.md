# Sculpt rotation refinement — 2026-09-08

Added axis-colored rotation rows with exact angles and adjacent negative/positive turn buttons. The layout follows the movement editor, with compact fields and accessible button names.

Turn increments offer 1°, 5°, 15°, 30°, 45° and 90°, plus a persistent custom increment from 0.1° to 180°. Buttons wrap into the 0–360° range; exact fields continue to accept signed angles. Every tap has its own Undo step, including rapid taps. Reset rotation remains reversible, and locked parts disable the angle fields and turn buttons.

Rotation edits apply to the selected part around its center, preserving its dimensions, position, other group members, and whole-sculpture transform.

Source: `stem_lab/stem_tool_geosandbox.js` and its matching public copy.

## Validation

- 48 tests passed across Sculpt rotation, editor and movement suites. Covered all three axes, positive and negative wrapping, fractional increments, rapid-tap history, draft validation, exact signed angles, reset, locks and preservation of part/group data.
- Browser checks passed at 1440, 390 and 320 pixels wide, including a paper background on desktop. Verified actual Three.js mesh angles, exact entry, custom steps, wrapping, Undo/Redo, locks, persistence, responsive fit and unobstructed turn buttons. No page errors or failed requests occurred.
- Visually reviewed desktop and narrow-phone layouts.
- JavaScript syntax and scoped diff formatting checks passed. Source and public copy SHA-256 hashes match.

Evidence: `scratch/geometry-rotation-refinement-2026-09-08/browser-results.json`, browser script and adjacent screenshots. Physical headset behavior was outside this browser editing pass.
