# Reader Edit, vocabulary validation, and karaoke access follow-up

Direct user scope: fix Edit from Both view; enforce preserved essential terms; investigate whether generated reading supports prevent karaoke activation. No deployment requested or performed. No Git history changes or messages to other sessions.

Baseline HEAD: `fd4044c862ed9b345b340d69cb1411a19c09dafb`. The shared checkout includes concurrent integration changes and does not establish the deployed release.

## Already landed by this follow-up

- `view_simplified_source.jsx`, currently starting at line 2095: replaced the local Edit callback with a shared transition for the toolbar and review-summary Edit buttons. It retains `requestSupportTransition`, exits comparison, stops playback, clears incompatible reading/popup state, toggles editing, and focuses `textEditorRef` after the editor mounts. Teacher and protected-original guards remain. The new effect only focuses after an explicit Edit action.
- `tests/reader_display_menu.test.js`: added stateful interaction checks for both Edit entry points, including editor focus, unchanged text, and Done returning to adapted reading. Added generated-support fixtures for Original and Adapted; each has one validated annotation. Tests open the real Display and ImmersiveToolbar controls and verify the karaoke callback, current passage, sentence list, and audio resolver. The karaoke overlay is stubbed in these access tests; existing overlay/TTS suites run separately.
- Ran both local module builders before the single-writer handoff. Integration subsequently rebuilt the reader. Existing shared changes were preserved.

## Vocabulary work already present from concurrent integration

The preserved-vocabulary implementation arrived while this task was investigating. This follow-up did not author or overwrite it. The attempted earlier patch failed verification without changes. Reviewed and validated the integrated helper, reader feedback, and tests instead.

The integrated implementation checks visible exact terms per source language pane at candidate and Apply time; normalizes NFC and whitespace; retains case/punctuation; deduplicates; rejects absent terms and explicit limits without truncation; ignores hidden/reference-only matches; retains source on rejection with actionable feedback; and binds previews to private request metadata. Limits are 30 distinct terms, 256 Unicode characters per term, and 4096 total characters. Presence is required at least once in each source pane, not conservation of occurrence counts or semantic meaning.

## Remaining proposed changes

None from this follow-up. Do not reapply the Edit hunk: it is already present. Integration 01 remains the sole writer for subsequent shared reader/helper/host/module changes and builds.

## Verification

- `node _build_generation_helpers_module.js` — passed.
- `node _build_view_simplified_module.js` — passed.
- Final command: `node node_modules/vitest/vitest.mjs run tests/reader_display_menu.test.js tests/preserved_vocabulary.test.js tests/reader_place_review_adapt.test.js tests/reading_support_draft_transitions.test.js tests/immersive_reader_render.test.js tests/karaoke_tts_regressions.test.js tests/document_citation_adaptation.test.js --maxWorkers=1 --configLoader native`
- Final run started at local 18:20:54, duration 102.63 seconds: **7 files, 167 tests passed**.
- Focused `git diff --check` passed; generated root/public mirror parity passed.
- Existing Node module-type warning occurred. No installations, servers, live TTS calls, browser-state changes, commits, pushes, or deployments.

Karaoke remains available via **Display → Immersive Reader → Focus Reader** for Original-with-supports and Adapted text. `host_handlers_source.jsx` at the inspected lines 9902–9931 also prepares missing immersive words locally and opens the reader; it has no reading-support prohibition. Activation is covered locally; the live TTS service was not exercised.

## SHA-256 snapshot after verification

Captured at `2026-09-26T18:23:15-04:00`. Shared integration was active during this session; these are post-run collection hashes, not a claim that the checkout was frozen throughout the tests.

| File | SHA-256 |
| --- | --- |
| view_simplified_source.jsx | 687866A6202A20700BA8DD40BCF59A7B8A5EDC0552FFED4091F8C764A01BA9F1 |
| generation_helpers_source.jsx | 8117CE3031982837ED931F0D952039D0998621ACF5561900A3DEDBB3D3AAF89E |
| tests/reader_display_menu.test.js | CB77638AB02F23D730EED00784D3926A565713327B186C547885C5EE76BED027 |
| view_simplified_module.js and desktop/web-app/public/view_simplified_module.js | 4BF8B03E21CB7988090B0D23D8B8D0DA292B0844D6D6BDBF69C4A6D338498373 |
| generation_helpers_module.js and desktop/web-app/public/generation_helpers_module.js | 750060F0F8D60C90F79C332085BDAAEA1D03E033916408F3ADAF34CC19A0F85D |
