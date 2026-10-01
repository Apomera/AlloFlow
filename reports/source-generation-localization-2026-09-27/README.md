Track 17 — Source-generation message localization, 2026-09-27

Prepared an independent, isolated **two-key / ten-translation** patch for the completed source-generation preservation handoff. It registers the existing English error and partial-success warning verbatim, then translates them into Spanish (Latin America and Castilian), Arabic, Simplified Chinese and Thai. **40 focused checks passed** using the captured engine and actual host translation function.

The implementation artifact is source-generation-locales.patch (18 files). It does not include engine, host, reader, generated module or pin changes. Neither it nor the earlier reader patches was applied to shared catalogs. Nothing was deployed, committed, pushed, installed or run against live application state. No cross-chat message was sent.

**Baseline and instructions.** Local HEAD at the start and final check: af3c6b82ab76dad40a5d44f785bf828d1adea86c. This differs from the preceding localization report's baseline. No applicable AGENTS.md was found in the repository or ancestors; AGENT_HANDOFF.md and the existing ownership/handoff records were inspected. Track 17 owns scoped catalog data and fixtures. The content-engine and host owners retain their source and generated artifacts; Track 01 retains integration. Work ownership was recorded before editing in WORK_LOG.md and the isolated handoff.

The tested snapshot is .codex-artifacts/source-generation-locales-track17. Exact file identities appear in baseline.json and source-inputs.json. The engine was refreshed once during work, then continued changing in the shared checkout; the host and coordination log also changed. Therefore the complete final shared checkout is **not** the runtime-tested snapshot. At final verification, both owned source literals, the engine's sourceMessage helper and the host translation callback were unchanged between captured and current source. final-source-contract-check.json records both versions' hashes. Other owners' subsequent changes were not revalidated by this track. Neither local HEAD nor this report identifies deployed bytes.

**Coverage delta.** Counts below cover nonempty direct string entries in the input namespace that correspond to the English catalog. They are not whole-application translation percentages or native-language quality certification.

| Locale | Before | Added | Candidate | Absent from 61 English entries |
| --- | ---: | ---: | ---: | ---: |
| Spanish, Latin America | 33 | 2 | 35 | 26 |
| Spanish, Castilian | 33 | 2 | 35 | 26 |
| Arabic | 33 | 2 | 35 | 26 |
| Chinese, Simplified | 33 | 2 | 35 | 26 |
| Thai | 33 | 2 | 35 | 26 |

Both English catalogs grow from 59 to 61 direct input strings. Root/public locale mirrors receive the same values. Every catalog value outside these two keys remains unchanged, including all simplified and share_collect values. These translations are AI-authored; native-speaker review remains pending. Other missing copy continues to use available English fallbacks.

| Key | Frozen English source wording |
| --- | --- |
| input.error_no_source_content | No usable source text was generated. Your existing source and reading have been kept. Please try again. |
| input.source_partial_generation | {failed} of {total} sections could not be generated. The rest were kept. Try again to fill the gaps. |

The exact payload is [translations/source-generation-locales.json](../../.codex-artifacts/source-generation-locales-track17/translations/source-generation-locales.json:1). It keeps failed and total as separate named placeholders; Chinese deliberately places total first.

**Ranked evidence, safeguards and limits.**

1. **P2, source/catalog gap addressed in the candidate:** both keys were absent from the English catalog and all five selected locale packs, while existing inline fallbacks kept the messages readable. No raw-key leak was reproduced for these two messages. Captured call sites are [content_engine_source.jsx:1216](../../.codex-artifacts/source-generation-locales-track17/content_engine_source.jsx:1216) and [content_engine_source.jsx:2024](../../.codex-artifacts/source-generation-locales-track17/content_engine_source.jsx:2024). The catalog test parses the source and checks the exact literals and English mirrors: [catalog fixture:8](../../.codex-artifacts/source-generation-locales-track17/tests/source_generation_locale_catalogs.test.js:8).
2. **Existing behavior verified with localized notices:** total empty generation preserves the prior source, reading and active view; partial generation publishes the one usable section once and warns that two of three sections failed. The locale patch does not implement these preservation behaviors; it exercises them with translated output. Evidence: [empty generation:10](../../.codex-artifacts/source-generation-locales-track17/tests/source_generation_locales.test.js:10), [partial generation:18](../../.codex-artifacts/source-generation-locales-track17/tests/source_generation_locales.test.js:18). Provider responses are controlled; no live model was called.
3. **Existing fallback safeguard verified:** missing, echoed, blank, throwing and non-string translations at the two owned message lookups produce readable English with resolved counts. An absent Arabic pack entry also falls back through the registered English catalog while retaining the Arabic passage. Evidence: [owned lookup failures:32](../../.codex-artifacts/source-generation-locales-track17/tests/source_generation_locales.test.js:32), [missing pack entry:42](../../.codex-artifacts/source-generation-locales-track17/tests/source_generation_locales.test.js:42). The tests use the extracted host callback, not a replacement interpolation algorithm: [host translator harness:11](../../.codex-artifacts/source-generation-locales-track17/tests/helpers/source_generation_locale_harness.js:11). Zero counts and Chinese placeholder reordering pass.
4. **P3, reproduced adjacent failure; separate owner follow-up:** an initial test made every translation call throw. Generation rejected at the earlier, unguarded status lookup, before sourceMessage could provide its fallback. Evidence: source-locale-runtime-initial-results.json and [captured startup lookup:1198](../../.codex-artifacts/source-generation-locales-track17/content_engine_source.jsx:1198). This is a simulated translator outage, not an observed live incident or a defect in the ten new translations. The final tests deliberately target failures at the owned message lookups and do not claim whole-engine tolerance of a globally broken translator. A minimal later engine-owner repair would put the startup status lookup inside a guarded translation/error-cleanup boundary; it should preserve existing work and reset busy state when translation fails. No source patch was made for this while the engine owner was active.
5. **Unverified risks:** actual toast/error-panel RTL layout, screen-reader announcements, native browser zoom, long-message wrapping, packaged/deployed behavior and native-language quality were not tested in this increment. Arabic fixture direction is declared metadata, not a rendered RTL-layout assertion. Chinese/Thai fixture content verifies preserved unspaced text; this two-message task does not exercise segmentation or arrows. The preceding reader report retains that separate evidence. Broader Lumen/research-review strings remain outside this bounded batch.

**Named fixtures.** The fixtures explicitly separate catalog filenames, interface language names and BCP 47 tags. Generation requests receive names such as Spanish (Latin America), Arabic and Chinese (Simplified), not catalog filenames. Their mocked generated prose is intentionally fixed test data and does not prove model language fidelity.

| Fixture | Contract |
| --- | --- |
| source_generation_en_v1 | English reference; total failure, partial warning and count interpolation |
| source_generation_es419_v1 | Latin American Spanish controls/messages with Spanish prior text |
| source_generation_esES_v1 | Castilian Spanish pack and independently named interface language |
| source_generation_ar_rtl_v1 | Arabic prior text/tag retained; Arabic messages and English fallback |
| source_generation_zh_unspaced_v1 | Unspaced Chinese prior text; total-before-failed placeholder order |
| source_generation_th_unspaced_v1 | Unspaced Thai prior text and resolved counts |

Fixture definitions: [tests/fixtures/source_generation_locales.json:1](../../.codex-artifacts/source-generation-locales-track17/tests/fixtures/source_generation_locales.json:1). Runtime checks require no raw owned key, blank message or unresolved failed/total placeholder. Catalog guards reject renamed, removed or duplicated placeholders, untranslated English values, extra keys/locales and changed frozen English. Existing conflicting values stop the merge instead of overwriting another owner's text.

**Validation actually performed.**

- Final: 40 passed, 0 failed, 0 pending across the runtime and catalog files. source-locale-final-results.json records the result. The final runner used one worker, 30-second test and 60-second hook timeouts.
- The initial broad translator-failure run had 23 passes and one failure at the unrelated startup status lookup. It is retained as the adjacent finding above.
- After the engine refresh, two repeat runs each had 39 passes and one runner failure in a file/AST-heavy catalog check at roughly 6.2–6.5 seconds under the default timeout. No catalog assertion mismatch was reported. Those reports are retained. The fixture now reads and compiles the captured host translator once and caches immutable pack data. The final run with explicit timeouts passed.
- Scoped updater check: two keys, five locales, zero pending writes. It registers the two English entries and updates only the ten selected pack copies. No full-language regeneration is involved.
- Strict read-only git apply --check --whitespace=error-all passed against the final shared catalog basis.
- In-memory application verifies all unrelated values survive. Applying this patch before or after the preceding 36-key navigation candidate produces identical catalog bytes across all 12 overlapping files. Exact candidate hash and result: stacking-check.json.

Reproduce after owner-reviewed integration:

    node dev-tools/i18n/apply_source_generation_locales.cjs --check
    node node_modules/vitest/vitest.mjs run tests/source_generation_locales.test.js tests/source_generation_locale_catalogs.test.js --maxWorkers=1 --hookTimeout=60000 --testTimeout=30000

The updater defaults to check mode. Its separately explicit --apply mode validates the complete payload and all catalog conflicts before writing, checks each target for concurrent edits and uses per-file atomic replacement. It is not a transaction across all twelve files; an operating-system failure partway through requires rerunning the check and completing the remaining scoped merge. No --apply command from this track targeted the shared checkout.

**Integration handoff.** source-generation-locales.patch is independent of the still-pending reader navigation/layout candidates. Its 18 files are two English catalogs, ten locale packs, a dedicated scoped updater, the payload, fixture data, helper and two tests. It intentionally does not modify the reader updater's simplified-only ownership rules. Preserve the separate reader patches and all active owner changes; do not copy entire snapshot files over the checkout. The integration owner should recheck source-copy contracts and rerun these tests against its final assembled source because the host/engine continued changing during this work. Translation edits have one owner after wording stabilizes. This resolves the two-key source-generation handoff and informs the reader/research language contract; it does not close the broader research-review translation lane or the adjacent global-translator failure. Deployment and generated-artifact synchronization remain separate owner steps.
