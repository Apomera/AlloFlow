# Remediation preservation validation

Run `npm run verify:remediation` after installing development dependencies, the nested React 18 browser harness, and Chromium. From the repository root:

```powershell
npm install --no-audit --no-fund
npm install --no-audit --no-fund --no-save --prefix desktop/web-app react@^18.2.0 react-dom@^18.2.0
npx playwright install chromium
npm run verify:remediation
```

The nested installation is required: root dependencies alone do not provide the React and ReactDOM UMD files read by the tests. The command runs the maintained source, generated-module, rendered-fidelity, and export-acceptance suites in [the suite manifest](../dev-tools/remediation_validation.json).

The `remediation-preservation` job in [verify.yml](../.github/workflows/verify.yml) runs the same command on pull requests and pushes to main. The job fails on test or setup errors. Making that status mandatory for merging remains a repository branch-protection setting.

Reports go to `test-results/remediation-validation/` by default. Use a new evidence directory for a retained local run:

```powershell
npm run verify:remediation -- --report-dir reports/my-remediation-validation
```

The directory contains unit and browser JSON reports, per-phase console logs (unit.log and browser.log), browser artifacts, and a summary that records running, passed, or failed status. Each phase separately records not-started, running, passed or failed, its process exit, report-read status, collected assertion counts, missing suites, and available suite/global diagnostics. Failed process exits remain failures even when a reporter claims success. Reports and logs are parsed or retained after failures; missing or malformed reports are explicit. Aggregate testsPassed is present only for successful complete runs. The command rejects missing suites, skipped tests, expected failures, and browser retries; Chromium runs with two workers and zero retries. CI uploads this evidence even when a test fails.

Add relevant suites to the manifest when extending these checks. `node dev-tools/remediation_validation.cjs --list` prints the selection without executing it. The validation contract test also detects omitted suites under the rendered and document-export browser naming conventions. The new form-context fixtures live in `tests/fixtures/remediation_form_context.json`, independently of historical review reports.

These checks exercise synthetic local fixtures and scripted model transport. They do not establish live-model quality or human screen-reader acceptance.

Each run records SHA-256 hashes of the selected suites and the additional files or fixture directories declared in `identityInputs` in the suite manifest. It records the Node.js and test-tool versions, the Playwright-configured Chromium revisions, and Git HEAD when available. Inputs, tool versions, and revision are checked again on completion; any change fails the run. This is a declared input set, not automatic discovery of every transitive dependency. Add new helpers and fixtures to that set when extending the tests.

Failure summaries retain the original error and available before/after identity, including setup failures. Summary publication uses a temporary file in the same directory followed by rename so readers see a complete JSON snapshot. Phase progress is printed to the console; detailed runner output is written to the phase logs, including worker and teardown errors omitted by JSON reporters. An interrupted process leaves a running summary rather than a success. The browser version metadata describes the installed Playwright configuration, not an independently measured executable.

Vitest uses two threaded workers and a 30-second default test/hook budget. Native focus, footnote-wrap and static crop-control checks run with Playwright-managed browser fixtures. DOM-only static cleanup checks remain in Vitest. An unavailable Git lookup is recorded with `gitHeadVerified: false`; it does not imply a revision change. File hashes and tool-version comparisons remain required for success.

## MCP calibration

`npm run verify:mcp-calibration` uses [a separate maintained selection](../dev-tools/mcp_calibration_validation.json) for MCP protocol and pipeline calibration. It includes the native focus/footnote and static crop-control suites that moved from Vitest to Playwright. The runner checks every selected path before starting and requires a passing result from each suite, so a moved or excluded file cannot silently drop coverage. Both runners use one worker; Chromium runs with zero retries. Unit tests retain their 360-second budget for local scripted MCP round trips.

Reports, logs and a summary are written to `test-results/mcp-calibration/`, or a directory supplied with `npm run verify:mcp-calibration -- --report-dir PATH`. `npm run verify:mcp-calibration -- --list` validates and prints the selection without running it. Missing reports, nonzero or unknown process exits, skipped tests, expected failures and retries fail the command. A failed unit phase leaves the browser phase unstarted. This calibration summary records runner results; the broader remediation command above additionally verifies input identity throughout its run.
