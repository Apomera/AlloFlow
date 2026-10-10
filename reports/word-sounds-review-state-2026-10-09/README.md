# Word Sounds recording review state — 2026-10-09

The recording editor now distinguishes the saved lesson set from an unsaved draft, explains the next review step, and reports failed lesson updates without losing the draft.

## Changes

- **Saved in lesson** appears only when a compatible reviewed board matches the displayed labels, clip contents and order. Changed drafts show **unsaved changes**; absent, invalid or incompatible saved boards show **not saved**. Trimmed labels follow the existing save normalization; cleanup history, hidden recovery slots and unrelated lesson fields do not change the content comparison.
- Guidance identifies missing labels/recordings by syllable number, then prompts for full-sequence preview, confirmation or saving. Busy operations have matching guidance. Preview and Save reference the same uniquely identified explanation. An unchanged saved set is clearly already reviewed, with instructions for saving it again or copying it to the local library.
- A synchronous lesson callback failure keeps the editable clips, review and hidden recovery slots available for retry. Applying a library set now succeeds at the host before replacing the current draft.
- If the local library write succeeds but lesson application fails, the UI accurately reports both outcomes and keeps the new library token for a conflict-free retry. Library failures remain separate from lesson failures.

## Verification

- **155 regression groups passed:** 143 existing groups and 12 new behavioral groups for saved/draft identity, readiness guidance, multiple-editor IDs, context matching, callback failures, recovery slots and library-token retries.
- **102 focused tests across nine files passed**, covering startup, feedback sequencing, family preload, rhyme sessions, host persistence, Kokoro selection, readiness, audio delivery and student packs.
- **Eight native Chromium scenarios passed**, using actual decoders, ordered audio playback, React and IndexedDB. Verified changed/restored status, guided review, direct failure/retry, partial local-library success/retry, failed library reuse, context matching, unique description IDs and phone/desktop layout. No overlapping clips, page errors or external requests occurred.
- Screenshots at 390 and 1280 px were inspected. Editor source parity, eight matching module copies, six hosted/local loader references, unchanged core/readiness contracts and scoped whitespace checks pass. Independent review found no blocking issue; its guidance clarification was applied before final testing.

## Reproduction and limits

Run `node dev-tools/word_sounds_review_state_regression.cjs`. Native checks run with `node --expose-gc dev-tools/word_sounds_review_state_acceptance.cjs`, installed Playwright and its browser path configured. `WORD_SOUNDS_QA_OUT` selects an output directory. The fixture is reused from `reports/word-sounds-portable-recordings-2026-10-09/fixture.wav`.

The browser harness embeds the production editor/core/library in an isolated host with local production CSS. Lesson callback failures are deliberately injected; IndexedDB, decoding and playback are native. This tests the UI and retry contract, not pronunciation quality, a physical microphone, cloud delivery or a live speech provider. No full application build or full-host visual audit was performed.

Both current lesson callbacks are synchronous React-state updates. The editor’s saved label reflects its matching lesson board; it does not independently verify disk/cloud persistence or introduce an asynchronous save acknowledgement. Language compatibility follows the existing core schema. No recording schema, provider selection or student playback code changed.

Sequential workers retained exact logs and source hashes. Shared Studio changes, other owners’ edits and index state were preserved. No staging, commit, push or deployment by this pass.
