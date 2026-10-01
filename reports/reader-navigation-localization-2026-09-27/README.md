Track 17 — Navigation and prepared-help localization, 2026-09-27 UTC

Prepared an isolated **29-key / 145-value** translation increment for Spanish (Latin America and Castilian), Arabic, Simplified Chinese and Thai. It covers reading navigation, keyboard guidance, prepared-help cards and support summaries. One existing reader fallback was missing from the English catalog; the patch registers its exact source wording in both English copies. No reader behavior was changed by the translation patch.

The candidate is navigation.patch (19 files). A separate layout-proposal.patch contains two class changes for reader-owner review. Neither patch was applied to shared source/catalog files. The layout proposal was tested through equivalent temporary CSS in disposable Chromium; that is not an integrated reader repair.

**Baseline and ownership.** The initial local HEAD was 452e7cd230b62f4e192f055826817653d5b997f4; the final checked HEAD was 16e3ea214bea20953b79b0e86e41f6d0beef9deb. The checkout contains uncommitted owner work, so neither commit alone identifies the tested snapshot or deployed release. source-inputs.json records exact captured/tested/shared hashes. Shared reader/helper sources were captured from current working files. The deployment record was read as context; this turn did not verify deployed bytes.

No applicable AGENTS.md was found in the repository or its ancestors. AGENT_HANDOFF.md and the integration ledger were inspected. Track 01 retains shared reader/host/build ownership. Its completed 70-key followup translation delta was already present in all five root/public packs and is preserved exactly. Track 17 owns this unique navigation payload, isolated catalog delta and fixtures. Changes made in the shared checkout by this turn are limited to this report directory. No Git changes, server, build, install, deployment, live application profile or cross-chat messages were performed.

**Coverage delta.** Counts are nonempty string leaves in the simplified namespace, not a native-language quality certification. The English namespace has 592 leaves after registering the previously uncatalogued fallback (591 before).

| Locale | Existing entries | Added by this patch | Candidate entries | Absent after patch |
| --- | ---: | ---: | ---: | ---: |
| Spanish, Latin America | 301 | 29 | 330 | 262 |
| Spanish, Castilian | 301 | 29 | 330 | 262 |
| Arabic | 301 | 29 | 330 | 262 |
| Chinese, Simplified | 301 | 29 | 330 | 262 |
| Thai | 301 | 29 | 330 | 262 |

Public locale mirrors receive the same additions. Existing Read labels are retained. All 70 followup values and all 173 share_collect entries per locale remain unchanged. The candidate's full scoped catalog guard covers 216 keys across five packs with zero pending writes. Missing labels elsewhere continue to fall back to English; this is not a fully translated reader or Lumen release. The new translations are AI-authored and await native-speaker review.

**Ranked findings, with evidence.**

1. **P2 — source coverage gap addressed:** navigation and prepared-help actions remained English across the five selected locales. The 29-key payload covers skip controls, Your reading, Word meaning, Word sounds, Practice, Display, arrow guidance, immersive-region guidance, teacher-help card actions, shown/hidden/stale/count summaries, locate-word messages and prepared-help mode hints. Exact keys and frozen English copy: [payload](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-navigation-track17/translations/reader-navigation-locales.json:6). Locale rows begin at [Spanish](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-navigation-track17/translations/reader-navigation-locales.json:38), [Arabic](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-navigation-track17/translations/reader-navigation-locales.json:100), [Chinese](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-navigation-track17/translations/reader-navigation-locales.json:131) and [Thai](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-navigation-track17/translations/reader-navigation-locales.json:162).
2. **P2 — source/catalog mismatch addressed:** simplified.define_hint_prepared_no_marks was used by the reader but absent from the English catalog. Its existing fallback, “Prepared explanations are available in Word help after the passage.”, is registered without rewriting the copy. The catalog fixture checks the literal against current reader source and the public English mirror. Evidence: [source fallback](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-navigation-track17/view_simplified_source.jsx:3995) and [catalog fixture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-navigation-track17/tests/reader_navigation_locale_catalogs.test.js:16).
3. **P2 — reproduced whole-document reflow failure, proposal only:** at 320 CSS pixels with 32px root text, the prepared-help list's Show in text button extends beyond the viewport. Measured document widths were 490px for Spanish/Chinese/Thai and 486px for Arabic; normal 16px text measured 320px. The list row is a non-wrapping flex container with two non-shrinking action buttons. Evidence: [list row](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-navigation-track17/view_simplified_source.jsx:2026), navigation-layout/results.json and the before screenshots. This is distinct from the earlier adaptation-control overflow, which the integration record reports repaired. The newly translated navigation controls and floating card passed their scoped geometry checks, but those checks alone did not detect the wider document. Visual inspection caught the discrepancy, and whole-document measurements were added. This report does not certify full-reader reflow.
4. **P3 — unverified risk:** native-speaker review, actual screen-reader announcements, native browser-menu zoom, packaged/deployed behavior and broader untranslated copy remain unverified. Chinese/Thai occurrence selection and keyboard movement are covered; this increment did not rerun every segmentation fallback or bilingual transaction suite. Further Lumen/source-panel translations remain outside this bounded change.

**Minimal proposed layout repair.** layout-proposal.patch adds flex-wrap to the prepared-help list row and gives its explanation a full-width basis on narrow screens, returning to automatic basis at the existing sm breakpoint. It changes no event handlers, text, annotations, language metadata or persistence. Equivalent CSS was injected only after baseline measurements in eight disposable browser cases; the document width became 320px in every case. The Arabic enlarged-text screenshot was re-inspected after this proposal. The source patch is intentionally unapplied: Track 01 should review it, generate the affected reader/CSS artifacts through the normal path, and rerun the same acceptance cases against those assembled artifacts. Do not claim the proposed source classes were built or shipped by this track.

**Named fixtures and safeguards.**

| Fixture | Passage / checks |
| --- | --- |
| reader_en_navigation_help_v1 | English reference and literal learner-word placeholders |
| reader_es419_navigation_help_v1 | Spanish UI, long labels and garza help |
| reader_esES_navigation_help_v1 | Castilian UI pack with independently specified Spanish passage metadata |
| reader_ar_navigation_help_v1 | Arabic passage, RTL arrows/card and English-interface variant |
| reader_zh_navigation_help_v1 | Unspaced Chinese occurrence and movement |
| reader_th_navigation_help_v1 | Unspaced Thai occurrence and movement |

Fixture data: [named fixtures](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/.codex-artifacts/reader-navigation-track17/tests/fixtures/reader_navigation_locales.json:1). Tests render the current JSX with the current embedded store/draft helpers; shared generated reader files are not rewritten. They verify translated controls and hints, left/right word movement following passage direction, preserved quote/explanation language and direction, Escape focus restoration, shown/hidden/stale summaries, the immersive region's label, and readable English fallback for missing/echoed translators. The immersive label fixture supplies stub overlay components; it is not a full immersive-reader integration test. Opening teacher-prepared help does not invoke the mocked lookup or playback callbacks.

Catalog checks reject raw keys, missing/renamed placeholders and frozen-copy changes. Literal mixed-script learner text, including dollar/ampersand characters, remains unchanged inside the word placeholders. Zero-count interpolation is covered. In-memory application verifies that every catalog value outside the 29-key scope survives, including the entire completed followup and delivery namespaces. English catalog changes are limited to the single missing key. Both patch files pass git apply --check --whitespace=error-all against the final shared checkout without applying them.

**Actual validation.**

- 47 unit/catalog tests passed, zero failed or pending: navigation-unit-results.json.
- 8 scoped Chromium cases passed at 320 CSS pixels and 16/32px root text: navigation-browser-results.json. These assertions cover the named navigation controls and prepared-help card. Four full-document overflow observations remain in the baseline diagnostics.
- 8 overlapping browser cases passed with the temporary wrapping proposal; each document measured 320px: navigation-reflow-proposal-results.json. Do not sum these as sixteen independent production-layout cases.
- Scoped all-batch catalog guard: 216 keys, five locales, zero pending writes.
- Early fixture runs exposed incorrect test setup (stale help requires editing an existing term; immersive labels require the immersive data marker and supplied overlay dependencies). Those setup errors were corrected. No production reader code was changed to make the fixtures pass.

Chromium used real reader markup rendered in jsdom plus production utility CSS in standards-mode documents; network requests were blocked. This was not a full running app. Root font scaling is not native browser zoom. Before/full-page/card/proposal captures are retained in navigation-layout; enlarged Arabic and Spanish examples were visually inspected.

**Reproduction and acceptance.** From an integrated checkout, run:

    node dev-tools/i18n/apply_reader_contract_locales.cjs --check --batch=navigation
    node node_modules/vitest/vitest.mjs run tests/reader_navigation_locales.test.js tests/reader_navigation_locale_catalogs.test.js --maxWorkers=1 --hookTimeout=60000 --testTimeout=30000

Set ALLO_READER_NAVIGATION_LAYOUT=1, then run tests/reader_navigation_locale_layout.test.js with the same runner. Its geometry diagnostics must be inspected as well as the scoped assertions. Set ALLO_NAVIGATION_REFLOW_PROPOSAL=1 only to reproduce the temporary CSS experiment. For acceptance of an actual integrated source repair, leave that proposal variable unset and require document width 320px in all eight recorded cases.

Acceptance requires: no raw keys or unresolved word/count placeholders in the owned labels; intact learner text; correct passage lang/dir independent of interface language; working RTL arrows and Escape focus return; translated stale/hidden/shown help states; and no whole-document overflow after the reader-owner repair. Translation-only acceptance does not close the separately recorded layout defect.

**Integration handoff.** navigation.patch is incremental over the completed 70-key shared followup batch. Its 19 files are the two English catalogs, ten locale packs, scoped updater, new payload, named fixtures, locale helper, two focused unit/catalog files and the opt-in browser file. Do not copy entire snapshot files over the shared checkout. Preserve the active owner deltas and rerun exact-copy checks if any relevant English sentence changes. layout-proposal.patch is a separate one-file suggestion; it can be reviewed independently and has not been applied to the snapshot's source. Shared reader/host/build/pin ownership stays with Track 01. Translation ownership remains one owner after English copy stabilizes; this handoff informs 06/07/10/11/16 and 18's accessibility work. Final artifact synchronization and deployed verification are separate steps, with no deployment requested here.

Follow-up: the cumulative 36-key candidate and four-class layout repair in ../reader-word-help-localization-2026-09-27/README.md supersede this report's 29-key navigation.patch and two-class layout-proposal.patch. Do not stack the old and new patches. This report and its evidence remain the historical checkpoint.
