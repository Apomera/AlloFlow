# Native option label preservation

The strict candidate gate previously compared option text, submitted values, selection, disabled state and group ownership, but ignored the native label override. A candidate could change a selected or unselected choice from Warm to Cold while keeping its underlying text and submitted value unchanged.

The gate now compares each option's effective choice text: a nonempty label override, otherwise native option text. It retains NFC and whitespace normalization. Empty label attributes follow the browser's text fallback, so equivalent additions, removals and repairs remain allowed. Both shipping modules were rebuilt under policy 20260919-2.

Added 14 shared scenarios exercised by 14 unit/pipeline tests and 14 Chromium tests (28 additional checks). They cover changed, removed, cleared and newly overriding labels; swapped labels on duplicate submitted values; superscript units; canonical equivalents; whitespace; and empty-label fallbacks. Browser tests inspect actual accessibility-tree option names and confirm harmful candidates retain the source through aiFixChunked with model transport mocked.

## Evidence

- [Before the fix](before.json): six harmful cases failed their rejection assertions; the prior 19 cases and four initial valid controls passed.
- [Initial focused regression](unit.json): 125 tests passed across six suites before the empty-label refinement.
- [Refined unit and source-build checks](refined-unit.json): 34 tests passed.
- [Native Chromium checks](native.json): all 20 tests passed, including all 14 new option-label cases, with zero retries.
- [Complete final validation](final-validation/summary.json): **failed**: 570 collected unit tests passed, but seven worker-startup timeouts prevented complete collection and the browser phase did not start. The identity guard also detected concurrent edits to utils_pure_source.jsx and utils_pure_module.js. Remediation source, generated modules and regression inputs remained unchanged.

The earlier run in validation/ was deliberately stopped while refining the browser-confirmed empty-label fallback. Its failure evidence is retained. No deployment, live model call, GitHub CI run or human screen-reader test was performed.

The missing suites are checked separately with one worker; their results and before/after identities are retained in missing-unit.json and missing-identity.json. These diagnostics do not turn the failed complete run into a pass.

## Final reviewed result

[Reviewed summary](reviewed-summary.json): all 28 new checks pass. Across the two broader unit attempts, 693 assertions passed; this is not a successful complete validation run. The one-worker diagnostic collected all seven missing suites and all 123 assertions passed, but static_crop_cleanup.test.js exceeded its 30-second Chromium-close hook timeout. The focused Chromium suite passed all 20 tests. Final hashing confirmed that the remediation source, both shipping modules, changed test files and new fixture match the versions present throughout the full-run attempt. The shipping modules are byte-identical.
