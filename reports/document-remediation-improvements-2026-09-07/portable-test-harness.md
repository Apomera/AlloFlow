# Portable remediation harness follow-up

Only tests/portable_remediation_core.test.js changed for this follow-up. No portable production script, driver, server, dependency, or behavior assertion was changed.

## Diagnosis

The original review stopped an 11-case run after about 506 seconds with four failures but without useful assertion details. A focused rerun against the current application completed with 7 passes and 4 failures (portable-core-initial.json). All four failures originated from Vitest withTimeout and its saved STACK_TRACE_ERROR stack; no remediation behavior assertion failed. Their 45.4, 99.4, 53.2, and 176.4 second durations exceeded the corresponding 30 or 60 second test budget. The failed set changed from the original review, and strict finalization passed in this rerun.

The harness called Python synchronously with a 240 second subprocess limit, blocking Vitest timers until each command returned. It also repeated capability discovery, which starts Node and Java, before every optional PDF case. Local subprocess duration varied substantially during concurrent workspace testing.

## Change

- Use asynchronous child processes so Vitest deadlines and teardown remain responsive.
- Bound each command separately (30 seconds for ordinary commands, 45 for capabilities, 90 for standalone validation, and 180 for PDF-required remediation), collect UTF-8 output, and cap test output at 4 MiB.
- Stop active test subprocesses before deleting fixtures; on Windows terminate only the child PID and its descendants with taskkill /T. Teardown has a 10 second budget.
- Reuse one capability probe across the suite. Missing optional capabilities are explicitly skipped rather than silently counted as passes.
- Allow 100 seconds for ordinary multi-command tests and 190 seconds for PDF integration tests. Existing success, failure, content, privacy, escaping, source binding, sandbox, and PDF validation assertions remain intact.

## Validation

Command:

    node node_modules/vitest/vitest.mjs run tests/portable_remediation_core.test.js --maxWorkers=1 --testTimeout=100000 --teardownTimeout=10000 --reporter=default --reporter=json --outputFile=reports/document-remediation-improvements-2026-09-07/portable-core-final.json

Result: 11 passed, 0 failed, 0 skipped; one worker; 96.41 seconds total (94.03 seconds in tests). Real local Chromium tagged-PDF generation and local veraPDF strict failure/success paths all ran. The slowest case was strict finalization at 47.41 seconds. This was an offline local fixture run with no model or AlloFlow service requests.

node --check and git diff --check passed for the changed test file. Cancellation branches are bounded in the helper but were not deliberately fault-injected in this follow-up. Evidence: portable-core-initial.json and portable-core-final.json in this directory.

No portable engine defect was established by these failures; the unresolved four-case finding is closed as test harness timing and reporting reliability.
