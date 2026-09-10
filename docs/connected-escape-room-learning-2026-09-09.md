# Connected escape room: teacher support and learning review

Date: 2026-09-09. Implemented locally; not deployed.

## What changed

Teachers can inspect the next graduated hint, the object's instructions, and the evidence already available to the team before sharing support. The share action is tied to the exact previewed hint. If a participant requests that hint concurrently, it becomes marked as shared; the teacher must deliberately preview the next hint before revealing more.

Rescue unlocks now name the object and discovery in an inline confirmation. Final-exit rescues explicitly explain that they complete the room for everyone. Cancel receives initial focus, Escape cancels, and cancellation restores the initiating button. Save failures retain the same concrete rescue for retry. A teammate solving the object closes an obsolete confirmation. Changing the session or attempt clears the support selection and confirmation, and delayed failures from an old attempt do not affect the new room.

Completed rooms now connect discoveries back to the lesson. Both solo players and a shared class can expand an evidence trail containing the prerequisite clues, the generated explanation, the supporting source quotation, and the resulting discovery. Players can revisit an object and return directly to the debrief with keyboard focus preserved. The teacher receives the same review with discussion prompts. Reflection is optional; no reflection responses are collected.

The completion recap reports discoveries and revealed hints, with teacher-supported discoveries shown only for shared sessions. Finished solo rooms no longer display the unfinished-settings caption. Completing the exit through the player's own focused action moves focus to the debrief; a teammate's completion does not take focus away from another reader.

## Accessibility and session behavior

- Hint-sharing buttons describe the exact visible hint through an accessible description. Previewing the next hint returns focus to the share button.
- Background saves and discoveries preserve focus when the teacher is working elsewhere. If the currently focused support control disappears because its object was solved, focus returns to the object selector.
- Rescue and lifecycle confirmations support keyboard cancellation. Existing 44-pixel controls, responsive layout, visible focus, large text, and forced-colors styling are retained.
- Support uses the existing teacher-owned progress leaves. No new participant-write permissions or shared text fields were added.
- Review data comes from the generated room and confirmed progress. Opening a review, following its navigation, and reflecting require no additional AI calls or live-session writes.

## Files

- `connected_escape_room_learning.js`: pure completion-review projection and guarded teacher-support patches.
- `connected_escape_room_debrief.jsx`: shared solo/student/teacher completion review.
- `connected_escape_room_support.jsx`: exact-hint previews, rescue confirmation, retry and focus handling.
- `connected_escape_room_source.jsx`: integration, lifecycle confirmation focus, completion navigation.
- `tests/connected_escape_room_learning.test.js`: focused review, concurrent-support, lifecycle and keyboard regression coverage.
- `dev-tools/check_connected_escape_live.cjs` and `dev-tools/check_connected_escape_solo.cjs`: expanded browser journeys.

The root and desktop bundles are synchronized. All three application loaders use module revision `fc949e68c0`; both interface-string namespaces contain the updated copy.

## Verification

- **200 tests passed across eight focused suites**, including 25 new tests. The final combined run passed 179 tests in seven files; its remaining worker hit a startup timeout before running any tests. An isolated rerun of that file passed all 21 tests in 1.51 seconds. There were no remaining test failures.
- **Solo browser journey:** 373 keyboard Tab steps, completion and resume, evidence review, focus navigation, optional reflection, and zero live-session writes.
- **Shared browser journey:** 4 independent browser contexts and 26 permission-checked writes through the production Mailbox adapter and Apps Script handlers, using local Google-service substitutes. Covered concurrent hints, rescue cancellation and failed-save retry, late joining, pause/resume, restart, shared completion, and end-room behavior.
- **Accessibility:** 18 recorded audit variants passed without axe violations or horizontal overflow, including expanded completion views, mobile widths, dark mode, 200% text with spacing overrides, and forced colors. The teacher rescue confirmation and mobile evidence review were also visually inspected.
- Root/public bundles, all three application references, and the two connected-room string namespaces match. Final module revision: `fc949e68c0`.

Browser AI requests use deterministic fixtures through the existing generation/review interfaces. Paid AI providers and a real classroom network were not exercised. Manual NVDA, JAWS, and VoiceOver testing remains outstanding; these checks are not a full WCAG conformance certification.

Machine-readable results and screenshots are in `docs/connected-escape-room-learning/`, including the overall `verification.json` and separate `solo` and `live` reports.
