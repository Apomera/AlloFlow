# Anatomy: activity writing and prediction clarity

This pass extends the pending Anatomy improvements. All changes remain unstaged and uncommitted.

## Changes

Systems in Motion now merges editor changes with the latest activity row and learning map. Queued changes to different fields accumulate, and the latest input event wins when the same field changes twice. Writing in other activities, structure notes, Quiz and Tutor work remain intact.

Prediction, explanation, comparison and self-review controls check the current activity, diagram context, learning level and profile before updating. Obsolete callbacks are ignored after navigation or opening the study sheet. Predictions cannot change after the disruption is revealed. Self-review uses the current explanation and toggle value; transfer feedback is announced only after an accepted update.

Prediction and disruption focus uses the accepted activity state, the matching pathway panel, sheet generation, atlas step and current focus. A pending focus callback yields when the learner moves to another control or changes context. The established pathway IDs remain intact.

Larger-text mode now includes the learning objective, prediction prompt, radio labels, progress text and comparison button. Both writing fields show their current character count and 1,200-character limit through an associated description. Writing keeps automatic text direction.

Homeostasis shows a named disclosure for saved explanations before a new model comparison, including imported writing and writing retained after Predict again. The disclosure includes guidance and the original text. After comparison, the writing appears in the existing editor. A blank explanation does not create an empty disclosure.

Three new labels are translated into French, Latin American Spanish and Arabic, with matching desktop catalogs.

## Validation

All 920 checks passed across 15 unit suites, including 106 new editor-continuity checks and 15 new localization checks. All three browser journeys passed. The 54 scoped accessibility scans found zero violations and no horizontal overflow. The 24 new scans exercise prediction/reflection and saved Homeostasis writing. Larger-text reading content remained at least 17 px, and all three print themes retained black text on white paper with interactive controls hidden.

Final metrics and the source hash are recorded in [verification.json](verification.json). The tests cover queued and retained editor actions, independent writing, current profile and diagram context, accepted feedback, delayed focus, writing limits, translated counters and saved-explanation visibility. Existing study-sheet, Homeostasis, Tutor, science and navigation tests are included as regressions.

The new browser journey checks real keyboard prediction, model reveal, self-review, transfer choices, text input limits, saved writing, activity changes and study-sheet resume. Accessibility and overflow checks cover Motion prediction/reflection and the Homeostasis saved-writing view at phone, tablet and desktop widths in light, dark and contrast themes, including Arabic larger text. The previous reflection and study-record browser journeys are also rerun. Scans are limited to the exercised components.

Detailed browser state is retained in [activity-writing-browser-validation.json](activity-writing-browser-validation.json), [reflection-regression-validation.json](reflection-regression-validation.json), and [study-record-regression-validation.json](study-record-regression-validation.json). All four final screenshots were reviewed visually.

## Screens

- [Activity writing on a phone](activity-phone.png)
- [Dark theme](activity-dark.png)
- [Saved Homeostasis explanation](saved-writing-phone.png)
- [Arabic with larger text](activity-arabic.png)
