# Remediation preservation validation

Run `npm run verify:remediation` after installing development dependencies and Chromium (`npx playwright install chromium`). The command runs the maintained source, generated-module, rendered-fidelity, and export-acceptance suites in [the suite manifest](../dev-tools/remediation_validation.json).

The `remediation-preservation` job in [verify.yml](../.github/workflows/verify.yml) runs the same command on pull requests and pushes to main. The job fails on test or setup errors. Making that status mandatory for merging remains a repository branch-protection setting.

Reports go to `test-results/remediation-validation/` by default. Use a new evidence directory for a retained local run:

```powershell
npm run verify:remediation -- --report-dir reports/my-remediation-validation
```

The directory contains unit and browser JSON reports, browser artifacts, and a summary written only after both phases succeed. The command rejects missing suites, skipped tests, expected failures, and browser retries; Chromium runs with two workers and zero retries. CI uploads this evidence even when a test fails.

Add relevant suites to the manifest when extending these checks. `node dev-tools/remediation_validation.cjs --list` prints the selection without executing it. The validation contract test also detects omitted suites under the rendered and document-export browser naming conventions. The new form-context fixtures live in `tests/fixtures/remediation_form_context.json`, independently of historical review reports.

These checks exercise synthetic local fixtures and scripted model transport. They do not establish live-model quality or human screen-reader acceptance.
