# Word Sounds microphone lifecycle — 2026-10-09

Microphone answers now belong to one capture attempt and one displayed item. Cancelled or delayed speech cannot score a later item or stop a newer capture.

## Changes

- Reserve a capture immediately, including the permission/startup interval. A second tap cancels it instead of starting another recognizer.
- Stop tracked activity/feedback audio and recording-editor previews before listening; remove the audible startup pop. Replay cancels capture before speaking. Background preloading does not cancel it.
- Invalidate ownership before requesting recognition stop/abort. Word, activity, language, answer mode, review/edit visibility, minimize, learner/session changes, pointer answers, session reset and teardown cancel the old capture. Stale result/end/error callbacks are ignored.
- Grade one nonempty final response only. Shared capture uses its finalized text, excluding interim text in mixed events. Existing punctuation/homophone comparison and scoring paths are preserved.
- Recover cleanly after unavailable recognition, constructor/start failures, silence or natural end. Three activity microphone controls expose their pressed state and translated cancellation label.
- Instructions-off automatic playback now checks the active run between delayed prompts/options. Its run is captured after the word-change teardown, preserving ordinary first-item playback while preventing old audio from restarting after the learner begins speaking.

## Verification

- **18 focused regression groups passed**, executing production lifecycle/hooks, shared speech wrapper and automatic-playback effect against controlled recognition events.
- **78 existing focused tests across seven files passed**: feedback sequencing, single instruction channel, runtime audio status, board lifecycle, probe interruption, syllable playback and first-item startup.
- **19 Chromium scenarios passed** using the full production Word Sounds modal, React, local production CSS, actual native Audio and the real shared voice wrapper. Scenarios cover both recognition paths, delayed and duplicate events, native audio interruption, word/activity changes, mode exit, minimize/unmount, startup failure/retry and exactly one final score. No page errors, external requests or cloud generation occurred.
- Inspected 390px and 1280px captures. The microphone control is visible and has its active cancellation name/pressed state. The harness substitutes icon components; this is not a complete application visual audit.
- Four runtime copies match, all three existing loader references are correct, and scoped whitespace checks pass. Core, readiness, Studio setup and the shared voice module are unchanged. Read-only review found no blocking issue.

## Initial failures and limits

The first adjacent run had five fixture failures: four extracted-manifest cases omitted current language/core dependencies, and one source assertion expected the older cancellation callback. Fixtures were corrected and automatic-playback behavior was tested directly. Initial browser attempts used the wrong minimize title and assumed randomized startup would always select cat; the final harness uses the actual title and explicitly switches to another displayed word. Initial receipts are retained separately; those attempts are not counted as passes.

Validation preparation briefly hit ENOSPC. Only this chat's disposable duplicate test sources were removed. Older task baseline copies were compressed losslessly and verified before their uncompressed copies were removed; all bytes remain available in adjacent gzip files. No user documents, repository sources or existing reports were deleted.

SpeechRecognition events are simulated to reproduce races deterministically. Native audio playback is real, but physical microphones, browser permission UI, speech-service recognition accuracy and cloud delivery were not tested. No full application build, staging, commit, push or deployment was performed. Shared repository changes and index were left in place.

Run `node dev-tools/word_sounds_mic_lifecycle_regression.cjs` and `node --expose-gc dev-tools/word_sounds_mic_lifecycle_acceptance.cjs`. Browser checks require installed Playwright/Chromium; `WORD_SOUNDS_QA_OUT` sets the evidence directory.

## Remaining review findings

A separate Studio edge case can reuse a valid saved syllable board for a different target, producing choices that omit the current answer; readiness rejects it. The read-only reproduction is retained in the task workspace as `work/content-review-repro.cjs`. It was not changed in this microphone pass. Other voice-mode overlay and dictionary-audio call sites merit a separate focused review.
