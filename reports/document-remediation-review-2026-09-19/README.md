# Next remediation refinements — September 19, 2026

This focused review reproduced two preservation bugs and identified a validation-evidence improvement. No application files were edited. The current source was inspected directly; the September 10 suite results were not treated as a fresh validation of today's code.

## 1. [P2] Preserve native form validation behavior

The form-state attributes at [doc_pipeline_source.jsx:10938](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10938) preserve `required` and several field constraints but omit `novalidate` and `formnovalidate`.

Two harmful candidates pass the actual strict acceptance function and are returned by `aiFixChunked` with model transport mocked:

- `form-validation-disabled`: add `novalidate` to a form with an empty required response.
- `submit-validation-disabled`: add `formnovalidate` to that form's submit button.

In Chromium, both source and candidate report invalid field contents. The source blocks submission before a submit event; either candidate reaches that event. The probe cancels the event, so no form data is sent. This establishes a changed client-side submission rule, not a claim about any server's validation.

Recommended fix: preserve the effective native validation-bypass properties of forms and submitters. Include submit buttons and applicable submit/image inputs, retained existing bypasses, and valid markup-equivalence controls. Add permanent strict-gate, mocked-pipeline, and native-browser regressions.

## 2. [P2] Preserve accessible value text independently of numeric values

The same attribute list preserves native `value` and `aria-valuenow`, but omits `aria-valuetext`; the accessible-name, description, and reference checks do not cover it.

`slider-spoken-value-changed` changes `aria-valuetext="Warm"` to `"Cold"` on a labeled range input whose numeric value remains 50. Both the strict gate and mocked pipeline accept it. Chromium's native accessibility tree retains the same name, numeric value, and range while changing its `valuetext` property from Warm to Cold.

Recommended fix: preserve existing nonempty accessible value text for supported value-bearing controls with NFC/whitespace normalization. Keep legitimate additions where meaningful value text was absent, and test these separately from changed existing values. Extend to other relevant roles only with supported semantic and browser coverage; this review directly reproduces the native range-input case.

## 3. Bind routine validation evidence to the tested implementation

The shared runner's summary at [dev-tools/remediation_validation.cjs:86](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/dev-tools/remediation_validation.cjs:86) records status, time, suite counts, and passed-test counts. It does not record source/module/test/manifest hashes, a Git revision, or a before/after comparison of the tested implementation. The earlier dated report supplied these through a separate `finalize.cjs`; routine local/CI runs should record them automatically.

Recommended improvement: capture relevant input hashes and tool versions at run start, compare implementation hashes again at completion, and include the identity in the summary. Preserve diagnostics when a run fails or files change during it. This is an evidence-quality recommendation grounded in the runner, not a reproduced false pass or a claim that existing CI history is unreliable.

## Reproduction evidence

[results.json](results.json) records exact source/candidate HTML, strict decisions, mocked-pipeline evidence, native submission behavior, accessibility-tree properties, policy version, browser version, and source SHA-256. Six cases completed: three harmful accepted candidates across two bug classes, plus three valid controls. All candidates were accepted and returned; controls retained their native behavior. The source hash remained unchanged during the probe.

[probe.cjs](probe.cjs) uses only local synthetic fixtures. Browser scripts are enabled for the probe's submit-event instrumentation; fixtures contain no document scripts, all resource requests are blocked, and submit events are canceled. The script refuses to overwrite existing results. The initial diagnostic attempt disabled JavaScript, which prevented the submit-event instrumentation from reliably canceling navigation; the saved successful run uses the corrected instrumentation.

This review does not establish downstream export behavior, real-model quality, or actual human screen-reader results. A further calibration step remains worthwhile: `tests/fixtures/pdf_calibration/manifest.json` still contains no human observations. Building a small representative artifact/reviewer corpus would complement these deterministic tests, but was not performed here.
