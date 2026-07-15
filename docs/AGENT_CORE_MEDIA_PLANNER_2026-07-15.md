# Agent Core capability-aware media planner

Date: 2026-07-15

Status: deterministic dry-run foundation. No MCP tool is registered and no
provider execution path is enabled.

## Purpose

`agent_core_media_planner_module.js` turns a credential-free
`ProviderInventory` and a bounded batch of `MediaRequest 1.0` objects into an
approval-ready plan. This is the negotiation layer between an agent such as
Claude or Codex and the runtime that actually owns Gemini Canvas, local models,
district infrastructure, or user-supplied API access.

The planner does not inspect API keys. A runtime advertises only safe facts:
provider id, model id, transport, billing mode, enabled state, and modalities.

## Planning behavior

For every requested image the planner:

1. selects an approved `imageGeneration` or `imageEditing` capability;
2. separately selects an approved `vision` capability when alt text is
   required;
3. favors explicit provider/model preferences and then included or local
   resources over metered resources;
4. requires a runtime-owned estimate for every metered operation;
5. checks both per-request and aggregate cost/operation ceilings; and
6. returns `executionAuthorized: false` in every plan.

Possible plan states are:

- `ready`: all capabilities and bounded estimates are present;
- `input_required`: selection is possible but current metered pricing is
  missing or invalid;
- `blocked`: a required capability or approved budget is unavailable; or
- `invalid`: the batch, request, or inventory failed contract validation.

## Fallbacks

Fallbacks are suggestions, never automatic substitutions. In particular:

- image generation may be suggested when source-preserving image editing is
  unavailable; and
- a text-only artifact may be suggested when images cannot be delivered.

Both carry `requiresApproval: true`. The planner never claims that a text-only
glossary satisfies a request for illustrated definitions.

## Glossary helper

`createGlossaryMediaBatch` deterministically maps glossary entries to bounded
MediaRequests. Entries with a managed `sourceAsset` become edit requests;
others become generation requests. The helper drafts prompts but performs no
inference and never reads image bytes.

Example:

```js
const batch = Planner.createGlossaryMediaBatch({
  planId: 'water-cycle-glossary',
  entries: [
    {
      id: 'evaporation',
      term: 'Evaporation',
      definition: 'Liquid water changes into water vapor.'
    }
  ],
  providerPolicy: {
    mode: 'deployment-default',
    allowMeteredUsage: false,
    maxCostUsd: 0,
    maxOperations: 2
  },
  batchPolicy: { maxCostUsd: 0, maxOperations: 2 }
});

const dryRun = Planner.planMediaBatch(batch, safeInventory, {});
```

With an included Gemini Canvas image model and an included vision model, this
plans two operations and zero metered cost. If only a metered provider is
approved, the runtime must inject current estimates before the plan can become
ready.

## Security boundary

- Batch size is capped at 500 requests.
- Credentials and secret-like field names are rejected recursively.
- Absolute filesystem paths are rejected; source images use opaque managed
  asset handles.
- Provider inventory remains free of credentials and endpoints.
- The planner contains no fetch, filesystem write, provider adapter, or MCP
  registration.

## Recommended MCP progression

The first MCP exposure should be a read-only `media_plan` tool returning this
dry-run result. Paid `asset_generate_image` or `asset_edit_image` tools should
remain unregistered until the permission, pricing-policy, asset-transfer, job,
and explicit-approval boundaries are tested together in the desktop runtime.
