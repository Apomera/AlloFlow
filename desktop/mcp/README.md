# AlloFlow Agent Core - local MCP connector

A local, **stdio-only** MCP server that lets agent clients (Claude Desktop,
Claude Code, and other MCP-compatible tools) talk to the AlloFlow Agent Core.

| Tool | What it does | Annotations |
|---|---|---|
| `capabilities` | Report the deployment CapabilityManifest | read-only |
| `blueprint_validate` | Contract-validate a lesson Blueprint | read-only |
| `artifact_validate` | Structurally validate an artifact/AlloPack envelope | read-only |
| `resource_pack_capabilities` | Discover resource formats, examples, attachment slots, and limits | read-only |
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

The resource-pack tools have three profiles. Omitting `profile` keeps the
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

Use `profile: "native"` for the full native resource catalog, all six notebook
templates, animation and saved image-view state. Call
`resource_pack_capabilities({ profile: "native" })` through your MCP client first
to inspect per-type contracts and examples, attachment slots, and limits. This
read-only discovery tool defaults to native; other pack operations still default
to text. Native supports authored discussion/jigsaw kits, adventures, persona
interviews, document-based inquiry, lesson plans, alignment reports, educator UDL
advice, Word Sounds records, and Gemini Bridge prompt steps. The connector validates and preserves those formats;
it does not execute code, run a simulation, start a conversation, or supply an AI
provider. Gemini Bridge contains prompts for external app generation, not
executable app code. The separate `capabilities` tool reports actual deployment providers.

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

Illustrated attachment slots are `glossary`, `panel`, `anchor`, and `sort`; `index` is
zero-based. Images must be self-contained base64 PNG, JPEG, or WebP data URLs.
Remote URLs, local paths, SVG, and GIF are not accepted as image payloads.
This initial still-image profile also rejects animation frames and nonempty
saved image-view annotations, including image overrides. Attach reviewed artwork
to native panel fields and edit the panels' captions and labels instead; the
validator reports unsupported saved states rather than removing them.
Native adds `single`, `timeline`, `frame` (with `panelIndex`), `override`, `memory`,
and `challenge` attachment slots, bounded GIF payloads, and supported saved
image-view state. Frame replacement also requires a re-encoded GIF in
`playbackDataUrl`. Memory and challenge visuals keep their native review gates;
changing artwork invalidates an earlier visual approval.
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

Math `graphData` uses a static SVG contract in every profile and in both single-
problem and legacy problem-array formats. Shapes, paths, labels, gradients,
clip paths, and markers are supported through presentation attributes. Scripts,
animation, CSS, hyperlinks, embedded images, `use`, foreign content, and external
references are rejected. The discoverable math contract includes a working
example and limits (120,000 characters, 2,048 elements, 32 levels). The app applies
the same policy when rendering graphs. Its embedded policy is synchronized with
`node dev-tools/sync_static_svg_policy.cjs`; `--check` verifies all host copies.

Aggregate raster and animation budgets are documented in
[media budgets](../../docs/mcp_media_budgets.md). Restart a running connector to
load source changes; rebuild/reinstall a packaged connector and deploy the app
to activate their respective changes. Existing exported packs are not rewritten.

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

With no manifest configured, the local deterministic workflow keeps
`artifact:read` and `artifact:draft`. An explicitly configured unreadable or invalid
manifest disables both scopes; only `capabilities` and the protocol handshake
remain available. Manifests are contract-validated and cannot contain secret-like
fields.

Permissions are enforced on every call, including calls to tools omitted from
`tools/list`. `artifact:read` permits validation, discovery, previews, media plans,
and job reads. `artifact:draft` permits create/revise, pack generation, attachment,
export, and cancellation. Each scope is independent. `capabilities` always remains
available so clients can diagnose their configured policy. This is a local process
policy; it is not remote-user authentication or authorization to publish or execute
artifacts.

For the read-only media planner, set 'ALLOFLOW_MCP_MEDIA_INVENTORY_PATH' to a
ProviderInventory 1.0 JSON file. It advertises only provider/model ids,
transport, billing mode, enabled state, and modalities; it cannot contain
credentials or endpoints. Missing or invalid inventory becomes an empty
inventory. Metered selections remain 'input_required' because this MCP phase
does not accept pricing claims from the calling agent.

## Jobs and audit trail

Create, revise, and preview currently complete immediately but return Job 1.0
envelopes so clients can use the same polling/result shape as future asynchronous
adapters. Jobs expire after one hour, with an idle sweep each minute. At most 256
jobs and 32 MiB of serialized job records are retained; each record is limited to
8 MiB. Oldest jobs are evicted when either capacity is reached, and all jobs are
cleared when the connector exits. Clients should retrieve and save needed results
promptly.

Every `blueprint_create`, `blueprint_revise`, `resource_pack_generate`,
`resource_pack_attach_image`, `resource_pack_export`, and `job_cancel` attempt
appends one redacted JSON line to:

```text
<desktop data dir>/agent-core/mcp-audit.jsonl
```

The desktop data dir is `ALLOFLOW_DESKTOP_HOME` when set, otherwise
`desktop/.local`. `ALLOFLOW_MCP_DATA_DIR` is an explicit override for tests or
portable managed launches. Audit records contain only event/time/tool/outcome, a
server-issued job ID when available, one-way hashes of unknown job IDs and
Blueprint IDs, and a coarse error
code. Blueprint content, directives, prompts, model reasoning, and secrets are
never written. Audited state changes fail closed if the audit line cannot be
appended. Rotation retains the active file and two preceding files, each at most
1 MiB; older files and previously oversized audit files are discarded on rotation.
Request IDs in cancellation diagnostics are hashed rather than logged verbatim.

## Transport limits

Input is bounded while streaming, before a complete line is buffered: at most
5,000,000 JavaScript string characters and 8 MiB of UTF-8 bytes per message. An
oversized frame produces one error and is discarded through the next newline;
the session can then continue. Malformed UTF-8 also rejects the entire frame with
a generic parse error, then recovers at the next newline; invalid bytes are never
silently replaced in accepted content. There are at most four active requests and sixteen
queued requests (up to 16 MiB of queued frames). Slow readers pause input and
request dispatch. A response is limited to 16 MiB, and buffered output to 32 MiB;
an exhausted output budget closes the connection rather than growing memory.

JSON-RPC envelopes require a string method, object parameters, and a bounded
string or safe-integer request ID. Tool names must be strings registered in the
explicit tool table. Blueprint plans are limited to 64 steps and directives to
8,000 characters. Request structures are limited to 50,000 values and 32 levels;
diagnostic lists to 100 entries plus an omission notice, with 512-character fields.
These limits retain the existing 5 MB image-attachment transport headroom and do
not change the pack service's separate media and content limits.

Startup manifests and media inventories must be regular files of at most 1 MiB,
with at most 10,000 JSON values and 16 levels. Invalid configuration diagnostics
omit raw file contents and names. A rejected manifest disables tool permissions;
a rejected media inventory advertises no media providers.

## Security regression gate

After changing the connector or its shared pack/rendering policies, run from
the repository root:

```bash
npm run verify:mcp-security
```

This offline gate first checks static SVG policy synchronization and the six
Agent Core module mirrors, then runs the focused stdio and HTTP transport,
startup configuration, SVG/sanitizer, pack/media work budgets, EPUB archive/validator,
and native/illustrated-pack compatibility suites. It uses the repository's installed Vitest directly and
fails if a required check, test file, or dependency is missing. It neither
downloads dependencies nor changes source, builds packages, or deploys anything.
HTTP coverage checks token and origin rejection, loopback binding, and authorized
requests against a temporary local server; it does not contact a hosted service.

The runner isolates temporary files under `tmp/mcp-security/` on Windows and
Unix, removes inherited MCP configuration from test processes, and cleans its
temporary directory after the run. Each failing check stops the gate and returns
a nonzero exit code. `npm run verify:mcp-security -- --list` prints the checked
files and suites. Run dependency-advisory checks separately; this regression
gate does not contact the registry or establish that dependencies are advisory-free.
The MCPB release workflow requires this same gate before packaging, including on
pull requests that change its shared policies, regression suites, or pack fixtures.

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
  results (32 MiB total) are retained for at most one hour and never across a
  connector restart. Draft-writing
  and cancellation attempts write the redacted audit metadata described above;
  payloads and directives are not written.
- **MCP host and model providers:** the calling client may transmit tool inputs
  and results to its configured model provider. Review that client's privacy,
  retention, district-approval, and administrator-control settings before use.
- **Student information:** do not submit student PII unless the institution has
  approved the complete MCP-host/model configuration for that data.
- **Data retention:** job results expire or disappear on connector restart.
  Audit JSONL stays on the local machine, with at most three 1 MiB files retained
  by rotation. Users or institutions may remove these earlier under their policy.
- **Secrets:** provider credentials are never read, returned, or logged;
  contract validation rejects secret-like fields in any payload.
- **Contact:** open an issue on the AlloFlow repository.

(When this ships as an MCPB desktop extension, this section is mirrored into
`manifest.json` `privacy_policies` as required by Anthropic's Connectors
Directory.)
