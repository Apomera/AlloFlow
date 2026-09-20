# Remediation pipeline refinements — 2026-09-20

Implementation is complete. Both combined runs passed all test assertions, but their commands retained failed status because concurrent Dino Lab commits changed Git HEAD. All 131 declared validation inputs and tool versions remained unchanged in both runs. The independent MCP calibration command passed.

Implemented the seven improvements from the [preceding review](../document-remediation-next-opportunities-2026-09-19/README.md), with harmful-change regressions and valid-repair controls.

## Changes

1. **CI prerequisites:** the remediation job installs the nested React 18 harness before validation. A fresh isolated installation produced both required UMD files and successfully rendered a React element.
2. **Calibration coverage:** a maintained manifest and guarded runner restore all 12 migrated Playwright checks. Missing selections, missing or malformed reports, nonzero or unknown exits, signals, skipped cases, and browser retries cannot produce a passing result.
3. **Table semantics:** the live strict gate preserves effective row and data-cell roles, including grids and inherited presentation effects. Equivalent fallback roles, inert presentation attributes, and valid header promotion remain allowed.
4. **Submission destinations:** the live strict gate preserves effective targets across form defaults, submitter overrides, externally associated controls, and document base targets. Equivalent explicit destinations remain allowed.
5. **Link destinations:** rendered checks resolve HTML/SVG URLs and SVG `xlink:href` precedence, preserving authored relative references and bases. Missing or unresolvable destinations report unavailable.
6. **Effective language:** rendered checks respect XML namespace precedence, inheritance, empty resets, equivalent casing, and Chromium's document-language metadata fallback.
7. **Rendered form payloads:** a new opt-in `formData` checkpoint compares native ordered text entries. Width or font changes that alter hard-wrap newlines require review; layout changes preserving the payload pass.

The root and desktop pipeline bundles were rebuilt identically. Policy version `20260920-2` invalidates cached results from the earlier preservation rules. The shared validation manifest includes the new regression suites and calibration runner inputs.

## Form-payload scope

Use a source-authored checkpoint on the form:

```json
{ "id": "response-payload", "sourceSelector": "#response-form", "properties": ["formData"] }
```

This uses native `FormData` without submitting or navigating. It preserves duplicate-name ordering, successful controls, external form ownership, and direction fields. `value` remains a DOM-value check; rendered payload verification must be explicitly requested. No submitter is chosen, and payloads containing files report unavailable. This does not verify server processing or replace live-gate navigation checks. [Usage and limitations](../../docs/rendered-document-fidelity.md).

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Shared remediation tests | All 1,226 assertions passed twice; revision guard failed in both runs | [Final run](validation-final/summary.json) |
| MCP calibration | 224 unit/protocol + 12 Chromium cases, all passed | [Calibration summary](../document-remediation-next-fixes-2026-09-20/mcp-calibration-final/summary.json) |
| Fresh CI dependency bootstrap | React/ReactDOM 18.3.1 installed and rendered | [Bootstrap evidence](../document-remediation-next-fixes-2026-09-20/ci-bootstrap/results.json) |

The shared suite now has 152 more regression cases than the prior 1,074-case run. MCP calibration overlaps some remediation suites, so these command totals are not a count of unique tests.

Both combined runs passed 801 unit/integration tests across 37 suites and 425 Chromium tests across 22 suites, without missing, skipped, retried, or failed cases. All 131 declared input hashes and tool versions stayed unchanged. The first run spanned Dino Lab commit `19a897c23`; the rerun spanned Dino Lab commit `4f1427c91`. Both commits changed Dino Lab implementation, tests, and evidence only. The command-level revision guard correctly kept both runs failed. [Original summary](validation/summary.json), [rerun summary](validation-final/summary.json), and [revision review](revision-review.json) remain intact; no guard or failure was overwritten. A passing result for that final revision guard still requires a run during which Git HEAD stays unchanged.

The dependency-bootstrap check used a fresh minimal isolated package, not a full clean checkout or GitHub job. Browser checks and MCP calibration are deterministic tests; no live-model quality evaluation or human screen-reader session was performed.
