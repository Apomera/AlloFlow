# SEL classroom and packaged-app verification plan

Status: prepared September 8, 2026. No classroom observation or packaged-app run is claimed by this document. Automated browser tests mount the real hub and tools with simulated host callbacks; they do not establish production service behavior or learning outcomes.

## Educator and learner walkthrough

Use a fictional scenario and invite passing. Invite learners using different communication and access methods; do not collect personal reflections as evaluation data.

| Task | Observe | Record without private content |
| --- | --- | --- |
| Find a two-minute first step | Can the learner explain why it was suggested and change their choices? | Navigation obstacles and misunderstood labels |
| Choose an example level | Does the language and context fit? Can the learner choose another example without stigma? | Suggested vocabulary/context changes |
| Try one activity | Can the learner find instructions, use keyboard or assistive technology, and choose an alternative response? | Access barriers and assistance needed |
| Rehearse and transfer | Can the learner show one action and describe when support might help? | Whether the instruction needs a clearer model, not a score of feelings |
| Recover an authoring draft | Can the educator resume after closing/reopening and distinguish draft from saved station? | Missing or confusing recovery steps |
| Remove and restore steps/stations | Does undo restore the intended item without disturbing later work? | Order, focus, and record preservation |
| Save or share | Can the participant distinguish device storage, project save, AI use, and selected Share Packet content? | Misunderstood boundaries; no copied student text |

## Packaged Desktop / configured-service verification

Run against a separately identified build and record OS, app version, browser engine, assistive technology, and service mode. Do not infer packaged behavior from the isolated harness.

1. Save a station and a journal entry, fully close/reopen Desktop, and verify exactly what persists.
2. Interrupt authoring, reopen, resume the draft, save it as a station, and export a project. Import into a fresh test profile and verify the saved station; an unfinished draft should not be exported.
3. Exercise project save success, cancellation, unavailable destination, and read-only/full storage. Confirm UI never calls a request a completed file save.
4. In a configured test live session, inspect actual host-visible progress and safety signals using approved fictional fixtures. Confirm displayed sharing boundaries match the configured behavior.
5. Preview a Share Packet in each detail mode, export it, and compare the resulting file with the preview. Confirm unselected text is absent.
6. Test keyboard-only, screen-reader navigation, zoom/reflow, reduced motion, and each activity's pause/audio controls across representative full journeys. Expand to all 72 tools; initial-render success is not an interaction audit.
7. Clear all SEL data, reopen, and verify drafts, recovery items, notes, and project mirrors cannot restore cleared data. Existing external exports require separate handling.

Track findings as UI/access barriers, instructional improvements, or service/persistence defects. Have educators and relevant subject-matter specialists review clinical and physiological claims and population fit separately. Classroom use is not evidence that the app has been evaluated for efficacy.
