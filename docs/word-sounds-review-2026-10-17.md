# Word Sounds refinement review

October 17, 2026. Reviewed the current working tree, including existing local changes. Application code was preserved; this pass adds review evidence and this report.

Implementation follow-up: [Word Sounds refinements](word-sounds-refinements-2026-10-17.md). This review records the pre-fix behavior; its original source locations and extraction scripts may no longer apply to the updated code.

Word Sounds has strong preparation, playback recovery, accessibility, and learning-history safeguards. The most valuable next work is to keep sound judgments, saved media, repeated assessment items, and printable teacher guidance consistent across the complete workflow. Seven remaining issues are detailed below.

## Recommended priorities

| Priority | Issue | Consequence |
| --- | --- | --- |
| High | Equivalent vowel labels compare differently | A correct Sound Sort choice can be scored as a distractor |
| High | Fixed forms lose repeated-item identity and can reorder repeats | The delivered check can differ from the authored check |
| High | Subset preparation drops shared media | Retained words can lose teacher audio and picture supports before repacking |
| Medium | Printable scripts ignore prepared task parameters | Teacher modeling can ask a different question from the learner activity |
| Medium | Printable syllable analysis ignores verified counts | A two-syllable word can be described as one syllable |
| Medium | Returning from review resets setup configuration | Teachers must recreate lesson choices and supports |
| Medium | An expired answer timer releases a newer submission lock | An already-scored item can add another graded history row |

## Sound Sort must compare canonical sounds

The generation prompt explicitly uses the long-vowel symbols `ā ē ī ō ū`, but the shared `soundKey` function does not normalize them to the equivalent dictionary tokens. The validator and board builder therefore agree on an incorrect distinction.

Executing the actual compiler with ordinary generated word data produced a last-sound board for **honey** with target `ē` and **key** among the distractors. The dictionary represents the ending of key as `ee`. A smaller rainy/happy/bee/cat example also puts bee in the distractors, and the resulting board passes `validSoundBoard`.

Normalize generated labels, dictionary labels, and audio lookup labels through the same canonical sound IDs. Preserve the original display label separately. Cover all five macron vowels, equivalent IPA where supported, and composed/decomposed Unicode. An integration check should compile a mixed dictionary/generated pack and verify both correct choices and distractors.

Sources: [sound normalization](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_core.js:437), [sound comparison](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_core.js:575), [generation prompt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:4624).

## Fixed forms must retain each authored item

The normal advance-after-answer path rotates consecutive instances of the same word without checking `isFixedForm`. An authored sequence `cat(item 1), cat(item 2), dog` can therefore become `cat(item 1), dog, cat(item 2)`.

A separate identity problem affects repeated targets even when order is preserved. Queue construction projects each pack item into a small word record, dropping its ID and prepared boards. Advancement subsequently resolves that record using the first matching word in `preloadedWords`. Two cat items testing different isolation positions can both use the first cat item's board. The source-executed reproduction expected the second item's position 2 and received the first item's position 0.

Carry a stable item ID and the exact prepared item through queue construction, advancement, playback, and history. Apply repeat avoidance only to practice. Verify the complete authored order and each item's question, answer, and recorded identity using a form with repeated words and different boards.

Sources: [queue projection](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:10420), [repeat rotation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:16311), [word-based lookup](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:16340).

## Selecting a subset must preserve its media

Pack-wide audio, shared decoding pictures, and AAC pictures are stored on the first pack item. Setup clones only the selected words, then collects saved media from those clones. Deselecting the original first item removes the shared media container even when its assets belong to retained words. Images stored directly on an individual retained row survive; the shared manifests remain vulnerable.

In a pack using shared manifests with no per-word image on the retained row, executing the production selection and manifest collection statements showed that `[cat, dog]` retains both words' audio and pictures, while selecting only `[dog]` produces empty audio, decoding-image, and AAC-image manifests. Later providers may regenerate these assets, potentially replacing teacher recordings or clues, or leave dependencies missing. This reproduction establishes the loss before provider preparation; it does not establish that every final delivery fails.

Collect existing media from the complete source pack before filtering words. Then retain the dependencies needed by the selected activities, preserving reviewed recordings ahead of provider replacements. Verify that selecting dog alone retains dog's original audio bytes and supports while excluding unneeded cat assets.

Sources: [selected-word cloning](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:4578), [audio collection](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:4925), [shared asset storage](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:5141).

## Printable teacher scripts must use the selected board

The direct-instruction script generator analyzes the word but does not retain its prepared `activityItems`. Several models then assume the task asks for an initial sound or letter.

Executed examples show the mismatch:

- Rabbit's prepared isolation board asks for position 3, `/i/`; its script asks for the first sound, `/r/`.
- Cat's prepared Sound Sort asks for the ending `/t/`; its script models the beginning `/k/`.
- Rainy's Missing Letter board hides index 2, `i`; its script asks for initial `r`.

Generate teacher prompts, answers, and worked examples directly from the same validated board used by the learner. Give unsupported tasks a clear preparation status. Compare exported teacher speech with the actual target position and answer for every configurable activity.

Sources: [word analysis](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_di_loader.js:204), [isolation model](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_di_loader.js:619), [Sound Sort model](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_di_loader.js:659), [Missing Letter model](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_di_loader.js:691).

## Printable syllable analysis must separate counts from splits

The compiler correctly keeps a dictionary-backed syllable count separate from an unverified written split. Rabbit, rainy, and happy can have supported count 2 with `syllables: []`. The script generator instead calculates `syllables.length || 1`, reports count 1, and falls back to blank placeholders in the counting model.

Read supported count evidence from the prepared counting board independently of split availability. Use a concrete counting model when the count is verified, and require separately reviewed spoken units when a task needs a split. Rabbit should export count 2 without inventing a pronunciation split.

Sources: [compiler count handling](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:4279), [script count fallback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_di_loader.js:225), [counting model](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_di_loader.js:664).

## Review navigation must retain the complete setup

Saved syllable work and selection have dedicated retention logic, but the broader setup configuration remains ordinary component state. Normally, opening Review unmounts setup; Back to Setup creates it again with defaults.

Mounting the exact production state declarations and remounting them reset a goal from 12 to 30, disabled the selected lesson, changed preparation scope from lesson to all, reset AAC and image settings, and cleared custom source text. The host navigation path was checked in source; the complete routed application was not mounted for this reproduction.

Retain a complete authoring-session draft, including lesson order/counts, goals, preparation scope, supports, source inputs, and learner attribution. Hydrate it when returning from review or reopening the resource. A round trip should preserve these settings until the teacher explicitly starts a new setup or changes them.

Sources: [setup state](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_setup_source.jsx:3534), [conditional setup mount](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:43979), [review navigation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:44117), [return navigation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:43083).

## Expired answer timers must not mutate a newer run

The delayed advance callback clears `submissionLockRef.current` before checking whether its activity epoch is stale. A session reset increments that epoch and permits a new answer, but an older callback can subsequently clear the new answer's lock before returning.

Executing the actual callback with old epoch 7, current epoch 8, and a new locked response changed the lock from true to false. A mounted-component diagnostic also reproduced the consequence: score once, reset into a new session during feedback, score the new run's item, let the old timeout fire, and submit the new item again. The actual grading callback created a third history row for those two answered items. The diagnostic exposes existing callbacks and refs without replacing their statements; it does not drive the complete routed user interface.

Check the epoch and mounted state before any callback mutation, or cancel the timer when its owning item/run ends. Verify that answering, resetting into a new session during feedback, and answering again leaves the new response locked when the old timeout fires.

Sources: [session reset](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:10259), [callback mutation before guard](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/word_sounds_module.js:16277).

## Existing improvements to preserve

Current source includes sticky support exposure, Sound Sort attribution restricted to the tested edge sound, guarded auto-director transitions, structural Missing Letter validation, and an explicit unavailable state for unresolved word families. These address several earlier review concerns and should remain covered while the remaining paths are refined.

The next testing investment should connect preparation, learner play, teacher scripts, and saved results using the same real compiled pack. The findings above occur at those boundaries. Incremental extraction of queue identity, task models, and canonical sound handling would make those contracts easier to maintain.

Two smaller refinements are worth including when those areas are touched. The recap calculates XP as `correct * 10` although actual awards vary with attempts, streak, and difficulty; it should display accumulated awarded XP. The printable analyzer also needs to recognize supported IPA vowels consistently: a phoneme object with `ipa: 'æ'` and `grapheme: 'a'` currently makes cat's analyzed shape `CCC`.

## Verification and reproduction

The isolated Chromium audio-recovery test passed, including blocked-playback messaging, retry focus, successful recovery, and the final ready status. It mocks media APIs and does not establish physical audio output or pronunciation quality.

The mounted timer diagnostic passed by reproducing the stale-lock and duplicate-history defect. Its passing result confirms the defect exists; it is not a claim that the behavior is correct.

All **1,327 existing Word Sounds regression tests across 103 files passed**, with no skipped tests. The browser recovery check and the separate mounted timer diagnostic also passed. The new reproductions identify behavior that the existing regression assertions do not cover. Six public runtime mirrors match their root files; source hashes, counts, and run results are saved in [verification.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-17/verification.json).

Reproduce the source behavior from the repository root:

```powershell
node reports/word-sounds-review-2026-10-17/content-audio-probe.cjs
node reports/word-sounds-review-2026-10-17/runtime-reproductions.cjs
node reports/word-sounds-review-2026-10-17/setup-evidence.cjs
```

Scripts and JSON outputs are in [the review evidence directory](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/word-sounds-review-2026-10-17). Existing source modifications were preserved; no deployment was performed.
