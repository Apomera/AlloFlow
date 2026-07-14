# AlloFlow Agent Core — local MCP connector (proof of concept)

A local, **stdio-only** MCP server that lets agent clients (Claude Desktop,
Claude Code, and other MCP-compatible tools) talk to the AlloFlow Agent Core
contracts. First slice is deliberately read-only:

| Tool | What it does | Annotations |
|---|---|---|
| `capabilities` | Report the deployment's CapabilityManifest | read-only |
| `blueprint_validate` | Contract-validate a lesson Blueprint | read-only |
| `artifact_validate` | Contract-validate an artifact/AlloPack envelope | read-only |

No network listener, no generation, no quota spend, no write path. Execution
and media tools arrive in a later slice after the permission model is
reviewed (see `docs/ALLOFLOW_FEDERATED_AGENT_ROADMAP_2026-07-14.md`).

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

This connector runs entirely on your device.

- **Data collection:** none. No data leaves your machine through this
  connector; it has no network listener and makes no outbound requests.
- **Usage and storage:** tool inputs (Blueprints, artifact envelopes) are
  validated in memory and returned to the calling agent; nothing is written
  to disk by this connector.
- **Third-party sharing:** none.
- **Data retention:** none — the process is stateless between messages.
- **Secrets:** provider credentials are never read, returned, or logged;
  contract validation rejects secret-like fields in any payload.
- **Contact:** open an issue on the AlloFlow repository.

(When this ships as an MCPB desktop extension, this section is mirrored into
`manifest.json` `privacy_policies` as required by Anthropic's Connectors
Directory.)
