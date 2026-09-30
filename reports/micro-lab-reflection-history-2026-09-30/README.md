# Micro Lab: reflect on evidence and revisit Gram reports

Learners can now add later reflections to saved Resistance evidence and quiz corrections. Gram keeps one previous saved report, and Home links directly to saved Resistance evidence needing a reflection.

## What changed

- **Resistance reflections:** Each saved snapshot has a separate, editable reflection of up to 1,200 characters. Its original notes, prediction, settings, explanation, and observed counts stay intact. Repeated saves retain the reflection; a distinct new snapshot starts with an empty reflection. Notebook and paired TXT/CSV downloads label the later reflection separately. CSV quoting and formula protection apply to these notes.
- **Home resume:** Home prioritizes saved Resistance snapshots without a reflection, respecting the selected snapshot within that group. The shortcut opens the saved-evidence disclosure and focuses its reflection field. Once every snapshot has a reflection, it opens the selected saved record for review. Explicit navigation can establish a repaired ID while clearing stale comparison aliases; the live culture and valid comparison choices stay intact.
- **Phone counts:** The saved Resistance table fits all five count columns within a narrow screen. Its caption and labels wrap, so learners can read the original counts beside their reflection.
- **Quiz correction reflections:** After a valid submission, each originally missed question has an optional, ungraded reflection of up to 600 characters. Results and practice show its original answer, current practice answer, and checked status. Changing a practice choice keeps the reflection and makes that answer unchecked again. TXT downloads keep these notes separate from original answers and scores. Incomplete attempts omit solutions and practice reflections. Starting a new quiz clears that attempt's answers, practice, and reflections.
- **Gram report history:** Saving a changed complete report keeps the current report as the one previous report. A native disclosure previews its literal written fields. Restore swaps the two saved reports while preserving working notes and observed stages. Repeat saves retain history, and starting a new investigation keeps both saved reports. TXT downloads separate current, previous, and working evidence. Save, restart, and restore focus requests cancel after later learner actions or navigation.

## Evidence limits

Reflections are learner-written annotations and do not change scores or original evidence. Resistance snapshots may come from different rounds of the same random teaching model. Gram history retains one prior report with its written prediction, interpretation, and explanation; neither saved report contains a historical stage log. Saving another changed report replaces the previous version.

## Validation

The final focused unit run passed **356 checks across 13 files**, including **36 new cases**. The initial preparation run exposed an incomplete new test fixture and a runtime mirror awaiting synchronization. The fixture was corrected, the source and mirror were synchronized, and the consolidated suite passed. The initial results remain in [unit-initial-results.json](unit-initial-results.json).

- **22 Chromium scenarios passed without retries, failures, skips, or flakes.** Five new scenarios cover saved Resistance annotations, all four notebook/comparison download formats, repaired-ID navigation, quiz correction retention and incomplete-attempt gating, and Gram replacement/restoration/restart. Seventeen existing scenarios cover portable evidence, guided resume, and Gram recovery/export. The browser served the local working tree.
- Reviewed four phone views at widths from 320 to 390 pixels. The saved Resistance table was refined after visual review; all five count columns now fit within the table. The final unit and browser runs both pass against that refinement.
- Both runtime files match byte for byte. Micro Lab translation namespaces match, with **1,622 extracted keys**, no missing entries, and no stale changed fallbacks. Source, test, and commit-helper syntax and scoped whitespace checks passed.

Machine-readable evidence: [validation summary](validation-summary.json), [unit results](unit-results.json), [browser results](browser-results.json), and [translation audit](translation-audit.json). Earlier verification results are retained alongside the final reports.

Phone views: [Resistance reflection](resistance-reflection-phone.png), [Home resume](resistance-reflection-home-phone.png), [quiz correction](quiz-correction-reflection-phone.png), and [Gram history](gram-report-history-phone.png).
