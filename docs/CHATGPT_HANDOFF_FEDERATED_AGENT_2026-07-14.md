# Handoff: AlloFlow Federated Agent Core — continuation after milestone 1

**Date:** 2026-07-14
**Audience:** ChatGPT (or any implementation agent) taking over with no conversational context
**Prior docs (read in this order):**
1. [ALLOFLOW_FEDERATED_AGENT_ROADMAP_2026-07-14.md](ALLOFLOW_FEDERATED_AGENT_ROADMAP_2026-07-14.md) — strategy
2. [CLAUDE_HANDOFF_FEDERATED_AGENT_2026-07-14.md](CLAUDE_HANDOFF_FEDERATED_AGENT_2026-07-14.md) — original implementation plan (Tasks 1–5)
3. [AGENT_CORE_IMPLEMENTATION_NOTE_2026-07-14.md](AGENT_CORE_IMPLEMENTATION_NOTE_2026-07-14.md) — extraction-seam findings

## What is already DONE (do not redo)

The incoming handoff began from two local commits on `main` (not pushed or deployed):

**`31546a70b`** — Phase 0 contracts + headless Blueprint service:
- `agent_core_contracts_module.js` (`window.AlloModules.AgentCoreContracts`, dual-mode `module.exports`) — versioned (`"1.0"`) validators for CapabilityManifest, Blueprint, Job, Provenance; MCP tool-classification table emitting `title` + `readOnlyHint`/`destructiveHint`; `fromLegacyConfig`/`toLegacyConfig` round-tripping the live Auto-Fill config shape; fail-closed on unknown versions/tools/modes; secret-like field names and absolute paths rejected; demo mode cannot advertise privileged capabilities; unknown fields dropped-with-warning.
- `agent_core_blueprint_service_module.js` (`AgentCoreBlueprintService.createBlueprintService(deps)`) — headless create/revise/reviseWithAI/validate/checkCapabilities/dryRun/approve/planExecution. AI functions (`autoConfigure`, `modifyBlueprint`) are injected. `planExecution` refuses anything whose `review.state !== 'approved'`; any revision resets to `draft`.
- Tests: `tests/agent_core_contracts.test.js`, `tests/agent_core_blueprint_service.test.js`; fixtures in `test_data/agent_core/`.
- Both prior docs updated for the Claude for Teachers launch (2026-07-14): underscore-only tool names (no dots — Claude's API rejects them), MCP annotations as a contract concern, MCPB packaging path, Learning Commons Knowledge Graph as a consumable capability, authoring skill as an early deliverable.

**`6821965b3`** — stdio MCP proof of concept + skill:
- `desktop/mcp/alloflow-mcp-stdio.cjs` — SDK-free newline-delimited JSON-RPC 2.0 stdio server exposing ONLY the read-only first slice: `capabilities`, `blueprint_validate`, `artifact_validate`. stdout = protocol only; logs on stderr. Default manifest is honest-empty; `ALLOFLOW_MCP_MANIFEST_PATH` overrides (invalid file → fail closed to empty). No network listener.
- `validateArtifact` added to the contracts module (envelope: id/type/title/language/data ≤2MB/provenance; `type` = known tool id or `"allopack"`).
- `tests/mcp_stdio_smoke.test.js` — spawns the real process; handshake, annotations, fail-closed validation, protocol errors (−32601/−32602/−32700), stdout cleanliness.
- `desktop/mcp/README.md` — Claude Code/Desktop config examples + the privacy-policy section MCPB submission requires.
- `agent_skills/alloflow-blueprint-authoring/SKILL.md` — teaches an agent the Blueprint 1.0 schema, valid tools, validation rules, pedagogy conventions (lessonDNA/golden thread), and both validation paths.

**Verify before building anything:**

```powershell
npx vitest run tests/agent_core_contracts.test.js tests/agent_core_blueprint_service.test.js tests/agent_core_ui_adapter.test.js tests/mcp_stdio_smoke.test.js
```

Expected: 4 files, 50 tests, all passing. Also `node --check` all three `agent_core_*_module.js` files and `desktop/mcp/alloflow-mcp-stdio.cjs` after any edit.

**ChatGPT hardening follow-up (2026-07-14):** Blueprint and artifact provenance now use the dedicated normalizer; all POSIX absolute paths and payloads deeper than eight levels fail closed; AI revisions preserve non-legacy audience/source context; MCP tools reject pre-initialization calls; and the connector privacy policy distinguishes local connector networking from the selected MCP host/model provider.

**Live-client usability follow-up (2026-07-14):** The real Claude Code run is documented in [MCP_LIVE_CLIENT_FINDINGS_2026-07-14.md](MCP_LIVE_CLIENT_FINDINGS_2026-07-14.md). The MCP server now advertises canonical nested Blueprint/Artifact schemas, malformed plan entries return `invalid-plan-item`, and artifact validation explicitly describes its structural-only scope.

## Settled decisions — do not relitigate

- AlloFlow stays open source, local-first, non-vendor-operated. No AlloFlow-hosted inference, no central student data. PrismFlow is demo-only.
- One Agent Core, many adapters (Canvas in-process, Desktop stdio MCP, district remote MCP, thin Cloudflare catalog). Adapters carry no educational logic.
- Tool names use `[a-zA-Z0-9_-]` only — never dots. The server identity provides the `alloflow` namespace.
- Every tool carries `title` + `readOnlyHint`/`destructiveHint` from `TOOL_CLASSIFICATION` in the contracts module. Add new tools THERE first.
- Agents draft; humans publish/approve. `planExecution` gating on `review.state === 'approved'` is a contract rule — never bypass or "helpfully" auto-approve.
- The stdio server stays SDK-free until the contracts stabilize; if you introduce an MCP SDK, it replaces `alloflow-mcp-stdio.cjs` only, never leaks into the core modules.
- Desktop packaging target is an MCPB bundle (separate Anthropic submission form; privacy policy mandatory). Remote directory listing needs a Team/Enterprise org — deferred.
- Standards lookup should consume the Learning Commons Knowledge Graph MCP connector, not rebuilt data.

## Working-tree rules (CRITICAL — shared dirty tree)

The repository has MANY uncommitted changes belonging to other active work. Before editing, run `git status --short` and expect noise.

- NEVER run `git reset`, `git checkout --`, `git stash`, `git clean`, or a bare `git add -A` / `git commit -a`.
- Commit ONLY with explicit pathspecs: `git add <your files> && git commit -m "..." -- <same files>`.
- Do not touch `AlloFlowANTI.txt`, `desktop/web-app/`, built `*_module.js` files you didn't author, or anything you didn't change.
- The three `agent_core_*_module.js` files are HAND-WRITTEN (no `_source.jsx`, no build step) — edit them directly. Everything else with a `*_source.jsx` twin is generated; don't hand-edit generated output.
- Do not push or deploy. Everything stays local for the maintainer (Aaron) to review.

## Next tasks, in order (stop for review between each)

### Task A: Live-client demo - COMPLETE (2026-07-14)
**Result:** Completed with Claude Code 2.1.207. All three tools were called; the run exposed Blueprint input-schema friction. See [MCP_LIVE_CLIENT_FINDINGS_2026-07-14.md](MCP_LIVE_CLIENT_FINDINGS_2026-07-14.md).

Connect the PoC to one real client and record what happens:
```bash
claude mcp add alloflow -- node desktop/mcp/alloflow-mcp-stdio.cjs
```
(or Claude Desktop config per `desktop/mcp/README.md`). Have the client call all three tools; note schema friction, confusing errors, and description quality. Deliverable: a short findings note in `docs/`.

### Task B: UI adapter for the headless service - COMPLETE (2026-07-14)
**Result:** Complete locally with 100/100 focused tests passing. See [AGENT_CORE_UI_ADAPTER_TASK_B_2026-07-14.md](AGENT_CORE_UI_ADAPTER_TASK_B_2026-07-14.md). Canvas re-paste and CDN publication are required before Canvas use; nothing was deployed.
Wire the live Auto-Fill path through `AgentCoreBlueprintService` WITHOUT changing user-visible behavior:
- The seam: `udl_chat_source.jsx` (~line 203 calls `autoConfigureSettings`, ~282 approval/revision recognition) and `AlloFlowANTI.txt` ~29199 (`modifyBlueprintWithAI`) / ~29661 (`handleExecuteBlueprint` delegating to `PhaseOHandlers`).
- Inject the existing functions as the service's `autoConfigure`/`modifyBlueprint` deps; represent `activeBlueprint` via `fromLegacyConfig`/`toLegacyConfig` at the boundary.
- The UI "Execute" click becomes `approve` + `planExecution` → existing `handleExecuteBlueprint` consumes `legacyConfig`.
- Acceptance: existing Auto-Fill UX byte-identical; `tests/allo_commands_plan.test.js` and all agent-core suites stay green; add a parity test proving UI-created and service-created Blueprints validate identically.
- WARNING: ANTI edits require re-pasting into Gemini Canvas (maintainer workflow) — keep the ANTI diff minimal and flag it clearly in your report.

### Task C: Second-slice MCP tools - COMPLETE (2026-07-14)
**Result:** The six local tools are implemented with bounded in-process jobs and redacted append-only JSONL auditing under the desktop data directory. Deterministic draft calls perform no AI inference or network request. `blueprint_execute` remains OUT. See [AGENT_CORE_MCP_TASK_C_2026-07-14.md](AGENT_CORE_MCP_TASK_C_2026-07-14.md).

### Deferred (do not start)
Cloudflare catalog MCP, district remote MCP/OAuth, MCPB packaging submission, computer control, connector-directory submission.

## Testing expectations

- Focused runs only (`npx vitest run tests/<file>`), never the whole suite with `-u` (`vitest -u` rebaselines every golden in the repo).
- `node --check` every JS file you create or edit.
- Report at handoff: tests run + exact results, tests not run and why, any generated mirrors touched (should be none), schema/compat decisions, security concerns, deployed = no.

## Context that explains "why now"

Claude for Teachers launched 2026-07-14: verified US K-12 teachers get a free year of premium Claude including Claude Code and Cowork, nine education connectors, and the Learning Commons Knowledge Graph connector. Teachers therefore already hold agentic clients that can call AlloFlow the moment adapters exist — which is why the skill + local MCP path was prioritized over remote infrastructure. AlloFlow's differentiation is the open artifact layer, institution-controlled deployment and data pathways, and provider choice, not being another AI provider. Local connector operation does not by itself make a cloud MCP host or model local; districts must approve the complete configuration used with student information.
