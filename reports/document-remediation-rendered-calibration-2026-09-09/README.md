# Rendered fidelity and synthetic calibration

Added a reusable Chromium comparison tool and an optional source-fidelity step in the existing post-export acceptance report. Complete source and output HTML documents are rendered in isolated contexts. Source-authored checkpoints select the properties that must be preserved. Names, roles, and accessibility exposure come from Chromium's native accessibility tree; visibility and form behavior use rendered/native state.

This is an opt-in post-export validation capability. It does not add a blocking asynchronous guard to live model repair, alter production scores, or promote a delivery verdict. Artifacts without a source-fidelity contract retain the previous acceptance behavior. Human validation remains `not-run`.

## Delivered

- [Rendered comparison tool](../../dev-tools/rendered_document_fidelity.cjs): exact source/output hashes, viewport/browser identity, selected observations, timing, coverage, blocked resources, and explicit passed/review-required/unavailable outcomes.
- [Export report integration](../../dev-tools/document_export_at_acceptance.cjs): optional `sourceFidelity` contract with source path and checkpoints. Failed or unavailable comparisons prevent the automated report from passing. Source/candidate byte stability is checked before publication.
- [Synthetic corpus](../../tests/fixtures/rendered_fidelity/cases.cjs): 20 authored HTML pairs covering valid semantic improvements, CSS/visibility, forms, links, tables, math, and language/direction.
- [Calibration runner](../../dev-tools/calibrate_rendered_fidelity.cjs): saves each source/output pair and result plus aggregate false-acceptance, false-rejection, and unavailable counts. Human metrics remain null.
- [Usage and contract documentation](../../docs/rendered-document-fidelity.md).

Independent review found and helped close four checker issues before final validation: script handlers/MIME variants being omitted from incomplete-coverage reporting, external hrefs borrowing local target text, `display:contents` false visibility failures, and lossy legacy file decoding. Regression tests cover each.

## Evidence

- The initial suite passed 24 browser tests. After the independent review fixes, [all 28 hardened browser tests passed](final-browser-tests.json). This includes corpus behavior, missing/ambiguous selectors, script/resource containment, file encoding, and post-export integration.
- The [calibration report](calibration/calibration-report.json) matched all 20 expectations: 14 harmful changes flagged, five valid repairs accepted, one external-resource case unavailable. There were zero false acceptances, false rejections, or unexpected unavailable results in this authored sample.
- All four existing HTML/PDF export acceptance tests passed: [export regressions](export-regressions.json). The [validation summary](validation-summary.json) records both suites with zero skipped, flaky, or unexpected results. Scoped whitespace checks passed.

No real-model accuracy or production error-rate claim follows from these synthetic results. Scanned PDF/OCR accuracy, actual screen-reader announcements, alternative-text usefulness, contrast/occlusion, and document-wide completeness are outside this checkpoint comparison. External resources and scripts are blocked; dependent documents cannot produce complete coverage. Files require valid UTF-8. The human observation manifest remains empty.

No deployment or live model call was performed. See the [human-validation handoff](../../docs/document-remediation-fidelity-validation.md) for the remaining independent acceptance work.
