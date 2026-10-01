# Track 11: dictionary cache and partial-response recovery

This batch adds one isolated dictionary patch with **338 passing tests across 12 files**.
Two failures were first reproduced against the unchanged dictionary source. Shared
application source, public mirrors, and generated application bundles were not edited.

The previous [media batch](../media/README.md) is still awaiting integration. Apply this
dictionary-only delta alongside its engine/host/reader patches. The media candidates and
patches are unchanged; this batch does not replace them.

## Baseline and evidence

Initial inspected HEAD: `2d6010185ecb09dfd69c043d79996eba5060caa5`.
Prepared and final verified HEAD: `af3c6b82ab76dad40a5d44f785bf828d1adea86c`.
HEAD advanced during investigation. The dictionary and relevant media source/candidate
hashes remained unchanged. `baseline.json` and `verification.json` record those hashes.
The local checkout does not identify the deployed release. No applicable `AGENTS.md`
was found in the workspace or inspected ancestors.

| Rank | Evidence | Status |
| --- | --- | --- |
| P2 | `dictionary_loader.js:42` returns arbitrary parsed cache data without validating entry shape or word identity. | Reproduced: a cached object with object-valued `meanings` is returned as an entry instead of allowing recovery. |
| P2 | `dictionary_loader.js:63`, `:79`, and `:80` assume every provider row, meaning, and definition has the expected shape. | Reproduced: a response containing a valid definition alongside malformed records becomes `invalid_response`, discarding the useful definition. |
| P2 | The same normalization coerces arbitrary definition/example fields to strings and applies the definition limit before filtering. | Source-confirmed gap: malformed fields can become meaningless display text or crowd out valid later definitions. Candidate tests cover filtering before limits. |

`source-reproduction.json` preserves the two expected failures against the unmodified
`dictionary_loader.js`. They are separate from the all-green candidate run in `tests.json`.
These are deterministic source-level reproductions, not claims of a deployed-browser failure.

## Minimal change and compatibility

`normalizeCachedEntry` validates persisted dictionary data before any caller receives it.
Unusable shapes, malformed JSON, and entries explicitly naming a different word behave as
uncached data, allowing the existing lookup/retry path to recover. Read-time normalization
does not delete or rewrite storage. A successful provider lookup may replace a bad cached
entry through the existing cache writer.

Useful legacy offline entries remain available, including entries without a stored word
field. Invalid sibling records are discarded while valid definitions, examples, attribution,
synonyms, and pronunciation records are retained. Text fields must be strings; objects are
not coerced into display text. Recovered collections retain the established limits of four
meanings, three definitions per meaning, twelve pronunciation variants, and eight synonyms.
Source links use the existing HTTP(S) convention and canonical dictionary fallback.

Provider normalization uses the same shape rules and tolerates malformed rows, meanings,
definitions, phonetics, and synonym lists. Filtering happens before the display limits, so
invalid records do not displace useful later definitions. If nothing usable remains, the
existing `invalid_response` result remains retryable and is not cached as a missing word.

Pronunciation pairs remain attached to their own records and meanings. Legacy independent
phonetic/audio fields remain separate when paired variants are absent; no pair is invented.
The cached-null sentinel, explicit missing-entry retry, entry-or-null `lookup()` API,
`lookupDetailed()` outcome contract, `getCached()`, and existing `hasOffline()` sentinel
semantics are preserved. Blocked/full storage remains best effort and does not prevent a
usable provider result from reaching the popup.

## Acceptance cases and results

Twenty new cases cover:

- Invalid cache shape, JSON, scalar values, arrays, empty meanings, and mismatched words.
- Recovery without silently changing invalid cached data into a cached miss.
- Valid offline legacy help with no fetch and no storage rewrite.
- Mixed valid/invalid cache fields, bounded collections, and per-meaning pronunciation pairs.
- Genuine cached misses and explicit retry; inaccessible storage and entirely unusable
  provider responses.
- Valid definitions and recordings retained alongside malformed provider records.
- Real popup recovery with AI failure, offline cached help with AI disabled, useful
  pronunciation after AI phonics failure, and dictionary retry without reselection.

The two focused suites passed **108 tests**. The final regression run passed **338 tests
in 12 files**, with a 15-second per-test budget to accommodate the previously slow local
bundle comparison. No assertion was relaxed or skipped in that final run.

The dictionary candidate is combined with the unchanged, frozen pending-media engine,
reader, and host candidates. Adjacent lifecycle/AI-guard suites retain their existing
production-module loaders. The bundle comparison checks two local generated files; it
does not verify the deployed release. No live provider or browser was used.

The dictionary candidate parses, its transform is idempotent, applying the patch in memory
reproduces the candidate, and read-only `git apply --check` succeeds. All recorded source
and pending-media candidate fingerprints matched at final verification.

## Ownership and integration handoff

- `dictionary.patch` targets `dictionary_loader.js`; integration and public-mirror
  synchronization remain with the dictionary/shared-file owner.
- Track 11 owns `dev-tools/prepare_dictionary_cache_recovery.cjs`, the additional cases
  and fixture changes in its two focused test files, and this report directory.
- The pending [media patches](../media/README.md) remain separate, complementary deltas.
  Do not copy full candidate files over shared source.
- Dependency 06 and track 17's language contract are preserved. The existing
  `data-reading-language` recovery is unchanged; this patch introduces no renderer
  language arguments, saved artifact fields, or translation keys.

Integrate the dictionary delta, reconcile any newer owner changes, and use the repository's
normal synchronization workflow for mirrors and generated assets. The preflight script
refuses to reuse pending-media candidates if their relevant source baseline has changed.
No other session was contacted.

Prepare: `node dev-tools/prepare_dictionary_cache_recovery.cjs`.
Verify without applying: `node dev-tools/prepare_dictionary_cache_recovery.cjs --verify`.
Regenerating a candidate requires a fresh test run.

The recorded final run used:

```powershell
$env:ALLO_ENGINE_CANDIDATE='reports/lookup-recovery/media/content_engine_module.candidate.js'
$env:ALLO_VIEW_CANDIDATE='reports/lookup-recovery/media/view_simplified_module.candidate.js'
$env:ALLO_DICT_CANDIDATE='reports/lookup-recovery/cache/dictionary.candidate.source.js'
$env:ADAPTED_HELP_VIEW='reports/lookup-recovery/media/view_simplified_module.candidate.js'
$env:ALLO_LOOKUP_HOST_CANDIDATE='reports/lookup-recovery/media/host.candidate.source.js'
node node_modules/vitest/vitest.mjs run tests/reading_word_image_ownership.test.js tests/dictionary_lookup_cancellation.test.js tests/reading_lookup_recovery.test.js tests/reading_lookup_popup_adapter.test.js tests/adapted_word_help_lifecycle.test.js tests/adapted_explanation_lifecycle.test.js tests/student_ai_hidden_host_guard.test.js tests/adapted_reading_popup_read_aloud.test.js tests/adapted_word_help_ui.test.js tests/adapted_reader_fixes.test.js tests/original_reader_markdown.test.js tests/reader_keyboard_a11y.test.js --testTimeout=15000 --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/lookup-recovery/cache/tests.json
```

No deployment, push, Git mutation, app server, or saved app-state change was performed.
