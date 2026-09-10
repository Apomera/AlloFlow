# Room files and editable clues — September 9, 2026

Implemented locally; not deployed. This pass improves moving a room between browsers and refining generated clues. No server permissions, participant-write paths, or live-session schemas changed.

## Download and import

Setup now has **Download or import a room**. Download creates a versioned `.alloroom.json` file containing the validated room specification, language, and lesson excerpt. It includes clues, hints, and stored solutions. Roster information, live-session details, progress, and AI-review results are not exported.

In another browser, open the same lesson and language, choose the file, inspect its title, area/object counts, and lesson excerpt, then explicitly open it. Import makes no AI request and does not launch or write a live session. The room can then be reviewed, saved to the library, played solo, or launched collaboratively through the existing controls.

An import preview explains when it would replace unsaved edits. Cancel keeps the current preview. Language or lesson mismatches block opening; whitespace-only differences in the same lesson are accepted. The file is not a standalone game: the AlloFlow app and matching lesson context are required. Progress is not transferred between browsers; existing tab-scoped progress for an identical room still follows the normal solo-resume behavior.

Files larger than 200,000 bytes are rejected before reading; oversized text, unsupported versions, invalid JSON, missing context, invalid puzzle connections/answers, and source-quote mismatches are rejected. Unknown metadata is dropped through the existing room whitelist. Parsed strings are rendered as text. Late reads after a lesson/language change or setup close are ignored, and failed reads can be retried.

## Editing generated rooms

The review view now lets authors edit:

- Room title, mission, and completion debrief.
- Each object's player instruction and visible description.
- The evidence or tool description collected from an object.
- All three graduated hints.

Every edit clears the previous AI playability result and resets the local preview attempt. Saving changed content preserves earlier saved versions as separate library entries. Changed room content also has its own solo-attempt identity.

Each AI-review finding includes **Edit this object's clues**, which opens the corresponding editor and focuses its instruction field. Teachers can revise the clue or its prerequisite evidence, then run the independent check again. Stored answer keys and dependency structures remain governed by the existing room engine.

Invalid edits produce room-validation feedback before saving rather than a misleading browser-storage error. Download also requires a valid room. The saved-room library displays the selected room's full title outside its select control, so long titles remain readable on small screens.

## Verification

- **175 focused automated tests passed**, including 23 new tests for file round trips, whitelisting, incompatible context, oversized files, cancellation, import previews, and editing/review behavior.
- A three-browser check passed a native file download and import into a fresh browser context, with no AI call or live write during import. It verified edited clues in the solo journal, malformed-file recovery, language mismatch feedback, and keyboard focus from AI findings to editing.
- Automated accessibility checks found no violations in the tested editor and import views, at desktop/mobile widths, in light/dark views, and with 200% text size. Screenshots were visually inspected.
- AI responses in tests are deterministic fixtures through production code. This pass does not claim a paid-provider quality evaluation or real classroom-network pilot. Full screen-reader testing remains outstanding; automated checks do not establish complete WCAG conformance.

Evidence: [file/editor results](connected-escape-room-portability/verification.json), [mobile import preview](connected-escape-room-portability/import-mobile.png), [editor](connected-escape-room-portability/editor-desktop.png).

The full solo browser journey also passed with 319 keyboard Tab steps and zero live writes. The four-browser multiplayer check launched an imported room and completed the shared escape, including pause/resume, retries, late join, restart, and end; it recorded 25 permission-checked writes. [Solo results](connected-escape-room-portability/solo/verification.json) · [Shared-session results](connected-escape-room-portability/live/verification.json).

Root/public bundles and interface strings match. The connected-room cache revision is `d93de5a5ad`.

## Main files and checks

- `connected_escape_room_transfer.js`: bounded file format, parsing, compatibility checks, and filename generation.
- `connected_escape_room_transfer.jsx`: native download, asynchronous file preview, and explicit import UI.
- `connected_escape_room_source.jsx`: expanded editing and integration with setup/AI review.
- `tests/connected_escape_room_transfer.test.js` and `dev-tools/check_connected_escape_transfer.cjs`: automated and browser verification.

```text
node _build_connected_escape_room_module.js
node node_modules/vitest/vitest.mjs run tests/connected_escape_room_transfer.test.js tests/connected_escape_room_library_navigation.test.js tests/connected_escape_room_solo_review.test.js tests/connected_escape_room_runtime.test.js tests/connected_escape_room_refinements.test.js tests/connected_escape_room_engine.test.js tests/connected_escape_mailbox.test.js --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node dev-tools/check_connected_escape_transfer.cjs
node dev-tools/check_connected_escape_solo.cjs
node dev-tools/check_connected_escape_live.cjs
```
