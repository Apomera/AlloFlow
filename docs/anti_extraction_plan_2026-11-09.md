# AlloFlowANTI.txt extraction plan (2026-11-09)

Status: plan only. Nothing has been moved. Start after the current uncommitted work is committed and deployed, so each move is measured from a clean baseline.

## What was measured

Measured by parsing the file (Babel), not by reading it. Scripts and raw results: `C:\tmp\anti_extract\` (`scan.cjs` … `scan7.cjs`, `handlers.json`, `effects.json`, `fileitems.json`, `sections.json`, `jsx_all.json`). Re-run them before starting: other sessions edit ANTI daily and line numbers drift.

- ANTI is 3.11 MB, 50,651 lines. One component, `AlloFlowContent`, is 2.40 MB (74%).
- Inside the component: effects 713 KB (437), handler closures 515 KB (701), render block 474 KB, state/refs/memos 305 KB (1,888), the `__alloHostDeps` bag 65 KB, shims for already-moved handlers 26 KB (267).
- Outside the component: 86 declarations of 1.5 KB or more, 463 KB in total.
- 648 of 9,184 test files read ANTI directly.

## Candidates, in the order to do them

| # | Job | Size | Risk | Target |
|---|---|---|---|---|
| 1 | Pure helpers that read no component state | ~110 KB | Low | existing helper modules or one new `host_pure_helpers` module |
| 2 | Read-aloud and karaoke audio store (22 functions, region near "Read-aloud audio: teacher-vettable per-sentence generation") | 44 KB | Low–medium | `host_handlers_source.jsx` or a new `read_aloud_store` module |
| 3 | Generation and chat runners: `_sendUdlToChat`, `_alloRunGenerate`, `handleSubmitOrganizerReflection`, `handleExecuteBlueprint`, `handleReadOriginal`, reading-supports handlers (20 functions) | 51 KB | Medium | `host_handlers_source.jsx` |
| 4 | Project save/load and export preview: `handleLoadProject`, `getExportPreviewHTML`, `_syncBuilderEditsToRemediation`, `handleOpenHistoryResource`, `recheckSourceAnalysis`, `executeSaveFile`, `_maybeSaveIncompleteProject` | 29 KB | Medium | `host_handlers_source.jsx` |
| 5 | Local-AI and media: `callImagen`, `applyAIConfig`, `playSequence`, `_sdTurboTryLocal` | 19 KB | Medium | `host_handlers_source.jsx` |
| 6 | Inline modals and notes in the render block: translate modal, save modal, adventure character review, STEM assessment panel, topic and word-list seed notes, gemini-bridge view, directions view | ~40 KB | Medium | new or existing `view_*` modules |
| 7 | Large effects (34 of 4 KB or more, 280 KB): live-session end check 41 KB, PDF watchdog family ~48 KB, Word Sounds probe bank ~79 KB | ~280 KB | High | needs a new pattern; do last, one at a time |

Job 1 members (all have zero component bindings): `chunkText`, `_compactFullPackRunForStorage`, `_compactBlueprintRunForStorage`, and file-scope `alloSanitizeRosterIdentityHistory`, `alloNormalizeRosterIdentity`, `_alloBuildDirectionsResultAdapter`, `_alloNormalizeDirectionsData`, `_alloEvaluateObjectives`, `getLiveOrganizerReadiness`, `resolveSavedFollowUpLivePlanTarget`, `ALLO_PDF_REMEDIATION_CACHE`, `ALLO_GENERATION_METRICS`, `ALLO_STORAGE_INVENTORY`, `_alloParsePreviewMarkdown`, `buildSchoolRewardsRecognitionWorksheet`.

Jobs 1–6 total about 290 KB of handlers and views plus 110 KB of helpers: roughly 13% of the file with low to medium risk. Job 7 would add about 9%.

## Leave inline

- The startup module loader (the 147 KB effect near "StrictMode … mounts → unmounts → remounts") and `CDNModuleGate`, `_alloCreate*DeliveryPolicy`, `_alloCreateModuleLoadDiagnostics`: they load the modules.
- Generated blocks: `_alloBrowserDeliveryManifest` (94 KB), `_alloRuntimeGraphManifest`, `_alloOptionalBrowserDeliveryManifest`. `build.js` writes them.
- Recovery and failure UI: `ALLO_WORKSPACE_RECOVERY`, every `renderCanvasRecovery*`, `renderEducatorAccessCodeSection`, `AlloFlowErrorBoundary`, `_AlloRecoverableLazyView`. They must work when modules fail to load (same decision as the 2026-09-04 extractions).
- `useTranslation`, `useFocusTrap`, state, refs, memos, the `__alloHostDeps` bag and the `_allo*Deps` bags.
- Session transport adapters (`_applyMbSessionAdapter`, `_applyLanSessionAdapter`, `writeToSession`): likely boot-critical; decide separately.
- Anything called while rendering. The heuristic flagged 66 closures as render-time; 321 more contain hooks.

## How each job is done

Follow the pattern of `docs/sidebar_shell_extraction_2026-09-04.md`, `persona_workspace_extraction_2026-09-04.md` and `flow_helper_extraction_2026-09-04.md`.

1. **Coordinate.** ANTI and `host_handlers_source.jsx` are shared. Tell active sessions which block is moving; re-read both files immediately before editing.
2. **Snapshot.** Save the pre-edit ANTI, the target source and all 4 module copies to a scratch folder. Confirm `module == build(source)` and note any mirror that already differs.
3. **Move the body unchanged.** For a handler, the body goes into `createHostHandlers(__d)`; every component binding it read becomes `__d.<name>`. Add any missing getter to `__alloHostDeps`. Add the function to the factory's return list.
4. **Leave a one-line shim in ANTI:** `const name = (...__a) => _alloHostHandlers().name(...__a);`. If any caller runs during render, guard the not-yet-loaded case: `_alloHostHandlers()` returns `_alloHostHandlersPending`, whose methods return a Promise (truthy). See `getAnalysisSourceUndo` for the guarded form.
5. **Views** take explicit props and render through `window.AlloModules.<View>` with the existing `_AlloRecoverableLazyView` fallback. Keep element ids, `data-help-key`s and DOM order: tours, voice control and tests depend on them.
6. **Rebuild.** Use the module's own builder (`_build_first_wave_view_modules.js` for HostHandlers, the `_build_view_*` scripts for views). Write all 4 copies (root, `desktop/web-app/public`, `desktop/app-build`, `desktop/web-app/build`). Then `node build.js --mode=dev --shell-only` so content pins match.
7. **Tests.** Find tests that slice the moved code out of ANTI (`grep` the function name in `tests/`) and point them at the new source; keep host-policy assertions on ANTI. Add one extraction test: the body equals the saved original after the `__d.` rewrite, the shim exists, the export exists. Prove it fails against the pre-edit copy.
8. **Gates.** `tests/anti_canvas_compile_clean.test.js` (zero esbuild warnings: Canvas will not run ANTI with one), `tests/host_handlers_wave3_extraction.test.js` (pin), `tests/sidebar_shell_extraction.test.js` where relevant, registry check, comment budget, and each feature's own suites.
9. **Browser check** for anything a user sees: load the built module in the Playwright harness (skill `render-view-module`), not the deployed app.
10. **Release order.** Publish updated modules before distributing the new ANTI. An old ANTI must keep working against the new module (unused dependencies are harmless); the new ANTI requires the new module.
11. **Record** bytes removed from the exact patch (not whole-file diffs, which include other sessions' work) and write a short doc like the three above.

One cluster per release. Do not batch jobs: a failure then has one cause.

## Job 7 needs a design first

No effect has been moved before. Options: (a) a module exports a hook that ANTI calls unconditionally, with a no-op until the module loads (changes hook order rules: the hook must exist from first render, so it must be boot-critical); (b) keep the `useEffect` shell in ANTI and move only its body into a handler `(__d) => cleanup`. Option (b) fits the existing pattern and keeps hook order fixed; recommend it, piloted on the 13 KB quiz-rules effect before the large ones.
