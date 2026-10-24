# Word Sounds refinements

October 17, 2026. This change addresses all seven issues in the [Word Sounds review](word-sounds-review-2026-10-17.md).

The later [XP and IPA follow-up](word-sounds-xp-ipa-refinements-2026-10-17.md) records the next two refinements and their expanded regression results.

## Answer correctness and prepared content

Sound Sort now compares generated macron vowels and dictionary/audio-bank tokens using the same canonical sound labels. The regression cases include honey/key, all five long-vowel symbols, decomposed Unicode, and mixed dictionary/generated words. Saved boards with incorrect distractors fail validation.

Fixed forms retain each authored item's identity, prepared data, and order, including repeated words with different questions. Advancement uses attempted items, preserves the configured form length and probe clock, and keeps practice-only repetition rules outside fixed forms. Graded history and completion payloads retain the delivered item identities.

Preparing a subset now seeds media from the complete original pack before filtering. Reviewed recordings and winning saved assets retain precedence over provider generation. Packing then keeps the selected activities' required dependencies, including decoding choices, while removing unused media. Direct per-word pictures continue to survive selection.

## Teacher scripts and setup

Printable teaching scripts use prepared activity boards for sound positions, answers, missing-letter positions, word families, and connected-text prompts. Invalid or omitted prepared tasks produce an explicit review message. Missing Letter describes the actual letter gap rather than inventing a sound for part of a multi-letter grapheme.

Syllable analysis uses the canonical count resolver, including pronunciation evidence, teacher approvals, and the current packed audio context. A checked count remains separate from a spoken split. Dictionary-backed rabbit reports two syllables without fabricated split units; stale splits and changed recordings cannot silently retain approval. The script loader embeds the same generated core used by preparation, playback, and readiness.

The complete setup draft survives Review and Back to Setup within its authoring session: lesson order and counts, goals, preparation scope, AAC/image settings, sources, learner selection, and completed AI suggestions. Generated-resource handoffs keep that draft. Unrelated resource changes reset it, and callbacks from an older session cannot overwrite the current session. Raw source text and learner draft fields stay in memory rather than entering shared lesson payloads.

## Session ownership

Delayed answer callbacks verify their item/session ownership before changing the submission lock. Resetting into a new session during feedback cannot let an old timer unlock the new response or add a duplicate graded history entry.

## Verification

New regressions cover canonical sound equivalence, compiled-pack teacher scripts, complete setup navigation and media packing, and actual learner controls for fixed-form advancement and session resets. The pre-fix printable-script run reproduced twelve failures before implementation; the separate review contains the earlier runtime and setup reproductions.

All **1,370 tests across 107 Word Sounds files are verified passing**, with no skipped tests. The suite grew by 43 checks. The initial full run passed 1,365 tests and found three missing-context failures in an extracted-effect test harness plus two shared UI-string mirror comparisons. The harness now supplies the new presentation counter, the UI-string mirrors match, and all 91 tests in the four affected files passed on the targeted rerun. Both original and rerun results are retained.

The Chromium audio-recovery test passed. Four embedded core copies are current, five generated/runtime JavaScript modules and five JSX host/source files pass syntax checks, and all five changed public module copies match. Production source hashes match those captured before the full regression run.

Counts, browser results, source hashes, and mirror parity are recorded in [the verification output](../reports/word-sounds-fixes-2026-10-17/verification.json). Generated setup/preview modules and host sources are rebuilt locally. No deployment is included.
