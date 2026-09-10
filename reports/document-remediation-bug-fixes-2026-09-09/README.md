# Document remediation review fixes

Implemented all 13 findings from the September 9 bug review. The live acceptance policy is now `20260909-5`; both generated pipeline modules were rebuilt and verified byte for byte.

## Changes

- **Live acceptance, findings 1–4:** Preserve effective native field names and resolved descriptions/relationships, including field units. Consistent ID renaming and equivalent names remain valid. Capture superscript/subscript attachment before normalizing link wording. Reject effective table-header role downgrades while retaining constrained scope correction.
- **Baseline export, findings 5, 10, 11, 13:** Check exposure of the exact table and required headers. Account for relative CSS dependencies using an isolated document origin and CSS inspection. Normalize both sides of HTML/PDF table expectations with NFC. Distinguish inert XML/data blocks from executable script types using browser-verified controls.
- **Rendered comparison, findings 6–9 and 12:** Compare descendant visible/accessibility text when those properties accompany a text checkpoint. Respect ancestor opacity for `display:contents`. Preserve selected-option identity and literal relative link references. Bound only requested observations. Valid visibility restoration, harmless wrappers, and large unrequested text remain supported.

## Validation

**422 distinct automated tests passed: 280 unit/integration tests and 142 Chromium tests.** Browser runs completed without skipped tests, retries, or flaky outcomes.

- 145 focused live-gate tests, including 43 new regressions and valid-repair controls.
- 103 shipping-module, source-association, evidence, and build-parity tests. Five original harmful examples also run through the generated module and verify source retention plus canonical rejection evidence.
- 67 rendered browser tests and 30 rendered unit tests.
- 75 export browser tests and two export inspection-failure tests.

The independent replay of **all 18 original review cases passed** against the final implementations: harmful changes are caught, while the valid-content cases pass. The original review evidence was preserved. Implementation hashes were checked before and after the replay.

The local MCP self-test passed in **20.9 seconds** with 11 scripted model calls and no source drift. This is a functional smoke check; the duration is not a performance comparison or live-model quality measurement.

## Evidence

- [Verified counts, final implementation hashes, and module parity](validation-summary.json)
- [Original-case replay results](original-cases-results.json) and [replay script](verify-original-cases.cjs)
- [Live-gate changes and test evidence](live/README.md)
- [Shipping-module and evidence integration tests](integration-tests.json)
- [Rendered comparison changes and test evidence](rendered/README.md)
- [Export changes and test evidence](export/README.md)
- [MCP self-test](mcp-selftest/benchmark-report.json)

Initial development reports are retained. The validation summary selects the latest results for each unit-test file, so the corrected positive test fixture in the initial live run is superseded by its passing final run. Browser totals use the final combined runs.

No deployment or live-model call was performed. Optional rendered comparisons still assess authored checkpoints; whole-document fidelity, representative production calibration, and human screen-reader acceptance remain outside this automated validation.
