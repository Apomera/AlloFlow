# Sculpt movement refinement — 2026-09-08

Reorganized Position & movement into axis-colored rows pairing each exact coordinate with its minus and plus controls. Moved the group movement toggle into this section and added a clear description of the active movement scope.

Exact coordinates now translate the selected group together, preserving relative placement and using displayed units at the sculpture's scale. Locked members block a group move. Exact positions that would push another member outside the workspace are refused atomically, restore the coordinate field, and show inline feedback without consuming Undo or Redo history. Existing handle nudges retain their shared-boundary behavior.

Added a Custom movement-step option from 0.01 to 10 display units, with draft entry, range validation, and persistence. Buttons and 3D handles use the same chosen step.

Source: `stem_lab/stem_tool_geosandbox.js` and its matching public copy.

## Validation

- 45 tests passed across the Sculpt editor, drag, and new movement suites. Covered scaled group coordinates, preserved spacing, shared boundaries, locks, independent selected-part edits, custom step drafts, button/handle consistency, and Undo/Redo.
- Final browser checks passed at 1440, 390 and 320 pixels wide. Verified exact group moves, rejected-move field restoration and inline feedback, custom-step button input and actual projected-handle mouse clicks, undo, saved movement settings, and responsive row fit. No page errors or failed requests occurred.
- Visually inspected the final desktop and narrow-phone layouts.
- JavaScript syntax and scoped diff formatting checks passed; source/public SHA-256 hashes match.

Evidence: `scratch/geometry-movement-refinement-2026-09-08/browser-results.json`, browser script and screenshots. Physical headset behavior was outside this browser editing pass.
