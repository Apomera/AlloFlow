# AquacultureLab evidence-saving enhancement

Completed locally on 2026-10-03. All changes remain unstaged and uncommitted. No push, deployment or full app/installer build.

## What changed

Students can now save either a reflection of at least 20 trimmed characters, or a structured explanation with nonblank Claim, Evidence and Reasoning fields totaling at least 20 trimmed characters. Next test remains optional. Readiness checks presence and length, not scientific quality. The save handlers and button state share the same rules.

The visible readiness panel distinguishes snapshot stock, complete scenario A, changed A/B inputs, writing and the 12-record capacity. Native buttons lead to the relevant existing control or heading and open its disclosure. Each Save button has its own accessible description; successful saving focuses Saved experiments.

Captured readings are counted as current, from earlier settings, from an earlier model, or unavailable. Earlier-model readings occupy one bucket even when settings differ. Counts are advisory: students can inspect original settings and deliberately keep earlier readings. Values, dates, units, model labels, writing, other records and parked work are preserved. The app does not generate an explanation or copy structured writing into an empty reflection.

Explicit `baselineScenarioRecorded:false` is respected when workspace and parked-draft settings are sanitized. Imported settings marked unrecorded cannot silently become A. Complete valid baselines remain available.

The annual model, physiology and frozen-measurement implementation are byte-preserved from the accepted controlled-comparison baseline. Model version remains `2026.10-stock-feedback`.

## Validation

- **183 distinct cases across 15 files passed** over the final full run and one targeted recovery, including **15 new save-readiness cases**. The full run passed 182 cases with one existing investigation setup timeout and zero pending cases. That exact unchanged case then passed on its own; the four other cases in its file had already passed in the full run. One worker, unchanged assertions, normal 30-second default, existing shorter per-case and hook limits, and no automatic retries. Node heap/semi-space caps are 1024/8 MiB. [Native full result](focused-tests.json) · [Full log](focused-tests.log) · [Native recovery](recovery-tests.json) · [Recovery log](recovery-tests.log) · [Unique-case accounting](resolved-tests.json).
- **Six Chromium workflow groups** passed, including 1280-, 390- and 320-pixel layouts, structured-only snapshot/comparison saving, freeform and CER minimums, exact records/export/reload, keyboard destinations, capacity and model/capture provenance. [Browser result](browser/results.json) · [Execution log](browser-execution.log).
- **14 scoped axe scans**, zero recorded violations. 10 scans contain incomplete items requiring manual review; responsive, control and forced-color previews were reviewed by root and an independent reviewer. Automated checks cover the changed controls; they are not certification of the full application.
- Syntax, scoped whitespace, exact LF runtime parity and empty scoped index passed. [Verification metadata](verification.json).

Earlier evidence is retained. The [initial new-file run](new-tests.json) had seven helper-initialization failures because the fixture called helpers before React rendered; eight UI cases passed. The [first full run](initial-full-tests.json) had 175 passes and eight failures: the explicit-false A hydration defect, six case/hook timeouts and one notebook assertion after timeouts. The provenance defect was corrected, the new fixture stopped mounting UI cases twice, and the final full run plus targeted recovery above verified every case with unchanged assertions and time limits. [Initial new-file log](new-tests.log) · [First full log](initial-full-tests.log).

## Preview and replay

- [Desktop](browser/sample-structured-comparison-1280.png) · [Phone](browser/sample-structured-comparison-390.png) · [320 pixels](browser/sample-structured-comparison-320.png) · [Forced colors](browser/sample-structured-comparison-320-forced-colors.png).
- [Structured-only saved investigation](browser/structured-comparison-390-report.html) · [Structured snapshot](browser/structured-snapshot-320-report.html).
- [Mixed capture freshness](browser/sample-mixed-capture-counts-320.png) · [Full-log requirement](browser/blocker-full-log-320.png).
- [Unchanged-input comparison after the oxygen edit](browser/blocker-unchanged-inputs-320.png). This screenshot shows the resolved state; the browser assertions verified the disabled comparison and its reason before the keyboard edit.
- [Portable browser harness](evidence-save-browser-qa.cjs). Run locally with Node from the repository; it starts and closes its own isolated React fixture and Chromium browser.

Primary samples use actual current-model calculations and captures. The mixed-provenance test deliberately labels one current-computed frozen reading `qa-earlier-model` to verify version guards; it does not reproduce or claim outputs from a historical model. No live farm, AI, hosted application or WebGL integration was evaluated in this pass.

Runtime SHA256: `c06d26f95247f48bf6787314b65ea5a0c06101b12a402112e3f4f470eb2c2014`. Accepted baseline: `832aa4d4f8a1dcebc75c99d4fd1960b23ac697b651aab8e735045de4496446cd`.
