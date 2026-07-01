# AlloFlow Agent Handoff

Purpose: a shared, human-readable coordination note for Aaron, Claude Code, and Codex. Update this before and after meaningful work so agents do not step on each other.

Last updated: 2026-07-01 by Codex.

## Repo Map

- Main working checkout: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.
- `D:\UDL-Tool-Updated` is a USB/backup copy. Do not assume it is the deploy source.
- Gemini Canvas remains the main deployment target. `AlloFlowANTI.txt` acts as the orchestration hub for the CDN modules.
- `deploy.sh` works through Git Bash on Windows: `& 'C:\Program Files\Git\bin\bash.exe' ./deploy.sh "message"`.
- Do not deploy unless Aaron explicitly asks for a deploy.

## Coordination Rules

- Start by reading this file and checking the current git status.
- Before editing, add or update a Work Log row with the files you plan to touch.
- Avoid two agents editing the same file at the same time.
- Treat uncommitted changes as Aaron's or another agent's work unless you made them in the current turn.
- Do not revert another agent's or Aaron's changes without explicit approval.
- Keep generated CDN/module pairs in sync when both source and built module files exist.
- Record the validation you ran and whether anything was deployed.
- Commit finished work before handing off so another agent can sync from Git instead of overwriting local-only changes.

## Work Log

| Date | Agent | Files | Status | Notes |
| --- | --- | --- | --- | --- |
| 2026-07-01 | Codex | `sel_hub/sel_hub_module.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Expanded the shared SEL Tool Shell beyond the first pilot tools to more core student-facing SEL tools for consistent navigation, save cues, and next-step guidance. |
| 2026-07-01 | Codex | `sel_hub/sel_hub_module.js`, `phase_k_helpers_module.js`, `misc_handlers_module.js`, `prismflow-deploy/public/phase_k_helpers_module.js`, `prismflow-deploy/public/misc_handlers_module.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Added a Recent SEL work section plus snapshot save/load mirrors so saved reflections and recent activity are visible, resumable, and included in project files. |
| 2026-07-01 | Codex | `sel_hub/sel_hub_module.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Added needs-based SEL finder chips and friendlier search aliases so students can find tools by what they feel or need, not only by formal category names. |
| 2026-07-01 | Codex | `sel_hub/sel_hub_module.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Added a shared SEL Tool Shell pilot for Emotion Zones, Coping Strategies, and Journal so high-use tools get clearer entry, privacy/save cues, and consistent navigation. |
| 2026-07-01 | Codex | `doc_pipeline_source.jsx`, `doc_pipeline_module.js`, `tests/doc_pipeline_loop_support.test.js`, `tests/__snapshots__/behavior_lens_golden.test.js.snap`, `a11y-audit/verapdf_diff_result.json`, `AGENT_HANDOFF.md` | Done locally, not deployed | Fixed OCR reconcile test dependency, updated stale BehaviorLens 80+ snapshots, fixed autonomous remediation malformed-plan no-mutation path, refreshed local veraPDF evidence. |
| 2026-07-01 | Codex | `prismflow-deploy/public/doc_pipeline_module.js`, `prismflow-deploy/public/dynamic_assessment_module.js`, `prismflow-deploy/public/help_strings.js`, `prismflow-deploy/public/language_matcher_module.js`, `prismflow-deploy/build/*` | Done locally, not deployed | Synced Prismflow public copies with main checkout, rebuilt Prismflow, and started local static test server at `http://127.0.0.1:4174/` (PID 45912). STEM files used by the app load from `public/stem_lab/`, which matched main `stem_lab/`; older root-level `public/stem_tool_*.js` duplicates remain stale but are not the active load path. |
| 2026-07-01 | Codex | `stem_lab/stem_lab_module.js`, `prismflow-deploy/public/stem_lab/stem_lab_module.js`, `prismflow-deploy/build/stem_lab/stem_lab_module.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Refined STEM Lab mobile modal shell layering/layout, widened and stabilized the tool catalog grid, and added alias-aware search so terms like Chemistry Lab and Optics Lab surface matching tools. |
| 2026-07-01 | Codex | `stem_lab/stem_lab_module.js`, `prismflow-deploy/public/stem_lab/stem_lab_module.js`, `prismflow-deploy/build/stem_lab/stem_lab_module.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Added a shared active-tool breadcrumb/back bar for STEM tools so plugin screens have consistent "All tools" navigation, current-tool context, and desktop shortcut hint. |
| 2026-07-01 | Codex | `sel_hub/sel_hub_module.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Improved SEL Hub first-screen UX, responsive catalog/pathway/station layouts, save/privacy clarity, dirty-state ordering, and tool theme handoff. Verified `sel_hub/FOR_EDUCATORS.md` is clean UTF-8; no Markdown edit needed. |
| 2026-07-01 | Codex | `tests/helpers/word_sounds_harness.js`, `tests/i18n_cli_tools.test.js`, `tests/__snapshots__/stem_*_golden.test.js.snap`, `AGENT_HANDOFF.md` | Done locally, not deployed | Fixed Word Sounds golden harness translation fallbacks, gave the slow full-tree i18n safety check a larger timeout, and refreshed eight stale STEM render digests after validating they match already-committed tool behavior. |
| 2026-07-01 | Codex | `live_polling_module.js`, `AlloFlowANTI.txt`, `view_history_panel_source.jsx`, `view_history_panel_module.js`, `tests/live_polling.test.js`, `tests/history_panel_share.test.js`, `tests/canvas_shell_live_controls.test.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Fixed live poll post-submit/close behavior, added anonymous aggregate result sharing and custom rating scales, moved floating live controls, changed Resource Pack History to pack-level community sharing, and removed the stray literal newline text. |

## Validation Log

- `npx vitest run tests/doc_pipeline_loop_support.test.js tests/behavior_lens_golden.test.js` - passed 66 tests.
- Blocking tagged-PDF golden group - passed 59 Playwright tests locally.
- `node dev-tools/verapdf_diff.cjs --gate` - passed locally with zero introduced ISO failures.
- `npm run build` in `prismflow-deploy` - passed; postbuild produced a self-contained `build/index.html`.
- `Invoke-WebRequest http://127.0.0.1:4174/` - HTTP 200; built page includes AlloFlow.
- `node --check sel_hub\sel_hub_module.js` - passed.
- `node dev-tools\check_sel_render.cjs --quiet` - passed with no app-crash render failures across 70 SEL tools.
- One-off jsdom render of `window.AlloModules.SelHub` - passed; rendered Start here and Save now UI.
- `node --check sel_hub\sel_hub_module.js` - passed after shared SEL Tool Shell changes.
- `node dev-tools\check_sel_render.cjs --quiet` - passed after shared SEL Tool Shell changes with no app-crash render failures across 70 SEL tools.
- One-off jsdom/fake-React render of `window.SelHub.renderTool('zones')` - passed; confirmed standard shell and dark-shell markers plus Save/Privacy/Purpose content.
- `node --check sel_hub\sel_hub_module.js` - passed after needs-based finder/search changes.
- `node dev-tools\check_sel_render.cjs --quiet` - passed after needs-based finder/search changes with no app-crash render failures across 70 SEL tools.
- One-off jsdom/React DOM render of `window.AlloModules.SelHub` - passed; confirmed needs chips render and Friend conflict updates search to surface friend/conflict tools.
- `node --check sel_hub\sel_hub_module.js`, `node --check phase_k_helpers_module.js`, `node --check misc_handlers_module.js`, `node --check prismflow-deploy\public\phase_k_helpers_module.js`, and `node --check prismflow-deploy\public\misc_handlers_module.js` - passed after Recent SEL work/snapshot persistence changes.
- `node dev-tools\check_sel_render.cjs --quiet` - passed after Recent SEL work/snapshot persistence changes with no app-crash render failures across 70 SEL tools.
- One-off jsdom/React DOM render of `window.AlloModules.SelHub` - passed; confirmed Recent SEL work renders seeded snapshots/recent usage and preserves the snapshot mirror.
- `node --check sel_hub\sel_hub_module.js` and `node dev-tools\check_sel_render.cjs --quiet` - passed after expanded shared SEL Tool Shell metadata.
- One-off jsdom/fake-React render of `window.SelHub.renderTool('sleep')` - passed; confirmed a newly expanded shell tool renders the standard shell marker, purpose copy, Save now, and tool content.
- UTF-8/mojibake scan for `sel_hub/FOR_EDUCATORS.md` and `sel_hub/sel_hub_module.js` - passed with zero matches.
- `npx vitest run tests/word_sounds_golden.test.js --reporter=verbose` - passed 22 tests.
- `npx vitest run tests/doc_pipeline_loop_support.test.js tests/behavior_lens_golden.test.js tests/pdf_pipeline_quick_bugs.test.js tests/scan_score_labels.test.js tests/guided_mode_banner_completion.test.js tests/guided_example_integrity.test.js tests/i18n_cli_tools.test.js tests/word_sounds_golden.test.js --reporter=verbose` - passed 213 tests.
- `npx vitest run tests/stem_tool_golden.test.js tests/stem_longtail_tools_golden.test.js tests/stem_math_tools_golden.test.js tests/stem_sim_tools_golden.test.js -u --reporter=verbose` - passed 88 tests; updated 8 stale STEM digest snapshots.
- `npx vitest run --reporter=json --outputFile C:\tmp\alloflow-vitest-full-4.json` - passed: 1290 suites, 4350 tests, 0 failed, 4 pending.
- `node --check stem_lab\stem_lab_module.js` - passed after STEM Lab shell/catalog/search refinements.
- `node --check prismflow-deploy\public\stem_lab\stem_lab_module.js` and `node --check prismflow-deploy\build\stem_lab\stem_lab_module.js` - passed; hashes match the source STEM module.
- `node dev-tools\check_stem_render.cjs --quiet` - passed with no app-crash render failures across 113 STEM tools; existing MusicSynth AudioContext warning still prints in the Node smoke environment.
- Playwright preview against `http://127.0.0.1:4174/` with the CDN STEM module request intercepted to the local build copy - passed: desktop catalog measured 1120px / 4 columns, `Chemistry Lab` found Equation Balancer, `Optics Lab` found OpticsLab AP, mobile hid the XP/brand/keyboard crowding controls, and the STEM modal z-layer now sits above the AI guide layer.
- `node --check stem_lab\stem_lab_module.js`, `node --check prismflow-deploy\public\stem_lab\stem_lab_module.js`, and `node --check prismflow-deploy\build\stem_lab\stem_lab_module.js` - passed after active-tool breadcrumb pass.
- Playwright preview against `http://127.0.0.1:4174/` with local STEM module interception - passed: Optics Lab shows the shared active-tool toolbar on desktop/mobile, and the `All tools` button returns to the 111-card catalog.
- `node dev-tools\check_stem_render.cjs --quiet` - passed after active-tool breadcrumb pass with no app-crash render failures across 113 STEM tools; existing MusicSynth AudioContext warning still prints in the Node smoke environment.
- `node --check live_polling_module.js`, `node --check prismflow-deploy\public\live_polling_module.js`, and `node --check view_history_panel_module.js` - passed after live polling/history changes.
- `npx vitest run tests/live_polling.test.js tests/history_panel_share.test.js tests/canvas_shell_live_controls.test.js --reporter=verbose` - passed 19 tests.
- `npm run build` in `prismflow-deploy` - passed after syncing live polling and history panel public modules; postbuild reported zero external resource requests.

## Open Coordination Notes

- There are pre-existing untracked i18n shard files under `dev-tools/i18n/handtl_semiconductor_*.json`; confirm intended commit scope before staging.
- `tests/undefined` is an untracked file dated 2026-06-30; confirm whether it is a generated artifact before cleanup.
- GitHub Actions Node deprecation warnings look informational, but future workflow cleanup may still be worthwhile.
