# Word Sounds XP and IPA refinements — 2026-10-17

Follow-up to the seven fixes documented in [the earlier refinements](word-sounds-refinements-2026-10-17.md).

## XP consistency

`word_sounds_module.js` calculates each final response's XP once and uses that value for the host award callback, the floating celebration, and a session total shown in the recap. The existing reward policy is preserved: a first-try easy answer earns 12 XP at streak one, medium earns 17, and hard earns 22. Retry rewards remain 5, 10, and 15 respectively, without a streak bonus. The first-try streak bonus still caps at 20.

Incorrect responses and probes award no XP. Probe recaps continue to show accuracy. Disabling animations does not suppress rewards. The session total resets through the existing session-reset path, including Play Again and a changed session identity, and survives activity transitions within a session.

## IPA classification

`word_sounds_di_loader.js` derives canonical sound keys for phoneme classification, syllable types, set summaries, teaching-model selection, and prepared sound comparisons. It keeps the supplied IPA and aligned grapheme spellings in printable speech and mapping content.

Supported IPA vowels, r-controlled vowels, diphthongs, consonant aliases, stress marks, and affricate tie marks now classify consistently with the app's sound labels. Explicit IPA objects distinguish `/j/`, `/i/`, and `/u/` from the app's bare `j`, `i`, and `u` tokens. Empty or invalid object fields fall through to the next supported phoneme field.

## Verification

The full Word Sounds run passed **1,429 tests across 109 files**, with no failed or skipped tests. This includes all 59 new XP and IPA regressions. No targeted reruns were needed after the complete thread-pool run.

The new regressions comprise 14 mounted XP tests and 45 IPA tests. XP coverage includes retry and difficulty rewards, streak accumulation and cap, final-item inclusion, activity changes, Play Again, changed session identity, reduced motion, and zero probe rewards. IPA coverage includes the reproduced cat, ship, bed, moon, rain, and bird examples, raw notation preservation, object fallbacks, blends, set summaries, model selection, and prepared isolation.

The complete regression result and source hashes are recorded in [verification.json](../reports/word-sounds-xp-ipa-2026-10-17/verification.json), with the raw runner output in [unit-run.log](../reports/word-sounds-xp-ipa-2026-10-17/unit-run.log). The runner uses a thread pool after the fork pool encountered worker startup timeouts before executing tests. Public module mirrors, embedded core copies, and JavaScript/JSX syntax are checked separately. These changes are local to the workspace.
