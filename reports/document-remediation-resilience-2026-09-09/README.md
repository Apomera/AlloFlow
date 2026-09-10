# Remediation meaning preservation and failure recovery

Implemented locally on September 9, 2026. The live acceptance policy is now `20260909-4`; both generated pipeline files were rebuilt and verified byte for byte.

## Changes

- Strict remediation preserves HTML superscript/subscript kind, content, and position, including linked expressions and existing captions. Existing captions use NFC normalization so Unicode exponents cannot collapse into ordinary digits. Equivalent formatting, improved footnote links, and new captions remain supported within the existing repair policy.
- Select options preserve effective disabled state inherited from optgroups, group membership, and existing group labels. Missing labels and equivalent disabled representations remain allowed.
- Baseline export acceptance preserves Unicode superscript/subscript distinctions, rejects incomplete text decoding as unavailable, and reports disabled scripts, unresolved resources, and active animations as incomplete coverage. Inert JSON, embedded assets, local SVG references, and canonical Unicode equivalents remain supported.
- Browser setup/inspection failures close contexts and retain unavailable diagnostics. Rendered checks continue other sides/profiles; valid manifests retain both unavailable and successful pairs. Batch completion rechecks source/candidate files and the manifest itself. An incomplete inspection cannot count as a pass.

## Validation

**259 distinct focused tests passed**, with every requested test file present in the final reports and no skips or retries in the final browser runs:

- 82 focused live-gate tests, including 27 new inline-math/option-group regressions.
- 87 live integration and generated-build parity tests.
- 19 deterministic rendered-recovery tests and two export inspection failure tests.
- 45 native Chromium rendered tests, including the existing 29 authored synthetic fixture cases and three new recovery/CLI tests.
- 24 baseline export tests: 20 new cases and four existing HTML/PDF export regressions.

The local MCP self-test passed in 53.4 seconds using 11 scripted model calls, with no source drift. It does not measure live-model accuracy or human accessibility acceptance. No deployment or live model call was performed.

## Evidence

- [Verified counts, file hashes, and module parity](validation-summary.json)
- [Live focused tests](live-focused-tests.json) and [integration tests](live-integration-tests.json)
- [Rendered recovery unit tests](resilience-unit-tests.json) and [export failure unit tests](export-inspection-unit-tests.json)
- [Rendered browser tests](rendered-browser-tests.json) and [baseline export tests](export-baseline-tests.json)
- [Pre-change baseline false-pass probes](export-baseline-probes.json)
- [MCP self-test](mcp-selftest/benchmark-report.json)
- [Example recovered batch review](batch-recovery-review.html) and [underlying results](batch-recovery-results.json)

These are bounded preservation and automated inspection checks. The rendered comparison remains opt-in. Human screen-reader validation, representative production calibration, OCR accuracy, and description usefulness remain separate work.
