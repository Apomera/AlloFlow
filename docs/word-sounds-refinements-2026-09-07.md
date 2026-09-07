# Word Sounds refinement implementation

Date: September 7, 2026. Follow-up to [the original review](word-sounds-review-2026-09-06.md). Changes are local; no deployment or publication was performed.

## Changes delivered

- **One Sound Sort rule set.** `word_sounds_core.js` supplies preparation and playback with canonical edge-sound IDs and an explicit English word inventory. It corrects hard-g cases, silent-e endings, voiced endings, and equivalent c/k spellings. Unknown words require supplied phoneme data. Ambiguous pronunciations without an explicit teacher override do not become scored choices. Invalid boards are rebuilt from available data or show a review message.
- **Prepared boards reach the learner.** Runtime validates and uses the prepared Sound Sort board, retaining its choices and order. Explicit teacher overrides are preserved when their board shape is valid. The setup build embeds the shared core into both standalone entry points, avoiding an additional script-loading dependency. `node dev-tools/sync_word_sounds_core.cjs --check` detects drift.
- **More conservative automatic difficulty.** Evidence is scoped to the current learner, activity, visual/audio mode, and AAC support. Easy-to-medium requires at least six responses across four words; medium-to-hard requires eight across six words. The success threshold is 85%, with reduced credit for retries. Progress advances one band at a time, tolerates isolated errors, and steps back after sustained difficulty. Repeating one word or completing tracing/visible-answer matching does not establish this progression. Long sessions retain their earned band.
- **Clearer reading evidence.** Sentence and story completion record whether the task was picture-supported cloze or visible-answer word matching, the clues shown, and the missing-image/revealed-answer reason. Neither task is recorded as independent reading. Visible-answer matching does not earn independent mastery or an automatic difficulty increase. Picture alternatives convey the target clue to screen-reader users. Lesson completion copy describes practice completed.
- **Optional spelling review.** Teachers can enter taught letters/adjacent letter groups and known whole words. The profile travels with the prepared pack; preview and review flag words outside that inventory, including accented spellings. Coverage includes the target and prepared sentence/story text.
- **Lesson-scoped preparation.** With a lesson plan enabled, teachers can choose “Selected lesson only.” Preparation retains those activity boards and limits associated choice/prompt audio requests. The activity picker honors the scope both in the new session and when its saved pack is reopened. Assessment preparation is scoped to the chosen probe activity. The default still prepares all activities.
- **Accessible setup controls.** Each lesson checkbox is linked to its activity name, item-count sliders have activity-specific names, and the preparation controls have explicit labels. “Words prepared” replaces an overly broad readiness claim.

## Verification

**586 tests verified across 54 files, including 40 new refinement tests. One isolated Chromium audio-recovery test passed.**

The full run passed 584 of 586 tests. Its two failures compared the entire shared UI-string files, whose values matched but key order differed. After synchronizing canonical key order, all 44 tests in the two affected files passed on rerun. No application logic changed between those runs.

Final results are recorded in `reports/word-sounds-refinements-2026-09-07/verification.json` and the accompanying test reports.

The new tests exercise the actual compiler and mounted React player, including exact prepared choices, support-specific progression, long histories, saved lesson scope, missing-image evidence, and semantic picture alternatives. Existing source assertions and the browser locator were updated where they were stale. Two rendering snapshots gained the new task-instruction element.

Generated modules were syntax-checked and compared with their public mirrors. The embedded shared core and Word Sounds string mirrors were checked. The changed source/test diff passed the whitespace check.

The isolated Chromium test verifies blocked-playback recovery, retry, focus, and readiness using mocked media APIs. It does not verify real audio pronunciation, codecs, screen-reader speech, or the fully styled production app.

## Remaining instructional work

The spelling checker is a review aid, not a decodability certification: knowing a letter pattern does not establish that a learner knows each of its sound values. The new inventory covers English Sound Sort edges, not every phoneme in every word or dialect. Other legacy phoneme-estimation paths remain candidates for a future pronunciation-data migration.

Independent connected-text reading, transfer to unfamiliar words, comprehension, and oral fluency still need their own task designs and validation. Picture-supported cloze practice is now recorded more accurately, but it does not establish those skills. New interface strings have English fallbacks; professional translation and human accessibility/audio checks remain separate work.
