# MCP remediation improvements

Implemented against the existing dirty worktree; no commit, deployment, external upload, or production model call.

## Behavior changes

- Agent-bridge request IDs retain the `mreq-` prefix but include a fresh random attempt nonce. Cancelling/restarting and resuming a saved run cannot reuse a pending request identity. Existing clients continue to echo opaque request IDs as before.
- Background-job records persist and restore a fixed numerical diagnostic capsule. It permits only named counters/timings, a normalized capture timestamp, and at most 128 call/heartbeat rows. Document text, filenames, dynamic keys, warnings, model strings, nonnumeric values, negative values, and nonfinite/out-of-range numbers are omitted. Existing records without diagnostics remain readable.
- Terminal checkpoints now retain the exact source text and compact OCR warning page identities needed for final source-coverage assessment. This fixes resumed terminal checkpoints failing coverage solely because their source text had been discarded. Capsule version is 2; checkpoint envelope version remains 1. The existing 128 MiB JSON and 32 MiB compressed size caps remain enforced. The input/options/engine digest checks continue to bind checkpoint reuse. Old incomplete compact capsules cannot be reused; the driver starts fresh when passed one, and legacy full snapshots remain supported.
- The workflow fencing contract test now requires the current failure-claim marker to exist before checking release/deletion ordering.
- The terminal checkpoint test's mock browser supplies and restores DOMParser, and its publication fixture uses source text that matches its synthetic HTML.

## Exact source/test paths touched by this subtask

- desktop/mcp/alloflow-remediation-mcp-stdio.cjs
- desktop/mcp/remediation_headless_driver.cjs (terminal checkpoint/source coverage regions only; verifier agent also edits this file)
- services/alloflow-remote-mcp/runner/server.cjs (terminal checkpoint allowlist/validator regions only; verifier agent also edits this file)
- tests/mcp_keyless_workflow.test.js
- services/alloflow-remote-mcp/runner/test/checkpoint-terminal-capsule.test.cjs
- services/alloflow-remote-mcp/test/workflow-contract.test.ts

## Focused validation

- 26/26 desktop tests passed: keyless workflow, durable jobs, residual hardening. Includes actual MCP protocol regressions delivering stale replies after cancel/resume and process restart/resume, atomic rejection of mixed valid/stale reply batches, and numerical diagnostics surviving server restart.
- 3/3 terminal checkpoint tests passed. The driver does not rerun fixes when resuming a valid terminal capsule; resulting content coverage and publication match. Persisted OCR errors/low-confidence pages still block tagged export in a fresh browser. Legacy incomplete capsules rerun work safely. Exact-key/source/metadata tampering checks pass.
- 10/10 remote workflow contract tests passed.
- Scoped git diff whitespace checks and JavaScript syntax checks passed.

Evidence: desktop-tests.json, terminal-capsule-tests.log, workflow-tests.json. diagnostics-tests.json records the earlier isolated diagnostics-only pass (other tests intentionally filtered).

Two initial test-harness failures were resolved: large inline preload text exceeded Windows command-line length, so the fixture now launches a temporary script; fixing DOMParser exposed the terminal source-coverage defect subsequently fixed above.

No checkpoint caps were increased. Retaining required source evidence makes some terminal checkpoints larger than before; oversized snapshots retain the existing explicit failure behavior. Runtime/staged package assets must be rebuilt through the repository's normal packaging workflow before release.
