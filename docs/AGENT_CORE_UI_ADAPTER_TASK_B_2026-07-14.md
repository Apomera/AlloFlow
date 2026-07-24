# Agent Core UI adapter - Task B implementation note

**Date:** 2026-07-14
**Status:** Complete locally; not pushed, deployed, or pasted into Gemini Canvas

## Outcome

The live Auto-Fill path now crosses the versioned Agent Core boundary without changing the legacy object shape held in React state or consumed by the Blueprint card and Phase O executor. Creation, AI revision, validation, explicit UI approval, and execution planning are all mediated by the same headless service used by MCP/headless callers.

## Architecture

- `agent_core_ui_adapter_module.js` is a pure, dual-mode adapter. It depends on `AgentCoreContracts` and `AgentCoreBlueprintService`, accepts the live Auto-Fill and AI-revision functions as injected dependencies, and contains no React, network, provider, or educational-generation logic.
- `activeBlueprint` remains the existing legacy Auto-Fill configuration. The adapter converts with `fromLegacyConfig` at entry and `toLegacyConfig` at return, so the visible card and downstream handlers receive the same shape as before.
- UDL Chat now calls the adapter for both Blueprint creation branches and the Blueprint-review AI revision branch. The original `autoConfigureSettings` and `modifyBlueprintWithAI` functions remain unchanged and are injected into the service.
- Every `handleExecuteBlueprint` call, including the card button and chat confirmation, now converts and validates the current legacy config, records the explicit UI approval marker `ui-confirmation`, calls `planExecution`, and gives only the returned `legacyConfig` to the unchanged Phase O handler.
- Missing Agent Core modules or invalid Blueprints fail closed. There is no fallback that bypasses validation or approval.

## Deployment and module loading

- `build.js` now manages and copies `agent_core_contracts_module.js`, `agent_core_blueprint_service_module.js`, and `agent_core_ui_adapter_module.js`.
- Canvas source loads the three modules from the AlloFlow CDN before UDL Chat. Firebase-owned sources load the same three files locally.
- The three Agent Core public mirrors and the generated UDL Chat public mirror match their root modules byte-for-byte.
- `desktop/web-app/src/App.jsx` and its ANTI backup contain the same Task B changes; their only file-level difference is the existing line-ending convention.
- The broad `node build.js --mode=dev` generator was intentionally not run because it would overwrite unrelated dirty-tree work. The established `_build_udl_chat_module.js` builder was run for UDL Chat only.

## Verification

- Focused Agent Core and Auto-Fill run: 7 files, 100 tests, all passing.
- Agent Core-only command: 4 files, 49 tests, all passing.
- UI adapter parity suite: 4/4 passing. It proves service-created and UI-boundary-created Blueprints normalize identically, revisions return the legacy UI shape, execution requires approval, and all three host copies retain the gate.
- Existing `allo_commands_plan`, Blueprint-mode guardrails, and pack-choice flow remain green.
- Syntax checks passed for the new adapter, generated UDL Chat modules, build registry, and public adapter mirror.
- `npm run verify:build`, `npm run verify:view-props`, and `npm run verify:registry` passed.
- Scoped `git diff --check` is required at final handoff and should remain clean.

## Security and compatibility decisions

- The approval marker represents an explicit click/chat confirmation at the UI authorization boundary; it is not exposed as an MCP/model-callable approval tool.
- Capability-manifest enforcement is not added to the live UI execution call yet. Omitting it preserves existing behavior while the permission/provider UX is reviewed. The contract approval gate is active.
- The UI stores no prompt or chain-of-thought provenance, and student information is not introduced into Agent Core logging or transport.
- The adapter uses the live ToolCatalog IDs when present and falls back to the contract catalog only if ToolCatalog is unavailable.

## Maintainer action required before Canvas use

`AlloFlowANTI.txt` changed. The updated Canvas source must be re-pasted through the normal maintainer workflow. The three new/updated Agent Core files and generated `udl_chat_module.js` must also be published to the configured CDN before that Canvas paste can load them. Nothing was deployed during this task.

## Review boundary

Task B is complete. The maintainer subsequently authorized Task C; its local draft/job slice is documented in [AGENT_CORE_MCP_TASK_C_2026-07-14.md](AGENT_CORE_MCP_TASK_C_2026-07-14.md). `blueprint_execute` remains excluded until the permission model is separately reviewed.
