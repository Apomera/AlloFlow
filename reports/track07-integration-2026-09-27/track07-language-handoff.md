# Track 07: saved translation languages and vocabulary feedback

Implemented and verified in `C:\Users\cabba\.codex\worktrees\preserved-vocabulary-sparse\UDL-Tool-Updated`. No shared reader, host, generated file, or deployed app was modified. Nothing was committed, pushed, installed, or deployed; no other chats were contacted.

The integration baseline is shared HEAD `af3c6b82ab76dad40a5d44f785bf828d1adea86c` plus its captured working files. The detached worktree base remains `fd4044c862ed9b345b340d69cb1411a19c09dafb`. Neither identifies the deployed release. Exact baseline hashes are in `track07-language-baseline/manifest.json`; earlier isolated files remain in `track07-language-prior`.

## Result

- Saved bilingual readings preserve their recorded translation destination even after ambient language settings change. English primary text can receive a requested translation. Disabled, empty, and same-language destinations remain single-call. New adapted candidates save explicit translation policy and target metadata. Metadata changes after Preview invalidate Apply.
- The reader uses the same saved destination for pane labels, language tags, direction, comparison language, and sentence narration metadata. The historical `ENGLISH TRANSLATION` delimiter and the comparison preference value `english` remain compatibility tokens, not language evidence. Legacy artifacts without target metadata retain the English fallback.
- A 200 ms debounced readiness check calls the same `preservedVocabulary.prepare` contract used by generation. Before Preview it displays per-term pane presence, absent exact matches, duplicate entries, and remaining distinct-term capacity. Pending or invalid checks block Preview; requested spelling is never silently changed. Generation and Apply continue validating independently.
- Formatting failures identify source versus candidate, the affected pane, and code/preformatted, styled, unsupported, unbalanced, or unclosed formatting. Source failures suggest a specific correction; candidate failures offer a retry. Unsupported content remains unverified and the original remains retained.
- Notices are bound to reading/configuration/options identity and discarded on transitions. Old errors cannot reappear after switching away and back. Apply and Undo confirmation remain visible for the resulting reading.
- Fifteen new messages are present in English, Castilian Spanish, and Latin American Spanish. Other catalogs use the existing English fallback until their owner translates the new keys. Placeholder parity passed for these three catalogs.

## Integration and ownership

All three patches pass forward `git apply --check` against the shared checkout, reverse checks against the isolated candidate, and the combined patch check. These are incremental patches against the captured current source, not the older detached Git base. Older track 07 patches should not be reapplied.

| Patch | Owner and contents |
| --- | --- |
| `track07-language-helper.patch` | Generation/pipeline owner: both helper sources and `tests/preserved_vocabulary_languages.test.js` |
| `track07-language-reader.patch` | Reader owner: reader source, updated readiness fixture, browser fixture, and 23-case acceptance runner |
| `track07-language-localization.patch` | Localization owner: canonical English and both Spanish catalogs |
| `track07-language-combined.patch` | The three increments together; use this OR the three separate patches |

Track 05 remains an implementation/integration dependency. The reader owner should integrate the reader increment with their current changes, rebuilding helper and reader modules together. No host wrapper edit is required. Patches contain canonical sources/tests/catalogs only. After integrating, copy the three catalogs to their `desktop/web-app/public/` counterparts and rebuild the three modules; do not copy an entire old reader file over shared work.

The isolated build outputs and public copies match byte-for-byte for all three modules and all three catalogs. `git diff --check` passed. `track07-language-patch-checks.json` records patch results, input hashes, and parity. A line-ending-only browser-runner difference was reconciled before the final applicability check.

## Verification

The new helper suite reproduced 14 failures against the prior built helpers, with six cases already passing (`track07-language-before.json`). All 20 new cases pass with the changes.

Final result: **248 tests passed across 11 suites**, plus **23 browser cases passed**, with no browser errors. These totals include earlier regressions and are not additive to previous reports. Reports: `track07-language-tests.json`, `track07-language-browser-results.json`, and `track07-language-validation.json`.

Builds:

```powershell
node _build_generation_helpers_module.js
node _build_text_pipeline_helpers_module.js
node _build_view_simplified_module.js
```

Focused regressions:

```powershell
node node_modules/vitest/vitest.mjs run tests/preserved_vocabulary_languages.test.js tests/preserved_vocabulary_enhancements.test.js tests/preserved_vocabulary.test.js tests/reader_place_review_adapt.test.js tests/leveled_text_citation_resilience.test.js tests/text_complexity_freshness.test.js tests/translation_policy.test.js tests/english_translation_direction.test.js tests/reader_audio_readiness.test.js tests/reader_narration_access.test.js tests/reader_narration_recovery.test.js --maxWorkers=1 --pool=threads --no-cache --reporter=dot --reporter=json --outputFile=track07-language-tests.json
node tests/track07-browser-acceptance.cjs
```

An intermediate expanded run encountered missing sparse-checkout audio/host fixtures and fork-worker startup timeouts. Those read-only dependencies were supplied locally; the final one-thread run passed all suites. The earlier failure report is retained as `track07-language-incomplete-tests.json`. The custom `translation_pipeline.test.js` mirrors other implementation logic and was excluded by Vitest configuration; it is not part of the claimed test count.

Browser coverage uses headless Chromium, React StrictMode, fixture-only state, mocked provider responses, and blocked network. Cases cover bilingual Preview/Apply, missing translation terms, stale requests, exact Unicode boundaries, readiness recovery, unsupported source/candidate formatting, reading/option changes, declined saves, keyboard focus, Spanish catalog interpolation, Arabic direction, and Apply/Undo feedback. No real model, deployed release, full-host TTS, or screen-reader run is claimed. Live integration must still be checked by the owning lanes after applying the patches.
