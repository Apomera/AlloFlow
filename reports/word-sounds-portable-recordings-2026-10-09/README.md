# Word Sounds portable recordings — 2026-10-09

Reviewed syllable recordings can now move between browsers/devices as a bounded per-word file. In a word’s syllable editor, open **Reuse reviewed recordings**, select **Download saved recording set**, and import that file for the same word and recording language on the destination device. Preview the full sequence, confirm the spoken syllables, then save reviewed syllables to the lesson. The existing optional local-library checkbox still controls library storage.

## Behavior

- Downloads include only the reviewed recordings already saved in the lesson, with their order, labels, word and qualified language. Unsaved drafts, answer choices, teacher notes, cleanup originals and library state are excluded.
- Versioned JSON is limited to 2 MiB, with the existing maximum of four bounded instructional clips. Format, word, language/dialect and task integrity must match before audio checks begin.
- Every incoming clip is decoded again by the browser. A stored decoded/reviewed flag cannot skip this check or fresh teacher review. Clips decode one at a time; the entire set replaces the draft only after every clip succeeds.
- Cancellation, a corrupt later clip, a word/language change, or unmount leaves the earlier recordings intact. Import does not save the lesson or library automatically.

## Verification

- **130 regression groups passed:** the previous 119 focused groups plus 11 new portable-set groups. The cancellation suite passed on its bounded retry; its initial allocation failure is retained and excluded from passing results.
- **102 focused tests across nine files passed** on the final combined sources, covering startup, feedback order, family preload, rhyme sessions, host persistence, Kokoro selection, readiness, audio delivery and student packs.
- **10 native Chromium scenarios passed:** saved-versus-draft download, import into a fresh browser context, every-clip native decoding, fresh ordered preview and confirmation, explicit lesson save/reload, wrong word/dialect rejection, second-clip decoding failure, oversized input, retained clip playback and responsive layout. Native playback had no overlapping clips or page errors and no external requests.
- Screenshots at 390 and 1280 px were inspected; controls fit without horizontal overflow.
- Both editor source copies match. Eight module copies and six named loader references are verified (hosted version pins and the desktop build's relative links); core and readiness contracts are unchanged. Scoped whitespace checks pass. Independent review found no actionable issue in the portable-set additions.

Initial process allocation/worker-exit failures and an interrupted browser run are not counted as passes. The final runs used smaller sequential Node allocations and a durable browser worker. Their logs and status receipts are included.

## Shared checkout

Preserved a concurrent Word Fluency presentation-tools addition to Word Sounds Studio. After detecting its newer generated setup file, reconciled only stale setup mirrors/named pins and reran all 102 focused tests on the combined files. A concurrent desktop build changed the desktop source hosts to relative module links; that format was preserved and verified against the matching module copies. The recording editor itself remained identical. No staging, commit, push or deployment by this pass.

## Reproduction and limits

Run `node dev-tools/word_sounds_portable_sets_regression.cjs` from this repository. For native checks, run `node --expose-gc dev-tools/word_sounds_portable_sets_acceptance.cjs` with Playwright installed and its browser path configured; `WORD_SOUNDS_QA_OUT` selects the output directory. The supplied `fixture.wav` makes the native test reproducible.

Native checks use actual React, production core/library/editor source, local production CSS, downloads, decoding and playback in an isolated editor. Both sample clips deliberately reuse one supplied Kokoro WAV: this verifies transport, ordering and review controls, not linguistic accuracy. No new speech generation, physical microphone, cloud delivery, full-host visual audit or full application build was performed. The existing file signature detects edits; it is not proof of authorship, so fresh listening and confirmation remain required.

Final source hashes and exact receipts are in `portable-final-checks.json`, browser details in `browser/results.json`, and focused-test output in `audio-portable-combined-tests.log`.
