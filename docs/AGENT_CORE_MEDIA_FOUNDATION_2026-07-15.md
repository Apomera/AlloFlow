# Agent Core provider-neutral media foundation

Date: 2026-07-15

## Outcome

`agent_core_media_contracts_module.js` defines the inert contract boundary for
future agent-directed image generation and editing. It is additive and is not
loaded by the current Gemini, Canvas, desktop, or MCP execution paths.

`MEDIA_EXECUTION_DEFAULT_ENABLED` is `false`. The module does not register MCP
tools, inspect environment variables, read API keys, call a provider, write an
asset, or change the existing `callGemini`, `callImagen`, or
`callGeminiImageEdit` routing.

## Safe discovery

`ProviderInventory 1.0` lets an agent see only approved, non-secret labels:

- provider id and display name;
- transport class (`host-subscription`, `api`, `local`, or
  `district-managed`);
- billing class (`included`, `metered`, `local-resource`, or `unknown`);
- enabled model ids and supported modalities.

Credentials, tokens, passwords, absolute paths, endpoint configuration, and
embedded image bytes are rejected. Actual credentials remain inside the
future runtime adapter or operating-system/district credential store.

## Media request contract

`MediaRequest 1.0` supports `generate` and `edit` operations. It carries:

- an explicit prompt and educational purpose;
- opaque managed handles for source and reference assets;
- normalized output dimensions, MIME type, and quality;
- an accessibility rule (alt text is required by default);
- an explicit provider allow-list when requested;
- separate approval for metered usage;
- maximum cost and operation limits.

The agent never receives a filesystem path or image bytes. Large artifacts
will later move through a managed local asset store or district-owned blob
store outside model context.

## Preflight and completion rules

`preflightMediaRequest` selects only an enabled model that advertises the
required modality. Metered providers are excluded unless
`allowMeteredUsage: true`; allow-listed mode cannot silently fall back to a
different provider.

`MediaResult 1.0` cannot validate as complete without a managed asset. When a
request requires alt text, the completed asset must contain it. Results that
exceed the approved cost or operation count fail validation rather than being
reported as successfully completed.

## Current non-behavior

This phase deliberately does **not**:

- expose `asset_generate_image`, `asset_edit_image`, or `asset_attach` through
  the current MCP server;
- add or enable `blueprint_execute`;
- change the Gemini provider defaults or request payloads;
- make OpenAI, Gemini API, or local-model network calls;
- allow an agent to inspect or choose credentials;
- create, import, attach, or export files.

## Verification

Run:

```bash
npx vitest run tests/agent_core_media_contracts.test.js tests/agent_core_contracts.test.js tests/agent_core_blueprint_service.test.js tests/mcp_stdio_smoke.test.js
npm run verify:gemini
```

The contract suite covers secret rejection, managed handles, included versus
metered provider selection, modality preflight, accessibility completeness,
and cost/operation ceilings. Existing Agent Core and MCP smoke tests remain in
the same regression command.

## Next guarded phase

Before any execution tool is registered:

1. Add an injected managed-asset-store interface with no raw path exposure.
2. Implement provider adapters behind the common request/result contract.
3. Pin the existing Gemini adapter with request-shape regression fixtures.
4. Correct and test OpenAI image generation/editing against its current API,
   including multipart upload and reference-image behavior.
5. Add cost estimation before approval and redacted actual-usage auditing.
6. Run cross-provider educational-image fixtures and manual review.
7. Enable tools only behind an explicit local/district feature flag and MCP
   write approval.

