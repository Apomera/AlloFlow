# Follow-up fidelity fixes

Implemented the confirmed candidate-gate findings from the [follow-up review](../document-remediation-followup-review-2026-09-09/README.md). Changes are local.

## Behavior

- Form checks give valid `aria-labelledby` references precedence over `aria-label`, preserve the referenced name, and inspect inherited disabled state. Native label/form indexing remains in place. Inputs with an omitted type and explicit `type="text"` are treated equivalently.
- Hidden content is tracked by ordered word occurrence, including visible copies. Revealing a hidden duplicate elsewhere cannot authorize hiding the original occurrence. Inline markup can split an already-hidden passage without changing its hidden content.
- Ordinary static CSS visibility rules account for declaration order, simple-selector specificity, inline style, and `!important`. Unsupported selector constructs fail conservatively. This is not a full computed-style or accessibility-tree comparison: external CSS, dynamic behavior, conditional rules, and inherited visibility exceptions still need rendered validation.
- Internal links bind to target text and image identity, permitting consistent ID renaming while rejecting the tested target reassignment. Ambiguous matching content retains the href as an additional constraint. Base-URL changes are rejected before they can silently retarget relative destinations.
- Existing MathML names and symbolic operators in prose are protected alongside MathML structure. Descriptions can still be added where none existed. This is bounded source preservation, not a full math parser or complete accessible-name algorithm.
- A simple, unspanned first row made entirely of headers can correct row scope to column scope when subsequent rows form a matching grid and no explicit header relationships conflict. Complex scope changes remain conservative.
- Cache policy advanced to `20260909-3`.

Source references remain bounded checks, not immutable document identities. Repeated text additions and ambiguous internal targets may still require manual review. Preserving an existing name or description can also retain an incorrect source description; deliberate corrections need independent review.

## Validation

The [development run](development-tests.json) passed 131 tests across five files, including 26 new behavioral regressions. The [browser probes](probe-results.json) cover the original thirteen review cases using actual Chromium computed state and ARIA snapshots; all returned the expected decision.

The final validation runner requires a zero process exit, a successful report, and a nonempty passing result for every requested file. It saves stdout, stderr, and a [completeness summary](validation-summary.json), addressing the earlier risk of interpreting an incomplete JSON report as a complete run.

Final validation: **177 tests passed across 10 files**, consolidated by the latest file result. The complete combined run reported 175 passes and two timeout failures in existing source-workflow/build-parity tests. Both affected files then passed in isolation (5 tests, exit 0) without source changes. See [consolidated validation](consolidated-validation.json), the original [completeness summary](validation-summary.json), and [isolated diagnostics](isolated-tests.log). This is not one clean combined invocation.

All thirteen final browser probes matched expectations. The [local MCP self-test](mcp-selftest/benchmark-report.json) passed in 47.5 seconds with 11 scripted model calls and no source drift. The [shipping module mirror](bundle-verification.json) matched exactly, and [all 71 staged runner dependencies](runner-check.log) verified. Scoped whitespace checks passed. Human calibration remains separate from automated evidence; no human observations are fabricated and no deployment is part of this change.
