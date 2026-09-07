# Verification improvements — 2026-09-07

Implemented shared PDF evidence normalization and final delivery decisions across desktop MCP, remote runner, and the public report sanitizer.

- Valid PDF/UA failures, unavailable validators, skipped validation, and the finalization reserve now produce review-required delivery. Remote reports preserve HTML verification separately.
- Executed remote PDF validation carries SHA-256, byte length, profile, validator version, timestamp, and duration. Producer and public consumer compare that identity with the emitted PDF.
- Missing/invalid counts, contradictory results, zero executed checks/rules, unexpected profiles/jobs, and unsuccessful processes claiming a pass cannot become passing PDF evidence. Real packaged veraPDF 1.30.2 exits 1 for normal noncompliance; this failure result is preserved.
- Ace rejects empty/unrecognized/malformed execution trees; EPUBCheck rejects messages contradicting its severity counts.
- The workflow accepts review-required completed artifacts. Runner staging includes the shared policy, required narration planner, and shared browser evidence module; the test loads the staged driver and verifies every eager local import and browser module against source.
- Historical validator reports lacking all identity/time fields remain retrievable as unavailable (`validator_evidence_unbound`). Partially supplied or mismatched provenance still rejects, and the producer cannot pass unbound evidence.

Validation completed:

| Check | Result |
| --- | --- |
| Focused adapter/readiness/EPUB/packaging Vitest suites | 58 passed |
| Public report service tests | 21 passed |
| Complete mocked remote runner server suite | 19 passed |
| Remote service TypeScript | Passed |
| Runner staging / read-only check contract | 1 passed |
| Packaged veraPDF on existing multi-column fixture | Noncompliant, 5 failed rules, 3,778 failed checks; digest retained |

The actual CLI fixture run and normalized result are recorded in `real-verapdf.json` and `real-verapdf-normalized.json`. The final combined test result is `focused-tests-final.json`; earlier `focused-tests.json` records an esbuild/jsdom test-loader collection failure corrected before the final run. No deployment was performed. After the root reviewer confirmed stable renderer builds, this subtask ran the scoped staging/check test. Staged runtime files were refreshed, and the tracked runner-release-contract.ts changed only its two generated hashes.

Changed application paths in this subtask:

- desktop/mcp/remediation_verification.cjs
- desktop/mcp/remediation_verification.d.cts (new)
- desktop/mcp/remediation_headless_driver.cjs (validator and rejection continuity; MCP agent separately changed source-coverage resume handling)
- desktop/mcp/remediation_epub_validation.cjs
- services/alloflow-remote-mcp/runner/server.cjs (verification producer and rejection continuity; MCP agent separately changed source-coverage capsule fields)
- services/alloflow-remote-mcp/scripts/stage-runner.cjs
- services/alloflow-remote-mcp/src/remediation-report.ts
- services/alloflow-remote-mcp/src/remediation-workflow.ts
- services/alloflow-remote-mcp/src/runner-release-contract.ts (generated hashes only)

Regression tests:

- tests/mcp_verification_adapters.test.js (new)
- services/alloflow-remote-mcp/runner/test/server.test.cjs
- services/alloflow-remote-mcp/test/remediation-report.test.ts
- services/alloflow-remote-mcp/scripts/test/stage-runner.test.cjs


Final rejection-evidence continuity:

- The shared schema/sanitizer retains a counter capped at 1,000,000 and at most 100 records with only pass, chunkId, phase, and known reason codes. Unrecognized records/private extras are discarded.
- The driver now carries this evidence through terminal capsules and publication. Remote and desktop schema-2 capsule readers keep the new fields optional, normalize old safe capsules to 0/[], and bound supplied records. Remote report producer/public retrieval and desktop tool schema/output use the same projection.
- Headless follow-up AI and axe fixes capture each pass delta before verification can fail or HTML can be reverted. Counters retain primary history without adding record lengths twice. Diagnostic-only Object.assign updates preserve object identity and hidden live-verification proof, including after canonical rehydration.
- Fresh/resumed output and accepted-round terminal resume retain exactly the same safe evidence. Tests enforce non-enumerable verification proof, AI/axe accepted/unverified/regressed outcomes, isolated-VM browser serialization, and desktop saved-report/restart/reuse continuity.

Final additional validation:

| Check | Result | Evidence |
| --- | --- | --- |
| Terminal/headless continuity, including 6 follow-up scenarios |6 passed|candidate-terminal-tests.log|
| Adapter and remote producer/public roundtrip |38 passed|candidate-public-roundtrip-tests.json|
| Service public report schema |21 passed|candidate-public-schema-tests.json|
| Complete mocked runner server suite |19 passed|candidate-runner-tests.log|
| Desktop output/schema/report/restart/reuse integration |1 passed|../mcp/rejection-keyless-final.json|
| Remote TypeScript |Passed|candidate-typescript.log|
| Final staged dependency and read-only check contract |1 passed|candidate-staging-test.log|
| Final real MCP selftest (MCP agent) |11 checks passed|../mcp/mcp-selftest-final.json|

The final staging attempt passed after a transient Windows directory-rename failure on its first attempt. Driver source was checked against the prior staged current copy: only the intended rejection-continuity delta was present, including all prior validator/source-coverage edits intact. Final staging refreshed current stable renderer bundles and the generated release hashes; no deployment occurred.

Additional changed paths for this final continuity work: desktop/mcp/alloflow-remediation-mcp-stdio.cjs; shared verification.cjs/.d.cts; remediation_headless_driver.cjs; remote runner/server.cjs; remote src/remediation-report.ts; generated runner-release-contract.ts; runner/test/checkpoint-terminal-capsule.test.cjs; tests/mcp_verification_adapters.test.js; tests/mcp_keyless_workflow.test.js; remote test/remediation-report.test.ts. Shared driver/stdio/server/test files also contain separately coordinated root/MCP-agent edits.
