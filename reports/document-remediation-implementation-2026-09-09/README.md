# Document remediation refinements implemented

Implemented the five findings from the September 8 review. Changes are local; nothing was deployed or committed.

## Behavior changes

- **Known content changes retain the original.** Strict repair rejects detected changes to source values, wording/order, and unsupported additions. This promotes the previously discarded accepted-candidate warnings into the existing durable rejection history. The review panel explains the reason, and acknowledging a rejection does not certify or alter the document.
- **Table values and spans are protected.** The shared check catches changed values, missing table structure, altered cell grids, and span changes. Header promotion and equivalent decimal/thousands formatting remain valid. Prose checks include single digits, signs, percentages, and units; numeric normalization preserves large identifiers without floating-point rounding and does not collapse dotted version identifiers.
- **Links retain their destinations.** Existing links preserve their ordered destinations, including web, email, and internal links. Descriptive wording can improve. New local skip controls can be added when their target exists, including when an ordinary source link already uses that target.
- **Images retain their surrounding context.** Asset identities and order remain protected, and the strict check also compares nearby content and existing captions. Moving an unchanged image from the Sunlight section into Shade is rejected.
- **Useful accessibility metadata has a bounded allowance.** Quoted alt/label/reference/scope/language attributes can grow without tripping the general relative HTML ceiling. The allowance is limited to 2,048 characters per matched attribute and 65,536 added metadata bytes per comparison. Oversized metadata and unrelated attribute padding still face the original limits; text limits remain in force.

The shared contract now runs in normal fixes, chunk and image/split retries, assembled output, the alternate axe repair path, and manual section re-fixes. Rejections are available in callbacks/results and use the canonical browser/desktop/report schema. The section-review callback checks current operation ownership before retaining evidence, including when later processing fails. Nested fix deltas are counted once.

The pipeline cache policy advanced to `20260909-1`, preventing reuse of results produced under the previous policy. Pipeline and review modules were rebuilt and synchronized with their desktop public copies. Local runner staging and its generated release contract were refreshed.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Focused source, shipping-module, review, ownership, routing, OCR, and build-parity regressions | 247 passed across 16 files, consolidated by latest file result | [Validation summary](validation-summary.json) |
| Remote public report contract | 21 passed | [Report tests](remote-report-tests.json) |
| Actual local browser/MCP pipeline, scripted model | Passed; 44.8-second trial, 11 scripted calls, no implementation drift | [MCP benchmark](scripted-mcp/benchmark-report.json) |
| Shipping module mirrors | Both exact byte matches | [Bundle hashes](bundle-verification.json) |
| Runner packaging | 71 dependencies staged and verified | Local `stage-runner.cjs` and `--check` completed successfully |
| Edited source whitespace | Passed | `git diff --check` |

The combined final test run recorded 246 passes and one 30-second timeout in an existing test that parses and traverses both large source files to inspect lifecycle event ownership. An initial isolated rerun also timed out. The complete 18-test lifecycle suite then passed with a 120-second allowance; its AST test completed in 23.8 seconds. The consolidated 247 total uses that final file result and counts each test once. No application changes were made between the final combined run and these lifecycle reruns.

The first development run's one failing assertion expected a table defect to reach the assembly gate. The stricter fragment gate rejected it earlier. That regression test now checks preservation and the rejection reason without requiring a later failure phase. New behavioral cases exercise both short and chunked inputs, positive repairs, exact-value edge cases, canonical serialization, the generated module, and stale/failed section-review callbacks.

## Boundaries

These changes address the reproduced preservation failures. Rejected fixes leave the original accessibility issue for subsequent repair or review; they do not mean the document is fully remediated. Intentional recovery of explicitly supplied missing source passages retains its separate recovery policy. Arbitrary table merges, link retargeting, and figure relocation are not approved by the general strict fix.

Figure context is a bounded association check, not a complete canonical page/block model or a proof that alt text matches image pixels. Existing export validators and human review remain necessary. No live-provider quality/cost measurement, human calibration, native screen-reader acceptance, or production deployment was performed. Those broader follow-on activities remain outside this implementation's validation.

Usage: [Preservation review and source-preserving repair](../../docs/document-remediation-review.md).
