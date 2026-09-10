# Residual remediation fixes

Implemented all eight findings from the latest review. The live policy is now `20260909-6`; both generated pipeline modules were rebuilt and verified against a fresh source build.

## Changes

- **Native names:** Preserve image alternatives, descendant ARIA names, SVG titles, and directly hidden native labels. Valid identifier renaming, equivalent names, and missing-name repairs remain supported. Hidden descendants of a visible label remain distinct from a directly hidden native label.
- **Tables:** Preserve effective table/grid roles in the live gate. Export acceptance checks the exact required rows and cells against Chromium accessibility identities, roles, names, and ownership. Hidden data, incorrect header names, and reassigned cells fail the contract; valid row headers and image-only headers remain supported.
- **Caption mathematics:** Preserve superscript/subscript attachment and nesting before captions are removed from general text comparison. Neutral wrappers, canonical Unicode equivalents, and descriptive footnote links remain supported.
- **Rendered text:** Bind visible/exposed DOM text to its original canonical character positions. Revealing a duplicate cannot compensate for losing a word from the original instruction. Rewrapping and legitimate hidden-content restoration remain valid.
- **Shared dependencies:** Both checkers now use `dev-tools/document_html_dependencies.cjs` for scripts, responsive images, CSS resources, and animations. Embedded assets and inert data blocks receive consistent treatment. Rendered calibration records the helper's hash and invalidates stale evidence when it changes.
- **Headings:** Normalize both expected and observed heading names with NFC while retaining native identity, level, uniqueness, and meaningful character distinctions.

The build-parity test also uses native `Buffer.equals` comparisons. This retains exact byte comparison while avoiding a generic structural walk through large generated files.

## Validation

**521 distinct automated tests passed: 324 unit/integration tests and 197 Chromium tests.** Final browser runs had no skipped tests, retries, or flaky results.

- 240 focused live-gate tests, including 61 new cases.
- 50 shipping-module, canonical evidence, and generated-build parity tests.
- 34 checker recovery, review, and calibration identity tests.
- 94 rendered/dependency browser tests, including 11 new occurrence cases and 16 cross-checker dependency cases.
- 103 export browser tests, including 28 new table/heading cases.

All **35 saved review examples** now behave as expected: the 17 latest examples and all 18 from the prior review. Original evidence was preserved, and implementation hashes remained unchanged throughout the replay. The local MCP self-test passed with 11 scripted model calls and no source drift.

## Evidence

- [Verified counts, implementation hashes, and module parity](validation-summary.json)
- [Both review batches replayed](review-cases-results.json) and [replay script](verify-review-cases.cjs)
- [Live changes and native-name observations](live/README.md)
- [Shipping-module and evidence integration](integration-final.json)
- [Final fresh-build parity test](build-parity-verified.json)
- [Final checker unit results](checker-unit-final.json)
- [Final rendered and dependency browser results](rendered-final.json)
- [Final export browser results](export-final.json)
- [MCP self-test](mcp-selftest/benchmark-report.json)

Development evidence is retained. The earlier generic Buffer parity assertion exceeded its time limit in both the combined and isolated runs. The verified parity report supersedes that single test; the integration report's other 49 tests passed. The validation summary selects the latest result for each test file and avoids duplicate counts.

These checks use synthetic local fixtures and scripted model transport. Occurrence evidence binds DOM text; accessible alternatives without DOM text still require explicit `name` checkpoints for their identity. No deployment, live-model call, or human screen-reader acceptance test was performed.
