# Remediation enhancement opportunities

Read-only analysis after policy 20260919-2. No application or permanent test files were changed. Ten local native Chromium probes were run: four rendered-verification cases and six strict-gate/form-submission cases. Model transport was mocked; no form data was transmitted. Existing validation failures were inspected without another full-suite run.

## Priority 1: Correct rendered selected-label fallback (P2)

At dev-tools/rendered_document_fidelity.cjs:165, selected choices use normal(option.label). A native option with label="" displays and exposes its text instead. With selected, value, name, role and exposed requested, changing an empty-label selected option from Warm to Cold produces a passed report, despite native accessibility names changing. Adding label="" to an otherwise identical Warm option instead produces review-required. Ordinary changed-label and unchanged-empty-label controls behave correctly.

Use the same effective label fallback already implemented in the strict pipeline gate: nonempty option label, otherwise option text, with existing normalization. Add both harmful and equivalent cases to the rendered suite and exercise its export-acceptance integration.

Evidence: [native results](rendered-option-label-results.json), [reproducible probe](rendered-option-label-probe.cjs). The result records the rendered-checker code hash and browser version. This finding concerns selected-choice checkpoints, not an assertion that every document property is covered by rendered verification.

## Priority 2: Preserve textarea submission rules (P2)

At doc_pipeline_source.jsx:10986, textarea state records value without hard-wrapping rules. Changing hard to soft wrapping, or changing columns while hard wrapping remains active, passes the strict gate and ships through aiFixChunked. Native FormData changes even though the textarea value is identical. Preserve effective wrapping mode and relevant column behavior; keep soft-wrap layout changes and neutral wrappers valid.

## Priority 3: Preserve submitted direction-field identity (P2)

The inventory at doc_pipeline_source.jsx:10938 omits dirname. Removing or renaming dirname="answer.dir" passes and ships, while native FormData loses or renames the companion direction field. Compare the effective companion field on supported native controls and accept inert attributes on unsupported types.

For both form issues, [exact fixtures and native submission evidence](form-gaps/README.md) show four harmful candidates accepted and shipped, plus two valid controls with unchanged payloads. Source SHA-256 stayed unchanged throughout the probe.

## Priority 4: Finish moving browser lifecycle into Playwright (P2)

The static_crop_cleanup Vitest suite launches Chromium for all 29 tests although only its final three use it. The retained diagnostic passed every assertion but failed the 30-second browser-close hook. Keep 26 DOM tests in Vitest and move the three native cases to Playwright-managed fixtures, retaining every assertion and adding the browser suite to the selection. This addresses the observed teardown failure, not the separate worker-startup timeouts.

## Priority 5: Retain phase diagnostics after runner failure (P3)

The validation wrapper throws on the test process exit before parsing the report. Consequently its failed summary omits the 570 collected passing assertions and seven missing suites; the raw Vitest report alone even reports success:true despite the unsuccessful process exit. Preserve process exit, phase state, collected counts, missing suites and hook/global errors separately from acceptance. Keep the run failed, omit successful aggregate totals, and explicitly record the browser phase as not started. Test malformed/missing reports, partial collections, misleading success fields and teardown failures.

[Validation analysis and extracted evidence](validation/README.md) documents both reliability recommendations. None of these findings establish live-model quality or human screen-reader acceptance.
