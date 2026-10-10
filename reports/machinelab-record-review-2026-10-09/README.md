# Machine Lab record review — October 9, 2026

The work record is now a place to revise explanations beside the saved evidence. Each valid station record has a labelled, bounded explanation field. Edits update that same record without changing its settings, predictions, other station records, or live machine geometry. Stale editors cannot alter a removed or replaced pair.

For the quantitative grade bands, Review at station opens the matching comparison, pauses the demonstration, and focuses its explanation while preserving current slider values. Open your work record returns to the updated explanation. Younger bands retain access to their saved writing without offering a route to hidden comparison controls.

Download text record creates a UTF-8 text file containing the current work record, original predictions, fixed measurements, and latest explanations. Copy and read-aloud continue to use the same assembled text. Temporary download links are removed immediately and object URLs are released after 30 seconds; failures offer a copy fallback.

## Verification

- 97 tests passed across six focused suites, including nine new record-review cases, guided investigations, paired evidence, work records, accessibility and translation-key hygiene. Receipt: `tests-final.json`.
- 12 native Chromium checks passed with zero captured page/console errors. These verify keyboard editing, station review and return focus, record isolation, unchanged live geometry, an actual text download and its exact current content, removal of the temporary link, and responsive layouts.
- Four screenshots were inspected: desktop, 390px phone, 320px dark mode and 320px forced colors. Receipt and captures: `browser/`. `browser/downloaded-record.txt` is the actual downloaded fixture record, including multiline writing and literal angle brackets.
- Canonical and desktop source SHA256 match: `18b5475471927f1dde1753638930a323398cfeef318ad3f87fd4d8a1d729a6ab`. Syntax and scoped whitespace checks pass.

The initial test run had 57 passing tests and one old assertion that expected the explanation in static child text. It now checks the controlled textarea value, matching the new editable UI; the initial receipt is retained as `tests-initial.json`. A first browser attempt received a canceled download in the default temporary location. Explicit writable browser download/temp paths completed successfully. Existing React key warnings from older Siege/Compare views appeared in unit output; the scoped browser run had none. A locked Windows source write was recovered using an atomic replacement, followed by source/mirror verification.

## Reproduce

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-record-review-2026-10-09/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
node node_modules/vitest/vitest.mjs run tests/machinelab_record_review.test.js tests/machinelab_work_record.test.js tests/machinelab_guided_investigation.test.js tests/machinelab_paired_evidence.test.js tests/machinelab_a11y.test.js tests/machinelab_i18n_hygiene.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000 --reporter=dot --reporter=json --outputFile.json=reports/machinelab-record-review-2026-10-09/tests-final.json
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_record_review_qa.cjs
```

This is local validation with the real Machine Lab renderer and fixture records. No full application build, physical screen-reader session, push, or deployment. Unrelated shared work is preserved.
