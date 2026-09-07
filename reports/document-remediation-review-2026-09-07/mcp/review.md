# MCP and remote pipeline review

Reviewed the current worktree, including existing uncommitted source changes. No application source was modified. New probes execute current source with local doubles and do not upload documents or contact models.

## Confirmed findings

### P1: Fence agent replies across resumed attempts

`desktop/mcp/alloflow-remediation-mcp-stdio.cjs:1407` reuses a saved `runId` during resume, but line 1417 resets `requestSeq` to zero and line 1475 creates request IDs from that counter alone. The resume handler at line 4630 preserves the run ID. The reply handler at line 4764 looks up only the supplied request ID in the current attempt's pending map.

Consequently, a delayed response to `mreq-1` from a cancelled/disconnected attempt can satisfy a different `mreq-1` after resume. The new request can concern different content when a previous file is now skipped through a completion manifest, the source has changed, or the restarted pipeline takes a different path. This can silently feed the wrong audit or replacement HTML into remediation.

`probe-stale-agent-reply.cjs` executes the current `startAgentRun` and `remediation_agent_respond` implementations with a stubbed model-dependent pipeline. It demonstrates different old/new prompts sharing the same run/request identity, and the old answer being accepted into the resumed result. Evidence is saved in `stale-agent-reply-result.json`.

Use a fresh attempt nonce in each published request ID (or globally unique request UUIDs), carry attempt identity through requests/responses, and reject replies from older attempts. Add a restart/cancel/resume regression that delivers an old response after the next attempt has published its first request.

### P2: Align finalization-reserve report reasons across runner and gateway

The runner emits `pdfUaValidation: {status: 'unavailable', reason: 'attempt_finalization_reserve'}` when less than one second remains for validation after reserving upload time (`services/alloflow-remote-mcp/runner/server.cjs:1924`). Its normalizer explicitly permits this reason at line 1557. The public report type and sanitizer do not permit it (`services/alloflow-remote-mcp/src/remediation-report.ts:35`, `:484`); the sanitizer throws `remediation_report_malformed`.

That turns a deliberately bounded validator skip into a failed report request after the runner has already produced/uploaded its output. Add this reason to a shared report contract and round-trip all valid runner validation outcomes through the gateway sanitizer. The verification reviewer independently reproduced the same issue. A second local source-executing probe is also included here.

## Verified strengths

- Desktop durable jobs use identity-bound input/options/engine digests, atomic checkpoint publication, a two-phase terminal intent, and fail-closed required persistence. Cancellation is committed before work is killed. Completion manifests rehash source and artifacts before reuse.
- The remote workflow claims attempt ownership in D1, fences previous attempts before destroying containers, renews leases during a live runner request, and tolerates transient lease-store errors within explicit lease slack.
- The remote runner bounds storage transfers and checkpoint size, carries cancellation through stalled response bodies, reserves time for publication/validation, reuses locally completed artifacts after a transient upload failure, and suppresses document-bearing free-form diagnostics at the container log boundary.
- Publication checks active-content scan evidence, verification binding, original-layout tagged-PDF delivery, complete auditor coverage, and R2 size/hash metadata. Failed or cancelled jobs have explicit artifact/checkpoint cleanup paths.

## Focused validation

- Desktop: `desktop_mcp_durable_jobs`, `desktop_mcp_residual_hardening`, and `desktop_mcp_completion_manifest_race`: **16/16 tests passed in 3 files**.
- Remote runner: **44/45 tests passed**. The terminal-capsule resume integration test at `runner/test/checkpoint-terminal-capsule.test.cjs:511` fails with `ReferenceError: DOMParser is not defined`. Its scripted browser at line 468 executes page evaluation in a Node realm without DOMParser; current driver source-coverage checks now use DOMParser. This is a test harness regression, not evidence of a production-browser failure. Update the mock browser or run this contract in a real browser before relying on the terminal-resume regression gate.
- Remote gateway: **150 tests passed in 18 files**; 2 suites (`pilot-discovery` and `worker`) could not collect because installed workerd rejects **win32 arm64 LE**. This platform limitation prevents claiming a complete remote gateway pass here.
- Stale agent reply: reproduced by executing current source. No production, Gemini or upload calls.

## Improvements to prioritize

1. Fix attempt identity on the keyless agent bridge and unify the runner/gateway validation-reason contract.
2. Add producer-to-consumer report contract tests and real-browser checkpoint-resume coverage. Some existing workflow tests assert source substrings rather than behavior; one fencing assertion compares an absent `await failJob(` marker (`-1`) to a later destruction offset, so it can pass without proving the intended order (`test/workflow-contract.test.ts:37-52`). Require every marker to exist, then prefer fault-injection tests that verify side effects.
3. Persist bounded job diagnostics in durable records: `enqueueJob` captures `job.diagnostics` at desktop line 1300, while `persistJob` serializes no diagnostics field. `remediation_job_diagnostics` therefore loses otherwise captured metrics after restart. A compact, versioned numerical diagnostics capsule would support slow/failing batch diagnosis without retaining document text.
4. Unify maintenance across desktop jobs, agent runs, and narration caches. Agent runs expire for resume after 30 days but intentionally remain on disk, and narration caches/indexes remain until removed; the privacy documentation accurately discloses this. Add an explicit dry-run/execute cleanup tool with counts and retention choices for institutional maintenance.
5. Derive remote companion capability metadata from the canonical inventory instead of fixed counts (`pilot-capabilities.ts:104`, `:140`; `pilot-server.ts:77` still declare 27 desktop tools). Keep runtime packaging, advertised validators, and tool counts tied to the same release artifact.

## Local MCP testing entrypoint

`node mcp-testing/tools/mcp_call.cjs call desktop/mcp/alloflow-remediation-mcp-stdio.cjs remediation_selftest --timeout 120000 --stderr`

Use an isolated `ALLOFLOW_MCP_STATE_DIR` before spawning the server so discovery/selftest does not restore unrelated queued jobs. The CLI kills its server after one call; multi-call start/respond/poll workflows need a persistent MCP session. The root reviewer ran a separate real-browser local selftest successfully.

Cloudflare review guidance was retrieved from the current Workers best-practices and Rules of Workflows documentation. Findings above are based on repository code and local evidence, not assumptions about current platform limits.
