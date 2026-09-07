# Verification and delivery review — 2026-09-07

Reviewed the current source, not prior review conclusions. No application code was changed. Run `node reports/document-remediation-review-2026-09-07/verification/probe.cjs` from the repository root to reproduce the saved `probe-results.json`. The probes load actual source; the private remote report helpers are exported only inside an in-memory Node module. Validator boundary probes deliberately inject malformed reports, and do not imply real veraPDF or Ace emitted those reports in this run.

## Findings that affect ordinary output/report paths

### P1 — Remote delivery remains ready/verified after a valid noncompliant PDF/UA result

The remote runner checks `remediationQuality()` before independent validation, then `buildReport()` copies that quality unchanged and appends PDF/UA evidence. A normal report with `status: 'noncompliant'`, two failed rules, and three failed checks still returns `distributionLevel: 'ready'`, `verificationState: 'complete'`, and `taggedPdfDelivery: 'verified'`. The public report sanitizer accepts and preserves this combination. Users or integrations consuming the headline summary can distribute an independently failed PDF as verified.

- Source: `services/alloflow-remote-mcp/runner/server.cjs:1497`, `:1513`, `:1589`, `:1597`, `:1930`, `:1952`; `services/alloflow-remote-mcp/src/remediation-report.ts:537`.
- Evidence: `remoteNoncompliantDelivery` and `remotePublicNoncompliantDelivery` in the probe JSON. Existing runner test `services/alloflow-remote-mcp/runner/test/server.test.cjs:444` deliberately exercises a noncompliant result and expects a successful request; it passed during this review, but does not assert a downgraded headline.
- Recommendation: reuse a single final delivery reducer across local MCP and remote runner. Preserve HTML verification separately, then derive delivered-PDF readiness after PDF validation. The local MCP already performs that downgrade in `desktop/mcp/remediation_verification.cjs:18` and renames an unverified PDF with `review-required` in the filename at `desktop/mcp/alloflow-remediation-mcp-stdio.cjs:2686`.

### P2 — A legitimate finalization-budget outcome makes the public report unreadable

When less than one second remains for PDF validation after preserving upload time, the runner emits `{status:'unavailable', reason:'attempt_finalization_reserve'}`. Its normalizer explicitly accepts the reason. The public sanitizer accepts only `validator_not_available`, `validator_timeout`, and `validator_error`, so the runner's own report is rejected with `remediation_report_malformed`.

- Source: `services/alloflow-remote-mcp/runner/server.cjs:1923`, `:1557`; `services/alloflow-remote-mcp/src/remediation-report.ts:484`.
- Evidence: `remoteFinalizationReserve` in the probe JSON. It sends the runner's normalized value into the real bundled TypeScript sanitizer; result is `accepted:false` and `remediation_report_malformed`.
- Recommendation: share the reason enum/schema between producer and consumer, preserve this outcome, and cover it with a contract test. Readiness should remain review-required because independent verification did not finish.

## Defensive correctness gaps confirmed with injected malformed evidence

### P2 — veraPDF adapter can manufacture a passing result from missing counts and a failed process

The CLI parser checks only that a boolean `compliant` and a truthy `details` exist. Missing, negative, oversized, or noninteger counts are normalized to zero. It never rejects a nonzero child exit code when JSON exists. A child that exits 1 after emitting `compliant:true, details:{}` therefore becomes `status:'compliant'`, zero failures, and zero passed checks. The local MCP adapter converts that result into evidence that `pdfUaEvidence()` accepts as `passed`, despite its otherwise strict downstream checks.

- Source: `desktop/mcp/remediation_headless_driver.cjs:2058`, `:2069`, `:2075`, `:2088`; bridge at `desktop/mcp/alloflow-remediation-mcp-stdio.cjs:277`.
- Evidence: `pdfCliIncompleteCountsAndFailedExit` and `finalPdfEvidenceFromMalformedCli` in the probe JSON. Uses the driver's existing `spawnProcess` injection hook and an existing PDF fixture; no real validator defect is claimed.
- Recommendation: reject missing/invalid summary counts before normalization; enforce a consistent job/profile/overall-result contract and recognized exit behavior; require evidence of executed validation. Keep absent evidence unavailable rather than converting it to zero findings. Add malformed-report cases beside the existing immutable-snapshot/cancellation tests.

### P2 — Ace can report a pass with zero recognized assertions

`parseAce()` rejects an empty top-level assertions array, but a nonempty array containing `{}` passes that guard. Its recursive parser recognizes no executed leaf assertions, then trusts the overall pass. It returns `status:'passed', assertions:0`. The EPUB pipeline treats passed EPUBCheck and Ace checks as complete for tested scope. This is a malformed-report edge case, not a failure observed with the installed real Ace runtime.

- Source: `desktop/mcp/remediation_epub_validation.cjs:27` through `:42` and final aggregation in `validate()`.
- Evidence: `aceEmptyExecution` in the probe JSON. A related `epubcheckContradiction` shows zero counters plus an ERROR message is also treated as passed; EPUBCheck parsing trusts severity counters without reconciling messages.
- Recommendation: require at least one recognized leaf assertion, reject malformed assertion nodes, and fail closed on contradictions between aggregate outcomes and individual findings. Expand the existing malformed-report tests beyond an empty top-level array.

## Additional improvement opportunities, not established normal-path failures

- **Centralize evidence semantics.** The shared policy rounds/clamps negative or fractional counts to zero (`accessibility_evidence_source.jsx:536`), while MCP `auditChecks()` requires nonnegative safe integers. Shared policy also ignores `chunksRequested/chunksAudited` unless a separate partial flag is provided, whereas the main pipeline has an exact-coverage predicate at `doc_pipeline_source.jsx:59`. The probes demonstrate the inconsistent answers, but did not establish a current standard pipeline path emitting those contradictory inputs without the protective flags. Treat this as drift prevention, not proof that normal remediation currently skips most AI sections.
- **Use the conservative Equal Access review count everywhere.** Shared policy takes the maximum of explicit review count and potential+manual counts (`accessibility_evidence_source.jsx:620`); MCP `auditChecks()` prefers an explicit zero (`desktop/mcp/remediation_verification.cjs:43`). Probe input with aggregate zero and five detailed review findings is reported passed by MCP. The normal engine currently computes the fields together, so this is another contradictory-input hardening opportunity.
- **Keep independent validation provenance in remote reports.** The CLI produces input SHA-256, byte length, timestamp, and duration, but remote `normalizePdfUaValidation()` drops them. The probe deliberately uses mismatched validator/artifact hashes to show that the remote report builder never compares them. Local MCP already binds and checks those fields against the actual output. Port that binding to remote delivery for protection against future adapter changes and easier evidence review.
- **Portable independent review is appropriately described as an attestation.** Its worksheet hashes source, plan, and output HTML; checks exact item IDs; and requires a fresh-context declaration and actionable discrepancy notes. `alloflow_portable.py:4381` explicitly says the script cannot prove reviewer independence. Retain that wording. Do not relabel an attestation as an independent executable validator or legal compliance certificate.

## Validation performed

- Production-code probe: completed successfully; detailed JSON saved alongside this report.
- `node --test --test-name-pattern='publishes bounded veraPDF evidence|attempt timing' services/alloflow-remote-mcp/runner/test/server.test.cjs`: **2 passed**, zero failed (about 2.4 seconds runtime).
- A seven-file existing Vitest run covering MCP readiness, EPUB, portable verification/core, shared evidence, and PDF self-check/font veto was stopped after its first reported suite took about 506 seconds. tests/portable_remediation_core.test.js reported **11 tests, 4 failures**: reports a no-service, deny-network capability contract (36.7 s); uses local Chromium for a tagged PDF when that optional capability exists (202.1 s); keeps the artifacts and report when strict PDF/UA mode fails (85.4 s); passes strict PDF/UA mode when the finalizer runs (119.2 s). Final assertion diagnostics were not emitted before stopping. These are unresolved test failures; host contention may contribute but was not established as their cause. The remaining files are not counted as passed. Only the test runner started by this reviewer and its descendants were targeted for stopping.

