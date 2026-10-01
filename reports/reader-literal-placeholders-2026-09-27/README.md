Track 17 — Literal placeholders and learner text, 2026-09-27

Prepared an isolated runtime fix for three reproduced language-contract failures: replacement symbols in learner text were interpreted by the host translator, repeated catalog placeholders were filled only once, and the reader could interpolate already-inserted learner text again. The candidate preserves literal values and fills each catalog token in a single pass.

**91 combined checks and five existing localization behavior checks passed.** A separate static localization check still fails on the same retained-draft notice in the baseline and candidate; that existing copy gap is documented below. No shared host/reader/catalog/generated files were edited. No deployment, Git mutation, installation, server or cross-chat message was performed.

The seven-file implementation artifact is literal-placeholders.patch. It is also split into host.patch, reader.patch and tests.patch for ownership review. These changes add **zero catalog keys and zero translations**. They do not replace the earlier catalog candidates. The earlier word-help layout proposal is now stale because another owner changed the shared row; do not apply that old layout.patch without reconciliation.

**Baseline and source authority.** Initial local HEAD: af3c6b82ab76dad40a5d44f785bf828d1adea86c. Final rechecked HEAD: 3752fe48d98ee8096e456d766427f3f513a11b25. The tested snapshot is .codex-artifacts/reader-literal-placeholders-track17. The shared checkout contains concurrent owner work, and neither HEAD identifies deployed bytes. No deployed release was checked.

No applicable AGENTS.md was found in the repository/ancestor inspection. AGENT_HANDOFF.md and the integration ownership ledger were read. Track 01 retains shared host/reader/generated integration. Work ownership was recorded before editing in WORK_LOG.md and the snapshot handoff. This turn changed only the isolated snapshot and owned reports.

Thirty initial inputs were captured, with the existing adaptation regression file added for validation. Exact hashes are in baseline.json and source-inputs.json. The shared English catalogs changed while work proceeded. Final checks confirmed that the five directly tested messages and all 14 repeated-placeholder English messages retained their tested wording. The captured host and reader inputs stayed unchanged in the final source-input comparison; the candidate intentionally changes only their owned translator/helper functions. Full final-catalog equivalence is not claimed.

**Ranked evidence.**

1. **P2, reproduced host interpolation failure:** the original callback passes caller values as String.replace replacement strings. For input.word-like values, `$&` reinserts the matched token, `$$` loses a dollar, and the other replacement symbols can copy or remove surrounding text. With the real key simplified.word_help_show_word_in_text, `{word: '$&'}` produced `Show in text: {word}` instead of retaining `$&`. The same mechanism affected English, Spanish, Arabic, Chinese and Thai learner values. Baseline function: [captured AlloFlowANTI.txt:6564](../../.codex-artifacts/reader-literal-placeholders-track17/reports/base/AlloFlowANTI.txt:6564). Candidate: [AlloFlowANTI.txt:6563](../../.codex-artifacts/reader-literal-placeholders-track17/AlloFlowANTI.txt:6563). Evidence: host-literal-baseline-results.json and [host fixtures:4](../../.codex-artifacts/reader-literal-placeholders-track17/tests/host_literal_placeholders.test.js:4).
2. **P2, reproduced unresolved repeated token:** the existing pdf_audit.mo.confirm message uses `{n}` twice, but the original host callback replaced only the first occurrence. There are 14 English catalog messages with repeated named tokens in the captured catalog. The candidate test checks every repeated occurrence in all 14, without changing those messages or unrelated feature code. Evidence: [catalog scan:19](../../.codex-artifacts/reader-literal-placeholders-track17/tests/host_literal_placeholders.test.js:19), [read-along confirmation:37](../../.codex-artifacts/reader-literal-placeholders-track17/tests/host_literal_placeholders.test.js:37), and validation-summary.json's exact key list.
3. **P2, reproduced reader re-interpolation:** fixing the host alone left 12 of 24 rendered gloss-label cases failing. A learner word such as `heron{start}` became `heron2` in an Edit gloss label; `{item}` could expand into an entire nested occurrence label. The visible learner word and underlying support data remained intact in these fixtures, so the demonstrated failure is label corruption, not stored passage corruption. The reader's text helper requested an interpolated translation and then interpolated it again. The candidate requests the template and inserts values once. Evidence: [reader helper:1484](../../.codex-artifacts/reader-literal-placeholders-track17/view_simplified_source.jsx:1484), reader-label-host-only-results.json and [rendered gloss fixtures:12](../../.codex-artifacts/reader-literal-placeholders-track17/tests/reader_literal_placeholder_labels.test.js:12).
4. **P3, existing source copy gap; unchanged by this fix:** the retained-draft notice in ReadingGlossEditor contains three raw English JSX fragments: “The passage changed. Your draft is retained. Review the word supports, then”, “choose the occurrence in the current text”, and “before saving.” The existing static test fails on exactly those fragments before and after the placeholder change. Evidence: existing-raw-copy.json, reader-i18n-baseline-static-results.json and [baseline reader:1716](../../.codex-artifacts/reader-literal-placeholders-track17/reports/base/view_simplified_source.jsx:1716). This notice needs a keyed message with its link handled explicitly after its owner stabilizes the wording; it was not translated speculatively here.
5. **Integration finding:** the previous report's four-class wrapping patch no longer applies to the shared reader. The current row uses space-y-2 and a different explanation basis/layout. stacking-check.json records the mismatch. This turn does not certify the newer row's reflow and does not rewrite it. The placeholder reader patch applies independently at its text helper.

**Minimal implementation and compatibility contract.**

The host callback converts the supplied own enumerable parameter values to literal strings in a null-prototype lookup, then replaces all template tokens through a function callback. Values are inserted once, so a value containing `{start}` is not subsequently interpreted as another parameter. Missing parameters remain unchanged. Existing catalog lookup order, word-sounds fallback, returnObjects opt-in, non-string-key behavior, zero, false and empty strings are covered. Parameter property names are treated literally, including dots and prototype-looking names.

The reader helper resolves the flat catalog template by calling its translator with the key, then applies the existing callback interpolation once. This matches the current host's flat-string catalog contract and continues to accept a translator that returns raw templates. It changes how parameters are passed to custom reader translators: a future translator that chooses a plural form or wording based on parameters must explicitly reconcile that contract. The current application callback has no such selection behavior. The five existing reader translation behavior checks pass with the change.

Exact expected-label assertions distinguish actual template tokens from legitimate brace-looking learner text. The fix does not strip learner braces or change stored annotations. Rendering fixtures verify both Edit and Remove accessible labels and confirm that item/support objects are unchanged and no update callback fires.

**Key/locale delta and named fixtures.**

| Catalog / locale | Added keys | Rewritten translations | Fixture |
| --- | ---: | ---: | --- |
| English | 0 | 0 | literal_en_v1 |
| Spanish, Latin America | 0 | 0 | literal_es419_v1 |
| Spanish, Castilian | 0 | 0 | literal_esES_v1 |
| Arabic | 0 | 0 | literal_ar_rtl_v1 |
| Chinese, Simplified | 0 | 0 | literal_zh_unspaced_v1 |
| Thai | 0 | 0 | literal_th_unspaced_v1 |

Fixture data: [reader_literal_placeholders.json:1](../../.codex-artifacts/reader-literal-placeholders-track17/tests/fixtures/reader_literal_placeholders.json:1). Values cover dollar replacement symbols, repeated tokens, zero/false, parameter order, literal braces, nested occurrence labels and mixed/unspaced script text. The selected real packs currently lack the exercised gloss-label translations, so those labels use English catalog fallback; this report does not imply new Arabic/Spanish/Chinese/Thai UI copy. Synthetic repeated templates exercise the formatter without modifying packs. The Arabic fixture records direction metadata; this increment does not test visual bidi layout or arrows.

**Validation actually performed.**

| Run | Result | Interpretation |
| --- | --- | --- |
| Original host/helper | 6 passed, 28 failed | Reproduced defects in 34 targeted cases |
| Host-only candidate | 28 passed, 6 failed | Reader's second interpolation still failed |
| Rendered gloss labels with host-only fix | 12 passed, 12 failed | Literal braces still corrupted nested labels |
| Final combined run | 91 passed, 0 failed | 35 host/helper cases, 24 rendered gloss labels, 32 existing navigation/bookmark/review/adaptation cases |
| Existing reader localization behavior | 5 passed, 0 failed; 7 unselected | Explicitly selected behavior group |
| Broader selected reader_i18n check | 9 passed, 1 failed; 2 unselected | Includes the unchanged raw-copy static failure |
| Same static check on captured baseline | 1 failed; 11 unselected | Confirms the retained-draft copy gap predates this fix |

Do not add baseline, intermediate and repeated runs together as independent acceptance cases. The 91 combined checks plus five selected behavior checks are the final behavioral validation. The full reader_i18n file is not green. Root/public catalog checks and full CI were not rerun because this increment edits no catalogs; the relevant final copy checks are recorded separately.

Tests used the actual extracted host callback and the current reader source compiled with its helper inputs. Existing module-based reader tests used a disposable adapter under the snapshot's reports directory. No production host/module build, packaged app, live AI/audio or live profile was used. There was no browser visual run in this increment; screen-reader pronunciation, native zoom and deployed behavior remain unverified.

Strict git apply --check --whitespace=error-all passed for the combined final patch. The packager verifies that only the translator/helper function bodies change and all surrounding source remains intact. Both canonical host callbacks are tested for equality. The generated desktop App.jsx and generated reader modules were not edited; the integration owner must regenerate them through the normal path.

**Focused reproduction and acceptance.**

After owner-reviewed integration:

    node node_modules/vitest/vitest.mjs run tests/host_literal_placeholders.test.js tests/reader_literal_placeholder_labels.test.js --maxWorkers=1 --hookTimeout=60000 --testTimeout=30000

With the newly assembled reader module selected through the repository's normal ALLO_VIEW_CANDIDATE mechanism, also run tests/reader_place_review_adapt.test.js. Select `^the Novak reading parts show translated text` in tests/reader_i18n.test.js for the five behavior checks; keep the separate static copy failure visible until its owner addresses it.

Acceptance examples: `Show in text: $&` must retain the literal value; both `{n}` positions in the read-along confirmation must resolve; repeated tokens must all receive the same value; reordering parameter object properties must not change output; and Edit/Remove labels for `heron{start}`, Arabic words, Chinese 水 and Thai หนังสือ must preserve the exact learner word. Missing translations must retain the existing readable English fallback. Underlying passages/supports must remain unchanged.

**Integration handoff.** literal-placeholders.patch contains two canonical host text files, one reader source file and four new fixture/test files. host.patch and reader.patch are independent source pieces, but both are needed to close the full host-plus-reader contract. tests.patch carries the shared acceptance cases. The prior navigation and source-generation catalog patches have no overlapping files with these changes. The prior word-help layout proposal is stale and must not be blindly applied. Integrate bounded hunks, preserve active owner changes, regenerate the desktop/reader artifacts and affected pins as appropriate, and rerun the selected tests on final assembled inputs. No all-language rebuild is proposed. This informs tracks 06/07/10/11/16 and accessibility review; translations remain with one owner after copy stabilizes.
