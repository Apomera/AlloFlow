# Form values and validation evidence improvements

Implemented the three recommendations from the [September 19 review](../document-remediation-review-2026-09-19/README.md). Policy is `20260919-1`, and both shipping pipeline modules were rebuilt.

## Changes

- **Preserve form validation behavior.** The strict gate compares the native boolean `noValidate` property on forms and `formNoValidate` on submit buttons and submit/image inputs, including externally associated submitters. Equivalent boolean spelling and inert attributes on non-submit controls remain allowed.
- **Preserve accessible value text.** Existing nonempty `aria-valuetext` on native range and number inputs is compared independently of the numeric value, accessible name, and description. NFC and whitespace normalization preserve canonical equivalents; missing or empty value text may still be repaired. This change is scoped to these native controls, not every custom ARIA widget.
- **Bind validation evidence to declared inputs.** The shared runner records a run ID, input SHA-256 hashes, Git HEAD when available, Node/test-tool versions, and Playwright-configured Chromium revisions before testing. It captures the identity again afterward and fails on input, tool, or revision changes. Selected suites are included automatically; additional sources, modules, helpers, configuration, and fixture trees are declared in the manifest. This is explicit coverage of declared inputs, not automatic discovery of every transitive dependency.
- **Retain honest failures.** A new run replaces an earlier success with running status before setup checks. Setup errors, test failures, missing inputs, and changes during the run retain diagnostic summaries and available before/after identity. A process interruption leaves running status rather than success. Unit console diagnostics accompany JSON results. Hooks receive the same 30-second budget as tests; individual suites may declare longer limits.

## Regression evidence

Added 34 checks: 19 form-value/unit cases, nine validation-identity and failure-path tests, and six native Chromium cases. Nine existing browser focus/reflow assertions were migrated from Vitest to Playwright-managed fixtures without removing coverage. Before implementation, the form suite showed all 11 harmful-candidate cases failing their intended rejection assertions while all eight valid controls passed. All 19 passed after the source changes.

The six original review examples are copied verbatim into permanent fixtures. Browser regressions exercise the actual strict gate and `aiFixChunked` with only model transport mocked, then inspect native submission behavior and accessibility values. Rejected candidates retain the source; valid controls remain accepted. Submit-event instrumentation cancels events and network requests are blocked.

## Final verification

- [Reviewed evidence and test counts](reviewed-summary.json)
- [Complete final command result with input identities](verified-validation/summary.json)
- [Final unit/integration results](verified-validation/unit.json)
- [Final Chromium results](verified-validation/browser.json)
- [Summary verification script](finalize.cjs)
- [Validation command documentation](../../docs/remediation-validation.md)

The complete run passed **934 tests: 679 unit/integration and 255 Chromium**, with no skips or retries. All declared input hashes and tool versions stayed unchanged. The validation command correctly returned failure because Git HEAD changed from `107e91b21c999fd318e48a85d3287ff87ab4c25e` to `db76fd140165f99a42d566e4638af58eac470538` during testing. The intervening commits concern the automobile workshop and Dino Lab, outside the selected remediation inputs. The original failed guard result is retained; this is not a successful revision-stable command run.

The finalizer checks both complete test reports, rechecks every recorded input hash, verifies all selected suites, confirms original review fixture identity, and checks equality of the two shipping modules. It permits a revision-only guard failure for evidence review, records `review-required`, and never changes the shared runner result. Fresh-source build parity is part of the shared test selection.

Earlier diagnostic evidence is retained. A development test caught a manifest update during its run; a subsequent stable run passed the seven identity tests. Another unit attempt ended before collecting tests, followed by a successful diagnostic rerun. The first complete run passed all 686 unit/integration assertions but failed an existing browser teardown hook's 10-second limit; it was correctly recorded as failed in `validation/`. A second run also exposed a Vitest fork-worker startup timeout and a Git lookup timeout incorrectly classified as revision drift; evidence remains in `final-validation/`. The shared runner now uses threaded workers, the nine browser-only checks use Playwright fixtures, and unavailable Git metadata is distinguished from a changed known revision. The final command records separate evidence under `verified-validation/`.

No deployment, GitHub CI run, live model call, or human screen-reader acceptance was performed in this session. The empty human calibration corpus remains a separate quality-measurement follow-up.
