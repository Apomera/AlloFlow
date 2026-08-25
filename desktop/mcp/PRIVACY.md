# Privacy — AlloFlow PDF Remediation connector

_Last updated: 2026-08-24._

This connector runs **entirely on your machine**. There is no AlloFlow server, account,
telemetry, or analytics of any kind.

## What data goes where

| Data | Destination | Why |
| --- | --- | --- |
| Documents processed with Gemini-powered tools (full or derived content) | **Google Gemini API**, under the API key **you** provide | The pipeline's OCR, audits, and fixes are AI calls |
| Document-derived prompts and rendered page images processed with `pdf_remediate_agent_start` | **Your MCP client's conversation and its model provider** (for example, Anthropic when Claude is the client) | In agent-bridge mode the client's model answers the pipeline instead of Gemini; no Gemini key is used, but this moves the model-processing boundary rather than removing it |
| Background-job records (arguments, paths, status, capped logs, result/error metadata) | **Your local disk only**, under `~/.alloflow-mcp/jobs` by default | Lets status and results survive a client/server restart |
| Nothing | AlloFlow / the connector author | The connector has no backend |
| Core validation and pipeline libraries | **Your local machine** | The preferred veraPDF Java CLI and core browser libraries are packaged locally; optional Office export may fetch public libraries, without sending the source document |
| Output files (accessible HTML, tagged PDF, report JSON) | **Your local disk only**, at paths you choose | The deliverables |

## Your API key

- Stored by your MCP client (e.g. Claude Desktop's encrypted user-config), injected into the
  connector as an environment variable at launch.
- Never written to disk by the connector, never logged, never included in tool results
  (capability reports name only the key's *source*, e.g. `env:GEMINI_API_KEY`).

## Student records / FERPA

Gemini-powered tools send document content to the Gemini API under your personal or institutional
key. Agent-bridge remediation instead surfaces document-derived prompts and page images to the MCP
client conversation, where the client's model provider processes them. A personal AI Studio key is
**not** covered by a school's Google Workspace for Education agreement, and a consumer model
subscription is not automatically covered by an institutional education agreement either. Do not
process documents containing student personally identifiable information unless your institution's
agreements cover the provider and account used for the selected path — or scrub the documents first.

## Local footprint

- Reads only the files/folders you pass to tools; writes outputs with collision-safe names
  (never overwrites) to the folder you choose.
- Background-job records persist as local JSON under `~/.alloflow-mcp/jobs` (override with
  `ALLOFLOW_MCP_STATE_DIR`) so a restarted connector can still report status and results.
  They contain tool arguments (including local paths and options), timestamps, status, capped
  log lines, and result/error metadata. They do **not** contain source-document bytes or the
  Gemini API key.
- Records older than 30 days are deleted when the connector next starts. Finished records may
  be evicted sooner when the bounded job store fills. To remove them immediately, stop the
  connector and delete its state directory.
- Headless Chromium runs with a fresh, isolated browser context per document.
- Agent-bridge runs are conversation-scoped and are not written to the durable job store. Their
  document-derived prompts and optional rendered page images are returned through MCP tool results
  to the client conversation; output artifacts remain on the local disk.
- `pdf_validate_ua` uses the packaged local veraPDF Java CLI and an immutable private copy of the
  selected PDF. Its result binds to that copy's SHA-256 and byte count. The legacy browser-based
  validator downloads CheerpJ/pdf-lib and is disabled unless a direct driver integration explicitly
  opts in with `ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS=1`; the MCP tool does not silently enable it.
