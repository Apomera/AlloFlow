# Claude Handoff: AlloFlow Federated Agent Core and MCP

**Date:** 2026-07-14  
**Audience:** Claude Code or another implementation agent taking over with limited conversational context  
**Primary roadmap:** [ALLOFLOW_FEDERATED_AGENT_ROADMAP_2026-07-14.md](ALLOFLOW_FEDERATED_AGENT_ROADMAP_2026-07-14.md)

## Read this first

The user wants AlloFlow to remain open source, local-first, and non-vendor-operated. Do not redesign it as an AlloFlow-hosted SaaS. Do not use the PrismFlow Firebase demo as a production backend.

The intended system has one reusable Agent Core and several adapters:

1. Gemini Canvas calls the core in-process.
2. AlloFlow Desktop exposes the core through a local MCP `stdio` process.
3. Districts may self-host an authenticated remote MCP adapter.
4. Cloudflare exposes only a thin public catalog/discovery/submission MCP surface.
5. AlloBot and Video Studio continue to use the same command and plan contracts.

The first implementation target is the Agent Core and a local proof of concept. Do not begin with remote hosting, computer control, or a complete tool inventory.

## User decisions that are already settled

- PrismFlow is a demo, not production infrastructure.
- AlloFlow does not provide default hosted inference.
- Users run through Gemini Canvas, Desktop with their own provider/local models, or district-owned infrastructure.
- The user does not want to become an inference or student-data vendor.
- AlloFlow will remain open source.
- Community Library publication must remain governed and reviewable.
- MCP is an adapter around AlloFlow capabilities, not a replacement for native AlloBot behavior.
- Computer control may be added later, but semantic commands are the primary path.
- Claude’s lack of native image generation is not a blocker: AlloFlow routes media work to configured cloud or local providers.

## Market context added 2026-07-14

Claude for Teachers launched the day this handoff was written: verified US K-12 educators get a free year of premium Claude including Claude Code and Cowork, nine curated education connectors, the Learning Commons Knowledge Graph MCP connector (standards for all 50 states), and an open-source skills repo with eval rubrics (`anthropics/k12-teacher-skills`). Consequences for this work:

- Teachers — not just technical users — now hold agentic clients that can call AlloFlow. The audience for the local connector is larger and less technical than originally assumed.
- An **AlloFlow authoring skill** (SKILL.md teaching Claude the Blueprint/AlloPack contracts) is a zero-infrastructure adapter that can ship as soon as the Phase 0 contracts exist. Treat it as a deliverable alongside the contracts, not a Phase 5 afterthought.
- Directory realities: desktop extensions are packaged as MCP Bundles (MCPB) and submitted via a separate form (no Team/Enterprise org needed); remote-server directory listings require a Team/Enterprise Claude org; every listed tool needs `title` + `readOnlyHint`/`destructiveHint`; local connectors need a privacy policy in README and `manifest.json` or face immediate rejection.
- Standards lookup should be a routable capability that can consume the Learning Commons Knowledge Graph connector rather than rebuilt data.

## Working-tree warning

The repository was already heavily modified and contained many untracked files when this handoff was written. Those changes belong to the user and other active work.

Before editing:

```powershell
git status --short
```

Rules:

- Do not reset, clean, revert, or broadly reformat the worktree.
- Do not stage unrelated files.
- Inspect overlapping files before patching.
- Prefer new focused modules and tests over large rewrites of `AlloFlowANTI.txt`.
- Generated/public mirrors follow repository-specific build workflows; do not hand-edit generated output unless the existing subsystem requires it.

## Current implementation evidence

### Command and plan kernel

`allo_commands_source.jsx` already contains important agent primitives:

- `PLAN_CONTRACTS` around line 348.
- `getCommandContract` around line 418.
- `validatePlan` around line 440.
- `planUtterance` around line 771.
- `runPlan` around line 823.

The implementation already supports:

- Structured command metadata.
- `demoSafe`, interaction, terminal, requirement, and output declarations.
- Planner filtering.
- Parameter sanitization.
- Sequential execution with fresh context.
- Stop and failure handling.
- Restrictions against destructive planner execution.

`tests/allo_commands_plan.test.js` covers multi-step planning, unknown commands, confidence, dependency validation, destructive actions, parameter bounds, demo-safe filtering, sequential awaits, timeouts, and stopping.

Do not replace this subsystem with a new agent framework. Extract and reuse it.

### Auto-Fill Blueprint path

`udl_chat_source.jsx` currently drives the guided Auto-Fill flow:

- Around line 203, it calls `autoConfigureSettings(...)` to build the Blueprint.
- Around line 282, it recognizes approval or revision.
- It calls `modifyBlueprintWithAI(...)` for changes.
- It calls `handleExecuteBlueprint()` after approval.

`AlloFlowANTI.txt` around line 28071 includes an agent entry that deliberately reuses the production Auto-Fill toggle/path. Preserve this parity.

The current problem is not missing behavior; it is that important behavior is coupled to UI state and handlers. The Agent Core should make the same workflow callable headlessly while an adapter keeps the UI working.

### Provider abstraction and media

`ai_backend_module.js` is already provider-neutral:

- The class documentation begins around line 209.
- `generateImage` begins around line 1611.
- Image-provider overrides route to Imagen, Flux/OpenAI-compatible endpoints, or local SD-Turbo.
- `_openaiGenerateImage` first probes a local Flux server on port 7860.
- `editImage` begins around line 1789.
- Text providers include Gemini, OpenAI-compatible services, Claude, LocalAI, LM Studio, Ollama, and AlloFlow Local.

Do not require the MCP client’s model to supply every modality. The Agent Core should ask the capability registry for an available provider and return a clear configuration requirement when none exists.

### Desktop local runtime

`desktop/runtime/alloflow-desktop-runtime.cjs` already provides a private local service:

- Defaults to `127.0.0.1`.
- Creates the runtime server around line 4618.
- Manages provider status, local text inference, local ASR, app lifecycle, LAN sessions, and optional School Box components.

`desktop/contracts/runtime-contract.json` documents the boundary:

- Desktop command center is local by default.
- The built-in text engine binds to `127.0.0.1` only.
- LAN Share deliberately exposes a restricted route set.

The MCP process can either import reusable core modules directly or use new private localhost endpoints. Prefer direct/shared service calls where feasible; do not expose Agent Core operations through the student LAN Share listener.

### Cloudflare public infrastructure

Cloudflare is not merely hypothetical:

- `alloflow-cdn.pages.dev` serves modules and catalog assets.
- `catalog/cloudflare-worker/` contains the `alloflow-catalog-submit` Worker.
- `catalog/cloudflare-worker/src/index.js` accepts lesson and translation submissions, bug reports, PD submissions, and plugin submissions.
- Lesson submissions are PII-rescanned and currently committed to `catalog/pending/` in the public GitHub repository.
- Bug, PD, and plugin submissions use private KV bindings.

Important risk: `catalog/cloudflare-worker/README.md` warns that pending lesson submissions enter public Git history. Before agent-assisted submissions are enabled, change lessons to private staging and publish only after human approval.

The Cloudflare Worker should not perform general lesson inference or store student records.

## Proposed core contracts

Use versioned schemas. Names may be adjusted to repository conventions after inspection, but keep the conceptual separation.

### CapabilityManifest

Suggested fields:

```json
{
  "schemaVersion": "1.0",
  "deploymentMode": "desktop-local",
  "text": { "available": true, "providers": ["alloflow-local"] },
  "vision": { "available": false, "providers": [] },
  "imageGeneration": { "available": true, "providers": ["sd-local"] },
  "imageEditing": { "available": false, "providers": [] },
  "speech": { "tts": false, "asr": true },
  "webSearch": { "available": false },
  "catalog": { "read": true, "stage": false },
  "permissions": ["artifact:read", "artifact:draft"]
}
```

Never expose keys, secret values, raw authorization tokens, or sensitive paths.

### Blueprint

The Blueprint should be an educational intent and workflow description, not a snapshot of React state.

Minimum concepts:

- Schema version and Blueprint ID.
- Source reference or source text policy.
- Grade/age band, subject, standards, language, interests, and accessibility needs.
- Requested resources and their parameters.
- Dependencies and execution order.
- Required capabilities.
- Warnings, missing inputs, and review state.
- Provenance for machine-generated revisions.

### Job

Minimum concepts:

- Job ID, Blueprint ID, status, current step, progress, warnings, and timestamps.
- Status values such as `queued`, `running`, `input_required`, `completed`, `failed`, and `cancelled`.
- Safe cancellation boundary.
- Result artifact IDs rather than embedding large binary payloads.

### Provenance

Minimum concepts:

- Generating/revising provider and model when available.
- Source and license declarations.
- Generation and validation timestamps.
- Blueprint/contract versions.
- Validation result and reviewer state.
- No hidden chain-of-thought or secret prompt storage.

## Proposed MCP tools

Do not expose all tools in the first slice.

**Naming rule:** tool names use only `[a-zA-Z0-9_-]` — no dots. Claude's API rejects dotted tool names, and MCP clients namespace by server (`mcp__alloflow__blueprint_create`), so the `alloflow` prefix belongs to the server, not the tool. **Annotation rule:** every tool carries an MCP `title` and the applicable `readOnlyHint`/`destructiveHint`, emitted from the contract-level tool classification (Connectors Directory hard requirement).

### First slice (all read-only, `readOnlyHint: true`)

1. `capabilities`
2. `blueprint_validate`
3. `artifact_validate`

These tools prove transport, contracts, error handling, and safety without causing generation costs or external effects — and this exact shape passes directory review easily later.

### Second slice

1. `blueprint_create`
2. `blueprint_revise`
3. `blueprint_preview`
4. `blueprint_execute`
5. `job_get`
6. `job_cancel`
7. `job_get_result`

### Later media tools

- `asset_generate_image`
- `asset_edit_image`
- `asset_attach`

### Separate public catalog tools

- `catalog_search`
- `catalog_get`
- `catalog_validate_submission`
- `catalog_stage_submission`
- `catalog_get_submission_status`

Do not expose `publish` in the initial public MCP server.

## Implementation sequence

### Task 1: Repository reconnaissance

Read completely before editing:

- `docs/ALLOFLOW_FEDERATED_AGENT_ROADMAP_2026-07-14.md`
- `allo_commands_source.jsx`
- `tests/allo_commands_plan.test.js`
- The relevant Blueprint portions of `udl_chat_source.jsx`
- The definitions of `autoConfigureSettings`, `modifyBlueprintWithAI`, and `handleExecuteBlueprint`
- Relevant provider methods in `ai_backend_module.js`
- `desktop/contracts/runtime-contract.json`
- The desktop runtime security/origin checks around its private route handling

Then write a short implementation note identifying the smallest extraction seam. Do not infer that `AlloFlowANTI.txt` is the only maintainable source; follow the existing source/build conventions for each module.

### Task 2: Contract-only implementation

- Add versioned contract definitions and validators.
- Include a tool-classification table that emits MCP `title` + `readOnlyHint`/`destructiveHint` annotations and enforces the `[a-zA-Z0-9_-]` naming rule at schema level.
- Add fixtures for valid, invalid, old-version, missing-capability, and demo-mode cases.
- Keep validators pure and usable in browser and Node contexts.
- Do not introduce an MCP SDK yet if doing so would obscure contract design.

Expected tests:

- Valid objects normalize predictably.
- Invalid/unknown tool or resource IDs fail closed.
- Additional fields follow an explicit policy.
- Secrets and unsafe path-like fields are rejected or redacted.
- Demo mode cannot request privileged actions.

### Task 3: Blueprint service extraction

- Create a headless service around Blueprint creation, revision, validation, preview, and execution planning.
- Introduce a UI adapter that passes current state/dependencies into the service.
- Preserve current user-visible behavior and review step.
- Reuse `validatePlan` and `runPlan` where the semantics match.
- Avoid importing React into the core service.

Expected tests:

- Current Auto-Fill configuration can be represented as a Blueprint.
- A revision changes only requested fields.
- Validation catches missing providers and command dependencies.
- Dry-run produces an ordered plan without side effects.
- Approval is required before effectful execution.

### Task 4: Local MCP proof of concept

- Add a small local `stdio` process, preferably under a focused desktop integration directory.
- Ensure stdout contains only valid MCP protocol messages; use stderr for logs.
- Expose only the first-slice tools, each with `title` + `readOnlyHint`/`destructiveHint` annotations.
- Plan the packaging as an MCP Bundle (MCPB) for Claude Desktop one-click install; draft the required privacy policy (README section + `privacy_policies` in `manifest.json`) at the same time.
- Add a local manual test and automated protocol smoke test.
- Package configuration examples without hardcoding machine-specific paths.

### Task 4b (parallel, cheap): AlloFlow authoring skill

- Draft a SKILL.md that teaches Claude the Blueprint/AlloPack contracts, validation rules, and pedagogy conventions, referencing the same versioned schemas from Task 2.
- Follow the structure of `anthropics/k12-teacher-skills` (skill packaged in a plugin, `evals/` rubrics alongside).
- This requires no server or transport and can be demonstrated in Claude Code immediately.

Do not add public HTTP exposure. If a local HTTP bridge is needed, bind it to `127.0.0.1`, validate origins, authenticate privileged calls, and keep it outside LAN Share.

### Task 5: Stop and review

After the local proof of concept:

- Demonstrate it with one compatible local client.
- Report tool schemas, exact data flow, provider calls, and files written.
- Compare a Blueprint created through MCP with the current UI flow.
- Do not proceed automatically to Cloudflare or district remote MCP work.

## Security and privacy requirements

- Tools are least-privilege and role-scoped.
- Read, draft, execute, export, stage, and publish are distinct permissions.
- Destructive actions never appear in automatic plans.
- Provider secrets never enter prompts, tool responses, logs, or artifacts.
- Student information is excluded from the public catalog path.
- Public submissions use private quarantine before publication.
- Demo deployments advertise only demo-safe capabilities.
- Local endpoints bind to loopback and retain existing DNS-rebinding/origin defenses.
- Agent/tool inputs are untrusted and must be schema-validated.
- Retrieved source content must not be allowed to redefine tool permissions.
- Logs should record actions and outcomes, not sensitive full prompts by default.

## Testing expectations

Run focused tests first. Candidate commands, adjusted to actual package scripts:

```powershell
npx vitest run tests/allo_commands_plan.test.js
node --check allo_commands_module.js
node --check desktop/runtime/alloflow-desktop-runtime.cjs
```

Add targeted tests for each new module. Do not run or update broad snapshots unless a relevant change requires it. Do not update unrelated golden files to make a broad test run green.

At handoff, report:

- Tests run and exact results.
- Tests not run and why.
- Any generated mirrors updated.
- Any schema or compatibility decisions.
- Remaining security concerns.
- Whether anything was deployed. The default should be “not deployed.”

## Initial definition of done

The first milestone is complete when:

1. Versioned capability and Blueprint contracts exist with tests.
2. A headless validator/dry-run path reuses existing command semantics.
3. Current Auto-Fill UI behavior is not regressed.
4. A local MCP client can call three read/validation tools without public infrastructure.
5. No secrets, student data, or production actions leave the device.
6. The implementation is documented well enough for a second contributor.

It is not necessary for the first milestone to generate every resource, operate images, control the UI, access Cloudflare, or support remote web clients.

## Questions that may be deferred until after the proof of concept

- Exact MCP SDK/package choice and update policy.
- Whether the local process imports the Agent Core or calls private localhost endpoints.
- Final directory and package naming.
- KV versus R2 for private lesson quarantine.
- OAuth identity provider choices for district deployments.
- Whether a university/nonprofit steward will own the public Cloudflare/GitHub infrastructure.
- Connector-directory submission and branding.
- Computer-control framework selection.

## Do not do these things

- Do not turn PrismFlow into the production endpoint.
- Do not add an AlloFlow-hosted model gateway.
- Do not couple Blueprint schemas to one model’s prompt format.
- Do not expose arbitrary filesystem or shell execution through MCP.
- Do not expose raw React state or every setter as tools.
- Do not make the public Worker a proxy to private teacher desktops.
- Do not auto-publish Community Library submissions.
- Do not start computer-control work before semantic parity is proven.
- Do not overwrite unrelated changes in the dirty worktree.

## Suggested prompt for the next Claude Code session

> Read `docs/ALLOFLOW_FEDERATED_AGENT_ROADMAP_2026-07-14.md` and `docs/CLAUDE_HANDOFF_FEDERATED_AGENT_2026-07-14.md` completely. Inspect the current command, Blueprint, provider, and desktop-runtime code named in the handoff. Do not modify PrismFlow, Cloudflare, or deployment infrastructure. Implement only the first contract-focused milestone and the smallest headless Blueprint validation/dry-run seam, preserving the existing UI and dirty worktree. Add focused tests, run them, and stop for review before adding an MCP SDK or remote endpoint unless the contract work genuinely requires one.

## Strategic reminder

The goal is not to make AlloFlow another AI provider. The goal is to make AlloFlow the open educational workflow and artifact system that many AI providers can operate safely.
