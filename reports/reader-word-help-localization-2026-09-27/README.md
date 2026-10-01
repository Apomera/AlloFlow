Track 17 — Prepared word-help localization and reflow, 2026-09-27

Extended the isolated navigation candidate with **seven keys / 35 translations** and four missing English catalog registrations. The cumulative candidate now contains **36 keys / 180 locale values** and five English registrations. It also includes a separately reviewable reader layout repair that passed full-page reflow checks with the translated labels.

Use this directory's navigation.patch and layout.patch. They **replace** the preceding 29-key navigation.patch and two-class layout-proposal.patch; do not stack the old and new versions. Shared reader, host, catalogs, generated outputs and pins were not edited by this turn. No deployment, Git mutation, server, installation or cross-chat message was performed.

**Baseline and ownership.** Local HEAD was rechecked at the beginning and end: 16e3ea214bea20953b79b0e86e41f6d0beef9deb. Current working files include other owners' uncommitted work; this commit is not a complete identity for the tested checkout and does not prove deployed bytes. The snapshot is .codex-artifacts/reader-word-help-track17. Current reader/helper inputs were refreshed before testing. Fourteen recorded shared inputs remained unchanged at final verification; the five existing fixture/harness/config dependencies also matched shared files. Exact hashes appear in baseline.json, source-inputs.json, patch-manifest.json and layout-manifest.json.

No applicable AGENTS.md was found in the repository or ancestors. AGENT_HANDOFF.md and the integration ownership ledger were inspected. Track 17 owns this bounded payload and its fixtures; Track 01 retains shared reader/host/build/pin integration. The prior snapshot/report remains available. This turn's shared writes are confined to owned reports; implementation and test edits are isolated. Work ownership was recorded before editing in WORK_LOG.md and the snapshot's handoff.

**Coverage delta.** These counts measure nonempty English-key coverage, not translation quality. Each of the five packs was missing all seven new messages. Four had no English catalog entry despite readable inline reader fallbacks. Existing fallbacks were registered verbatim; no English copy was rewritten.

| Locale | Shared entries | Previous candidate | This increment | Cumulative candidate | Still absent |
| --- | ---: | ---: | ---: | ---: | ---: |
| Spanish, Latin America | 301 | 330 | +7 | 337 | 259 |
| Spanish, Castilian | 301 | 330 | +7 | 337 | 259 |
| Arabic | 301 | 330 | +7 | 337 | 259 |
| Chinese, Simplified | 301 | 330 | +7 | 337 | 259 |
| Thai | 301 | 330 | +7 | 337 | 259 |

English simplified leaves: 591 shared, 592 in the previous candidate, **596** in this candidate. Both English copies and both copies of each selected locale receive identical scoped changes. All 70 already-owned followup values and all 173 share_collect entries per pack remain unchanged. The complete scoped updater guard covers 223 keys across five locales with zero pending writes. Untranslated UI elsewhere still falls back to English; screenshots visibly retain such labels. These translations are AI-authored and await native-speaker review.

| New key, with simplified. prefix | Frozen English copy | English registration |
| --- | --- | --- |
| word_help_open_help | Open help | New |
| word_help_show_in_text | Show in text | Already present |
| word_help_prepared_for | Prepared word help: {word} | New |
| word_help_tip_no_marks | Prepared explanations are listed below. Choose Word meaning to open help from the passage. | New |
| word_help_located_in_text | Located "{word}" in the passage. Read its explanation in Word help. | New |
| word_help_listen_to_word_help | Listen to word help | Already present |
| word_help_stop_word_help | Stop word help | Already present |

**Ranked evidence.**

1. **P2, source coverage gap addressed in the candidate:** the seven list/action/status messages were missing in all five packs. No raw-key failure was reproduced: the reader's existing English fallbacks kept these labels readable. New values and exact frozen copy begin in [payload:36](../../.codex-artifacts/reader-word-help-track17/translations/reader-navigation-locales.json:36); locale additions begin at lines 75, 113, 151, 189 and 227. The catalog fixture parses current reader source to verify existing fallback literals, English registration and mirrors: [catalog fixture:15](../../.codex-artifacts/reader-word-help-track17/tests/reader_navigation_locale_catalogs.test.js:15).
2. **P2, reproduced reflow failure and bounded candidate repair:** at 320 CSS pixels and 32px root text, the unmodified list row plus the new translations widened the document to 586px in both Spanish packs, 539px in Arabic, 461px in Chinese, 552px in Thai and 490px in English. Normal 16px text measured 320px for all six. The non-wrapping row and non-shrinking buttons are at [current source:2030](../../view_simplified_source.jsx:2030). The previous two-class proposal reduced the problem but still produced 345px in both Spanish packs; its browser run had 10 passing and 2 failing cases. The final four class changes wrap the row, give its explanation a full-width basis below sm, and cap each action button at max-w-full. All twelve final cases measured 320px with no help-action overflow. Evidence: word-help-layout-baseline/results.json, word-help-browser-two-class-results.json, word-help-layout-final/results.json and [full-page assertions:60](../../.codex-artifacts/reader-word-help-track17/tests/reader_navigation_locale_layout.test.js:60).
3. **Existing safeguard / nonfinding:** the reader already distinguishes a located word from a highlighted word. Without the highlight API it uses a separate tip and status; the new translations preserve that distinction. With a simulated highlight registry, one matching range is registered before the highlighted message is asserted. Tests: [unavailable API:31](../../.codex-artifacts/reader-word-help-track17/tests/reader_word_help_list_locales.test.js:31) and [available API:41](../../.codex-artifacts/reader-word-help-track17/tests/reader_word_help_list_locales.test.js:41). No production capability or message-selection logic changed.
4. **Existing safeguard / nonfinding:** list and occurrence accessible names preserve the selected word; opening prepared help avoids a dictionary lookup and Escape returns focus to its list action. Listen/stop callbacks retain the passage language, including Arabic passage audio under English controls: [audio:58](../../.codex-artifacts/reader-word-help-track17/tests/reader_word_help_list_locales.test.js:58), [mixed language:70](../../.codex-artifacts/reader-word-help-track17/tests/reader_word_help_list_locales.test.js:70). Missing, echoed and throwing child translators produce readable English list labels and status while preserving Arabic passage metadata: [fallback cases:79](../../.codex-artifacts/reader-word-help-track17/tests/reader_word_help_list_locales.test.js:79).
5. **P3, unverified risks:** native-speaker review, actual assistive-technology pronunciation/announcements, native browser zoom, wide-screen visual review, packaged/live app behavior and deployed bytes remain unverified. The highlight registry is simulated in unit tests. The browser checks use rendered JSX markup with actual Tailwind classes compiled in memory, not a running application. Chinese/Thai word occurrence and arrow movement are covered; segmentation fallback variants and the wider bilingual transaction suite were not rerun. This is not a full-reader or Lumen translation claim.

**Named fixtures and focused acceptance.**

| Fixture | Language contract covered |
| --- | --- |
| reader_en_navigation_help_v1 | English reference; labels, placeholders, focus, capability and audio states |
| reader_es419_navigation_help_v1 | Latin American Spanish, long action labels |
| reader_esES_navigation_help_v1 | Castilian Spanish, long action labels |
| reader_ar_navigation_help_v1 | Arabic passage metadata, RTL movement and help |
| reader_zh_navigation_help_v1 | Unspaced Chinese selection, movement and help |
| reader_th_navigation_help_v1 | Unspaced Thai selection, movement and help |
| reader_ar_en_ui_audio_v1 | English controls with Arabic passage speech metadata |

The first six are defined in tests/fixtures/reader_navigation_locales.json; the last is a named mixed-language case in the list fixture. The cumulative suites also retain navigation/card/summary coverage from the previous candidate. Literal mixed-script words containing dollar and ampersand characters remain intact in word placeholders; zero-count interpolation is covered. The source-copy guard rejects stale English, raw keys and renamed placeholders.

**Actual validation.**

- Final unit/catalog run: **87 passed, 0 failed** across three files; word-help-unit-results.json.
- Final source-layout candidate: **12 passed, 0 failed**, six languages at 320px and 16/32px root text; word-help-browser-reflow-results.json. Full-document width and help-action bounds are asserted, alongside navigation/card bounds. This uses actual candidate source classes, with no temporary CSS override.
- Baseline browser run: 12 scoped navigation/card cases passed while diagnostics recorded six whole-document overflows. Those scoped passes did not certify list reflow.
- Intermediate two-class source attempt: 10 passed, 2 failed. Both Spanish failures are retained as evidence; the final button width caps resolve them.
- Strict read-only git apply --check --whitespace=error-all passed for both final patches against the final shared working files. In-memory application confirms unrelated catalog values survive.

The same twelve browser scenarios were rerun for baseline, intermediate and final states; do not add these into a claim of 36 independent acceptance scenarios. Disposable Chromium blocked network requests and used no app server/profile. Root font scaling is not native browser-menu zoom. Enlarged Spanish and Arabic full-page final captures were visually inspected; controls wrap inside the page. No live audio, AI or storage operation was exercised.

Reproduce from the integrated checkout, after owner review and scoped patch application:

    node dev-tools/i18n/apply_reader_contract_locales.cjs --check --batch=all
    node node_modules/vitest/vitest.mjs run tests/reader_navigation_locales.test.js tests/reader_navigation_locale_catalogs.test.js tests/reader_word_help_list_locales.test.js --maxWorkers=1 --hookTimeout=60000 --testTimeout=30000

For browser acceptance, set ALLO_READER_NAVIGATION_LAYOUT=1 and ALLO_READER_NAVIGATION_REFLOW_ACCEPTANCE=1, then run tests/reader_navigation_locale_layout.test.js with the same runner options. Leave ALLO_NAVIGATION_REFLOW_PROPOSAL unset; that older optional CSS experiment is not needed. Require all twelve documents to remain 320px wide with zero help-action overflow. Meaningful controls and status messages must have no raw keys or unresolved word/count placeholders, preserve learner words and actual passage metadata, and restore focus on Escape.

**Integration handoff.** navigation.patch contains 20 files: the two English catalogs, ten locale packs, scoped updater, payload, named fixtures/helper and four test files. layout.patch contains only the four reader utility-class changes, isolated from translation ownership. Apply the cumulative patches in place of the previous report's versions; do not copy whole snapshot sources over concurrent owner work. Track 01 must review and integrate the reader change, generate affected artifacts through its normal path, synchronize mirrors/pins and rerun acceptance against assembled artifacts. Translation edits stay with one owner after source copy stabilizes; recheck the frozen-copy guard if wording changes. No all-language rebuild is proposed for this increment. This informs 06/07/10/11/16 and accessibility track 18.

A coordination note received during validation proposed input.error_no_source_content and input.source_partial_generation for an actively changing generation contract. They were not added to this frozen simplified-namespace batch. The content-engine owner retains its readable fallbacks; those two translations remain a separate handoff after that contract settles. No response was sent to another session.

2026-09-27 integration update: layout.patch in this report no longer applies to the shared reader, whose list row has since changed. Treat this report's layout evidence as historical and do not apply that patch without reader-owner reconciliation. See ../reader-literal-placeholders-2026-09-27/stacking-check.json. The navigation catalog candidate remains separate from this stale layout proposal.
