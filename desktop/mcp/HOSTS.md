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
Codex example: `codex mcp add alloflow-remediation-http --url http://127.0.0.1:8765/mcp --bearer-token-env-var ALLOFLOW_MCP_HTTP_TOKEN`.

To check the HTTP transport with the official MCP SDK client (the stack HTTP-only hosts build on),
run `dev-tools/mcp_http_sdk_client_check.mjs`; its header explains the one-time SDK install.

## Driving the keyless lane well

Without a Gemini key, `pdf_remediate_agent_start` runs the whole pipeline with the host's own model
as the engine: the pipeline pauses at each internal model call, publishes it as a pending request,
and continues when the host answers. A 2-page born-digital document needs about 15 to 25 requests;
a 4-page scan about 30. Each request is a full turn of the host's model, so the run takes as long
as the host takes to answer. Measured with instant answers, the pipeline's own work is a few
seconds between requests, plus one to two minutes of OCR at the start of a scanned document.

What every host should do, in whichever words its model understands:

- Answer all pending requests in one `remediation_agent_respond_batch` call; the reply carries
  the next requests and their images.
- Reply with the single word `UNCHANGED` to a fix prompt whose fragment needs no change.
- Follow each prompt's format contract exactly: strict JSON where it asks for JSON, raw HTML
  where it asks for HTML. A malformed reply is discarded and asked again.
- Start with `max_run_minutes: 90` or more when the document is scanned or the host is slow; a
  run that hits the limit is cancelled and has to be resumed.
- Poll with `include_images: false` while waiting and fetch the images only to answer; keep one
  document per conversation, because everything answered stays in the host's context.
- Report the verdict, the cautions and the fidelity notes as the tool states them. A review
  verdict withholds the tagged PDF on purpose.

The bundled skill (`alloflow-pdf-remediation`) says all of this to hosts that load skills; the
notes below cover what each host needs on top.

**Claude Desktop.** Loads the skill and prompt from the `.mcpb` automatically, so the model already
knows the loop. Its turns are the slowest of the hosts here because each turn re-reads the whole
conversation, which is why one document per chat and `include_images: false` polling matter most.
Expect 15 to 40 minutes for a short document at Desktop pace; if the chat stops asking for the next
requests, say "continue answering the pending requests" and it resumes where it was. Install the
current bundle: any build before 13 September 2026 spends most of that time in defects that are
fixed now.

**Claude Code.** Same loop, faster turns, and the project checkout's `.mcp.json` registers the
server. In an unattended session the model drives the loop without prompting; the run's
`bridgeStats.clientLatencySeconds` in the final result shows how long its answers took.

**OpenAI Codex CLI.** Codex does not load MCP skills, so give it the loop in the prompt, for
example: "Remediate C:\path\file.pdf with the alloflow-remediation tools. Start it with
pdf_remediate_agent_start and max_run_minutes 90, then keep calling remediation_agent_requests
and answer everything pending with remediation_agent_respond_batch until the run is completed.
Answer each prompt in exactly the format it asks for, reply UNCHANGED when a fix fragment needs no
change, and tell me the verdict, cautions and fidelity notes at the end." Keep
`tool_timeout_sec = 1800` in the config: a single long poll never exceeds 30 seconds, but the
first call to a scanned document can wait for the OCR pass. Codex's own turn limit may stop the
loop on a long document; "continue the run" picks it up, since the pending requests wait on the
server and the run's deadline is the only clock.

**ChatGPT app (developer mode connector).** The connector is reached through the tunnel described
above; the loop is the same and ChatGPT's model answers the requests, so document text and page
images pass through OpenAI. Give the loop in the prompt as for Codex, because ChatGPT loads no
skill. Two practical points: the app tends to stop after a handful of tool calls and wait for you,
so expect to say "continue" several times during a run, and the tunnel must stay up for the whole
run (the server keeps the run alive while it waits, up to `max_run_minutes`). Keep
`ALLOFLOW_MCP_ALLOWED_ROOTS` on the folder being processed and stop the tunnel afterwards.

**Gemini CLI, Cursor, Windsurf, VS Code.** Same as Codex: no skill, so put the loop in the prompt;
keep the long tool timeout; expect to nudge the loop on a long document.

**When it looks stuck.** Poll `remediation_agent_requests` once with `wait_seconds: 30`. If it
returns a pending request, the pipeline is waiting for the host, not the other way round. If it
returns nothing pending and the `log` shows Tesseract or axe lines, the pipeline is working. If
nothing changes for ten minutes, cancel with `remediation_agent_cancel`, keep the written files,
and send the `log` lines with the report.

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
