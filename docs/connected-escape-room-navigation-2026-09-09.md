# Escape-room navigation and saved variations — September 9, 2026

This pass improves investigation navigation and local room reuse. Changes are local and have not been deployed. No participant permissions or shared-state formats change.

## Player experience

- **Investigation guide:** An expandable overview groups every object by area, shows discovery counts, and distinguishes ready, completed, and locked objects. Its buttons open the selected object and move keyboard focus to its heading. The guide contains navigation metadata, not hidden clues or solutions.
- **New discoveries and leads:** After a discovery, the player sees the recovered item names and direct links to investigations that have just become available. Shared updates do not move the player's current selection or focus. Late joiners get the current guide without replaying all historical discoveries as announcements.
- **Reading shortcuts:** Buttons jump directly to the selected object or the journal, reducing repeated navigation on small screens and with a keyboard. Navigation preserves unfinished device settings and makes no multiplayer writes.

## Saved-room library

Setup now supports eight saved rooms per lesson and language in the current browser. Saving a new variation preserves earlier saved rooms. Saving identical content updates its existing entry. Opening a saved room requires no AI request and remembers that selection for the next setup visit.

Solo progress remains separate for each room and learner, in the same browser tab. The existing single-room save is read as a legacy entry; migration leaves that original data in place. An empty new library prevents removed legacy entries from reappearing.

The library does not evict rooms when it is full. It explains how to remove a saved room before saving another. Removal needs confirmation and keeps the currently open preview and tab-scoped solo progress. Opening a saved room over unsaved edits also needs confirmation, initially focused on Cancel. These are product controls for learners, not additional assistant approval requests.

Malformed, oversized, or mismatched stored libraries are not overwritten. Save failures preserve the current playable room. The library is local browser storage, not cloud synchronization or a portable export format. Generating another room can replace an unsaved preview; save variations you want to retain.

Preview progress and workspace identity reset when generating or loading another room. AI review results clear when switching rooms, so a review cannot be displayed as applying to another variation.

## Verification

All **152 focused tests passed**, including 23 new library/navigation tests. The solo browser check passed with **312 keyboard Tab steps**, no live writes, saved-variation recovery, and mobile accessibility checks. The four-browser collaboration check passed with **24 permission-checked writes**, including direct navigation to a newly opened investigation. Automated accessibility checks found no violations in the tested views.

Results: [solo verification](connected-escape-room-navigation/solo/verification.json), [live verification](connected-escape-room-navigation/live/verification.json). Screenshots: [mobile investigation guide](connected-escape-room-navigation/solo/investigation-guide-mobile.png), [mobile saved-room library](connected-escape-room-navigation/solo/saved-library-mobile.png). Both screenshots were visually inspected. Root/public bundles and interface strings match; the connected-room cache revision is `24a7e326a0`.

Verification results and screenshots are recorded under `docs/connected-escape-room-navigation/`. The fixtures exercise production React components and puzzle rules. Multiplayer tests use the production Mailbox adapter and actual Apps Script handlers with local substitutes for Google services. AI responses are deterministic fixtures, not a paid-provider quality evaluation.

Repeatable checks:

```text
node _build_connected_escape_room_module.js
node node_modules/vitest/vitest.mjs run tests/connected_escape_room_library_navigation.test.js tests/connected_escape_room_solo_review.test.js tests/connected_escape_room_runtime.test.js tests/connected_escape_room_refinements.test.js tests/connected_escape_room_engine.test.js tests/connected_escape_mailbox.test.js --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node dev-tools/check_connected_escape_solo.cjs
node dev-tools/check_connected_escape_live.cjs
```

Accessibility checks cover keyboard navigation, focus preservation, automated WCAG 2.2 rules, mobile layouts, enlarged text, and forced colors. They do not establish complete WCAG conformance; actual screen-reader testing remains outstanding.
