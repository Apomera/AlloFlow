# Word Sounds draft editing — 2026-10-09

Teachers can correct the syllable count or order without re-uploading their recordings.

## Behavior

- Reducing the count temporarily retains the omitted units in the open editor. Increasing the count restores their latest labels, clips, cleanup results and original audio for Undo. Restored slots are consumed, so repeated changes cannot resurrect older versions.
- **Move earlier** and **Move later** swap a complete syllable unit. Position-specific accessible names identify the buttons, invalid boundary actions are disabled, and keyboard focus follows the moved label. Movement is announced through the editor’s existing status.
- Count and order changes invalidate prior preview/confirmation. Count and movement controls wait during playback, audio checking and local-library operations.
- Only displayed units play or enter a newly saved lesson. Saving clears omitted draft units, including when a host callback does not immediately rerender. Download still exports the last saved board, as its label says, rather than an unsaved draft.
- Successful import/library replacement, word/language changes and a new saved-board revision clear extras from the earlier context. Failed/cancelled imports keep them recoverable.
- The recovery buffer is bounded to the editor’s four supported slots and exists in memory while editing. It does not persist across closing/unmounting the editor or browser reload.

## Verification

- **143 regression groups passed:** 130 existing groups and 13 new draft-editing groups. New cases include repeated 4→2→3→edit→2→4 changes, cleanup/original recovery, movement, focus, review invalidation, busy/library locks, active-only saves/exports and all reset/preservation boundaries.
- **102 focused tests across nine files passed**, covering startup, feedback sequencing, family preload, rhyme sessions, host persistence, Kokoro selection, readiness, audio delivery and student packs.
- **11 native Chromium scenarios passed**, with actual decoders and sequential audio playback. Verified keyboard Enter/Space reordering and focus, cleanup/Undo recovery, four- and two-clip sequence order, fresh review, shorter-set saves/downloads, import/library/context resets and responsive layout. No overlapping clips, page errors or external requests occurred.
- Screenshots at 390 and 1280 px were inspected and have no horizontal overflow.
- Canonical runtime/setup editor blocks match; eight module copies and six loader references are verified. Hosted pins and the desktop build’s local links are preserved. Core/readiness contracts are unchanged, and scoped whitespace checks pass. Independent review found no actionable defect in the bounded change.

Verification used sequential workers and durable logs because this host has slow/unstable sandbox startup. An optional read-only Node REPL status check failed in the Windows sandbox helper; shell status reads supplied the results. No failed tool startup is treated as a test pass.

## Reproduction and limits

Run `node dev-tools/word_sounds_draft_editing_regression.cjs`. Native checks run with `node --expose-gc dev-tools/word_sounds_draft_editing_acceptance.cjs`, installed Playwright and its browser path configured. `WORD_SOUNDS_QA_OUT` selects an output directory. Native fixtures use the earlier report’s `reports/word-sounds-portable-recordings-2026-10-09/fixture.wav` plus distinct short generated tones.

The browser harness uses the actual production editor/core/library and local CSS in an isolated host. Fixture audio checks editing mechanics and order, not spoken syllable accuracy. No new live Kokoro/cloud generation, physical microphone, full application build, full-host visual audit or cloud delivery check was performed. Prior provider/feedback behavior is covered by the focused regressions.

Shared Studio changes, other owners’ edits and index state were preserved. No staging, commit, push or deployment by this pass. Final hashes and exact receipts are included in this directory.
