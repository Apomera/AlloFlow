# Changed runtime and accessibility suites

Candidate: `C:/tmp/tyler_integration_candidate`.

Final result: **268 passed, 1 existing skip, 0 failed across 15 suites**, using each suite's latest completed run. See `runtime-a11y-final-summary.json` for the deduplicated suite counts and supporting JSON filenames.

The first run covered the 15 changed suites not already covered by the focused roster, onboarding, baseline, and own-source runs. It completed with 225 passing assertions, 1 existing skip, 4 failed assertions, and 1 suite that could not load a missing sparse-checkout fixture. The JSON evidence is `runtime-a11y-tests.json`.

## Repairs prompted by this run

- Registered `header.nav_home_behavior_tools` and `header.home_behavior_tools_tooltip` in the candidate's UI catalog and public mirror. Both keys were missing in the current main and review catalogs; values use the header's existing English fallbacks.
- Updated the History visual contract test from old inner element IDs to the current enclosing tabpanel IDs. The test now also compiles the real host's two panel opening tags and checks IDs, labels, roles, focusability, and active/inactive visibility at wide and narrow layouts.
- Materialized two omitted STEM files and the two nine-file student-shell artifact directories from current main. These were test fixture omissions in the sparse candidate. The copies total 8,450,107 bytes and preserve any existing candidate file. No source assertion was bypassed.

The catalog keys, exact hashes, and materialized fixture hashes are recorded in `runtime-check-input-repairs.json`. The helper that performed those changes is `repair-runtime-check-inputs.cjs`.

## Commands

Executed from the candidate directory:

```powershell
node node_modules/vitest/vitest.mjs run tests/ai_capability_gating.test.js tests/app_shell_cognitive_load.test.js tests/canvas_workspace_recovery.test.js tests/class_materials_first_run.test.js tests/deferred_module_pump.test.js tests/educator_hub_modal_runtime_a11y.test.js tests/guided_mode_banner_completion.test.js tests/header_nav_i18n.test.js tests/history_navigation_lane_visual.test.js tests/hub_personalization.test.js tests/learning_hub_ai_only_cards.test.js tests/learning_hub_modal_runtime_a11y.test.js tests/localization_landing_and_catalog.test.js tests/qr_student_shell.test.js tests/sidebar_tabs_navigation_a11y.test.js --maxWorkers=1 --pool=threads --no-cache --configLoader=runner --hookTimeout=60000 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=C:/tmp/tyler-integration-runtime-a11y-tests.json --silent

node node_modules/vitest/vitest.mjs run tests/ai_capability_gating.test.js tests/header_nav_i18n.test.js tests/history_navigation_lane_visual.test.js tests/qr_student_shell.test.js --maxWorkers=1 --pool=threads --no-cache --configLoader=runner --hookTimeout=60000 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=C:/tmp/tyler-integration-runtime-a11y-retry-tests.json --silent
```

The second command covers only the four affected suites. One tool-host timeout occurred before the first attempt launched; absence of both a process and output report was verified before retrying it.

That retry passed AI capability (38) and header catalog (13). It found a second obsolete History text pin, which assumed ArrowLeft was immediately followed by Home; the current control also supports ArrowRight. The pin now checks the full current condition. The new actual-host-panel assertion passed. QR's worker timed out before starting, so only the remaining two suites ran again:

```powershell
node node_modules/vitest/vitest.mjs run tests/history_navigation_lane_visual.test.js tests/qr_student_shell.test.js --maxWorkers=1 --pool=threads --no-cache --configLoader=runner --hookTimeout=60000 --testTimeout=30000 --reporter=default --reporter=json --outputFile.json=C:/tmp/tyler-integration-runtime-a11y-final-tests.json --silent
```

This last run passed all 26 assertions with exit code 0. The two retry reports are preserved as `runtime-a11y-retry-tests.json` and `runtime-a11y-final-tests.json`. No tested product failure remains.

## Mutation verification

`node reports/tyler-merge-audit-2026-09-28/verify-history-panel-mutation.cjs` copied the eight inputs of the History test into a scratch directory, forced the Create panel's `hidden` property to `false`, and ran only the new actual-panel assertion. The assertion failed as intended. SHA-256 rechecks confirmed all eight candidate files were unchanged. Evidence: `history-panel-mutation.json`, `history-panel-mutation.log`, and `history-panel-mutation-receipt.json`.
