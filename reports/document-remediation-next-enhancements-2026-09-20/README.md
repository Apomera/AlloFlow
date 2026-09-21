# Document remediation enhancements — 2026-09-20

Implemented another focused review and correction pass. Pipeline policy is `20260920-3`; both generated pipeline bundles have been rebuilt.

## Changes

1. **Preserve native form behavior when field names shadow DOM APIs.** Names such as `noValidate`, `matches`, `tagName`, and `parentNode` could hide validation changes, reject harmless repairs, or corrupt traversal. The live strict gate and reading-order check now use trusted native DOM access. Original field names and submitted values are retained.
2. **Preserve form submission encoding.** Changing `accept-charset` could change network bytes without changing DOM values. The gate now compares effective requested encodings, including aliases, ordered fallbacks, UTF-16 output behavior, replacement labels, and `x-user-defined`. ASCII-only label normalization avoids treating Unicode lookalikes as supported labels. Native browser fixtures compare the source, candidate, and actual accepted output.
3. **Keep rendered and export evidence tied to the native DOM.** Named form controls can no longer replace text, attribute/style collections, tag identity, structural traversal, or visibility methods. This closes demonstrated false passes for changed instructions and hidden script dependencies, while accepting equivalent repairs.
4. **Support SVG link target-text evidence.** Same-document SVG links now use the shared destination resolver, including authored bases, encoded fragments, and `href`/`xlink:href` precedence. Missing, external, and undecodable targets remain unavailable.
5. **Strengthen validation evidence requirements.** Both validation commands now require a readable Git revision before and after execution. Explicit identity paths reject symbolic links and junctions in ancestor directories. This deliberately tightens the prior optional-Git policy; unavailable metadata is reported separately from a changed revision.
6. **Bind MCP calibration to its tested inputs.** Calibration records before/after SHA-256 hashes, tool versions, and Git HEAD. Missing or changed inputs, stale loaded manifests, and unavailable revision evidence prevent success. Passing phase diagnostics remain available when final identity verification fails.

The remediation manifest includes the new unit and browser suites. Documentation describes the native evidence behavior and stricter validation policy.

## Final validation

Both final commands exited 0, with no skipped or retried tests. Selected input hashes, tool versions, and Git HEAD stayed unchanged throughout both runs.

| Command | Unit tests | Chromium tests | Total |
| --- | ---: | ---: | ---: |
| `verify:remediation` | 890 | 530 | 1420 |
| `verify:mcp-calibration` | 244 | 12 | 256 |

Remediation covers 38 unit and 24 browser suites, binding 135 input files; calibration covers 21 unit and 2 browser suites, binding 174 input files.

Both commands completed successfully at Git HEAD 22b210e0c6d04fa373b2c8e3cc0994088278df0c. A concurrent repository merge advanced HEAD afterward to b18cebf3ed4197a5c2a795afa0489aac1465446d. All declared input hashes and tool versions still match the completed runs. No validation guard was disabled or changed for this later repository event.

The generated root and desktop bundles are byte-identical, the source retains LF line endings, and the scoped `git diff --check` passed. [Compact verification and final hashes](verification.json).

## Retained evidence

- [Final remediation run](validation-final/summary.json) — maintained source, generated-module, rendered-fidelity, and export-acceptance suites.
- [Final MCP calibration run](calibration-final/summary.json) — protocol and pipeline calibration, including native focus and crop controls.
- [Form implementation and focused results](../document-remediation-enhancements-2026-09-20/forms/README.md) — 63 permanent shared fixtures; final targeted runs passed 63 unit and 63 Chromium cases.
- [Rendered implementation and focused results](rendered-review/README.md) — 42 new regression cases; 174 focused Chromium checks passed.
- [Independent charset review](rendered-review/charset-independent-review.md) — replacement-label and Unicode-lookalike review, native submission observations, and primary-source references.
- [Identity expectations before enforcement](identity-before.json) and [focused identity/contract results after enforcement](identity-after.json) — five expected failures before the changes, then 27 passing checks.
- [Intermediate remediation run](validation/summary.json) and [intermediate calibration run](calibration/summary.json) passed 1,388 and 256 checks respectively. These predate the final replacement-label and ASCII-normalization correction; use the final run identities for the delivered code.

These checks use synthetic local documents and scripted model/MCP transport. Form requests are intercepted before transmission. They do not establish live-model quality or human screen-reader acceptance. Suite totals overlap and should not be added as a count of unique tests. Identity coverage is the declared manifest input set, not automatic discovery of every transitive dependency.
