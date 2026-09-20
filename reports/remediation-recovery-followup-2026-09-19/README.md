# Remediation recovery follow-up — 19 September 2026

Implemented the approved four follow-ups locally. No live AI calls, deployment, or packaged application build.

## Behavior

- Provider Retry-After deadlines remain in force when another request succeeds, including full adaptive recovery. A shorter later header cannot overwrite a longer provider deadline. Shortened adaptive waits reschedule promptly.
- Recovery confirmation sleeps have individual end times. Overlapping waits count once; delayed background-tab callbacks do not charge time beyond the intended pause. Cancellation and a new run detach prior waits.
- Opening audits expose document-scoped wait feedback and a Stop action. Stop cancels queued/in-flight transport, retains the uploaded document, releases the one-click UI even if underlying work ignores abort, and returns keyboard focus to a launch control. Late results cannot start remediation or overwrite a retry. Superseded UI audits are isolated from batch work.
- The opening audit distinguishes preventive pacing, the request queue, and service recovery, with a countdown when known. Stalled copy points to Stop rather than a disabled close control. Estimates exclude pacing/service delays; the loading description no longer hard-codes five reviewers.
- The result action now says **Re-run verification**, with visible and accessible help stating that it runs all checks on the current document without changing it. Full canonical verification is retained.
- Canvas pacing still defaults on. The preference and saved-batch behavior from the previous implementation are unchanged.

## Validation

- 151 gate/ownership cases passed across the initial run and affected rerun; the final affected rerun passed 70/70.
- 48 Stop/workspace/first-start cases passed.
- 43 existing one-click/stall cases passed after updating source extraction seams.
- 98 integration cases passed across the initial run and focused reruns. Five initial failures were stale source matches: image transport now carries its explicit abort signal; host upload/reset and LMS handling had moved into extracted modules; the Run Audit test matched a focus selector rather than the button. Updated tests preserve the original behavior assertions. Image tests and all 16 upload-lifecycle cases then passed.
- All 26 Chromium continuity cases passed, with no retries: 23 maintained scenarios and 3 new audit scenarios. The new tests cover stopping an abort-insensitive operation, starting another audit before the old result returns, and queue/pacing/recovery feedback at 390px in dark and high-contrast themes.
- Five layout screenshots captured; 320px light audit, 390px dark audit and 390px verification screenshots reviewed. No captured browser JavaScript errors. Scoped accessibility checks passed; this is not a manual screen-reader audit.
- Pipeline integrity, host/source JSX smoke and scoped whitespace checks passed. Generated root/desktop public pipeline and view modules, plus contextual help, match byte-for-byte.

These are deterministic and browser-fixture checks. Live Canvas timing has not been compared between pacing modes.

## Evidence

See [validation.json](validation.json), [initial integration results](audit-integration-tests.json), [image-signal rerun](image-signal-tests.json), [visual check](visual-check.json), the screenshots here and in continuity-screenshots/, and tests/e2e/remediation_continuity.spec.ts. Remaining test output is recorded in the task's shell results.

Application source and generated modules remain in the shared working tree, preserving pre-existing and concurrent work. No broad staging or commit of shared files was performed.
