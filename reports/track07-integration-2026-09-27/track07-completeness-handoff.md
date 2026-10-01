# Track 07: required reading panes and empty-output recovery

Implemented and tested in `C:\Users\cabba\.codex\worktrees\preserved-vocabulary-sparse\UDL-Tool-Updated`. This increment builds on `track07-language-handoff.md`. Shared source, host, generated files and the deployed app were not changed; nothing was committed, pushed, installed or deployed. No other chats were contacted.

The shared checkout reported HEAD `3752fe48d98ee8096e456d766427f3f513a11b25`. Its helper sources still match the pre-language-increment baseline, while unrelated reader work has continued. The isolated detached base remains `fd4044c862ed9b345b340d69cb1411a19c09dafb`. Neither is assumed to represent the deployed release. The previous isolated increment was captured with hashes in `track07-completeness-baseline/manifest.json` before editing.

## Reproduced gap and result

A candidate could preserve every requested primary-pane term while silently dropping the unrequested translation pane. With no requested terms, empty, hidden-only, citation-only or malformed output could also reach Preview/Apply. Invalid provider responses were coerced to text or allowed to start a second translation call.

The initial 23-case reproduction produced **21 failures and two passes** against the prior built helpers (`track07-completeness-before.json`). Five further boundary cases were then added. All 28 completeness cases now pass.

- Candidate and Apply share a separate pane-completeness check. It requires readable primary text, a readable translation when required, and no unsolicited second pane when translation is disabled. Existing bilingual artifacts continue requiring both panes.
- The visible-text projection is the same parser used by vocabulary validation. Hidden, deleted, reference-only, citation-only, URL-only and fenced payloads cannot make an otherwise empty pane count as a reading. Invisible Unicode controls alone are insufficient; visible non-Latin text and whole emoji remain valid.
- Repeated, generic, inline or noncanonical translation separators are rejected instead of being accepted by one parser and interpreted differently by the reader. The standard legacy machine delimiter remains unchanged.
- Unsupported formatting or unavailable parsing remains unverified, with retained source and explicit recovery. All adaptation candidates now need the shared reading parser, even when no essential terms were requested. This deliberately avoids accepting an unreadable pane merely because the term list is empty.
- Provider results must be nonblank strings after outer fence cleanup. A blank/non-text primary response stops before translation; an invalid translation response does not produce a candidate. Cancellation retains precedence over late provider failures.
- Pane failures return `sourceRetained: true`, a structured `panes` audit and `recovery: 'preview'`. The reader restores focus to Preview rather than directing users to edit already-valid essential terms. Vocabulary-specific failures still focus the term field.
- Vocabulary semantics and limits are unchanged. In particular, an empty list still reports `not-requested`; pane completeness does not imply a vocabulary or semantic guarantee.
- Five recovery messages were added to English and both Spanish catalogs. Placeholder parity and public-copy parity passed. Other locales retain the existing fallback until localization owners translate those keys.

## Integration and ownership

Use **`track07-pending-combined.patch`** for the current shared checkout: it includes both the previous language/readiness increment and this completeness increment. It passes `git apply --check` against the shared working files. Equivalent owner-specific patches are:

| Patch | Ownership |
| --- | --- |
| `track07-pending-helper.patch` | Generation/pipeline sources; language and completeness tests; the freshness harness now loads the real shared parser |
| `track07-pending-reader.patch` | Reader source, readiness test fixture and browser acceptance fixtures |
| `track07-pending-localization.patch` | Canonical English and both Spanish catalogs |

If the language increment is already integrated elsewhere, use `track07-completeness-combined.patch` or its helper/reader/localization parts instead. Those patches were checked forward against the previous isolated increment and in reverse against the current candidate. Do not apply both patch sets.

Reader changes remain a handoff through the reader owner. Track 05 remains the broader implementation dependency. The pending reader patch applies without replacing concurrent word-help/highlighting changes in the shared checkout. No host edit is needed for this increment. Rebuild the generation helper, pipeline helper and reader together; copy canonical catalogs to their public mirrors. Recheck applicability after further shared changes.

`track07-completeness-patch-checks.json` records input hashes, separate patch checks, byte parity and whitespace checks. Root/public pairs are identical for all three modules and catalogs; `git diff --check` passed. Generated bundles are available in the isolated checkout but deliberately omitted from source patches.

## Validation

Final result: **207 tests passed across eight files and 29 browser cases passed**, with no browser errors. These counts overlap earlier reports and are not additive. `track07-completeness-tests.json`, `track07-completeness-browser-results.json` and `track07-completeness-validation.json` contain the results.

```powershell
node _build_generation_helpers_module.js
node _build_text_pipeline_helpers_module.js
node _build_view_simplified_module.js
node node_modules/vitest/vitest.mjs run tests/preserved_vocabulary_completeness.test.js tests/preserved_vocabulary_languages.test.js tests/preserved_vocabulary_enhancements.test.js tests/preserved_vocabulary.test.js tests/reader_place_review_adapt.test.js tests/leveled_text_citation_resilience.test.js tests/text_complexity_freshness.test.js tests/translation_policy.test.js --maxWorkers=1 --pool=threads --no-cache --reporter=dot --reporter=json --outputFile=track07-completeness-tests.json
node tests/track07-browser-acceptance.cjs
```

An intermediate run exposed two freshness fixtures that loaded the adjustment helper without the shared parser. Those fixtures now load the production pipeline; the final run passes. No production validation was weakened to accommodate the fixtures.

The six additional browser cases cover missing translation with primary-only terms, an empty candidate with no terms, hidden-only translation, Apply-time pane tampering, stopping before translation after blank provider output, and retaining success feedback after the complexity control resets. Existing cases continue covering exact terms, stale responses, declined saves, focus, language metadata, localization and Undo.

Browser checks use headless Chromium, React StrictMode, mocked model responses, network blocking and fixture-only state. No live model, full-host TTS, screen-reader, deployed-release or full-app test is claimed. Current shared-reader changes are protected by incremental patching but should receive the owning lane's integration checks after merge.
