# Word Sounds recording quality — 2026-10-09

Implemented locally:

- Optional per-syllable silence trimming and volume leveling, original playback, and undo. Edited audio must be previewed and confirmed again before saving. Quiet sound margins are retained; gain is capped at 2x. This is not noise removal.
- A bounded device-local IndexedDB library of teacher-reviewed word recordings. Reuse requires the same normalized word and qualified language/locale. Save/replace and apply are explicit; lesson answer choices are retained. Storage errors do not prevent saving the lesson itself.
- Saved speech checks distinguish voice mismatch, language mismatch, and unknown provenance. Selective replacement uses the selected voice/language without silent provider fallback.

Five affected build steps completed. All 24 copies across six module families and 18 named host pins were verified, and the generated core check passed. Shared source changes were preserved. No staging, commit, push, or deployment.

## Verification

- 102 focused Vitest tests across nine files passed in the final one-fork run. The earlier thread-pool attempt failed before tests because of memory exhaustion; an initial sandbox cache-write attempt also failed before tests.
- 76 installed regression groups passed: language 9, cleanup 14, cleanup DOM 7, recording library DOM 6, recorded-syllable DOM 3, pack maintenance 18, transport 12, clip selection 7.
- Native IndexedDB tests passed 12 groups, including reload, dialect isolation, aliases, Unicode-equivalent words, capacity, atomic conflicts, cancellation, and failed transactions.
- Native Chromium cleanup decoded PCM and real stored Kokoro clips, retained conservative audio margins, capped gain, and produced valid reviewed recordings.
- The real production Kokoro worker completed two forced generation passes with `af_heart`, produced decodable nonzero audio, made no cloud TTS calls, and preserved audio and actual voice metadata across local saving/reload. Its results record the exact source hashes used before this pass's readiness-language update; TTS and loader sources did not change in this pass.
- The integrated browser passed recording through real microphone APIs using a supplied audio sample, cleanup, original comparison, undo, preview/review gating, local-library save/reuse, and saved-lesson reload. Generation in this workflow used known bank fixtures; real Kokoro was verified separately.

## Incomplete final checks and limits

The first extended browser run passed ten checks, then exposed a fixture omission: the test resource lacked the ID required by the actual student-pack serializer. The fixture was corrected. Subsequent reruns were interrupted by native process crashes and host memory exhaustion before completion of the final export/separate-student-context playback step. These are not recorded as passing runs. Existing transport tests passed, but the new full browser sequence still needs a completed final run. The final scoped whitespace check was also not completed.

The host ultimately could not start even a command shell: `The paging file is too small for this operation to complete. (os error 1455)`. A read-only process listing also returned `Out of memory`. Only this task's completed Kokoro browser cache (228,888,944 bytes) was removed; successful results and generated WAVs were retained. No unrelated processes or user data were removed. The handoff and report were finalized using direct file edits after shell execution became unavailable.

Physical microphone/student-device testing, subjective pronunciation review, and cloud delivery/full-host integration were not exercised by these local fixtures.

## Evidence and resuming the interrupted check

The workspace is `C:/Users/cabba/Documents/Codex/2026-10-07/please-keep-enhancing-thanks-x20`.

Evidence remains in `work/next-final-tests`, `work/audio-next-final-tests.log`, `work/next-kokoro-results`, `work/next-cleanup/native-results.json`, `work/next-library/native-test-results.json`, `work/next-browser-results`, and `work/next-final-module-hashes.json` under that workspace. New focused regression scripts are installed in this repository's `dev-tools/word_sounds_*` files.

When system memory is available, run `node work/next-browser-run.cjs` from the workspace. It uses the corrected `work/next-workflow-acceptance.cjs`, the stored known audio fixture, a disposable local browser session, actual recording/editor/serialization code, and a separate student browser context. Inspect its exit status and `work/next-browser-results/results.json`; partial checks alone do not confirm a complete run.
