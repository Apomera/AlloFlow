# Using the AlloFlow remediation connector from any MCP host

The connector is a plain MCP server: newline-delimited JSON-RPC over stdio by default, with an
optional Streamable HTTP transport. Nothing in it depends on Claude. The bundled skill and prompt
are standard MCP features that hosts without skill support simply ignore.

## Get the files

Either work from a checkout of this repository, or extract the release bundle. The `.mcpb` file is a
zip archive: rename it to `.zip` or extract it directly.

```
mkdir alloflow-remediation && cd alloflow-remediation
tar -xf ../alloflow-remediation.mcpb          # bsdtar on Windows 10+, macOS, Linux
node server/alloflow-remediation-mcp-stdio.cjs   # prints "ready (stdio only; tools: ...)" on stderr
```

Requirements on every host except Claude Desktop (which supplies Node itself): Node.js 20 or newer
on PATH, a Java runtime for PDF/UA and EPUB validation, and one `remediation_setup` call for the
Chromium download. From a checkout, run `node desktop/mcp/fetch_epubcheck.cjs` once so the EPUBCheck
distribution is present (the release bundle already contains it).

In the examples below, replace `SERVER` with the absolute path of
`alloflow-remediation-mcp-stdio.cjs` (in the checkout: `desktop/mcp/...`; in the extracted bundle:
`server/...`). From an extracted bundle also set `ALLOFLOW_MCP_ASSETS_DIR` to the bundle's `assets`
directory and `ALLOFLOW_MCP_SKILLS_DIR` to its `skills` directory, exactly as `manifest.json` does.
`ALLOFLOW_MCP_NO_KEY_FILES=1` keeps the connector from looking for a Gemini key file; the keyless
agent bridge works without any key.

## Claude Desktop

Settings > Extensions, drag in `alloflow-remediation.mcpb`. See MCPB_RELEASE.md.

## Claude Code

```
claude mcp add alloflow-remediation -e ALLOFLOW_MCP_NO_KEY_FILES=1 -- node SERVER
```

A checkout also ships a project-scoped `.mcp.json` at the repository root.

## OpenAI Codex CLI

`~/.codex/config.toml` (or a trusted project's `.codex/config.toml`):

```toml
[mcp_servers.alloflow-remediation]
command = "node"
args = ["SERVER"]
startup_timeout_sec = 60
tool_timeout_sec = 1800

[mcp_servers.alloflow-remediation.env]
ALLOFLOW_MCP_NO_KEY_FILES = "1"
```

Or: `codex mcp add alloflow-remediation --env ALLOFLOW_MCP_NO_KEY_FILES=1 -- node SERVER`.
Long tools (remediation, narration, PDF/UA validation) need the generous `tool_timeout_sec`; the
background job tools return immediately and can be polled instead.

## Cursor, Windsurf, VS Code (Copilot agent mode) and other `mcp.json` hosts

```json
{
  "mcpServers": {
    "alloflow-remediation": {
      "command": "node",
      "args": ["SERVER"],
      "env": { "ALLOFLOW_MCP_NO_KEY_FILES": "1" }
    }
  }
}
```

VS Code uses the key `servers` instead of `mcpServers` in `.vscode/mcp.json` and accepts
`"type": "stdio"`.

## Gemini CLI

`~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "alloflow-remediation": {
      "command": "node",
      "args": ["SERVER"],
      "env": { "ALLOFLOW_MCP_NO_KEY_FILES": "1" },
      "timeout": 1800000
    }
  }
}
```

## ChatGPT (developer mode connectors) and other HTTP-only hosts

ChatGPT cannot launch a local stdio server; its custom connectors need a remote HTTPS endpoint.
The connector can serve MCP over Streamable HTTP for that case:

```
ALLOFLOW_MCP_HTTP_TOKEN=<long random secret> node SERVER --http=8765
```

- Binds `127.0.0.1:8765`, endpoint `http://127.0.0.1:8765/mcp`.
- Every request needs the token, as `Authorization: Bearer <token>` or, for hosts that cannot set
  headers, in the URL path: `/mcp/<token>`.
- Without `ALLOFLOW_MCP_HTTP_TOKEN` a token is generated and printed on stderr at startup.
- `GET /mcp` with `Accept: text/event-stream` opens a notification stream (progress, resource
  list changes). `POST /mcp` carries requests, single or batched; `DELETE /mcp` is accepted and
  ignored (one session per process).
- The process keeps running when stdin closes, so it can be started from a terminal or a service.

To reach it from ChatGPT you must publish that loopback port through a tunnel you control (OpenAI's
Secure MCP Tunnel, cloudflared, ngrok or similar), then add the tunnel URL with the path token as a
custom connector in ChatGPT developer mode.

**Read this before you open a tunnel.** Everything the tools can read on this machine becomes
readable by anyone who reaches the URL with the token, and in keyless mode the document text and
page images flow through ChatGPT to OpenAI. Use a fresh token per tunnel, stop the tunnel when you
are done, restrict the connector with `ALLOFLOW_MCP_ALLOWED_ROOTS` to the folders you mean to
expose, and do not process student records this way unless your institution's OpenAI agreement
covers it. Binding to any address other than loopback additionally requires
`ALLOFLOW_MCP_HTTP_ALLOW_REMOTE=1` and is not recommended; let the tunnel do the exposure.

Hosts that speak Streamable HTTP locally (Codex, Cursor and VS Code accept a `url` instead of a
`command`) can use `http://127.0.0.1:8765/mcp/<token>` directly without any tunnel.

## What differs between hosts

- The keyless agent bridge asks the host's model to answer document-derived prompts through
  `remediation_agent_requests` / `remediation_agent_respond_batch`. Any host with an agentic loop
  can drive it; the connector never contacts a model provider itself in that mode.
- Progress notifications and `notifications/cancelled` are honoured on both transports.
- Hosts without MCP skill or prompt support lose only the bundled guidance text; the tool
  descriptions carry the same safety rules.
- `remediation_capabilities.transports` reports which transports this process serves.
- Without a Gemini key, `audit_html` runs axe-core and IBM Equal Access and reports the AI rubric
  as `not-run`; the Gemini-only tools (`pdf_audit`, `pdf_remediate`, batch Gemini jobs) still
  refuse, and the keyless agent bridge covers full remediation instead.
