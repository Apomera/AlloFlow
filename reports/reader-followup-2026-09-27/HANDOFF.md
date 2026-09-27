# Reader retention, deferred copy and draft-save follow-up

This continuation completed the bounded local memory and reader-copy work, then integrated the received track04 partial-save fix as a separate checkpoint. No commit, push, deployment, production account operation or messages to other sessions were performed. Existing SEL report images, parent-owned test files and other tracks' source changes were preserved.

The initial HEAD was `452e7cd230b62f4e192f055826817653d5b997f4`. During final verification the parent committed only its nine reserved test/helper files and regression reports, moving HEAD to **`3620ec1fee7589d4b81e0223a7fa572460a03e88`**. The final guard detected the move; its full file list was inspected before accepting this baseline. No runtime/catalog files were changed by that commit. These commits do not identify the new uncommitted working-tree runtime bytes. The existing release receipt names source `37bdb2883`, generated release `0cc63c58e949fe6ed4f6c245db0746354653872f`, Pages deployment `d5b95c96-e203-417c-8bae-5f17731a27cc`, and 52 selected exact-byte checks. Those earlier reported live checks were not repeated in this continuation and do not certify these changes. Global CI was not green in that receipt.

## Findings and smallest changes

| Priority / classification | Evidence | Result |
| --- | --- | --- |
| P2, reproduced retention growth and source gap | `reader_place_store.js:6` exact-text Map; `:120` pristine-entry pruning; `memory-before.json`, `memory-after.json` | The old page cache retained 201 empty reading entries and 3,821,220 key characters after 200 distinct resources. Retain the 20 most recently accessed pristine, never-saved readings. Entries with authored work, saved baselines, positions, pending saves, removal markers, storage problems or recovery evidence remain protected. No total memory or byte cap is claimed. |
| P2, source/catalog gap | `translations/reader-followup-locales.json:1`; `dev-tools/i18n/apply_reader_contract_locales.cjs:6`; `LOCALE_HANDOFF.md` | Added 70 messages in five packs and exact public mirrors. Registered 36 verbatim English fallbacks. The existing 117-key batches remain unchanged; the full guard now covers 187. Final preview-refresh semantics and explicit recovery-save instructions are retained. Native-speaker review is still needed. |
| P1, partial-save source gap, owner fault reproduction | `view_simplified_source.jsx:1673`; `tests/reading_support_draft_transitions.test.js:176`; integration record under `../adapted-reader-integration-01-2026-09-26-1730/deltas/followup-04-partial-save/` | A matching annotation anchor did not prove all submitted fields were saved. Compare the submitted draft with the confirmed wording, importance, pin and image. Keep unconfirmed values dirty, retain their unload protection and block deferred navigation until confirmation. Owner pre-fix fault-injection evidence was read; the combined shared build was independently validated after integration. |
| P2, reproduced fixture race | `place-browser.cjs:147`; `browser-results-before-fixture-fix.json` | A snapshot taken before opening recovery controls could race an ordinary position save. Capture durable bytes in the same browser task as Restore. Exact byte equality is still required after restore and typing until Save restored work. No application behavior was weakened for this fixture correction. |
| Resolved concurrent integration mismatch; deployed state still unverified | Initial full mirror scan returned 8,224 matches of 8,227 files, three mismatches and four exclusions | The mismatches were own_sources_module, Cephalopod and Raptor source/public pairs. Their owners synchronized them; 01 did not overwrite their files. The final full scan passed **8,227/8,227 pairs, zero drift, four documented exclusions** (`mirror-final.txt`). This is local byte parity, not deployment or a global-CI claim. |

The measured unique-navigation heap increase from cycle 10 to 200 dropped from **7,710,460 bytes (7.35 MiB) to 825,992 bytes (0.79 MiB)**, an observed reduction of about 89%. The cache remained at 20 entries from cycle 20 through 200; DOM nodes/listeners remained 20,917/3,598. Residual heap growth remains, and authored-session growth is intentionally protected. This is a synthetic local fixture, not deployed memory profiling or proof that every retaining path is bounded. The measurement preceded the separate partial-save editor change; the retention helper itself is identical in the final build.

Existing safeguards/nonfindings: no bulk eviction of authored work; no persistence migration; no auto-save of restored drafts; no changes to original text or human recordings; preview persistence isolation and protected draft transitions retained. The navigation-position cache was already bounded to 60 entries, so it was not changed. The translation updater still rejects changed English, placeholder loss and conflicting existing translations.

## Source-to-output map and ownership

| Canonical input | Output / reference | Owner boundary |
| --- | --- | --- |
| `reader_place_store.js`, `reader_support_drafts.js`, `view_simplified_source.jsx` | `_build_view_simplified_module.js` → `view_simplified_module.js` and `desktop/web-app/public/view_simplified_module.js` | 01 is the single combined-reader/build writer; 04 supplied only its two-file delta. Draft helper unchanged. |
| Reader output SHA-256 | Literal `view_simplified_module.js?v=…` in `AlloFlowANTI.txt`, `desktop/web-app/src/AlloFlowANTI.txt`, `desktop/web-app/src/App.jsx` | 01 updated only the reader URL. Concurrent research pin changes were detected and preserved; final three host hashes match. |
| Frozen English + `translations/reader-followup-locales.json` | Scoped updater → five `lang/*.js` packs and five public mirrors | 01 completed and froze this delta. Track17 should own subsequent locale reconciliation; see exact hashes and key scope in `LOCALE_HANDOFF.md`. No catalog writes by 01 after that freeze. |
| `ui_strings.js` | `desktop/web-app/public/ui_strings.js` | Exact English mirror; only 36 missing fallback entries registered. |
| Host and public assets | Future app-shell/desktop build and release manifest | Existing generated app shell is from the prior release. No full app/desktop build or release performed here. |

Final source/module hashes and the reader pin are in `completion.json`. The first reader checkpoint used pin `9fa57df1`; the separately integrated partial-save checkpoint uses **`bb06f8dd`**. The source-only track04 patch SHA-256 was verified as `2283c0c7d4a9474cf8bf70fd57de205b5db232049e5915d9bd3091bf8ee76ad2`; both its recorded source bases matched before applying. Its older cumulative patch was not used.

## Validation and acceptance

- 51 persistence/lifetime/retention tests passed: pristine LRU, revisiting evicted readings without writes, saved answers/bookmarks, anonymous work and positions, queued saves, failed work and recovery copies.
- 67 existing localized recovery cases and eight real Chromium narrow-layout cases passed in `focused-tests.json`. That initial run also had one test-selection mistake: the English control fixture was incorrectly included in a non-English assertion. The corrected five-locale suite passed all 16 cases (`locale-final-tests.json`).
- 120 generated-reader checks passed across four files (`generated-reader-final-tests.json`) before the separate partial-save integration. Initial default setup/test deadlines were exceeded; the rerun used explicit 60-second hook/test limits without changing production code or expectations.
- Final combined partial-save, retention and locale run: **80 passed, zero failed**, three files (`partial-save-final-tests.json`), including 58 draft-transition tests. Counts overlap the earlier groups and must not be added into a unique total.
- Nine real Chromium recovery cases passed (`browser-results.json`): cross-tab merge/conflict, stale review, native reload decisions, queued Web Locks, denied/corrupt storage, quota, legacy writer detection, anonymous recovery, explicit restore-save and durable reload.
- Three instrumented lifecycle cases passed (`memory-after.json`): 200 unique-resource freshness checks, 50 overlay cycles and native local audio. All had zero tracked timers, frames, playing audio and highlight ranges after cleanup; no measured steady-state storage writes.
- Frozen catalog guard passes 187 keys × five locales with zero pending writes. Reader output/public pair, English/public pair, locale pairs and all three reader URL pins are checked independently; the final repository-wide mirror gate also passes 8,227 pairs with four documented exclusions.

The final combined native-browser partial-save fixture passed **14 checks with zero page errors**, stored separately as `partial-save-browser-results.json`. It includes cancellation during pending save, focus return, native reload protection, unconfirmed wording and confirmation before leaving. Earlier owner-isolated browser results are not counted as this checkout's acceptance. Tests use disposable storage and fixture providers. Actual assistive technology, native browser-menu zoom, hardware/mobile codecs, live providers, real Canvas account behavior and cold-start offline delivery remain outside this continuation.

## Integration queue and release recheck

1. Preserve the completed 01 memory and 04 partial-save source deltas. Use `completion.json` and the exact integration record, not a stale whole-reader candidate. Parent-owned test files from the coordination notice were not edited.
2. Give subsequent shared-catalog writing to Track17. Reconcile the frozen 70-key delta first. The new partial-save fallback `simplified.gloss_save_changes_unconfirmed` needs catalog/locale ownership after this freeze; its readable English fallback is already in the reader. Other research/Storybook/simulator translations are not represented as completed here.
3. Let active domain owners finish their source/public pairs, then rerun the full mirror gate and focused affected checks. The clean scoped pairs do not override a failing global check or CI.
4. Under separate release authorization, build the actual app/desktop artifacts, record source commit plus working-tree hashes, job/deployment ID, origin and UTC time, and produce a release manifest. Fetch the exact emitted shell/module/catalog URLs and compare response SHA-256 values with that manifest. Verify language-cache behavior and rerun the affected reading/recovery/draft journeys against those served bytes. HEAD or a changed query pin alone does not prove deployed content.

Read-only application checks (no builds or test state):

```powershell
git --no-optional-locks rev-parse HEAD
git --no-optional-locks status --short
node dev-tools/i18n/apply_reader_contract_locales.cjs --check --batch=all
node dev-tools/check_deploy_mirror.cjs
```

Evidence/fixture commands and side effects:

```powershell
# Reads application state, writes only reports/reader-followup-2026-09-27/completion.json.
node reports/reader-followup-2026-09-27/final-check.cjs --baseline-ready 3620ec1fee7589d4b81e0223a7fa572460a03e88

# Writes test report/caches and disposable test state; installed dependencies only.
$env:ALLO_VIEW_CANDIDATE='view_simplified_module.js'
node node_modules/vitest/vitest.mjs run tests/reading_support_draft_transitions.test.js tests/reader_place_retention.test.js tests/reader_followup_locales.test.js --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000

# In-memory bundling, ephemeral loopback fixture server, disposable browser/storage, JSON report.
node dev-tools/reader-performance/run.cjs --case unique-navigation,overlay-cycles,live-audio --instrument --retention --baseline-ready 3620ec1fee7589d4b81e0223a7fa572460a03e88 --output reports/reader-followup-2026-09-27/memory-recheck.json
```

`node _build_view_simplified_module.js` writes the reader module pair and requires refreshing the reader host pin afterward. The broader adapted-reader builder also writes pure helpers, engine, styles and additional pins; it was not needed here. No install, main app build, server left running, deployment or Git mutation was performed.
