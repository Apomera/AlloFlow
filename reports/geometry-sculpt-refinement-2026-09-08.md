# Geometry Sandbox: Sculpt editor refinement

The Sculpt workspace now separates size, movement, and rotation into smaller disclosures. A compact row jumps directly to Size, Move, Rotate, Arrange, or Material, opening the destination and moving keyboard focus to its summary.

Exact numeric fields retain drafts until Enter or blur. Escape cancels without changing the sculpture or its undo/redo history. Invalid values show an inline range message instead of silently clamping; invalid blur restores the current value. Field identity follows the selected part so rejected drafts and error messages do not carry into another part's editor. These controls also cover project scale, rotation, and copy spacing.

The existing local preview referenced an obsolete CSS asset. Its link now points to the current built stylesheet.

## Verification

- Seven focused suites passed **114 tests** for the main change: sculpt editing, workbench, panel rendering, drag gestures, mode isolation, visual clarity, and rendered geometry.
- After the final part-selection refinement, the sculpt editor suite passed **23 tests**, including the new selection regression. Together with the other six suites, this gives **115 passing tests**.
- Real WebGL browser workflows passed at **1440×1000** and **390×844**: all five section jumps, focus behavior, material undo, exact-value drafts/cancellation/validation, redo preservation, movement, rotation, and horizontal overflow checks. No runtime errors, failed requests, or HTTP errors were observed.
- Desktop and phone screenshots were visually inspected; the final shortcut row fits on one line.
- Source/public file hashes match and scoped whitespace checks pass.

Browser script, results, and screenshots: `scratch/geometry-sculpt-refinement-2026-09-08/`.

This pass targets the main Sandbox's Sculpt editor. Physical headset behavior was not tested.
