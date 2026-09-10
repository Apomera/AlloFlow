# Existing selected-creation UI regression alignment

Both requested suites passed: **12 tests across 2 files, exit 0**.

- `geometry_world_empty_guidance.test.js`: 10 passed. The retained-selection case now expects the current exact intro and checks the selected count and export scope, while preserving block and history identity assertions.
- `geometry_world_dock_selection.test.js`: 2 passed. Retained builds use the accessible Selected build summary and exact count/bounds assertions. The fallback ground case verifies that the selected summary and export-scope claim disappear. Existing selected-model Print Lab handoff assertions remain intact.

Only these two test files and this report were edited; no production changes. The run produced the existing ReactDOMTestUtils.act deprecation warning, with no test failures.

Machine result: `reports/geometry-world-control-polish-2026-09-10/updated-contract-tests.json`.

```text
node node_modules/vitest/vitest.mjs run tests/geometry_world_empty_guidance.test.js tests/geometry_world_dock_selection.test.js --maxWorkers=1 --testTimeout=30000 --reporter=default --reporter=json --outputFile=reports/geometry-world-control-polish-2026-09-10/updated-contract-tests.json
```
