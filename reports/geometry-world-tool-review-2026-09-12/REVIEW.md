# Geometry World — tool discovery and preview review

## Implemented

**Find a tool** is available from the Free Build dock. It searches eleven destinations by their names, descriptions, and common terms such as roof, copy, JSON, and print. Name matches rank first. Enter opens the first available result, expands the relevant section, scrolls within the dock, and moves keyboard focus there. Unavailable selection tools explain what is required and link to selection controls. Unfinished form entries stay mounted while the finder is open.

**Pending preview actions** stay in the dock footer. A proposal shows its block count, target block bounds, and net block change. Review in world frames the broad side of the proposed geometry with Apply, Back to tools, and Cancel available beside it. Escape cancels. Returning to the dock preserves the proposal; applying uses the existing transaction and Undo path. Opening the main Build tools button exits review and avoids duplicate action controls.

**Clear preview presentation** temporarily hides decorative landscape scenery so nearby trees cannot cover the proposal. Show surroundings restores placement context. Scenery visibility is restored when review ends, including after a render-quality replacement; student geometry, selection, history, and project data are unchanged. Ordinary placement guidance is hidden during review.

**Small-screen navigation** provides a scrollable finder and a compact dock on short landscape screens. Preview controls retain touch targets of at least 44 pixels and long review content can scroll within the viewport. The compact phone review is checked against the projected model bounds so its controls do not cover the proposed structure.

## Verification

- 524 passing unit tests across 27 suites; no failed or pending tests after merging the latest rerun for each suite.
- 25 browser assertions passed, with no page errors, using local Chromium and real WebGL.
- Covered draft preservation, natural-language search, keyboard focus, unavailable tools, preview ownership, explicit Apply, exact Undo, Escape cancellation, scenery isolation/restoration, 320px touch portrait, and 844×390 landscape.
- Source syntax, canonical/desktop parity, and scoped git diff whitespace checks passed.
- Screenshots: [preview footer](01-preview-footer.jpg), [world review](02-preview-world.jpg), [phone finder](03-phone-tool-finder.jpg), [phone review](05-phone-review.jpg), [short landscape](06-short-landscape.jpg), [desktop finder](07-desktop-tool-finder.jpg).

## Next priorities

1. Material and lighting polish: make previewed material choices easier to judge, improve consistency across stone, timber, glass, and water, and tune shadows around dense structures.
2. Precision building: alignment and repeated patterns for larger structures, with clear previews and one-step Undo.
3. Larger connected lesson areas: distinct districts, landmarks, and routes linking several meaningful construction challenges.

## Delivery

Updated stem_lab/stem_tool_geometryworld_builder.js and synchronized desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js. Added tests/geometry_world_tool_review.test.js. Existing unrelated workspace changes were preserved.

No commit or deployment was performed. Verification used the local app harness; the Gemini Canvas shared deployment was not updated.
