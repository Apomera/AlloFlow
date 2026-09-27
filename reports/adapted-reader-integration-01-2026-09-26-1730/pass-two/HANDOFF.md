The second local integration pass is complete. Its focused acceptance gate passes against the combined production artifacts. This supersedes the first checkpoint's outstanding lookup failures, stale content pins and reported adaptation overflow. Deployment identity and full application release acceptance remain separate: no deployment, push, commit, broad application build or live learner-data operation was performed.

Local HEAD remained `a9c8fb36285c661a9b85a1cf376f99f05f382de5`. The original investigation reference was `d2351f4524abd1e7d6915c25b2b1a49d630bb18f`; the first integration used `fd4044c862ed9b345b340d69cb1411a19c09dafb` and then `6b63e76e862125e87422f02a54ed60beac68e8fb`. None proves deployed content. Applicable AGENTS.md inspection found no additional nonempty instructions.

The initial pass-two capture preserved 5,758 source, build and test inputs (193,526,393 bytes) and every selected handoff patch. `baseline-manifest.json` and `handoffs.json` identify their hashes. Final source/module/test fingerprints are in `final-validation-before.json` and `final-validation-after.json`. At 2026-09-26 23:59:05 UTC, no captured input had changed during the final validation. `completion-summary.json` records zero pin failures, matching hosts/source copies, and zero mirror drift. The dirty-tree inventory is retained in `git-status-final.txt`; other owners' changes were preserved.

| Final artifact | SHA-256 |
| --- | --- |
| Reader source | `817c30b553f3150b11c6f1ee41e655e5c20a43ddd3129942d2961acd6e5b09cd` |
| Reader module, root/public | `a1b6e04609179cd6352cb10ef01224a88adc162f885eceeedf2e2a5c801ec3e6` |
| Place helper | `f3f1b718ae496003fecf365f070e4ef98c4efcceb5e6b11761cea44e047a75ae` |
| Draft helper | `362075237ac900f150abed73f1e9eb578273a6ce4c5b2db2068341ef27a0c0e5` |
| Engine source | `b541b4d6e29c097f8955314acb87f82344e62f6ce2c4418879ddc4275d6edee8` |
| Engine module, root/public | `189593ed46af578e9a9a9ab830d5b39a351ae8e0d06b61b0cc669e2a316404a4` |
| Dictionary loader, root/public | `2f6cfa948fadef07d97c5705dc412e062bc070cf2a031bef9067169bf82bfd91` |
| All three host files | `b9c9c38e7a9d8f191a84b066367fbed4a96fa81fab09c596456e6e446f25475b` |

The source-to-output map remains:

| Canonical source | Output / synchronization | Owner |
| --- | --- | --- |
| `reader_place_store.js` + `reader_support_drafts.js` + reader JSX | [Reader builder](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/_build_view_simplified_module.js:13) embeds both helpers; writes root/public reader modules. Both helper hashes are included in performance evidence. | 01 is the sole shared reader writer. |
| Engine JSX | Scoped engine builder produces root/public module; desktop engine source copy synchronized separately. | 01 serializes lookup/bilingual/research integration. |
| Audio service/artifact, generation/text-pipeline, immersive reader, Export and Storybook dialog sources | Nine affected module pairs were regenerated with named builders; `build-results.json` records results. Installed dependencies only, with npm offline mode. | Domain contracts retained; 01 assembles builds. |
| Dictionary loader and karaoke store | Exact root/public copies. The store is intentionally hand-authored despite its module filename. | 11 and 02/15 contracts, integrated by 01. |
| English strings and locale packs | Root/public JSON bytes synchronized; 51 vocabulary values added in Arabic, Chinese and Thai, preserving Spanish and delivery namespaces. | 17 stable terms-only handoff; 01 applied it once. |
| Canonical host | Exact desktop source mirrors; 15 changed content-pin targets, including the five previously stale research/delivery targets, now match module bytes. `final-pin-plan.json` records both Quick Start references. | 01 is the sole host/build integrator. |

Broad `build.js --dry-run` remains unsuitable as a read-only command: [module writes](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/build.js:2193) precede the dry-run branch. No broad build ran here. The compiled application/student shell is not an output of this pass. Dictionary, AI bridge and catalogs retain their existing dynamic release-version/cache schemes; the global `55e824a46` stamp is not evidence of this local integration. The release pipeline must refresh its identity and validate the actual fetched assets, including language-pack caching.

The completed integration ledger is:

| Owner | Bounded handoff disposition |
| --- | --- |
| 02 | Clip-profile verification, per-sentence preparation failures, recovery list/focus, store/service and tests integrated. Unverified clips remain a subset of stale clips. |
| 03 | Helper + reader + English recovery-copy controls integrated atomically. Restored drafts require explicit Save restored work; copy removal retains authored work. |
| 04 | Enhancement-only draft/picker/save-transition delta integrated, preserving both helper dependencies and current reader behavior. |
| 06 | Direct Display → Listen along delta and interaction tests integrated. Existing overlay and language/occurrence resolver reused. |
| 07 | Grapheme-boundary vocabulary validation, bounded segmentation work and stale-translation cancellation integrated with actual generation/pipeline outputs. |
| 09 | Current-appearance preview snapshot, explicit refresh, truthful hint, English keys and runtime cases integrated. Existing input/Help/engagement isolation preserved. |
| 10 | Current-support card ownership, valid popup ARIA and spotlight cleanup integrated; final regression tests merged. |
| 11 | Canonical resilience dictionary/engine/reader patches integrated. Production-artifact tests now cover provider cancellation/deadlines, detailed dictionary outcomes and picture retry. |
| 13 | Already-landed consistency modules preserved; SharedActivity and ShareSessionSurfaces pins refreshed. |
| 15 | Exact source increment from `5c31474049cb…` to `8b26a875a948…` integrated. Host summary recovery, verified epilogue checkpoint, export fallback/duplicate guards and actual offline browser route retained. Candidate-generated pin hunks were excluded; pins were derived from combined outputs. |
| 17 | Final 10-file terms-only patch applied once. The copy-dependent supplement was not applied on top of it. Combined 117-key catalog guard passes. |
| 18 | Scoped save retry/cancellation, truthful unconfirmed/failed status, live region and focus recovery integrated. Existing stable busy controls retained. |
| 19 | Overlay preference write guard and unique-navigation fixture integrated. Performance runner retains both reader helpers. |
| Research | Completed own-sources/Lumen/Quick Start/misc-panel changes preserved; relevant pins refreshed. Strict storage reads and Lumen load-state guard remain intact. |
| Simulators | Completed Cephalopod/Raptor/Evolution/Kitchen sources and mirrors preserved; no remaining active-writer warning. No simulator implementation by 01. |

Two source conflicts were reconciled semantically: prepared-help card ownership shares its JSX boundary with the audio failure list; narration status/focus shares its boundary with the preview opener. Both behaviors were retained. Exact before-images and resolved patches are under the parent report's `deltas/pass2-*` and `merge-pass2-*` directories. No older whole reader, host or generated candidate replaced the current source.

Ranked findings and resolutions:

| Priority / classification | Exact evidence | Disposition |
| --- | --- | --- |
| P1, source gap and reproduced test failure | [Lookup controller/deadline](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/content_engine_source.jsx:3022); [detailed dictionary API](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dictionary_loader.js:158); [independent popup messages](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_simplified_source.jsx:3549) | Resolved. The final production run passes all 24 dictionary, 66 engine recovery and 42 popup adapter cases. Existing request identity guards remain; transport abort is best effort and local deadlines settle providers that ignore abort. No live-provider proof is claimed. |
| P1, source/output integration gap | `final-pin-plan.json` and `completion-summary.json` | Resolved for all 15 affected literal content-pin targets, root/public outputs, engine source copy and three hosts. This is local parity, not deployed-byte proof. |
| P2, reproduced combined-reader layout failure | [Adaptation controls](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_simplified_source.jsx:4844); `layout-before.json` and `layout-before-measurements.json` | Four failures reproduced at 320 CSS px/32px root text. Reduced compounded padding, removed fieldset minimum-width pressure and allowed labels to wrap. Final eight Chromium layout cases pass; checks now include fieldsets, legends and buttons. Instructional copy was retained. This is doubled root text, not native browser zoom. |
| P2, obsolete fixture assumptions | [Narration visibility](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_simplified_source.jsx:2175); `persistence-visible-controls.patch` and `persistence-shell-fixture.patch` | The old tests looked for removed Edit audio labels while hiding narration in Zen mode. They now mount normal teacher controls and assert visible playback-ready counts. All three actual capture/serialization/replay cases pass. |
| P2, overly strict fixture comparison | `place-browser/check.cjs`, final restoration/reload case | Page-exit position saving legitimately updates resume metadata after explicit save. The fixture still asserts no durable change before explicit confirmation, then verifies identical keys, exact text identity, answers and bookmark after reload and mounts a fresh reader to verify the restored answer. All nine browser recovery cases pass. |
| P2, observed performance limit; cause unverified | `performance-final-instrumented.json`, unique-navigation retained snapshots | Nodes/listeners stayed constant from cycle 10 through 200, but retained JS heap rose from 43,578,764 to 51,225,620 bytes (about 7.29 MiB). No flat-heap or lifetime memory bound is claimed. Further retention profiling is deferred; the measurement does not establish a leak or cause. |

Safeguards/nonfindings preserved: protected Original text and human recordings; exact-candidate Apply acknowledgement and Undo; unsaved draft/picker protection; learner/version-scoped recovery; no preview persistence, audio or host-input ownership; separate playback readiness and verified device receipts; old dictionary API compatibility; research strict local reads; and receiver-facing media inclusion versus availability distinctions. These are implemented behavior, not missing features inferred from old plans.

Actual validation on the final combined files:

| Gate | Result | Evidence |
| --- | --- | --- |
| Clean combined unit run | **900 passed, 0 failed, 40 files** | `final-unit-tests.json`; all lookup candidate variables explicitly target canonical production modules/source. |
| Recovery-copy helper/UI run | **71 passed, 0 failed, four files** | `place-recovery-tests.json`; helper/module overrides target the shared production files. This run preceded only the final padding adjustment. |
| Final reflow + Display/layout suites | **36 passed, 0 failed, three files** | `reflow-final-tests.json`; includes eight real Chromium locale cases. Some unit coverage overlaps the 900-case run; do not sum counts. |
| Narration recovery browser | 12 cases passed | `narration-browser/narration-recovery-browser.json`; storage callbacks mocked, native focus/keyboard used. |
| Native audio browser | 10 cases passed | `audio-browser-final.json`; real decoding, recordings, stale/unknown profiles, partial preparation/retry and focus. |
| Preview refresh browser | Desktop and phone passed | `preview-browser/browser-results.json`; zero preview persistent writes/media/host-input effects; only intercepted fixture navigation. |
| Recovery places browser | Nine cases passed | `place-browser/browser-results.json`; real disposable storage, cross-tab conflicts, quota, reload, copy restore/remove. |
| Prepared help browser | Six interaction groups + seven preview dependency checks passed | `prepared-help-browser/` and `final-browser-run-record.json`. |
| Offline Storybook | Actual export/reload/offline recipient route passed | `storybook-browser-final.json`; saved epilogue reused, missing clip only regenerated, later author export succeeds with providers unavailable, recipient audio/picture decode and playback succeed without HTTP. |
| Vocabulary/Apply browser | 12 cases passed | `vocabulary-browser-final.json`; real assembled modules under StrictMode. |
| Reader routes browser | 34 cases passed | `routes-browser-final.json`; older static baseline label in the fixture is not the artifact identity—use the surrounding final manifests. |
| Instrumented lifecycle | Three cases passed on final source hash | `performance-final-instrumented.json`: 200 distinct-resource freshness checks, 50 overlay cycles, native audio; zero measured steady-state storage writes, zero timers/frames/playing audio/highlight ranges after cleanup. Retention caveat above applies. |
| Byte mirror checker | 8,227 matched, zero drift, four documented exclusions | Checker exit 0. Separate content-pin verification also passes. |
| Locale contract guard | 117 keys, five locales, zero pending writes | `apply_reader_contract_locales.cjs --check --batch=all`, exit 0. |

Earlier failed/mixed runs are retained as diagnostic evidence. `assembled-unit-tests.json` initially had 898 passes and the two obsolete persistence fixtures; `layout-before.json` has the four reproduced overflow failures. They are superseded by the clean final runs, not deleted or counted as passes.

Deferred scope is explicit: the preview/audio localization supplement requires a new preview-only delta after reconciling changed English copy; pending 02/03/09/11/18 labels and five research fallbacks remain for catalog work. Final catalog presence is 231 simplified leaves per selected pack versus 555 in the combined English catalog; all 173 share_collect entries per pack remain. This is not a fully translated reader. Simulator localization stays outside reader track 17. Full-host operation, actual assistive technology, native browser-menu zoom, hardware/mobile codec breadth, live providers, app-shell cold-start offline and every delivery/export route remain unverified. The synthetic lifecycle measurement does not supply timing budgets or a lifetime memory guarantee.

The ordered remaining release handoff is:

1. Review the local combined diff and frozen manifest; retain the single reader/host/build ownership boundary. All delivered functional increments in this queue are now reconciled. Translation/retention followups above are explicitly deferred rather than silently represented as complete.
2. Under separate release authorization, produce the actual application/student-shell release artifacts and release manifest, including dynamic loader/catalog versions. Record the release commit, job/deployment ID, flags, origin and UTC time. A commit alone cannot identify dirty working bytes.
3. Compare the uploaded shell and its actual JS/CSS/module requests against that manifest. Fetch the exact emitted loader URLs, including dictionary/catalog/cache behavior, and compare response SHA-256 values. Re-run affected reproductions against those actual bytes.
4. Run the relevant real application routes and manual accessibility checks on disposable data. Only then assess release acceptance; no deployment or deployed certification occurred here.

Read-only local validation commands, from the workspace:

```powershell
git --no-optional-locks rev-parse HEAD
git --no-optional-locks status --short
node dev-tools/check_deploy_mirror.cjs
node dev-tools/i18n/apply_reader_contract_locales.cjs --check --batch=all
node reports/adapted-reader-integration-01-2026-09-26-1730/artifact-snapshot.cjs --check
```

For a focused combined rerun (writes test reports/caches and disposable test state):

```powershell
$env:ALLO_ENGINE_CANDIDATE='content_engine_module.js'
$env:ALLO_VIEW_CANDIDATE='view_simplified_module.js'
$env:ADAPTED_HELP_VIEW='view_simplified_module.js'
$env:ALLO_LOOKUP_HOST_CANDIDATE='host_handlers_source.jsx'
$env:ALLO_DICT_CANDIDATE='dictionary_loader.js'
$taskCases=Get-Content reports/adapted-reader-integration-01-2026-09-26-1730/pass-two/unit-selection.json | ConvertFrom-Json
node node_modules/vitest/vitest.mjs run @taskCases --maxWorkers=1 --hookTimeout=60000 --testTimeout=30000
```

For post-deployment byte verification, use the actual HTTPS asset origin and a frozen release manifest containing every requested artifact:

```powershell
node reports/adapted-reader-integration-01-2026-09-26-1730/verify-deployed-bytes.cjs 'https://ACTUAL-ASSET-ORIGIN/' 'FROZEN-RELEASE-MANIFEST.json' view_simplified_module.js content_engine_module.js dictionary_loader.js karaoke_audio_store_module.js
```

The verifier performs GET requests only, prints response identity/hash evidence, and writes no files or app state. It was syntax-checked, not run against production. It checks expected hash-query variants; separately verify the exact URLs emitted by the deployed shell and its compiled assets. Scoped builders write generated files/mirrors; pin integration writes the three hosts; tests/browser fixtures write reports/caches and disposable storage. Temporary loopback fixture servers close after their checks. No live app profile was operated.
