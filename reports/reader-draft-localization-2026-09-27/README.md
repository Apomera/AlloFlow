# Reader draft localization — Track 17

Prepared an isolated seven-message reader draft/save improvement. Shared reader, host, generated files and catalogs were not edited by this increment. Integration and deployment remain pending.

**Baseline and ownership.** Initial captured HEAD: `13ebcc73f5784436643adc7c12ff8d83d5b29028`. Final read-only patch check HEAD: **`286e09850680047d44efcc836075916cf488eff6`**, at `2026-09-27T16:17:28.880Z`. The source snapshot is `.codex-artifacts/reader-draft-locales-track17`; `baseline.json` records 35 input hashes. The final integration basis and concurrent changes are recorded in `patch-manifest.json`. Neither commit nor local file parity identifies the deployed release. No deployed bytes were checked.

The English and two Spanish catalog pairs changed during concurrent integration. The patch was rebased onto those newer catalogs while preserving every unrelated value, and all 66 affected runtime/catalog cases passed again (`draft-refreshed-catalog-results.json`). Whole host/reader/helper/test files also moved. The exact `ReadingGlossEditor`, `simplifiedText`, `findReadingGlossOccurrences`, `readingGlossContext`, and actual host translator boundaries remained unchanged; `owned-boundary-stability.json` records their hashes. The captured broader regression runs do not certify the newer complete assembled application.

No applicable `AGENTS.md` was found in the repository or inspected ancestors. `AGENT_HANDOFF.md`, the Track 01 ownership ledger, and the reader follow-up handoff were read. Ownership was recorded before editing in `WORK_LOG.md`. Track 01 retains shared reader/host/build integration. Subsequent user approvals authorized this isolated implementation and focused validation. There was no Git mutation, install, production build, server, deployment, live account operation or message to another session. A received coordination notice about Track 07 catalog integration was respected by continuing exclusively in the isolated snapshot.

**Ranked evidence and classification.**

1. **P2, reproduced localization failure:** the captured `view_simplified_source.jsx:1713` renders “Save and continue” directly; `:1716` renders the retained-draft warning and its inline action as three English fragments. Baseline fixtures with real translated packs still show these English strings. The initial 49-case run has 21 passes and 28 failures (`draft-baseline-results.json`). The candidate keys the complete warning with one `{chooseOccurrence}` action slot, permitting language-specific placement without HTML parsing.
2. **P2, source/catalog gap with existing safe retention:** the stale-draft error at captured reader `:1661`, success notice at `:1672`, missing-support confirmation at `:1677`, and already-keyed partial-save error at `:1686` lacked this complete seven-message catalog coverage. The candidate registers the frozen wording and translates it in five packs. It does not implement the existing save-confirmation or draft-retention protections. Rendered fixtures confirm that failed/partial confirmation retains the wording, keeps the session dirty and blocks continuing.
3. **P2 follow-up, reproduced existing boundary limitation:** `findReadingGlossOccurrences` at captured reader `:1425` uses `Intl.Segmenter(undefined, {granularity: 'word'})` and requires whole-word boundaries. For `清澈的水流过花园。`, this runtime segments `水流` together. A supplied support for `水` can be edited initially but cannot be reselected after a passage change. The first candidate run exposed this in two cases: 47 passed, two failed (`draft-candidate-results.json`). The final successful unspaced Chinese fixture uses the whole word `河水`; the separate named `draft_zh_compound_subword_v1` fixture preserves the unresolved limitation and verifies retained work, a disabled save, and the readable no-exact-match notice. No segmentation behavior was changed. This is not evidence that all Chinese occurrences are supported.
4. **P3, defensive fallback verified:** missing, echoed, blank, throwing and non-string draft translations produce readable English. A malformed action template produces a complete English warning and exactly one working English action. Missing, duplicated, renamed, extra or stray-brace tokens are rejected by the bounded catalog guard. Markup-looking copy stays plain text. These are injected failure cases, not reported live incidents.
5. **Unverified risks:** native-language review, screen-reader pronunciation, native browser-menu zoom, full-reader reflow, deployed/cached locale delivery and other language packs remain outside this increment. The browser fixture checks the actual warning markup in its fieldset using the current Tailwind configuration; it does not certify the full app. Existing fallback copy elsewhere can remain English, including the Chinese subword no-exact-match message. No arrow behavior, passage language detection, Lumen text or bilingual segmentation contract is changed.

**Key and locale delta.** Seven English registrations and seven entries in each selected pack: 35 translated values, with exact public mirrors. No full-language regeneration.

| Key under `simplified` | Contract |
| --- | --- |
| `gloss_draft_passage_changed` | Complete retained-draft warning; exactly one `{chooseOccurrence}` action slot |
| `gloss_draft_choose_occurrence` | Inline action label |
| `gloss_draft_passage_changed_error` | Save-time stale-passage error |
| `gloss_save_and_continue` | Pending-action save control |
| `gloss_save_word_support_confirmed` | Confirmed-save notice |
| `gloss_save_support_unconfirmed` | Missing support confirmation; draft retained |
| `gloss_save_changes_unconfirmed` | Partial field confirmation; draft retained and retry requested |

| Catalog/locale | Added entries | Named fixture |
| --- | ---: | --- |
| English | 7 | `draft_en_v1` |
| Spanish, Latin America | 7 | `draft_es419_v1` |
| Spanish, Castilian | 7 | `draft_esES_v1` |
| Arabic | 7 | `draft_ar_rtl_v1` |
| Chinese, Simplified | 7 | `draft_zh_unspaced_v1` |
| Thai | 7 | `draft_th_unspaced_v1` |

Fixture definitions and frozen copy are in [reader_draft_locales.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/tests/fixtures/reader_draft_locales.json:1) and [reader-draft-locales.json](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/translations/reader-draft-locales.json:1). The additional `draft_zh_compound_subword_v1` case is a limitation characterization, not a successful re-anchoring case. Labels and notices are checked against exact expected text, including literal learner text such as `$&` and `{literal}` in retained/saved explanations.

Exact code references: [captured warning/action](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/reports/base/view_simplified_source.jsx:1713), [captured word-boundary rule](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/reports/base/view_simplified_source.jsx:1431), [candidate warning component](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/view_simplified_source.jsx:1503), [candidate save notices](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/view_simplified_source.jsx:1682), [retention/re-anchoring fixtures](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/tests/reader_draft_locales.test.js:7), [partial confirmation fixtures](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/tests/reader_draft_locales.test.js:30), [Chinese subword characterization](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/tests/reader_draft_locales.test.js:65), and [bounded catalog guard](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-draft-locales-track17/dev-tools/i18n/apply_reader_draft_locales.cjs:20).

**Smallest implementation.** `ReadingDraftChangedNotice` renders a catalog sentence split around one named action slot. The button retains the same disabled state and handler. Surrounding text is rendered by React; no HTML insertion is used. Invalid template structure falls back to the complete original English sentence and action. Four existing literal message calls are keyed, and the existing partial-save key is registered. The action and warning wrap at narrow widths. Save confirmation, pending navigation, cancellation, draft ownership and passage text remain unchanged.

The dedicated `dev-tools/i18n/apply_reader_draft_locales.cjs` defaults to check mode, owns exactly these seven keys/five locales, refuses changed frozen English or conflicting existing values, and preserves other catalog content. Explicit apply mode validates all files before writing, checks for concurrent edits and replaces each file atomically. It is not a transaction across all twelve catalog files; an OS failure midway requires checking and completing the remaining scoped merge. This track used apply mode only in its disposable snapshot.

**Validation actually performed.** The final distinct evidence comprises **178 passing checks**:

| Check | Passed | Evidence |
| --- | ---: | --- |
| Rendered draft flows and fallback/slot cases | 50 | `draft-render-layout-results.json`; includes one known-limit characterization |
| Frozen catalog, mirror and guard checks | 16 | `draft-catalog-final-results.json` |
| Existing draft transitions | 58 | `draft-combined-results.json` |
| Existing navigation/bookmark/review/adaptation | 32 | `draft-combined-results.json` |
| Existing reader i18n behavior and raw-copy checks | 10 | `draft-i18n-results.json`; two registry tests unselected |
| Chromium warning reflow and keyboard focus | 12 | `draft-render-layout-results.json`, `draft-layout/results.json` |

The earlier combined run has 153 passes and one fixture assertion failure: the Chinese subword case expected a save-time alert even though the save button was already disabled. The corrected characterization asserts the disabled save and existing no-exact-match notice. The final 50-case runtime run passes. No production behavior was loosened to make the fixture pass. The refreshed-catalog rerun passes all 66 runtime/catalog checks. Do not add repeated runs to the unique total or describe the entire existing reader-i18n file/full CI as green.

Tests use the actual extracted host translator and reader source compiled with its two embedded helper inputs. Existing module-based suites use a disposable `reports/reader-test-adapter.js`; the snapshot test loader routes the reader to that adapter. Neither adapter nor loader instrumentation is in the integration patch. No production module was rebuilt. Browser checks use disposable Chromium with all network requests blocked, 320 CSS px and 16/32 px root text. Arabic inherited RTL direction and keyboard Tab focus pass. The enlarged Spanish, Arabic, Chinese and Thai captures were visually inspected. Root text scaling is not native browser zoom.

**Reproduction and acceptance.** After the integration owner merges the source and creates the normal reader module:

```powershell
node dev-tools/i18n/apply_reader_draft_locales.cjs --check
node node_modules/vitest/vitest.mjs run tests/reader_draft_locales.test.js tests/reader_draft_locale_catalogs.test.js tests/reading_support_draft_transitions.test.js tests/reader_place_review_adapt.test.js --maxWorkers=1 --hookTimeout=60000 --testTimeout=30000
$env:ALLO_READER_DRAFT_LAYOUT='1'
node node_modules/vitest/vitest.mjs run tests/reader_draft_locale_layout.test.js --maxWorkers=1 --hookTimeout=60000 --testTimeout=30000
Remove-Item Env:ALLO_READER_DRAFT_LAYOUT
```

Acceptance: both original/adapted drafts retain exact wording after passage changes; save remains unavailable until supports are reviewed and the current occurrence is explicitly selected; translated Save and continue waits for complete confirmation; missing/partial confirmation keeps the draft and pending action; each warning has one accessible actionable slot, can move it to either sentence edge, and exposes no raw owned key or template token. A complete Chinese word and the Thai unspaced fixture re-anchor successfully. The Chinese subword case remains a separate owner decision.

**Integration handoff.** The 20-file `reader-draft-locales.patch` is divided into `reader.patch`, `catalogs.patch`, and `tools_and_tests.patch`. Use the manifest's exact bases and hashes; never replace the shared reader with the snapshot. `stacking-check.json` records compatibility with the prior literal-placeholder reader patch and semantic composition with the pending navigation/source-generation batches. Catalog insertion contexts can overlap even when owned keys are disjoint; when that happens, apply the source/tools/tests patches and run the respective bounded updaters after catalog ownership is released. Do not blindly stack cumulative catalog patches or reapply the older stale layout patch.

Final patch: **68,143 bytes**, SHA-256 **`cf2e82dd514c2b19ab350236aae7ca2e49f62196bebf790d21d443f1b79f8b97`**. `git --no-optional-locks apply --check --whitespace=error-all` passed against the final HEAD and current working files without applying anything. The reader patch composes identically in both orders with the prior literal-placeholder helper patch. The three catalog batches yield identical values in all six merge orders for all twelve catalog files; raw textual patch stacking is not assumed. An initially slow optional raw-patch composition scan was stopped only in this task's owned packaging process, and the completed bounded semantic check replaced it. No test result depended on that optional scan.

Track 17 remains the translation owner after this frozen copy is accepted. Track 01 owns reader/module/public output, host pins, CSS availability and assembled validation. Track 04 should review the draft/save confirmation seam; Tracks 06/07/10/11 should reconcile occurrence boundaries and actual passage language before changing Chinese/Thai behavior; Track 16 should retain these locale/fallback acceptance cases. New research/readiness copy owned by the concurrent Track 07 integration is not included in this seven-message coverage claim. Rerun affected checks on final assembled sources, then perform separately authorized release validation against exact served bytes.

For the Chinese follow-up, first define whether an already validated current support for a subword remains eligible for explicit reselection. A bounded reader-owner change could offer that exact validated occurrence without relaxing matching for every substring. Verify the actual passage language supplied to segmentation and add both supported/unavailable `Intl.Segmenter` cases before changing the broader boundary rule. Preserve existing whole-word rejection in spaced languages and never silently relocate or discard the draft.
