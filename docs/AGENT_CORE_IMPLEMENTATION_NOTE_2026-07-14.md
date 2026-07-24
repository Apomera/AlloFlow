# Agent Core implementation note — smallest extraction seam

**Date:** 2026-07-14
**Task:** Task 1 deliverable from [CLAUDE_HANDOFF_FEDERATED_AGENT_2026-07-14.md](CLAUDE_HANDOFF_FEDERATED_AGENT_2026-07-14.md)

## Findings

The seam is smaller than the handoff assumed. The Blueprint workflow is already
half-extracted into deps-injected module functions:

| Behavior | Where it lives today | Coupling |
|---|---|---|
| Blueprint creation (`autoConfigureSettings`) | `phase_k_helpers_source.jsx:1696` (module: `phase_k_helpers_module.js`); ANTI delegates to it | deps-injected; needs only `callGemini`, `cleanJson`, `setGenerationStep`, `addToast`, `t`, `warnLog`, `history` from the giant deps bag |
| Blueprint revision (`modifyBlueprintWithAI`) | still inline in `AlloFlowANTI.txt:29199` (and `desktop/web-app/src/App.jsx`) | closure over `callGemini`/`cleanJson` only; contains a pure `normalizeBlueprintPlan` worth mirroring |
| Plan normalization (`getBlueprintResourcePlan`) | `phase_o_misc_handlers_source.jsx:499` | pure |
| Execution (`handleExecuteBlueprint` → `executeOneBlueprint`) | `phase_o_misc_handlers_source.jsx:563` | deps-injected; drives `handleGenerate` per plan item |
| Command/plan kernel (`PLAN_CONTRACTS`, `getCommandContract`, `validatePlan`, `runPlan`) | `allo_commands_source.jsx:348–853` | already headless-testable (see `tests/allo_commands_plan.test.js`) |
| Canonical tool IDs | `tool_catalog_source.jsx` → `window.getToolIdsCsv()` / `window.TOOL_CATALOG` | global registry with hardcoded fallback mirrored in phase_k |

The live Blueprint object (output of `autoConfigureSettings`) is unversioned:

```json
{
  "resourcePlan": [{ "tool": "analysis", "directive": "..." }],
  "recommendedResources": ["analysis"],
  "toolDirectives": { "analysis": "..." },
  "lessonDNA": { "essentialQuestion": "...", "goldenThread": [], "keyTerms": [] },
  "globalSettings": { "gradeLevel": "...", "tone": "..." },
  "glossaryConfig": {}, "quizConfig": {}, "outlineConfig": {},
  "visualConfig": {}, "adventureConfig": {}, "brainstormConfig": {}
}
```

Ordering invariant enforced in three places (phase_k normalize, ANTI
`normalizeBlueprintPlan`, phase_o `getBlueprintResourcePlan` consumers):
`analysis` items first, `lesson-plan` items last.

## Chosen seam (what this milestone adds — additive only, zero UI changes)

Two new hand-written CDN modules following the `allo_crypto_module.js`
convention (IIFE, `window.AlloModules.X` registration, dual-mode
`module.exports` for vitest):

1. **`agent_core_contracts_module.js`** (`AlloModules.AgentCoreContracts`) —
   versioned `CapabilityManifest`, `Blueprint`, `Job`, `Provenance` contracts +
   validators, the MCP tool-classification table (emits `title` +
   `readOnlyHint`/`destructiveHint`, enforces the `[a-zA-Z0-9_-]` naming rule),
   and `fromLegacyConfig`/`toLegacyConfig` converters that round-trip the live
   Auto-Fill shape above.
2. **`agent_core_blueprint_service_module.js`**
   (`AlloModules.AgentCoreBlueprintService`) — headless create/revise/validate/
   dry-run service. AI calls (`autoConfigure`, `modifyBlueprint`) are injected
   dependencies, so the UI adapter can pass the existing phase_k/ANTI functions
   unchanged and tests can pass stubs. Execution is NOT performed by the
   service: `planExecution` requires `review.state === "approved"` and returns
   the ordered plan for the existing `handleExecuteBlueprint` path to run.

**Not modified:** `AlloFlowANTI.txt`, `udl_chat_source.jsx`,
`allo_commands_source.jsx`, `phase_k/phase_o` sources, any built module or
mirror. Wiring the UI adapter (ANTI delegating to the service) is a later,
separately-reviewed step; current Auto-Fill behavior is untouched.

## Deliberate decisions

- Tool names in the classification table use underscores only (no dots) —
  Claude's API rejects dotted tool names and MCP clients namespace by server.
- Unknown top-level Blueprint fields are dropped-with-warning during
  normalization (explicit policy per handoff); unknown schema versions and
  unknown tools fail closed.
- Secret-like field names (`/key|token|secret|password|credential/i`) anywhere
  in a Blueprint/manifest fail validation; demo deployment mode cannot
  advertise privileged permissions or catalog staging.
- `validatePlan`/`runPlan` are not duplicated: blueprint tools map to command
  IDs (`quiz` → `generate_quiz`, …) via an optional `getCommandContract` dep so
  the same contract semantics can gate both surfaces without drift.
