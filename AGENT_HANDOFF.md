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
| 2026-07-01 | Codex | `sel_hub/sel_hub_module.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Added a shared SEL Tool Shell pilot for Emotion Zones, Coping Strategies, and Journal so high-use tools get clearer entry, privacy/save cues, and consistent navigation. |
| 2026-07-01 | Codex | `doc_pipeline_source.jsx`, `doc_pipeline_module.js`, `tests/doc_pipeline_loop_support.test.js`, `tests/__snapshots__/behavior_lens_golden.test.js.snap`, `a11y-audit/verapdf_diff_result.json`, `AGENT_HANDOFF.md` | Done locally, not deployed | Fixed OCR reconcile test dependency, updated stale BehaviorLens 80+ snapshots, fixed autonomous remediation malformed-plan no-mutation path, refreshed local veraPDF evidence. |
| 2026-07-01 | Codex | `prismflow-deploy/public/doc_pipeline_module.js`, `prismflow-deploy/public/dynamic_assessment_module.js`, `prismflow-deploy/public/help_strings.js`, `prismflow-deploy/public/language_matcher_module.js`, `prismflow-deploy/build/*` | Done locally, not deployed | Synced Prismflow public copies with main checkout, rebuilt Prismflow, and started local static test server at `http://127.0.0.1:4174/` (PID 45912). STEM files used by the app load from `public/stem_lab/`, which matched main `stem_lab/`; older root-level `public/stem_tool_*.js` duplicates remain stale but are not the active load path. |
| 2026-07-01 | Codex | `stem_lab/stem_lab_module.js`, `prismflow-deploy/public/stem_lab/stem_lab_module.js`, `prismflow-deploy/build/stem_lab/stem_lab_module.js`, `AGENT_HANDOFF.md` | In progress, not deployed | Refining STEM Lab mobile shell, catalog layout, and tool search aliases/discoverability. |
| 2026-07-01 | Codex | `sel_hub/sel_hub_module.js`, `AGENT_HANDOFF.md` | Done locally, not deployed | Improved SEL Hub first-screen UX, responsive catalog/pathway/station layouts, save/privacy clarity, dirty-state ordering, and tool theme handoff. Verified `sel_hub/FOR_EDUCATORS.md` is clean UTF-8; no Markdown edit needed. |
| 2026-07-01 | Codex | `tests/helpers/word_sounds_harness.js`, `tests/i18n_cli_tools.test.js`, `tests/__snapshots__/stem_*_golden.test.js.snap`, `AGENT_HANDOFF.md` | Done locally, not deployed | Fixed Word Sounds golden harness translation fallbacks, gave the slow full-tree i18n safety check a larger timeout, and refreshed eight stale STEM render digests after validating they match already-committed tool behavior. |
| 2026-07-01 | Codex | `live_polling_module.js`, `AlloFlowANTI.txt`, `view_history_panel_source.jsx`, `view_history_panel_module.js`, `AGENT_HANDOFF.md` | In progress, not deployed | Fixing live poll post-submit/close behavior, anonymous result sharing, poll scale customization, pack-level community sharing, and stray literal newline text. |

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
- UTF-8/mojibake scan for `sel_hub/FOR_EDUCATORS.md` and `sel_hub/sel_hub_module.js` - passed with zero matches.
- `npx vitest run tests/word_sounds_golden.test.js --reporter=verbose` - passed 22 tests.
- `npx vitest run tests/doc_pipeline_loop_support.test.js tests/behavior_lens_golden.test.js tests/pdf_pipeline_quick_bugs.test.js tests/scan_score_labels.test.js tests/guided_mode_banner_completion.test.js tests/guided_example_integrity.test.js tests/i18n_cli_tools.test.js tests/word_sounds_golden.test.js --reporter=verbose` - passed 213 tests.
- `npx vitest run tests/stem_tool_golden.test.js tests/stem_longtail_tools_golden.test.js tests/stem_math_tools_golden.test.js tests/stem_sim_tools_golden.test.js -u --reporter=verbose` - passed 88 tests; updated 8 stale STEM digest snapshots.
- `npx vitest run --reporter=json --outputFile C:\tmp\alloflow-vitest-full-4.json` - passed: 1290 suites, 4350 tests, 0 failed, 4 pending.

## Open Coordination Notes

- There are pre-existing untracked i18n shard files under `dev-tools/i18n/handtl_semiconductor_*.json`; confirm intended commit scope before staging.
- `tests/undefined` is an untracked file dated 2026-06-30; confirm whether it is a generated artifact before cleanup.
- GitHub Actions Node deprecation warnings look informational, but future workflow cleanup may still be worthwhile.
