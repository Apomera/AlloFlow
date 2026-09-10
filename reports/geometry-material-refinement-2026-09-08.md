# Sculpt material refinement — 2026-09-08

Custom colors and finishes now follow the same selected-part or group scope as presets. Group edits skip locked members, preserve properties not being edited, and remain reversible with Undo. The panel reports the number of editable and skipped parts and identifies mixed surfaces.

Added exact hex-color entry with optional #, three- or six-digit input, validation, Enter/blur commit, and Escape cancellation. Invalid or uncommitted drafts do not change geometry or history. Preset cards now show finish-specific swatches, finish names, and a checked active state when all editable targets match.

Inspector shortcuts align the chosen section near the top of the desktop panel or below the sticky phone canvas, making its controls immediately reachable.

Source: `stem_lab/stem_tool_geosandbox.js`, mirrored to `desktop/web-app/public/stem_lab/stem_tool_geosandbox.js`.

## Validation

- 40 tests passed across the existing Sculpt editor suite and seven new material tests. Covered scoped color/finish edits, locked members, partial-property preservation, mixed states, hex drafts, validation, cancellation, no-op history, active presets, and undo/redo.
- Final browser checks passed at widths of 1440, 390 and 320 pixels. Verified real Three.js metal/matte/wire materials, exact color input, group scope, lock preservation, undo, active presets, persisted recipes, responsive fit, and actual section-jump alignment without test-only scrolling. No page errors or failed requests occurred.
- Visually inspected the material panel and model on desktop and phone.
- JavaScript syntax and scoped diff formatting checks passed; source/public SHA-256 hashes match.

Evidence: `scratch/geometry-material-refinement-2026-09-08/browser-results.json` and adjacent screenshots. This pass covers browser Sculpt editing; physical headset behavior was not tested.
