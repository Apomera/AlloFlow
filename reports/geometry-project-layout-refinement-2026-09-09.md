# Geometry Sandbox — Project panel refinement

The Project panel now places the sculpture title, Save, Save a copy, and Continue editing together in a compact card. A clear primary Save button and the existing save-destination message make the result of saving easier to understand.

Saved sculptures appear immediately after the project card. New sculpture remains directly available. Whole-sculpture adjustments start collapsed, and import/export share a separate disclosure with a short explanation.

Title drafts apply on Enter or blur, cancel on Escape, and restore the committed value if left blank. Committed title changes remain undoable.

## Verification

- 55 targeted unit tests passed across Project layout, project handoff, saved gallery, editing, and dragging. One gallery test initially exceeded the 15-second time limit; the gallery suite passed independently with a longer timeout.
- Real Chromium preview checks passed at 1440, 390, and 320 pixels: title editing followed by Save, independent copies, Escape cancellation, exported JSON contents, import and undo save association, return to editing, collapsed secondary sections, and horizontal overflow checks.
- No browser runtime or failed-request errors were recorded.
- JavaScript syntax check and scoped `git diff --check` passed.
- Main source and public mirror have identical SHA-256: `978676EB8A4ECBE55A4AD26FE43F7FD719C95E63D0CD939E52D2E3D11E67B641`.

Browser results and screenshots: `scratch/geometry-project-layout-2026-09-09/`.

This pass validates the browser Project workflow; it does not include headset testing.
