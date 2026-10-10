# Word Sounds answer integrity — 2026-10-09

Spelling Bee, Word Scramble, and Missing Letter now submit through the shared grading path immediately. Blank input, composing or repeated Enter, rapid duplicate checks, and edits after a finalized answer cannot create unintended attempts. Spelling hints build cumulatively and their support remains recorded even when the learner edits or erases the hint.

## Changes

- Probe startup now survives rerenders that cancel a pending start timer, and ignores callbacks after unmount.
- Removed three local 1.5-second success timers. These previously left controls editable and allowed an intervening wrong response to race a delayed correct response using stale attempt counts. The shared handler now owns grading, feedback, scoring locks and advancement from the original submission.
- Reject empty or whitespace-only answers, missing targets, unmounted submissions and finalized controls. Ignore Enter during IME composition or key repetition. The same unchanged response cannot be submitted twice rapidly; editing the response permits the next attempt. Finalized inputs, letter choices, hint buttons and clear/tile controls are disabled and their handlers recheck the lock.
- Incorrect Spelling Bee and Missing Letter submissions no longer start a separate word replay immediately before the shared feedback path. Shared feedback continues to control ordered replay.
- Spelling letter boxes are neutral before a checked attempt. Practice shows per-letter feedback after a miss; probes keep that feedback hidden and omit hints. Word Scramble also disables browser spelling/autocorrect suggestions on its typed input.
- First-letter hints preserve subsequent input. Vowel and additional-letter hints retain correct letters and advance monotonically: for example, _a_ → ca_ → cat. They do not alternate between earlier hint states.
- Per-item evidence records the particular spelling clue, text support, and whether the hint supplied the complete answer. Erasing or editing a hint cannot erase that evidence. Existing response-evidence logic receives the combined clues and preserves true support/exposure flags. Shared core/mastery policy is unchanged.

## Verification

- **99 focused tests passed** across nine files covering audio ordering, instruction playback, audio status, board lifecycle, student packs, teacher controls, view identity and syllable playback/startup. Tests ran in three serialized batches.
- **78 production-derived regression groups passed:** 15 construction-answer groups, 4 probe-startup groups, 24 speech/confirmation groups, 18 microphone lifecycle groups, 7 isolation startup groups and 10 answer-visibility groups. The new fixture extracts and executes the actual submission/support helpers and all three activity renderers; existing renderer tests were updated to exercise the new helper rather than simulate delayed grading.
- **30 native Chromium scenarios passed:** 10 new construction scenarios plus the 20 existing speech, answer-visibility, native audio and portable-reopen scenarios. New checks use actual button events inside React flushSync to prove score/history update in the same event task, without a wall-clock approximation of the old delay. They verify single history writes, attempts, support/exposure evidence, IME behavior, locked controls and cumulative hints.
- Inspected new 390px independent-spelling and 1280px checked-feedback screenshots, along with the repeated speech-confirmation captures. The checks use the production modal and CSS with a controlled local host; icon components are substituted.
- All four runtime copies match. One CDN cache pin and two existing relative desktop loader references are verified. Shared setup source/module, voice, core and readiness modules retain their baseline hashes. Syntax and scoped whitespace checks pass.

## Initial browser finding

The first new browser run passed nine scenarios, then failed to open the probe answer field. The trace exposed a production startup race: the probe-started marker was set before its delayed callback ran, and a callback-identity change cancelled the timer without releasing that marker. The original run is retained under initial-failures/probe-fixture. The marker is now claimed inside the mounted start callback. The original browser host and assertions remain unchanged; four extracted-effect regression groups cover cancellation/rearming, exactly-once startup, readiness and unmount. All final-source checks were rerun; the failed attempt is not counted as a pass.

The retained audio suite initially missed its early-replay precondition under slow host scheduling: the delayed instruction had already started before the test clicked Replay. Its failed receipt is retained under initial-failures/early-replay-fixture. The first fixture revision clicked during the launch event before the modal completed initialization; the run token was invalidated before any manual play call. That trace is retained under initial-failures/premount-fixture. The final early-action fixture waits for the production initialization boundary inside the local browser and clicks the real control without a tool round trip; production timers and audio are unchanged. The ten new scenarios had already passed on the same final source and were retained while the corrected twenty-scenario suite was rerun.

## Limits and scope

Recognition and host state are controlled fixtures. Existing local Kokoro and standard-bank clips exercise native audio mechanics in the retained acceptance suite. This pass does not assess physical microphones, live-provider generation, pronunciation quality, or the full application's cloud delivery. No full application build was run. No staging, commit, push or deployment was performed, and unrelated shared checkout/index work was preserved.

## Reproduce

Run from the repository:

```text
node dev-tools/word_sounds_answer_integrity_regression.cjs
node dev-tools/word_sounds_answer_integrity_probe_startup_regression.cjs
node dev-tools/word_sounds_voice_mode_regression.cjs
node dev-tools/word_sounds_mic_lifecycle_regression.cjs
node dev-tools/word_sounds_isolation_startup_regression.cjs
node dev-tools/word_sounds_learning_visibility_regression.cjs
node --expose-gc dev-tools/word_sounds_answer_integrity_acceptance.cjs
node --expose-gc dev-tools/word_sounds_voice_modes_acceptance.cjs
```

Browser checks require Playwright/Chromium. Set `WORD_SOUNDS_QA_OUT` to choose an evidence directory. Final runtime SHA-256: `54f1c117994a7d715c4b7ed729b2379dbf7bae222ea6fc6b2e8f4c14f643f80d`.
