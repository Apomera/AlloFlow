# Form preservation review — September 10, 2026

Two new harmful candidates pass the actual strict `acceptFixedHtmlDetailed` gate and are returned by `aiFixChunked` when only the model transport is mocked. Two equivalent wrapper controls pass correctly. Native Chromium 148.0.7778.96 confirms the observable differences. Policy `20260909-6`; source SHA-256 `2a246d27928524c54ee16c8419dfd04904f4a05dfbacd07bd94ffb2825419909`; source remained unchanged during execution.

These findings concern local candidate acceptance and browser behavior. They do not establish every downstream export result or human screen-reader behavior. No application code was changed.

## 1. [P2] Preserve input length constraints

The form attribute fingerprint at [doc_pipeline_source.jsx:10279](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10279) omits `maxlength` and `minlength`. Changing the existing textarea limit from 200 to 5 is accepted even though users can no longer enter the original-length response. In the saved native keyboard probe, typing `Blueberries grow well.` enters the full sentence in the source and only `Blueb` in the candidate. The strict gate reports `accepted: true`, the pipeline returns the candidate, and the pass contains no candidate rejection.

Reproduction: `maxlength-truncates-response` in [results.json](results.json). The control `maxlength-preserving-wrapper-control` wraps the textarea in a span while preserving its limit; acceptance and typing remain correct. `minlength` has the same omission in code but was not separately probed or counted as another finding.

Refinement: compare effective native length constraints for applicable inputs and textareas. Retain valid equivalent markup and account for absent/invalid values according to the DOM rather than requiring raw attribute formatting.

## 2. [P2] Preserve fieldset/legend membership

The form collection at [doc_pipeline_source.jsx:10278](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10278) omits fieldsets/legends. Its state records form ownership but no fieldset ancestor or group name at [doc_pipeline_source.jsx:10309](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:10309). Moving the closing student fieldset before its Name field preserves all text, control labels, and form ownership, so the gate accepts it. Chromium confirms that the Name textbox loses membership in the `Student details` group while the Teacher group remains intact. This removes context needed to distinguish identical field names.

Reproduction: `fieldset-name-association-lost` in [results.json](results.json). The control `fieldset-preserving-wrapper-control` adds a div inside the same fieldset and preserves its accessible grouping correctly.

Refinement: retain each control's ordered, named fieldset ancestry and the associated legend's accessible name. Compare semantic group context without requiring the original IDs or arbitrary wrapper structure, so ordinary accessible repairs stay valid.

## Reproduction

The saved [probe script](probes.cjs) refuses to overwrite existing evidence. It loads the source functions through the existing test harness, replaces only the model response transport, and observes static fixtures in Chromium with page scripts and outbound resources disabled. Four cases completed successfully; two expose harmful acceptances and two are valid controls. Read the existing [results](results.json) or run a copy with a fresh output location.
