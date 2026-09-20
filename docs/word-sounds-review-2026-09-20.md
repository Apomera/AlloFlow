# Word Sounds: remaining improvement review

Date: September 20, 2026. This is an analysis pass; application code was not changed. Earlier board-parity and matching-board lifecycle improvements remain in place.

## Recommended priorities

| Priority | Finding | Evidence | Recommended change |
| --- | --- | --- | --- |
| High | Rejected prepared content can reappear through a legacy fallback | Executed compiler, resolver, and render-board construction | Distinguish an absent legacy board from a rejected board; validate the final board before play |
| High | Sound Sort credits untested phonemes | Executed the actual mastery-attribution branch | Attribute evidence to the tested edge sound; separate whole-word performance from individual sound mastery |
| High | Showing and then hiding letters loses support history | Mounted player, toggled labels twice, submitted an answer | Retain support exposure for the current item until it ends |
| Medium | Unresolved word families default to an unrelated family | Executed the actual resolver | Return an explicit unavailable/review state rather than inventing a family |
| Medium | Other prepared activities lack equivalent structural validation | Executed Missing Letter's initialization | Validate indices, answer consistency, and answer availability for each activity |
| Medium | Some delayed transitions can outlive the activity that scheduled them | Source inspection; not an end-to-end timing reproduction | Extend item/activity cancellation guards to all delayed scoring and transitions |

## Findings and acceptance criteria

### 1. Rejection currently does not survive fallback

A teacher-edited Word Families item with `hat` in both matches and distractors is rejected by the compiler: `activityItems.word_families` is omitted. The runtime then treats the missing board as legacy content, reads the original teacher-edited fields, and reconstructs a board containing `hat` on both sides.

The new prepared-board validator works, but the fallback bypasses its result. Explicitly exceptional family membership should remain possible; conflicting choices still need a clear resolution before play.

Locations: `word_sounds_setup_source.jsx:2138`, `:2258`; `word_sounds_module.js:4012` and the Word Families render branch around `:17260`.

Acceptance: this input produces a reviewable invalid-board state or a validated replacement, and can never yield two identical choices with different scoring. Persist the distinction between **not prepared**, **valid**, and **rejected**. Replacement content must have its required media checked.

### 2. Sound Sort still overstates phoneme-level evidence

The actual grading branch routes a successful Sound Sort item with phonemes `['k','a','t']` to `updatePhonemeMastery` with all three labels. Sound Sort asks for one edge sound, so the middle and opposite-edge sounds were not independently tested. This can affect both positive and negative phoneme records.

Locations: `word_sounds_module.js:13845` and `:8312`.

Acceptance: a first-sound sort updates only its tested onset; a last-sound sort updates only its tested ending. Other tasks should have explicit evidence-attribution rules. A whole-word mistake should not automatically establish which individual sound was misunderstood. Distinguish “practiced in this word” from “individually assessed.”

### 3. Support exposure is remembered only at submission

A live mounted-player reproduction enabled printed labels, disabled them again, then correctly answered Sound Counting. The saved row was `mode: "sound_only"`, `textSupported: false`, and `cluesShown: []`.

The previous change correctly captures support present at submission. It does not retain support already seen during the same item. Hiding a hint cannot undo the information it supplied.

Locations: `word_sounds_module.js:13592`, `:18872`; `word_sounds_core.js:481`.

Acceptance: showing and then hiding labels still records text-supported practice for that item. Reset exposure on a new presentation, activity, resource, or session as appropriate. Keep post-answer celebration text separate so it does not retroactively contaminate an independently completed response.

### 4. Unknown families still fall back to “-at”

Calling the current resolver for `rhythm` with no family metadata returned rime `at` and members `cat`, `hat`, `bat`, and `mat`. This is the final fallback after the existing rules find no family. It is not evidence that the target belongs to that family.

Location: `word_sounds_module.js:4095`.

Acceptance: an unresolved target is omitted from that activity with an understandable preparation status, offered for teacher review, or replaced by a validated target. The instruction must remain consistent with the word actually selected.

### 5. Validation coverage is uneven across prepared activities

Missing Letter accepts any integer `hiddenIndex`. Executing its actual initialization with target `cat`, `hiddenIndex: 99`, and `correctLetter: 'x'` returned those values unchanged. There is no corresponding letter position in the displayed word.

Locations: `word_sounds_module.js:15403`, `:15412`, and the Missing Letter rendering/scoring branch around `:16539`.

Acceptance: require an in-range position, the correct letter at that position, and an option set containing a usable answer. Extend the same approach to scramble letter counts, mapping slots, segmentation slots, and other prepared activity shapes. These adjacent checks are recommended follow-up coverage, not additional reproduced defects in this review.

### 6. Delayed callbacks need a consistent owner

The auto-director schedules `startActivity(nextActivity)` after two seconds and checks only whether the player is mounted and whether its captured probe flag is false. It does not compare the activity epoch, unlike the normal next-item timeout. A manual activity change during that window could therefore be superseded by an old transition. Other spelling activities also contain delayed answer callbacks guarded only by the enclosing modal's mounted flag.

Locations: `word_sounds_module.js:13825`; comparison guard at `:14031`; delayed Missing Letter scoring at `:16549`.

Acceptance: complete an item, manually change activities before the delay finishes, and verify that neither the old score callback nor the old automatic transition affects the new activity. This timing risk is source-confirmed; the complete manual-switch scenario was not mounted and reproduced in this pass.

## Suggested implementation order

1. Close rejected-board fallbacks and add final structural validation at the play boundary.
2. Make phoneme attribution task-specific and retain hint exposure for each item.
3. Replace unrelated-family fallbacks with explicit preparation outcomes.
4. Apply the existing cancellation-token pattern to the remaining delayed callbacks.

## Saved evidence and limits

`reports/word-sounds-review-2026-09-20/reproductions.json` records executed source behavior for sound attribution, rejected-board fallback, unresolved families, and Missing Letter. Reproduce it from the repository root with:

`node reports/word-sounds-review-2026-09-20/reproduce.mjs`

`hint-toggle.json` and `hint-toggle-test.log` record the mounted React reproduction. Its temporary test was moved out of the ordinary test suite after execution. `create-hint-diagnostic.cjs` regenerates that temporary test from the existing harness if needed.

No full regression suite was rerun because this pass made no application changes. This review does not assess pronunciation audio quality, real-device playback, or educational validity through learner studies.
