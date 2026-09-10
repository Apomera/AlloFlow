# Escape room solo play, AI review, and accessibility — September 9, 2026

Implemented locally. No deployment, paid AI-provider call, or server-permission change was made in this pass.

## Play independently or collaboratively

Open a Quiz resource and choose **Connected escape room**. Outside a live session, this is now available to independent learners as well as teachers and parents. Generate a room, inspect its clues, optionally choose **Check playability with AI**, and select **Play solo**. A teacher hosting a live session also has **Launch for everyone**.

Solo play uses exactly the same interaction rules, prerequisites, tools, hints, and final exit as multiplayer. It has personal journal/inventory labels, immediate local feedback, its own completion/debrief, and a confirmed restart. It does not open or update a live session. Generation now explicitly asks for puzzles that one person can complete without simultaneous actions or private teammate knowledge.

The room is saved in this browser. Solo discoveries, hint levels, selection, and unfinished settings resume in the same browser tab after closing/reopening the player or reloading. Progress is separated by room content and learner ID when available; anonymous play uses a local identity. Stored progress is validated, unknown fields are discarded, and unreachable discoveries cannot be restored. Storage failure is explained without blocking play. Closing the tab ends the tab-scoped progress record; this is not cross-device cloud saving.

## Independent AI playability review

The optional review makes one separate JSON request for each tool, configuration, sequence, or route device, using the app's configured AI provider. Setup shows the maximum additional request count before the user runs it.

Each request contains that object's visible instructions, room/area context, and its prerequisite discoveries. It excludes the stored answer, solution explanation, hints, lesson answer key, the object's own reward, and downstream rewards. Separate requests prevent later puzzle evidence from revealing an earlier puzzle's solution through a combined prompt. Coordinate review receives the visible grid size and axis convention, not hidden coordinates or displacement.

The app compares the reviewer's proposed answer with the stored solution. A confident matching answer is labeled **Solution matched**; disagreement, ambiguity, or insufficient evidence is labeled **Needs review**. Invalid output and provider failures produce an incomplete report, never a pass. There is no automatic repair or launch. Instructions can be edited or a new room generated; editing invalidates the old report. Cancellation, source changes, and closing setup suppress late results and stop subsequent requests. A provider failure also stops further requests.

This review checks whether a separate AI pass can reproduce the device solutions from the supplied clues. It is not an independent factual audit, a guarantee of uniqueness, or a substitute for teacher review and classroom testing. Results are held in setup, not published as student progress.

## Accessibility work and evidence

- The setup dialog makes background content inert, keeps keyboard focus inside, includes scrollable text in its tab order, skips hidden/disabled controls, and restores its trigger on close.
- Solo entry and return, restart confirmation/cancellation, and collected-object completion manage focus explicitly.
- Sequence and coordinate boundary buttons use announced disabled states while retaining focus. Boundary activation is safely ignored. Changed sequence order and map position have text announcements; shared hints also update a live region.
- Buttons have a minimum 44 by 44 CSS-pixel target. Form outlines have stronger contrast, font sizing follows the user's base size, mobile controls also enlarge, and forced-colors styling preserves controls and focus.
- The full solo fixture was completed using keyboard input, including generation, AI review, tool choice, wrong-answer recovery, hints, ordering, and the final exit. The check used 193 Tab steps and asserted that focus remained visible and inside the dialog.
- Automated axe checks included WCAG 2.0 A/AA, 2.1 A/AA, and 2.2 AA tags. No violations were found in tested setup, teacher, and player views. These are applicable automated rules, not complete criterion-by-criterion WCAG coverage.
- Tested 1280, 390, and 320 CSS-pixel layouts, light/dark views, reduced-motion preference, forced colors, and 200% root text size with increased text spacing. The 320 CSS-pixel layout also exercises the width used for reflow evaluation. This does not claim testing native browser zoom at every level.
- Actual NVDA/JAWS/VoiceOver use and testing with disabled learners remain outstanding. Browser semantics and automated checks do not establish full WCAG 2.2 AA conformance.

Reference guidance: [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

## Verification

- **129 focused tests passed**, including 29 added for solo state, review isolation/validation, provider cancellation/failure, independent Quiz entry, recovery, reset, and dialog background behavior.
- **204 existing regression tests passed** across classic escape rooms, mixed collaborative questions, live quiz/escape review, and Concept Quest review.
- **Four-browser multiplayer verification passed**, using the production Mailbox adapter and actual Apps Script handlers with local service substitutes: 24 permission-checked writes, shared discoveries, retries, pause/resume, late join, restart, and completion.
- **Solo browser verification passed**, with zero live writes, real reload recovery, keyboard completion, coordinate controls, and accessibility checks.
- AI responses in both browser harnesses are deterministic fixtures passed through production generation/review code. Production model quality and real classroom networks have not been piloted in this pass.

Evidence: [solo and review results](connected-escape-room-solo-review/verification.json), [live results](connected-escape-room-solo-review/live/verification.json), [mobile controls](connected-escape-room-solo-review/solo-device-mobile.png), [large text](connected-escape-room-solo-review/solo-device-large-text.png), [AI review](connected-escape-room-solo-review/review-desktop.png).

## Implementation and repeatable checks

New modules: `connected_escape_room_solo.js`, `connected_escape_room_review.js`, and `connected_escape_room_accessibility.jsx`. Integrated through `connected_escape_room_source.jsx`, `view_quiz_source.jsx`, the three application entry copies, and the existing translation namespace. Root/public bundles match. Connected-room cache revision: `c3fe4b0b91`; Quiz cache revision: `4d9e851b97`.

```text
node _build_connected_escape_room_module.js
node _build_view_quiz_module.js
node node_modules/vitest/vitest.mjs run tests/connected_escape_room_solo_review.test.js tests/connected_escape_room_runtime.test.js tests/connected_escape_room_refinements.test.js tests/connected_escape_room_engine.test.js tests/connected_escape_mailbox.test.js --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node node_modules/vitest/vitest.mjs run tests/escape_room_review_runtime.test.js tests/live_quiz_escape_review_runtime.test.js tests/concept_quest_review_runtime.test.js tests/escape_room_collaborative_mix.test.js --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node dev-tools/check_connected_escape_solo.cjs
node dev-tools/check_connected_escape_live.cjs
```
