# AlloFlow Agent Core - local MCP connector

A local, **stdio-only** MCP server that lets agent clients (Claude Desktop,
Claude Code, and other MCP-compatible tools) talk to the AlloFlow Agent Core.

| Tool | What it does | Annotations |
|---|---|---|
| `capabilities` | Report the deployment CapabilityManifest | read-only |
| `blueprint_validate` | Contract-validate a lesson Blueprint | read-only |
| `artifact_validate` | Structurally validate an artifact/AlloPack envelope | read-only |
| `resource_pack_generate` | Assemble and validate an agent-authored AlloPack draft | external-effect |
| `resource_pack_validate` | Validate renderer shapes, privacy, and size | read-only |
| `resource_pack_preview` | Create a teacher-review preview | read-only |
| `resource_pack_export` | Serialize a validated .allopack.json payload | external-effect |
| `resource_pack_attach_image` | Attach an embedded image and accessibility metadata to a copy of an illustrated AlloPack | external-effect |
| `blueprint_create` | Create a deterministic draft from an explicit plan | draft-writing |
| `blueprint_revise` | Apply explicit pure changes to a draft | draft-writing |
| `blueprint_preview` | Preview ordered steps and missing capabilities | read-only |
| `media_plan` | Plan bounded media operations against configured provider capabilities | read-only |
| `job_get` | Read local job status | read-only |
| `job_cancel` | Request cancellation of an unfinished job | external-effect |
| `job_get_result` | Read a completed job result | read-only |

The connector has no network listener and makes no outbound request. The resource-pack tools are intentionally provider-neutral: the calling agent supplies generated history, and this connector only assembles, validates, previews, and exports it. `media_plan`
uses a separately configured, credential-free ProviderInventory and never executes
its result or accepts agent-supplied pricing. The Task C
draft operations use the deterministic headless service: they do not invoke a
model, analyze source text, spend quota, or execute artifacts. `blueprint_execute`
is deliberately not registered pending permission-model review.

## Illustrated AlloPacks

The resource-pack tools have two explicit profiles. Omitting `profile` keeps the
existing text profile and its 12 resource types. Use `profile: "illustrated"`
when validating, reviewing, exporting, or adding images to an illustrated pack:

```js
await callTool('resource_pack_validate', { pack, profile: 'illustrated' });
await callTool('resource_pack_preview', { pack, profile: 'illustrated' });
await callTool('resource_pack_export', { pack, profile: 'illustrated' });
```

These are illustrative MCP client calls; `pack` is the complete parsed AlloPack,
not only its `history`. Validation and export preserve the accepted pack's native
fields, including credits, accessibility metadata, and lesson configuration.
For an existing pack, use these tools rather than passing its history through
`resource_pack_generate`, which composes a new envelope. For a new pack, put
`profile: "illustrated"` inside the generation `request`; this also permits
authored `image`, `memory-aid`, and `applied-challenge` resources.

The calling agent or host generates or obtains the image and reviews its actual
contents. The connector then attaches supplied bytes without image generation,
URL fetching, or image-file access:

```js
const result = await callTool('resource_pack_attach_image', {
  pack,
  profile: 'illustrated',
  attachment: {
    resourceId: 'water-cycle-glossary',
    slot: 'glossary',
    index: 0,
    dataUrl: reviewedImageDataUrl,
    alt: 'Two views of the same pavement show a puddle becoming smaller.',
    altSource: 'vision'
  }
});
// On success, result.value is the updated pack; the input pack is unchanged.
```

Attachment slots are `glossary`, `panel`, `anchor`, and `sort`; `index` is
zero-based. Images must be self-contained base64 PNG, JPEG, or WebP data URLs.
Remote URLs, local paths, SVG, and GIF are not accepted as image payloads.
This initial still-image profile also rejects animation frames and nonempty
saved image-view annotations, including image overrides. Attach reviewed artwork
to native panel fields and edit the panels' captions and labels instead; the
validator reports unsupported saved states rather than removing them.
`decorative: true` identifies a decorative image; use empty alt text for it.
Otherwise supply meaningful alt text of at most 250 characters. `altSource` is
`vision`, `author`, or `planning`; it defaults to `planning`, which does not claim
that someone inspected the image. The attachment operation calculates the hash
that associates the alt metadata with the image. Keep these fields when editing or
exporting; changing image bytes requires renewed alt-text review.

The illustrated profile bounds embedded media, dimensions, placement count,
non-image text, and serialized pack size. See the
[authoring reference](../../docs/AGENT_CORE_RESOURCE_PACK_AUTHORING.md) for limits
and workflow details. A tool preview is a structured review summary, not a
rendered student view. Import and inspect the exported pack in AlloFlow before
calling it classroom-ready.

## Requirements

- Node.js 18+
- A checkout (or install) of AlloFlow — the server loads
  `agent_core_contracts_module.js` from the repository root.

## Claude Code

From the repository root:

```bash
claude mcp add alloflow -- node desktop/mcp/alloflow-mcp-stdio.cjs
```

## Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config),
replacing `<ALLOFLOW_ROOT>` with your checkout path:

```json
{
  "mcpServers": {
    "alloflow": {
      "command": "node",
      "args": ["<ALLOFLOW_ROOT>/desktop/mcp/alloflow-mcp-stdio.cjs"]
    }
  }
}
```

Packaging note: the distribution form for Claude Desktop will be an MCP
Bundle (MCPB) desktop extension with one-click install; this loose-file setup
is the development path.

## Advertising real capabilities

By default the server reports an **empty, honest** manifest (no providers).
To advertise what your machine actually provides, point
`ALLOFLOW_MCP_MANIFEST_PATH` at a JSON CapabilityManifest:

```json
{
  "schemaVersion": "1.0",
  "deploymentMode": "desktop-local",
  "text": { "available": true, "providers": ["alloflow-local"] },
  "imageGeneration": { "available": true, "providers": ["sd-local"] },
  "permissions": ["artifact:read", "artifact:draft"]
}
```

An invalid manifest falls back to the empty one (fail closed). Manifests are
contract-validated and can never contain secret-like fields.

For the read-only media planner, set 'ALLOFLOW_MCP_MEDIA_INVENTORY_PATH' to a
ProviderInventory 1.0 JSON file. It advertises only provider/model ids,
transport, billing mode, enabled state, and modalities; it cannot contain
credentials or endpoints. Missing or invalid inventory becomes an empty
inventory. Metered selections remain 'input_required' because this MCP phase
does not accept pricing claims from the calling agent.

## Jobs and audit trail

Create, revise, and preview currently complete immediately but return Job 1.0
envelopes so clients can use the same polling/result shape as future asynchronous
adapters. Up to 256 jobs/results are retained in memory and are cleared when the
connector exits.

Every `blueprint_create`, `blueprint_revise`, `resource_pack_generate`,
`resource_pack_attach_image`, `resource_pack_export`, and `job_cancel` attempt
appends one redacted JSON line to:

```text
<desktop data dir>/agent-core/mcp-audit.jsonl
```

The desktop data dir is `ALLOFLOW_DESKTOP_HOME` when set, otherwise
`desktop/.local`. `ALLOFLOW_MCP_DATA_DIR` is an explicit override for tests or
portable managed launches. Audit records contain only event/time/tool/outcome, a
job ID when available, a one-way hash of the Blueprint ID, and a coarse error
code. Blueprint content, directives, prompts, model reasoning, and secrets are
never written. Audited state changes fail closed if the audit line cannot be
appended.

## Manual test

```bash
node desktop/mcp/alloflow-mcp-stdio.cjs
```

then paste (one line each):

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"manual","version":"0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"capabilities","arguments":{}}}
```

The automated protocol smoke test lives at `tests/mcp_stdio_smoke.test.js`
(`npx vitest run tests/mcp_stdio_smoke.test.js`).

## Privacy Policy

This connector process runs entirely on your device. The MCP host or model
client that calls it may operate locally or may send tool inputs and results
to a cloud service under that provider's terms and organizational controls.

- **Connector networking and collection:** none. This connector has no network
  listener, makes no outbound requests, and does not independently collect or
  transmit data.
- **Usage and storage:** payloads are processed in memory. Up to 256 local job
  results are retained only for the connector process lifetime. Draft-writing
  and cancellation attempts write the redacted audit metadata described above;
  payloads and directives are not written.
- **MCP host and model providers:** the calling client may transmit tool inputs
  and results to its configured model provider. Review that client's privacy,
  retention, district-approval, and administrator-control settings before use.
- **Student information:** do not submit student PII unless the institution has
  approved the complete MCP-host/model configuration for that data.
- **Data retention:** job results disappear on connector restart. Audit JSONL is
  retained on the local machine until the user or institution removes it under
  its own retention policy.
- **Secrets:** provider credentials are never read, returned, or logged;
  contract validation rejects secret-like fields in any payload.
- **Contact:** open an issue on the AlloFlow repository.

(When this ships as an MCPB desktop extension, this section is mirrored into
`manifest.json` `privacy_policies` as required by Anthropic's Connectors
Directory.)
