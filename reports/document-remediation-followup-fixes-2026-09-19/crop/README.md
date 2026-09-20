# Static crop cleanup browser lifecycle migration

Kept all 26 DOM/static test cases in Vitest and removed its file-wide Chromium launch/close hooks. Moved the three native cases into Playwright-managed page fixtures in tests/e2e/document_static_crop_cleanup.spec.ts, preserving all 11 browser assertion statements verbatim. The migrated cases still check raw Replace file-change behavior, preservation of source controls/content during canonical export, and the current crop control calling its runtime before cleanup.

Focused verification passed: **26 unit tests and 3 Chromium tests**, with zero retries and no skipped tests. [Summary](summary.json), [unit report](unit.json), [browser report](browser.json), [migration assertion inventory](migration.json).

Commands:

```powershell
npx vitest run tests/static_crop_cleanup.test.js --pool=threads --maxWorkers=1 --allowOnly=false --testTimeout=30000 --hookTimeout=30000 --reporter=dot --reporter=json --outputFile=reports/document-remediation-followup-fixes-2026-09-19/crop/unit.json
$env:PLAYWRIGHT_JSON_OUTPUT_FILE = 'reports/document-remediation-followup-fixes-2026-09-19/crop/browser.json'
npx playwright test tests/e2e/document_static_crop_cleanup.spec.ts --project=chromium --forbid-only --retries=0 --workers=1 --reporter=line,json --output=reports/document-remediation-followup-fixes-2026-09-19/crop/browser-artifacts
```

These checks run entirely against local source and synthetic fixtures. The parent task handles manifest registration and the full validation run; no application code or configuration was changed by this subtask.
