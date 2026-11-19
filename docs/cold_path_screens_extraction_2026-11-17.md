# Cold-path screens extraction (third view wave), 2026-11-17

Six screens that open only on request left `AlloFlowANTI.txt` for one lazy CDN module, `view_cold_path_screens_module.js` (source `view_cold_path_screens_source.jsx`, module key `ColdPathScreens`, loader `window.__alloLazyColdPathScreens`). This is Job 6 of `docs/anti_extraction_plan_2026-11-09.md`. Nothing is downloaded until one of the screens is shown.

## What moved

| Screen | Component | Bytes moved | Host values handed over |
|---|---|---|---|
| Gemini bridge prompt list | `GeminiBridgeView` | about 3,200 | 5 |
| Saved math assessment (plan or submitted answers) | `SavedMathAssessmentView` | about 5,100 | 10 |
| Adventure cast lobby call, with its portrait handlers | `AdventureCastLobbyView` | about 10,300 | 11 |
| Save artwork as a visual support (dialog) | `StemArtworkHandoffView` | about 4,300 | 8 |
| Teach live (dialog) | `SessionStartOptionsView` | 3,113 | 6 |
| Translate (dialog) | `TranslateModalView` | 6,049 | 18 |

The host went from 3,268,851 to 3,239,216 bytes (29,635 smaller) in all three copies. This is a host-size reduction; no load-time measurement was made.

Each body is the text that was in the host, unchanged, wrapped in `function Name(props)` with the host values it read listed in one destructuring line. The host keeps the condition that shows the screen and renders a `_alloCreateFirstWaveCdnView` shim with those values spread in, the same contract as the first two waves.

## The focus trap rule

`useFocusTrap(ref, isOpen)` starts its trap in an effect that runs when the dialog opens, and returns at once when `ref.current` is empty. A lazy view is not mounted on the first opening, so a ref owned by the host would be empty and the dialog would open with no trap. The tool therefore refuses a target that takes a ref the host passes to `useFocusTrap`.

Teach live and Translate carry a `trap` entry in the tool instead: the view makes its own ref and calls the host's hook through `window.__alloHooks.useFocusTrap(ref, true, props.onTrapEscape)`, so the trap starts when the view mounts and ends when it leaves. The host's `useRef` line and `useFocusTrap` line for each were deleted, and the host hands the view what Escape should do as `onTrapEscape`. The tool checks that each ref was used in exactly three places (declaration, hook, dialog) before it moves anything.

Two behaviours are the same as before the move and were not changed here:

- Translate: focus does not return to the Translate button when the dialog closes. The language box has `autoFocus`, which runs before the trap records where focus was, so the trap records the box itself.
- Save artwork: the dialog has no trap of its own. Escape closes it through the app-wide Escape net, which presses its Close button.

## Left in the host on purpose

- Save project dialog (4.9 KB, `saveModalRef`): saving has to work with no network. A lazy dialog would be a loading notice when the network is down.
- Word Sounds generator panel: 39 host values; not a cold path.

## How it was done

`node dev-tools/extract_third_wave_cdn_views.cjs` (`--dry-run` reports and writes nothing). It is incremental: a target already in the host as a shim call is skipped, so the second batch appended to the source file and the export list of the first. After it runs:

```
node dev-tools/build_browser_delivery_manifest.cjs --sync --host=AlloFlowANTI.txt
cp AlloFlowANTI.txt desktop/web-app/src/AlloFlowANTI.txt
cp AlloFlowANTI.txt desktop/web-app/src/App.jsx
```

To change a moved screen: edit `view_cold_path_screens_source.jsx`, run `node _build_first_wave_view_modules.js ColdPathScreens`, copy the module to its three mirrors (`desktop/web-app/public`, `desktop/app-build`, `desktop/web-app/build`), update the `?v=` pin on the loader line in the host to the first 8 hex digits of the module's sha256, then the three commands above.

Files changed besides the host and the new source and module: `build.js` (MODULES, COMPILE_PAIRS, CONTENT_HASH_PINNED), `_build_first_wave_view_modules.js` (CONFIGS), `deploy.sh` (POST_MODULES), `tests/helpers/host_source.js` (MOVED_VIEW_FILES), `dev-tools/shell_i18n_baseline.json` and `shell_i18n_deep_baseline.json` (the 15 and 18 hard-coded English strings of the artwork dialog are now counted against the new file, and the host's entry was lowered by the same number).

## Checks

- `tests/third_wave_cdn_extraction.test.js` (13 tests): shim, pin and loader contract; the host hands each screen exactly the names it reads; the four copies of the module equal a fresh build; each screen is drawn from the built module; the two dialogs run in a real DOM with the host's own `useFocusTrap` (focus enters, Tab wraps, Escape closes, focus returns, the trap stack empties).
- Tests that sliced moved text out of the host now read it where it lives: `math_saved_assessment_workflow`, `adventure_report_and_consent_followups`, `fix0927_activities`, `header_translation_dialog`, `modal_focus_trap`, `analysis_translation_sync_scope`, `class_mailbox`, `student_save_submit_voice`.
- All 690 test files that read the host were run after each batch. For the first batch every failing file was run again with host reads served from the pre-move copy: no test failed after the move that passed before it. After the second batch, the run was compared with the first: three new failures, two from the move (redirected above, both pass) and one from another session's edit of `math_fluency_module.js` made after the manifest sync. The failures that remain in that set were there before this work (105 tests in 52 files on 2026-11-17).
- Real Chromium, first batch: 25 of 25 checks (loading notice, one download at the pinned address, each screen's actions reaching the app, close while loading, a failed download).
- Real Chromium, second batch: the same keyboard and mouse script was run on the dialogs as the host drew them and as lazy views; all 27 observations are the same (focus after opening, Tab order, Shift+Tab, Escape, focus after closing, every button).
- `check-pipeline-integrity.js`, `check-source-pair-drift.js`, the delivery manifest check and both i18n ratchets pass.

The browser checks use the host's own gate, shim, loader line, call sites and focus hook, sliced from the host file, with stand-in app state. The whole app was not started from the new host: that needs a web build, which is part of a release.

## Release order

Publish `view_cold_path_screens_module.js` before, or together with, the new host. An older host does not ask for the module; the new host needs it. No commit, push or deploy was made as part of this work.

Evidence: `C:\tmp\anti_extract\` (pre-move copies in `pre_wave7\` and `pre_batch2\`, browser scripts `wave7_browser_box.cjs` and `wave7_browser_box2.cjs`, results in `run_1117\`).
