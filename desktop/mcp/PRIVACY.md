# Privacy — AlloFlow PDF Remediation connector

_Last updated: 2026-09-04._

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
| EPUB validation reports (raw EPUBCheck and Ace JSON) | **Your local disk only**, beside the EPUB | Independent evidence; these raw reports can quote short document snippets |

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
- Background-job records older than 30 days are deleted when the connector next starts.
  Keyless run records expire for resumption after 30 days and remain on disk until removed. Finished records may
  be evicted sooner when the bounded job store fills. To remove them immediately, stop the
  connector and delete its state directory.
- Headless Chromium runs with a fresh, isolated browser context per document.
- EPUB validation runs the bundled EPUBCheck (local Java) and DAISY Ace (local Node + Chromium)
  against a private immutable snapshot of the EPUB, then deletes that snapshot. Neither validator
  makes a network request for the document. The raw JSON reports copied to your output folder can
  contain short document snippets around each finding; treat them as document content.
- Agent-bridge runs save paths, settings and progress in a separate agent-runs directory. Their
  document-derived prompts and optional rendered page images are returned through MCP tool results
  to the client conversation; output artifacts remain on the local disk.
- `pdf_validate_ua` uses the packaged local veraPDF Java CLI and an immutable private copy of the
  selected PDF. Its result binds to that copy's SHA-256 and byte count. The legacy browser-based
  validator downloads CheerpJ/pdf-lib and is disabled unless a direct driver integration explicitly
  opts in with `ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS=1`; the MCP tool does not silently enable it.

## Optional local narration

Kokoro and Piper narration use local inference. Public JavaScript libraries and model weights may be downloaded from jsDelivr, unpkg, cdnjs (ONNX Runtime), Hugging Face and its CDN. Document text is not intentionally included in those dependency requests. A private Chromium profile caches model assets under the MCP state directory. Generated section audio, which contains document content, is cached under narration-cache to support resume and remains until the owner removes it. Keyless run records under agent-runs contain local paths, settings, progress and results; no pending model prompts or replies are persisted. Completed narration is also written to the requested output directory. Both accessible and natural narration use the same boundary. Voice discovery reads the bundled catalog and returns model-card links without downloading anything. Saved-run discovery reads local run metadata only.


Narration preflight uses a temporary Chromium context with all network requests blocked.
It reads the selected HTML documents and bundled helper assets, returning language/voice
routes, source hashes, rough audio-duration estimates and readiness metadata to the client.
It does not fetch voice models or synthesize audio. Multilingual synthesis uses the same
local processing and public-dependency boundary described above.

Completed-output indexes persist under `narration-completions` in the state directory.
They contain source and output paths, options fingerprints, artifact hashes and
coverage/result metadata, with no additional document text or audio. They remain
until the owner removes them. Reuse verifies every artifact locally before returning
the existing output paths; no browser or dependency request is needed for that path.

Section caches can now be reused across documents and edits within the same local
state directory. Keys bind exact speech, voice, language, mode and runtime; cached
audio still contains document content. No shared or remote cache is used. Coverage
reports contain counts, hashes, token offsets, document targets and extraction
metadata, without adding raw source passages or model prompts. Narration reports
can carry upstream source-coverage metadata from the remediation report.
