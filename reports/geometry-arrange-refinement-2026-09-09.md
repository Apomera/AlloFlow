# Sculpt arrangement refinement — 2026-09-09

Added an explicit Selected part / Whole group scope for Ground, Center X/Z and Snap to step. Group actions translate all members by the same amount, preserve their relative positions, and require every affected member to be unlocked. Center and Snap use the selected part's center as the anchor. Copy and mirror controls retain their existing selected-part behavior.

Ground now measures the actual rendered vertices of affected parts, including their rotations and whole-sculpture scale. Selection outlines and move handles no longer affect the grounding height. The lowest surface in a group rests on the grid while group spacing stays intact.

Arrangement controls now include concise descriptions and adapt to stacked cards on narrow phones. Out-of-bounds changes are refused atomically. No-op actions preserve history; successful arrangements use one Undo step.

Source: `stem_lab/stem_tool_geosandbox.js`, mirrored to `desktop/web-app/public/stem_lab/stem_tool_geosandbox.js`.

## Validation

- 46 tests passed across Sculpt arrangement, editor and movement suites. Covered scoped centering/snapping, preserved offsets, locks, workspace boundaries, malformed translations, no-op history, Undo/Redo and source immutability.
- Browser checks passed at 1440, 390 and 320 pixels wide. Verified actual surface grounding with rotated box and torus geometry, group spacing, repeated Ground without an extra Undo step, centering, snapping, locks, saved scope and responsive layout. No page errors or failed requests occurred.
- Visually inspected desktop and narrow-phone layouts.
- JavaScript syntax and scoped diff formatting checks passed; source/public hashes match.

Evidence: `scratch/geometry-arrange-refinement-2026-09-09/browser-results.json` and adjacent screenshots. Physical headset behavior was outside this browser editing pass.
