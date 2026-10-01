# Passage labels, pin notices, and readable fallback — Track 17

Prepared an isolated eight-message localization increment and repaired a reproduced empty-label fallback. The integration bundle combines this work with the earlier draft and literal-placeholder runtime fixes, so the reader helper does not require conflicting patches. Shared application files were not edited, and nothing from this increment was deployed.

**Baseline and authority.** Initial HEAD: `286e09850680047d44efcc836075916cf488eff6`. Packaging HEAD: `c4c8d6f8bffc88e5e1549b2f84448f15184b2fe8`. Final applicability HEAD: `a63e347b7d193cbc95b5fc3a9fec844322f1f455`. The shared checkout contains further uncommitted work; these HEADs do not identify deployed bytes. No deployed release was inspected. The snapshot is `.codex-artifacts/reader-passage-labels-track17`; `baseline.json` records 33 captured input hashes. `patch-manifest.json` records exact patch bases and outputs. `final-verification.json` records successful strict read-only checks of all three patch routes against the latest HEAD and confirms both refreshed English catalog hashes match the packaged outputs. Its catalog verification supersedes the pre-refresh `sameAsTestedCandidate: false` flags for those two files in the packaging manifest. The snapshot test results do not certify the latest whole application.

Applicable repository, ancestor and target-path `AGENTS.md` checks found no instructions. `AGENT_HANDOFF.md` and the Track 01 ownership ledger were read. The owned work log was written before editing. Track 01 retains shared reader/host/build integration, and Track 17 owns this frozen translation batch. No shared catalog/runtime/generated writes, Git mutation, install, server, live profile/provider operation or messages to other sessions occurred. A received Track 07 integration notice was followed by a local baseline recheck; its reported tests are not counted here.

**Ranked evidence.**

1. **P2, reproduced source/copy gap:** the captured reader uses an English `passageName` value in two generic messages and emits pin/unpin notices directly. All five selected packs lacked the eight owned messages. Even with the proposed catalogs supplied, the old source produced English passage labels and pin notices: 30 passes and 21 failures in the initial 51-case source comparison. Candidate call sites: [whole-sentence label, line 1716](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/view_simplified_source.jsx:1716), [validation message, line 1719](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/view_simplified_source.jsx:1719), and [pin notices, line 1692](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/view_simplified_source.jsx:1692). Current real-pack behavior was English fallback; a translated sentence containing an English passage-kind fragment was a source risk, not a separately observed deployed failure.
2. **P2, reproduced empty label and raw-key fallback defect:** the reader helper accepted whitespace-only translations and raw keys padded with whitespace. Three first-candidate fixtures failed on labels containing a single space. `fallback-baseline.json` also records direct source-function results for space, tab/newline and a padded key. The [candidate helper at line 1485](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/view_simplified_source.jsx:1485) checks trimmed text for validity but returns the original meaningful translation. Learner values and valid surrounding whitespace remain intact. Missing, echoed, padded, blank, throwing and non-string lookups now receive readable English.
3. **P2, reproduced dependency on the earlier literal fix:** all 24 new pin-label cases failed without the prior host/reader interpolation repair; all 24 pass in the consolidated runtime. Values such as `$&`, `$$`, `{start}` and `{item}` must remain literal learner text inside the resolved accessible label. These are exact expected-string assertions, not blanket removal of braces. Evidence: [literal pin-label fixtures, line 6](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/tests/reader_passage_literal_labels.test.js:6), before/final JSON reports, and `composition-record.json`.
4. **Existing safeguards verified:** translated pin success notices appear only after confirmation. A rejected save leaves the support unpinned and produces no success notice. Pending saves disable duplicate changes. Adapted passages still omit original-only pin controls. Source text and occurrence offsets remain unchanged. See [pin/confirmation cases, line 18](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/tests/reader_passage_label_locales.test.js:18). These behaviors already existed; this increment preserves them.
5. **P3, observed adjacent visual limitation:** the native Importance select clips its long English selected caption at 320 px with doubled root text. The Arabic capture can hide the leading meaning-bearing words. The eight owned labels/messages fit and remain usable, but the complete editor is not certified free of clipping. Source: [Importance options, line 1724](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/view_simplified_source.jsx:1724); evidence: the four reviewed enlarged captures listed in `validation-summary.json`. A later copy/accessibility pass should consider shorter frozen choice labels with a wrapping explanation, then retest the native select. This option-copy change was not added to the current batch.

**Coverage delta.** Six new English registrations; two existing English strings retained unchanged. Each selected locale gains eight entries, totaling 40 translated values. All selected public mirrors match. No full-language regeneration.

| Key under `simplified` | Purpose | English delta |
| --- | --- | --- |
| `gloss_word_from_original` | Original-passage word field label | New |
| `gloss_word_from_adapted` | Adapted-passage word field label | New |
| `gloss_no_exact_match_original` | Original-passage validation message | New |
| `gloss_no_exact_match_adapted` | Adapted-passage validation message | New |
| `gloss_pinned_notice` | Confirmed pin notice | New |
| `gloss_unpinned_notice` | Confirmed unpin notice | New |
| `gloss_pin_for` | Accessible pin label with exactly one `{item}` | Retained |
| `gloss_always_show_in_lighter_view` | Visible pin checkbox label | Retained |

| Locale | Owned coverage before → after | Named fixture |
| --- | --- | --- |
| English | 2/8 → 8/8 | `passage_labels_en_v1` |
| Spanish, Latin America | 0/8 → 8/8 | `passage_labels_es419_v1` |
| Spanish, Castilian | 0/8 → 8/8 | `passage_labels_esES_v1` |
| Arabic / RTL | 0/8 → 8/8 | `passage_labels_ar_rtl_v1` |
| Chinese, Simplified | 0/8 → 8/8 | `passage_labels_zh_unspaced_v1` |
| Thai | 0/8 → 8/8 | `passage_labels_th_unspaced_v1` |

Definitions: [fixture data](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/tests/fixtures/reader_passage_label_locales.json:1) and [frozen locale payload](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/translations/reader-passage-label-locales.json:1). Original/adapted messages are complete sentences, permitting language-specific grammar without an English noun parameter. The older generic English keys remain for compatibility with older consumers.

Fallback is still English outside this batch, including the inner occurrence descriptor (“text position”) and several editor controls shown in the captures. The pin label's translated framing does not mean its entire embedded descriptor is translated. Native-language review, actual assistive technology, native browser-menu zoom, full-app RTL behavior/arrows, mixed interface/passage-language pronunciation and deployed locale-cache behavior remain unverified. Passage language and segmentation logic are unchanged.

**Validation actually performed.** Final evidence contains **291 distinct passing checks**, with another **130 affected checks passing after the English catalogs were refreshed**; the rerun is not added to the total.

| Check | Passed |
| --- | ---: |
| New rendered labels, pin states and fallback cases | 55 |
| Frozen catalog, placeholder, conflict and mirror guards | 16 |
| Literal learner values in localized pin labels | 24 |
| Existing support curation | 19 |
| Existing draft transitions | 58 |
| Prior host/reader literal-placeholder checks | 35 |
| Existing reader i18n behavior and raw-copy checks | 10 |
| Chromium editor layout/focus cases | 24 |
| Prior draft-localization compatibility cases | 50 |

`validation-summary.json` maps those counts to reports. Two existing reader-i18n registry tests were unselected; this is not a full-suite/global-CI claim. The earlier composed run had 206 passes and one fixture setup failure because the legacy host-mirror check read a canonical path absent from the small snapshot. Its isolated file reads were routed to both actual composed host copies, preserving the exact assertions; the 35-case rerun passed. Initial fixture-directory and line-ending guards also stopped safely before a useful test run. No application assertion was weakened.

Browser cases use actual editor markup and the current Tailwind configuration in disposable Chromium, with network requests blocked. They cover original/adapted forms in all six fixtures at 320 CSS px and 16/32 px root text, correct inherited direction, label association, focus and owned-control reflow. They inspect layout/focus; actual pin/save state is tested in rendered React fixtures. Four enlarged Arabic, Spanish, Chinese and Thai screenshots were reviewed. Root text scaling is not native browser zoom.

Reader tests compile the captured JSX plus its two helper inputs into a disposable adapter; no production module or application build was run. The legacy host mirror test uses the two composed host files. The previous draft fixture uses its real pending seven-message payload layered over the current catalogs in the test harness only. Its one now-stale English-only Chinese-error assertion is updated by `draft-fixture-followup.patch`. The underlying Chinese `水` within `水流` reselection limitation remains; its retained-draft/no-match behavior still passes, with the new localized message.

Concurrent English changes, including lookup and other feature copy, were preserved. `catalog-refresh.json` lists them; all 130 affected label/catalog/literal checks passed against the refreshed English pair. The four relevant reader functions and both host translator callbacks remained unchanged in the shared checkout during packaging (`boundary-stability.json`). Whole-file drift elsewhere is recorded separately and is not certified by these isolated tests.

**Minimal implementation and ownership.** The increment changes the reader text-helper validity check, replaces two generic passage-kind calls with four complete-sentence calls, keys the two existing pin notices, and adds eight bounded locale entries per pack. Save/selection handlers, persistence, source text, offsets and segmentation are unchanged. The dedicated updater [apply_reader_passage_label_locales.cjs](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-passage-labels-track17/dev-tools/i18n/apply_reader_passage_label_locales.cjs:1) defaults to check mode, rejects changed English, broken placeholders and conflicting existing values, and preserves unowned catalog values. Apply mode validates the complete plan and checks for concurrent changes before per-file atomic writes; it is not a transaction across all twelve files.

Translation writing remains with Track 17 after this copy is accepted. Track 01 owns shared reader/host/module/public/pin assembly. Track 04 owns draft/pin/save contract review; Tracks 06/07/10/11 retain language, segmentation, occurrence and lookup dependencies; Track 16 should carry the named fixtures into assembled verification, and the accessibility owner should review the Importance caption follow-up.

**Integration handoff.** Prefer the 23-file **`integration.patch`**: 73,512 bytes, SHA-256 `0998530d5d06fe1e42b76af99ebd0aee8668862bc85b3e395b84e626466ce7b0`. It contains the consolidated runtime, this batch's catalogs and new tools/tests. Its runtime includes the prior literal host/helper fix, the prior draft notice/save-reader changes, and this increment. It does not include the previous batches' catalog values, updater/test files or generated outputs.

1. Recheck the manifest bases and current ownership before applying. `integration.patch`, `runtime-combined.patch` and `passage-labels.patch` each passed strict read-only `git apply --check --whitespace=error-all` checks at packaging time.
2. Apply **one** route. `integration.patch` already contains `runtime-combined.patch`, `catalogs.patch` and `tools_and_tests.patch`; do not apply those again. The 21-file `passage-labels.patch` is the incremental review alternative, not another patch to stack afterward.
3. The consolidated runtime replaces the earlier literal reader/host and draft reader patches. Retain their separate catalog/test/updater work. Do not reapply their old runtime changes. The flat-template translator contract remains as documented in the earlier literal-fix report; future parameter-selected/plural translators need explicit reconciliation.
4. Reconcile the earlier draft, navigation and source-generation catalog/tool handoffs, then use their bounded updaters instead of blindly stacking overlapping JSON insertion hunks. `catalog-composition.json` confirms no conflicting frozen values with this batch; it does not claim raw patch commutativity. After installing the prior draft test file, apply `draft-fixture-followup.patch` to update its single English-only assertion. That delta was verified against the exact prior fixture and all 50 cases passed with the actual pending translations.
5. The integration owner should regenerate affected reader/host outputs, public mirrors and pins through the normal build path, check CSS availability for the included prior warning component, then rerun affected checks against the final assembled application. Source/HEAD/pin changes alone do not prove deployed content. Actual release verification remains a separate authorized step.

Focused acceptance after assembly:

```powershell
node dev-tools/i18n/apply_reader_passage_label_locales.cjs --check
node node_modules/vitest/vitest.mjs run tests/reader_passage_label_locales.test.js tests/reader_passage_label_catalogs.test.js tests/reader_passage_literal_labels.test.js tests/reading_support_draft_transitions.test.js tests/reading_support_curation.test.js --maxWorkers=1 --hookTimeout=60000 --testTimeout=30000
$env:ALLO_PASSAGE_LABEL_LAYOUT='1'
node node_modules/vitest/vitest.mjs run tests/reader_passage_label_layout.test.js --maxWorkers=1 --hookTimeout=60000 --testTimeout=30000
Remove-Item Env:ALLO_PASSAGE_LABEL_LAYOUT
```

Acceptance requires complete translated original/adapted labels, readable English for invalid lookups, exact retained learner text inside accessible labels, success notices only after confirmation, no duplicate pin changes while busy, and unchanged original/adapted control eligibility. Preserve the documented Chinese boundary limitation and the Importance caption follow-up as separate work.
