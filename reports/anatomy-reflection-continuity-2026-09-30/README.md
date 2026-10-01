# Anatomy: saved activity reflections

This pass builds on the uncommitted study-sheet improvements. It remains unstaged and uncommitted at the user's request.

## Changes

Warming and cooling explanations now have separate named cards in the study sheet. Each card describes the matching disturbance and returns to that activity. Saved writing keeps its own text direction, and resumed motion editors use at least 17 px text in larger-text mode.

Returning to an activity closes the sheet and opens the correct scenario in one accepted state update. It checkpoints the current Cards round, retains Quiz and Tutor work, and focuses the saved-writing editor. Imported feedback writing opens the prediction section when no local model attempt has been completed. Retained actions check the current sheet, profile, and saved writing before navigating; delayed focus respects a learner who has already moved elsewhere.

JSON exports include both temperature directions, including the inactive saved session. The live explanation takes precedence over an older session snapshot, so clearing current writing does not bring it back during export. Imports keep each direction's local writing and attempt settings, and repeated imports do not add duplicate notes.

Earlier study files did not save the disturbance direction. Their Homeostasis writing stays in a separate card with explicit warming and cooling choices. Choosing an activity uses the writing only if that destination is empty or already contains the same text. A conflicting destination keeps both reflections and displays a recovery message.

The record remains version 1. Optional `feedbackNotes` stores up to three validated explanations: warming, cooling, and an earlier note without a direction. `learningNotes` retains one Homeostasis fallback within its previous five-entry limit. The import preview counts each reflection once. Prediction choices, completed model attempts, Quiz progress, and grade/display settings remain local.

Five new labels are translated into French, Latin American Spanish, and Arabic. Both source copies and all locale mirror pairs match.

## Validation

All 799 checks passed across 13 unit suites, including 144 new reflection-continuity checks and nine new localization checks. Both browser journeys passed. The 30 scoped accessibility scans found zero violations and no horizontal overflow; all three print themes used black text on white paper with interactive controls hidden. Larger-text reading content remained at least 17 px.

Results and the final source hash are recorded in [verification.json](verification.json). The new tests cover live and inactive writing, clearing, direction-specific conflicts, legacy records, malformed extensions, repeated imports, fresh Cards checkpoints, retained actions, and focus recovery. Existing study-sheet, Homeostasis, Tutor, navigation, localization, and science suites are also included.

The reflection browser journey uses keyboard resumes, real JSON download/upload, separate local model attempts, and a fresh workspace to check roundtrips. It checks nine English reflection scans at 320, 768, and 1440 px across three themes, three Arabic reflection scans with larger text, and three Arabic motion-editor scans. The earlier study-record journey checks another 15 scans and three print themes. Scans are limited to the components exercised by those journeys.

Detailed state and display evidence is retained in [reflection-browser-validation.json](reflection-browser-validation.json) and [study-record-regression-validation.json](study-record-regression-validation.json). All four final screenshots were reviewed visually.

## Screens

- [Named reflection cards on a phone](sheet-phone.png)
- [Dark theme](sheet-dark.png)
- [Arabic with larger text](sheet-arabic.png)
- [Resumed motion writing](resumed-motion.png)
