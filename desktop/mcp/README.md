# AlloFlow Agent Core - local MCP connector

A local, **stdio-only** MCP server that lets agent clients (Claude Desktop,
Claude Code, and other MCP-compatible tools) talk to the AlloFlow Agent Core.

| Tool | What it does | Annotations |
|---|---|---|
| `capabilities` | Report the deployment CapabilityManifest | read-only |
| `blueprint_validate` | Contract-validate a lesson Blueprint | read-only |
| `artifact_validate` | Structurally validate an artifact/AlloPack envelope | read-only |
| `blueprint_create` | Create a deterministic draft from an explicit plan | draft-writing |
| `blueprint_revise` | Apply explicit pure changes to a draft | draft-writing |
| `blueprint_preview` | Preview ordered steps and missing capabilities | read-only |
| `job_get` | Read local job status | read-only |
| `job_cancel` | Request cancellation of an unfinished job | external-effect |
| `job_get_result` | Read a completed job result | read-only |

The connector has no network listener and makes no outbound request. The Task C
draft operations use the deterministic headless service: they do not invoke a
model, analyze source text, spend quota, or execute artifacts. `blueprint_execute`
is deliberately not registered pending permission-model review.

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

## Jobs and audit trail

Create, revise, and preview currently complete immediately but return Job 1.0
envelopes so clients can use the same polling/result shape as future asynchronous
adapters. Up to 256 jobs/results are retained in memory and are cleared when the
connector exits.

Every `blueprint_create`, `blueprint_revise`, and `job_cancel` attempt appends one
JSON line to:

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
