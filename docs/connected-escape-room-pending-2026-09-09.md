# Connected escape room: pending actions and continued investigation

Date: 2026-09-09. Local implementation; not deployed.

## Player experience

Previously, an unconfirmed action disabled the controls on every object. Players can now prepare configurations, sequences, tool selections, and coordinates on other ready objects while their first action is being sent or confirmed. The submitted object's controls stay fixed to the submitted settings. Further submissions and hint requests remain unavailable until that action is acknowledged. Pausing the room still pauses all puzzle controls.

The pending-action panel names the object and distinguishes sending, a slow send, waiting for the teacher, and an action ready to retry. A direct return button opens the submitted object and focuses its heading. The player can continue reading evidence and adjusting another puzzle without changing the queued request.

Prepared drafts and the original pending action survive a reload together. When the exact saved request already appears in the shared queue, the player waits for its confirmation. When the saved request is absent, an immediate retry is offered. Invalid, oversized, or obsolete saved actions are cleared with an explanation rather than leaving the room locked.

Results name the object they refer to. A confirmation preserves the player's current puzzle, draft, and keyboard focus. If the focused retry control disappears on confirmation, focus moves to the named result so the outcome remains accessible.

## Live-session handling

- An immediate transmission guard coalesces rapid retry clicks. Every retry retains the original attempt ID, request ID, object, action kind, and answer.
- A send already in progress remains the only active transmission of that request. Preparing another puzzle does not create another write.
- A receipt must match both the current participant and the pending object before clearing the action.
- The teacher's waiting count and host processor now use the same roster and shared-party checks. Removed or unassigned participants no longer inflate that count.
- All changes use existing participant action slots and teacher progress fields. There are no new backend fields or permission rules.

## Implementation

- `connected_escape_room_pending.js`: bounded pending-action recovery, exact request comparison, receipt matching, and host-queue eligibility.
- `connected_escape_room_pending.jsx`: contextual sending/recovery UI and accessible navigation.
- `connected_escape_room_source.jsx`: separate draft editing from action submission, transmission guard, named feedback, and focus recovery.
- `tests/connected_escape_room_pending.test.js`: regression coverage for concurrent preparation, reload recovery, pauses, retries, receipts, focus, and stale sessions.
- `tests/connected_escape_room_runtime.test.js`: updated recovery expectation when a saved action has not reached the shared queue.
- `dev-tools/check_connected_escape_live.cjs`: delayed transport, host reconnection, draft/reload, and pending-state accessibility scenarios.

AI generation, classic escape rooms, and the existing solo flow continue through their established interfaces. Pending-state navigation and draft editing use local state and do not call the AI provider.

## Verification

- **223 tests passed in nine suites**, including 23 new tests.
- **Live browser check:** 4 independent browser contexts and 33 permission-checked writes through the production Mailbox adapter and Apps Script handlers with local service substitutes. A transport write was deliberately held while another puzzle was prepared, then released while the teacher was unavailable. Both the pending request and second puzzle draft survived reload. On host reconnection, confirmation preserved the second puzzle's order and focused control; the prepared action was submitted only after the first was confirmed.
- **Solo browser check:** 373 keyboard Tab steps through a complete journey, with zero live-session writes.
- **Accessibility:** 22 recorded audit variants passed without axe violations or horizontal overflow. These include pending-action views at 320 pixels, dark mode, and 200% text, alongside the existing completion, large-spacing, and forced-colors checks. The pending panel was visually reviewed at 320 pixels.
- Root/public bundles, all three application loaders, and both interface-string namespaces are synchronized at revision `4b8c21a0ab`.

The browser checks use deterministic AI fixtures through the production interfaces and a local Mailbox service substitute. Paid providers and a real classroom network were not exercised. Manual NVDA, JAWS, and VoiceOver testing remains outstanding; automated checks do not establish full WCAG conformance.

Reports and screenshots are stored in `docs/connected-escape-room-pending/`, with an overall `verification.json` and separate `live` and `solo` reports.
