# Anatomy activity switching and progress refinements

October 1, 2026. Final source validated in the unit and browser runs below.

## What improved

- **Reliable activity changes:** desktop tabs and the phone Activity selector read the latest saved state. Navigation checks the current activity, diagram, learning level, study sheet, and navigation revision before accepting a change. Leaving Cards checkpoints the current round.
- **Quiz continuity across diagrams:** a saved Tour or Pathway keeps the Quiz question, answer, score, and attempts. Returning to Quiz restores its validated diagram context at the same learning level. Manual diagram changes and Restart invalidate the old return checkpoint. Regular and recommended Quiz entry share this behavior.
- **Clear saved-question return:** the other ten activities show which question remains saved, explain that its answer and score are kept, and provide a direct return control. The strip wraps on phones and supports light, dark, and contrast themes, Arabic, and larger text.
- **Focus and announcements:** accepted transitions focus the current step, question, or answered feedback. Delayed effects check their destination and original focus, preserving a newer activity, open study sheet, or active writing. Unmounting the tool cancels those effects. Cross-system Tour and Pathway announcements now resolve the accepted structure rather than the origin diagram's collection. Arrow navigation follows the document's reading direction.
- **Fresh progress updates:** passive observations merge into the latest progress maps. Private pending work belongs to each state store. Older renders cannot overwrite newer learning records or apply an observation after its activity or study context changes.
- **Clearer guidance and visuals:** the earlier guidance pass included in this commit distinguishes overall progress from current-view confidence, provides recovery for empty diagrams, and keeps all six dashboard metrics visible on phones. Its historical evidence is in [the guidance report](../anatomy-guidance-2026-10-01/README.md).
- **Localized interface:** this combined pass adds 26 labels to French, Latin American Spanish, and Arabic, with identical desktop mirrors. Existing authored educational content can still use English fallbacks.

## Final validation

| Check | Result |
| --- | --- |
| Unit checks | 625 passed across 13 files in one final run |
| New activity-switch checks | 112 across both source copies |
| New passive-progress checks | 48 across both source copies |
| New saved-return localization checks | 15 |
| Browser journeys | 6 passed |
| Scoped accessibility scans | 108; zero violations |
| Saved-return layout | No page overflow or panel clipping in tested layouts |
| Return controls | At least 44px in both dimensions |
| Arabic larger text | At least 17px in exercised strip text and controls |
| Source and three locale pairs | Exact byte parity |
| Visual captures | Four reviewed at original resolution |
| Source syntax and scoped diff formatting | Passed |

The new browser journey checks desktop tabs, the phone selector, saved Tour and Pathway steps, cross-system spoken announcements, answered Quiz return, a partially rated Cards round, retained Tutor writing, keyboard direction, and delayed focus. Its 12 scans exercise the saved-question strip at 320px, 720px, and 1280px in three themes, plus Arabic at 320px with larger text. The five other journeys cover guidance, saved-round return, study records, reflections, and activity writing. Accessibility scans cover those exercised components; they are not a whole-application audit.

Earlier runs exposed stale fixture expectations and the missing cross-system announcement. The fixtures retain behavior assertions and now account for accepted navigation revisions and visible focus targets. A cold broad browser run also exceeded the study-record time limit; its unchanged warm rerun passed. After the announcement fix, the final full unit and six-journey browser runs were repeated against the frozen source. Earlier unit JSON files are retained as diagnostic history; use [verified-unit-results.json](verified-unit-results.json) for the final result.

## Visual evidence

- [Phone saved question](saved-quiz-phone.png)
- [Dark-theme saved question](saved-quiz-dark.png)
- [Arabic saved question with larger text](saved-quiz-arabic.png)
- [Returned Quiz on a phone](returned-quiz-phone.png)

## Detailed evidence

- [Verification summary](verification.json)
- [Final unit results](verified-unit-results.json)
- [Activity-switch browser results](activity-switch-browser-validation.json)
- [Guidance regression](guidance-regression-validation.json)
- [Saved-round return regression](study-return-regression-validation.json)
- [Study-record regression](study-record-regression-validation.json)
- [Reflection regression](reflection-regression-validation.json)
- [Activity-writing regression](activity-writing-regression-validation.json)

Canonical and desktop source SHA-256 after normalizing CRLF to LF:

`3e7e6a7250b3cefe7444359d0f81a69e12e4b30aa92644c0a5d2b3b825aaf2ca`

## Next refinement

Badge and challenge award callbacks still capture reward state from their render. A future pass should merge those awards into current state and prevent duplicate rewards. The passive-progress checks in this pass isolate that existing award behavior.
