# Word Sounds recording refinements — 2026-10-09

Reviewed recordings now replace obsolete standalone syllable requirements, so a student can open and hear a lesson after a teacher records or reuses syllables. The shared normalizer preserves actual word targets, response choices, other activities, older Sound Swap/rhyme/orthography fields, and unrelated required audio. Invalid, wrong-word, or wrong-language recordings cannot hide missing dependencies. Teacher saves persist the corrected manifest; older saved packs are handled during readiness and runtime checks. Readiness contract version is 6.

The recording editor offers cancellation for pending microphone permission, active recording, file checking, cleanup, and preview. Cancel keeps the prior checked clip, stops active media, rejects late results, and requires another complete review. Stop recording still saves the intended capture. Recorder errors cannot replace a valid clip with partial chunks.

Background prefetch status updates no longer cancel teacher clip replacement. Actual content/audio/voice/language/activity changes, navigation, and loss of generation permission still cancel stale work. A single functional host update keeps the latest state and declines queued substantive edits.

## Verification

- 102 focused Vitest tests in nine files passed against final sources with one fork worker.
- 119 regression groups across 12 scripts passed: existing 76 groups plus cancellation 8, recorded dependencies 13, legacy dependencies 5, and replacement races 17.
- 17 real Chromium workflow checks passed against the final runtime/readiness hashes. They exercise microphone APIs with a supplied WAV, cancellation, cleanup/original/undo, review gating, saved-lesson reload, native IndexedDB reuse, actual portable/student-pack serialization, and playback in a separate student context. The first instruction finishes before syllables; incorrect-response speech finishes before replay; correct feedback plays one spoken praise clip. No audio overlaps, browser errors, student synthesis, or cloud TTS calls occurred in this workflow.
- Four affected builds completed; 24 module copies and 18 named loader pins match. Generated core and scoped whitespace checks passed. The core synchronizer now skips unchanged files. Cloud-synced files rejected direct overwrites during a first build attempt; the completed build used guarded same-directory atomic replacement for known generated outputs.

The previously interrupted student-browser verification is completed by this pass. Its first resumed run exposed the stale syllable dependency; a later run exposed the background-status cancellation race. Both received targeted fixes and regressions. An old extraction test needed the real language variable and action-test stubs needed functional setters; assertions were retained. A memory-exhausted library test was not counted as a pass; the final complete run is recorded in the test statuses. Original failures remain in the task workspace and selected logs are retained under earlier-attempts.

## Limits and reproduction

Browser speech-generation responses use known bank fixtures. Real Kokoro generation was separately verified in the preceding recording-quality pass; it was not downloaded or rerun here. The microphone is a known audio file through native getUserMedia/MediaRecorder, not physical microphone hardware. No subjective pronunciation assessment, live cloud delivery, or full application build was performed. The screenshot uses a small fixture stylesheet and is not a full production layout review.

Run the installed dev-tools/word_sounds_recording_workflow_acceptance.cjs with WORD_SOUNDS_QA_OUT pointing to this report's browser directory, which contains the microphone WAV. On this machine PLAYWRIGHT_BROWSERS_PATH is C:/Users/cabba/AppData/Local/ms-playwright. Source hashes and all final test logs are attached here. The workspace work/refine-verification-job.cjs runs browser and unit verification sequentially with durable status logs.

Shared checkout/index and other owners' work were preserved. No staging, commit, push, or deployment.
