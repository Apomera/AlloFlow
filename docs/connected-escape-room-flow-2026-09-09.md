# Connected escape room: independent puzzle paths

Implemented locally on September 9, 2026. Module revision: **2a8d292216**.

## What changed

AI generation now checks that the final door combines at least two independent paths with their own reasoning devices. Previously, a structurally valid room could put both devices in one sequence and repeat an earlier discovery at the final door, making it appear to have two paths.

The new analysis follows prerequisite relationships, removes redundant final requirements when counting paths, and distinguishes shared discoveries from objects belonging to one path. It supports intermediate objects that carry a device result to the door and rooms with more than two paths. The Discovery opens two paths option also requires a use-tool discovery upstream of a reasoning device on each independent path.

The generator sends specific feedback through the existing single repair attempt. It never silently rewrites puzzle dependencies, adds an extra review request, or loops indefinitely. If both attempts fail, the previous preview remains available.

## Teacher review

A collapsed **How this room connects** view shows starting objects, shared discoveries, separate paths, the discoveries each object needs and reveals, and the final door. Each object opens its exact clue editor and focuses the instruction field. **Back to room connections** returns keyboard focus to the expanded view.

The view uses native details, headings, lists and buttons. It has a single-column layout at narrow widths, supports enlarged text and high contrast, and uses the existing translation namespace. Connection checks describe the puzzle structure; they do not establish that the content, clues or lesson reasoning are correct. The existing optional AI playability review remains available for that separate purpose.

## Compatibility and collaboration

- New quality requirements apply only to newly generated AI rooms. Existing v1 library entries, imports, solo saves and live rooms retain their established validation rules.
- A saved sequential room can still be played, saved and launched; its teacher connection view explains the limitation.
- Solo and collaborative play still use the same deterministic puzzle rules. Both structures remain completable by one person.
- No participant permissions, shared write paths, synchronization schema, timing rules or role requirements were added. The flow view is derived from the room specification.
- Classic escape-room mode and other quiz modes were not changed in this pass.

## Verification

- **244 regression tests passed across 10 files**, including 21 new cases covering dependency analysis, misleading branches, shared prerequisites, indirect results, three-path rooms, tool gates, bounded repair, saved-room compatibility, solo/shared completion and review focus.
- After the final spacing and singular-label refinement, the 32 flow/runtime tests and new browser flow check passed again.
- New browser flow journey: generation repair, requested discovery structure, keyboard editor navigation and return, failed-generation recovery, and importing an older sequential room. Six deterministic provider requests and zero live writes.
- Existing solo journey: 377 keyboard Tab steps, zero live writes, completion, reload recovery, saved rooms, hints, review and restart.
- Existing live journey: four independent browser contexts and 33 permission-checked writes using the real session adapter and Apps Script handlers with local service substitutes. Includes concurrent actions, pending-action recovery, pause/resume, host reload, late join, completion and restart.
- 27 automated accessibility/layout variants across the flow, solo and live checks: no reported axe violations for the selected WCAG A/AA rules and no checked horizontal overflow. New flow views covered desktop, 320px mobile, dark mode, 200% text with increased spacing, and forced colors; buttons met the 44px height check. Mobile and desktop screenshots were also visually inspected.
- Root/public bundles match, all three app loader references use the current revision, and both translation files contain the updated escape-room namespace.

Manual NVDA, JAWS and VoiceOver validation remains outstanding. The automated checks do not establish complete WCAG conformance. Paid AI providers and real classroom networks were not exercised; generation/browser tests used deterministic fixtures. This change has not been deployed.

## Evidence and implementation

- Summary: [verification.json](connected-escape-room-flow/verification.json)
- Flow browser checks: [browser-verification.json](connected-escape-room-flow/browser-verification.json)
- Solo checks: [solo/verification.json](connected-escape-room-flow/solo/verification.json)
- Live checks: [live/verification.json](connected-escape-room-flow/live/verification.json)
- Dependency analysis: connected_escape_room_flow.js
- Teacher review: connected_escape_room_flow.jsx
- Integration: connected_escape_room_engine.js and connected_escape_room_source.jsx
- Regression coverage: tests/connected_escape_room_flow.test.js
- Browser journey: dev-tools/check_connected_escape_flow.cjs
