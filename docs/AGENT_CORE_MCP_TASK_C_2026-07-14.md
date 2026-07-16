# Agent Core MCP Task C completion note

**Date:** 2026-07-14
**Scope:** local stdio MCP second slice only
**Status:** complete locally; not pushed or deployed

## Delivered

- `blueprint_create`: deterministic draft creation from an explicit plan and audience settings.
- `blueprint_revise`: pure explicit revision through `AgentCoreBlueprintService`; edits always return to draft review state.
- `blueprint_preview`: side-effect-free ordered step and capability preview.
- `job_get`, `job_cancel`, and `job_get_result`: bounded local Job 1.0 status/result protocol.
- Append-only JSONL audit records for every create, revise, and cancellation attempt.

All current draft/preview operations complete immediately, but the job envelope keeps
the client contract compatible with future asynchronous local or district-owned
adapters. At most 256 jobs/results are held in memory; none survive connector restart.

## Audit and privacy boundary

The audit file is `<desktop data dir>/agent-core/mcp-audit.jsonl`. The connector
uses `ALLOFLOW_DESKTOP_HOME`, matching the desktop runtime, with `desktop/.local`
as the development fallback. `ALLOFLOW_MCP_DATA_DIR` is an explicit test/managed
launch override.

Each line contains only schema/event/timestamp/tool/classification/outcome, an opaque
job ID when available, a truncated SHA-256 Blueprint reference, and a coarse error
code. It never stores Blueprint payloads, lesson directives, prompts, model reasoning,
or credentials. Audited state changes are committed only after the audit append
succeeds; an unavailable audit path fails closed.

## Preserved boundaries

- stdio only; no listener or outbound network request
- no AI provider, source-text analysis, inference, or quota spend
- no Firebase/PrismFlow dependency
- no artifact execution
- `blueprint_execute` is not registered
- jobs/results remain local to the connector process

## Verification

```powershell
node --check desktop/mcp/alloflow-mcp-stdio.cjs
npx vitest run tests/agent_core_contracts.test.js tests/agent_core_blueprint_service.test.js tests/agent_core_ui_adapter.test.js tests/mcp_stdio_smoke.test.js
```

The MCP test covers initialization, annotations and schemas, create -> result ->
revise -> result -> preview -> result, completed-job cancellation, unknown jobs,
rejected draft calls, redacted audit contents, protocol errors, and the continued
absence of `blueprint_execute`.

## Deferred

Permission-model review and any `blueprint_execute` exposure remain separate work.
Cloudflare catalog MCP, district remote MCP/OAuth, MCPB packaging/submission, and
computer control also remain deferred.
