# Lesson board refinements — September 10, 2026

This pass improves the existing solo and cooperative lesson board. Changes are local; nothing was committed or deployed.

## Improvements

### Make route and construction choices easier to understand

Selecting a location now shows its lesson concept, whether the class has explored that concept, its connected locations, and the paths that successful exploration would open. Reward previews include bonuses from constructed projects and stop promising rewards for already explored locations.

Construction previews show the exact resource shortfall or the balance that would remain after building. A shortcut whose destination is already accessible is identified before choosing it. Completed boards distinguish locations visited in the game from those not explored.

Teachers see a summary of confirmed proposals for available moves, aggregated from current roster members. Selecting a proposal opens its details without starting it or spending resources.

### Review and edit generated activities

The board editor now exposes all response options and the answer key for choice and settings activities. Teachers can edit ordering items and rearrange the correct order with keyboard-operable buttons. Hints, exact source excerpts, and the closing reflection are editable as well.

Validation feedback is shown within the editor. Invalid source excerpts or malformed activities cannot be saved, played, or launched. Existing saved copies remain unchanged until a new save is requested. Path and resource rules still pass the same board validation; this does not verify educational correctness, so teacher review remains necessary.

### Distinguish shared progress from individual understanding

The teacher surface includes a class learning review built from resolved responses. Concept summaries show how many responding learners demonstrated each idea and how many learners have no recorded response. Individual summaries include retries and explicitly distinguish missing responses from incorrect ones. The review remains on the teacher UI and does not add network writes or a leaderboard.

The current activity review shows each submitted answer in lesson language, alongside its result and the solution. The existing shared-session transport is unchanged: this is not a new server-private assessment system.

### Recover from delayed actions and changing sessions

A proposal delayed past the voting phase no longer locks a learner out of the opened activity. Its old request is released locally, and a late failure cannot clear or overwrite a newer pending response. Pausing within the same action window retains the pending action.

Learners wait for their session identity before joining. Duplicate effect execution does not send duplicate joins while a join is pending. Storage failures are visible, without claiming an unsaved action will survive reload.

Switching lessons during AI generation can start generation for the new lesson. A result from the old lesson is ignored, and repeated activation within one lesson still starts only one request.

## Verification

- **162 tests passed** across six suites: 124 board tests, 11 connected escape-room runtime tests, and 27 Concept Quest review/runtime tests.
- New cases cover delayed proposal completion, pause retention, missing identity, duplicate joins, unavailable storage, switching lessons during generation, all three answer-key editing formats, invalid evidence, proposal inspection, accurate project previews, and individual learning summaries.
- **Four browser contexts** completed the multiplayer journey through the production Class Mailbox adapter and real Apps Script handlers with local service substitutes: 33 writes, an approximately 8.9 KB final session document, and no browser page errors. The provider returned fixture JSON; no paid AI request or production classroom was used.
- **15 automated accessibility configurations passed**, including the expanded editor, open learning review, 320/390/768/1280-pixel widths, dark mode, 200% text, increased spacing, and forced colors. Document and activity-panel overflow checks passed. Keyboard ordering, focus restoration, and the teacher proposal/learning screenshots were reviewed.
- Seven application/module sources parsed; the board bundle, UI-string mirrors, and all three application loader revisions were checked.

Evidence: `docs/lesson-board-refinements/tests.json` and `docs/lesson-board-refinements/live/verification.json`, with screenshots in the same live directory.

Manual screen-reader and real-classroom testing remain outstanding. The existing Mailbox v21 / updated Firestore rules release requirements from the first implementation still apply; this pass introduces no additional server schema or permissions changes. The separately documented project-wide Word Cloud source-text assertion was not changed in this pass.
