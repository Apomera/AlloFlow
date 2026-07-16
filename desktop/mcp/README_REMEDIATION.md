# AlloFlow PDF Remediation — local MCP connector (v1)

Exposes the **real remediation pipeline** (`doc_pipeline_module.js`, the same bytes the app
ships) as MCP tools. A self-contained **sibling** of `alloflow-mcp-stdio.cjs` (the Agent Core
connector): same SDK-free NDJSON JSON-RPC transport, but it does not touch the Agent Core
contracts or any app source — the pipeline runs unmodified inside headless Chromium, exactly the
way `tests/e2e/remediation_fault_injection_golden.spec.ts` drives it.

```
┌──────────────┐  stdio   ┌──────────────────────────────┐  CDP  ┌──────────────────────────┐
│ MCP client   │ ───────► │ alloflow-remediation-mcp-    │ ────► │ headless Chromium        │
│ (Claude etc) │          │ stdio.cjs                    │       │  fresh page per run:     │
└──────────────┘          │  validation → single-flight  │       │  doc_pipeline_module.js  │
                          │  remediation_headless_       │       │  + verification_policy   │
                          │  driver.cjs                  │       │  + doc_builder_renderer  │
                          └──────────────┬───────────────┘       └──────────────────────────┘
                                         │ fetch (GEMINI_API_KEY)
                                         ▼
                            generativelanguage.googleapis.com
```

**Isolation:** one fresh browser page per run — a fresh pipeline instance per document, so runs
can never collide on the pipeline's ambient globals. **Single-flight:** one audit/remediation at
a time; concurrent calls get a clean busy error.

## Setup

From the repo root (`UDL-Tool-Updated`):

```bash
npm install                          # playwright is already a devDependency
npx playwright install chromium      # once, if Chromium isn't present
export GEMINI_API_KEY=...            # a Google AI Studio / Gemini API key
```

Requires network: the Gemini API (**document content is sent to it**) and public CDNs
(pdf.js, Tesseract, pdf-lib, axe) that the pipeline loads at runtime.

### Claude Code

```bash
claude mcp add alloflow-remediation \
  --env GEMINI_API_KEY=YOUR_KEY \
  -- node "C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/desktop/mcp/alloflow-remediation-mcp-stdio.cjs"
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "alloflow-remediation": {
      "command": "node",
      "args": ["C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/desktop/mcp/alloflow-remediation-mcp-stdio.cjs"],
      "env": { "GEMINI_API_KEY": "YOUR_KEY" }
    }
  }
}
```

### Direct CLI (no MCP client — handy for a first smoke)

```bash
GEMINI_API_KEY=... node desktop/mcp/remediation_headless_driver.cjs audit path/to/doc.pdf
GEMINI_API_KEY=... node desktop/mcp/remediation_headless_driver.cjs remediate path/to/doc.pdf [outDir]
node desktop/mcp/remediation_headless_driver.cjs validate path/to/doc-tagged.pdf   # PDF/UA-1; no key needed
```

## Why a Gemini key? (billing model, in one minute)

MCP has two sides. Your **Claude subscription pays for the client** — Claude reading your
request, deciding to call `pdf_remediate`, interpreting the result. The **server is a separate
program on your machine**, and the remediation pipeline inside it makes dozens of its own AI
calls (Vision OCR, audits, fix passes) to **Gemini** — that engine choice is baked into the
pipeline's prompts and OCR flow. Those calls can't ride the Claude subscription:

- MCP does define a "sampling" mechanism where a server borrows the client's model, but Claude's
  clients don't support it today — and the pipeline's Vision/OCR calls are Gemini-shaped anyway.
- A Claude-backed engine (Anthropic API key, or shelling out to `claude -p`) is possible as a
  future additive backend, but it's a real project: the audit/OCR prompts, the error taxonomy,
  and the scoring calibration are all tuned against Gemini.

**The practical answer:** a free Google AI Studio key (aistudio.google.com → "Get API key",
~2 minutes). The free tier of the flash models is generous enough for real remediation runs.
The Canvas app never needs this — only this connector does.

## Tools

| Tool | What it does | Writes | Typical time |
| --- | --- | --- | --- |
| `remediation_capabilities` | Honest environment report (key present, Chromium available, modules found, models, limits). Call first. | nothing | instant |
| `pdf_audit` | Accessibility audit: score, per-severity issues, scanned/searchable detection, language, page count. Accepts `.pdf`, `.docx`, `.pptx` (Office files audit deterministically from extracted text). | nothing | 1–3 min |
| `pdf_validate_ua` | Independent **PDF/UA-1 (ISO 14289-1)** validation via veraPDF — a real JVM in headless Chromium, served from the repo's own `verapdf/` assets (a local loopback server provides the HTTP Range support CheerpJ requires; the CDN copy fails that at some edges). **Needs no Gemini key.** Runs outside the single-flight lane, so it works even while a remediation job is running. A lone `clause 5, test 1` failure = the pipeline deliberately withheld the PDF/UA claim, not a forgotten stamp. | nothing | ~1–2 min (JVM boot 40–90s cold) |
| `pdf_remediate` | Full pipeline, **synchronous**: audit → accessible HTML rebuild → AI fix passes to `target_score` → honesty-gated verification → tagged-PDF export. Blocks until done — use the job tools if your client enforces tool timeouts. | `<stem>-accessible.html`, `<stem>-tagged.pdf`, `<stem>-remediation-report.json` (collision-safe names, never overwrites) | 5–30 min |
| `pdf_remediate_start` | Same run as a **background job**; returns a `jobId` immediately. Jobs run one at a time in start order. | same as above | instant return |
| `pdf_batch_remediate_start` | Background job remediating **every .pdf in a folder** (non-recursive, ≤60 files, skips `-tagged.pdf` outputs), continuing past per-file failures. | same, per file | instant return |
| `remediation_job_status` | Job state + the last pipeline telemetry lines (throttle waits show here — a slow job is distinguishable from a stuck one). | nothing | instant |
| `remediation_job_result` | The completed job's summary (per-file summaries for batches). | nothing | instant |
| `remediation_job_cancel` | Cancels a queued job, or kills the running one (its browser context closes; in-flight AI calls die in seconds). Files already written stay. | nothing | instant |

Remediate options (same on all three remediate tools): `output_dir`, `target_score` (default
95), `fix_passes` (default 2), `polish_passes` (default 0), `tagged_pdf` (default true),
`ocr_language` (Tesseract code for scanned docs, e.g. `spa`; omit for auto-detect).

**Office inputs:** the remediate/audit/batch tools also accept `.docx` and `.pptx` — the
pipeline routes them through its deterministic Office branches (mammoth/pptx extraction, no
Vision pass). Office inputs skip the tagged-PDF export; the accessible HTML is the deliverable.

**Skill:** `agent_skills/alloflow-pdf-remediation/SKILL.md` teaches an agent the job-polling
etiquette and how to relay the honesty fields without overstating them — install it alongside
the connector for best results.

**Recommended flow for a client like Claude:** `remediation_capabilities` → `pdf_remediate_start`
→ poll `remediation_job_status` every 30–60 s → `remediation_job_result`. Jobs are in-memory:
they do not survive a server restart.

The result carries AlloFlow's honesty surfaces verbatim: the distribution verdict
(ready / cautions / review-before-handing-out), before/after scores with their source,
`aiVerificationIncomplete`, integrity coverage/warnings, and every fidelity note. **The tagged
PDF only carries a PDF/UA declaration when it earned one.** Treat the verdict the way the app's
results screen does: review the cautions before distributing.

## Behavior under throttling

The pipeline's own gate runs unchanged: proactive pacing for heavy/scanned docs, breaker with
success-gated recovery, wait-not-stop calm probes. Its telemetry (`[GeminiGate]`, `[Retry]`,
`API-start`, `[Tesseract]`) streams to the server's **stderr** — that log is the diagnostic if a
run looks slow. A run is stopped hard at `ALLOFLOW_MCP_MAX_RUN_MINUTES` (default 30).

Direct-API differences from Canvas: a 401/403 is treated as a **real key problem** (permanent,
no retry grind); 429s are classified per-minute (throttle, retried/deferred) vs per-day
(permanent, honest degradation) from the response body — the same taxonomy the app pins in
`tests/gemini_error_taxonomy_contract.test.js`.

## Privacy / FERPA

- Document content is sent to the **Gemini API under your key** — use only with documents you
  are authorized to process there (the Canvas app's Workspace-for-Education DPA does NOT cover
  a personal API key).
- No AlloFlow server, telemetry, or storage is involved; outputs are written only to the local
  paths you choose. stdout is protocol-only; logs go to stderr.

## Env reference

| Var | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | — (required) | Gemini API key for text + vision calls |
| `ALLOFLOW_MCP_GEMINI_MODEL` | `gemini-3-flash-preview` | primary model |
| `ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL` | `gemini-2.5-flash-lite` | one retry on a 404/config failure |
| `ALLOFLOW_MCP_MAX_RUN_MINUTES` | `30` | hard wall clock per run |
| `ALLOFLOW_MCP_VERAPDF_URL` | local loopback server | override validator page URL (host must support HTTP Range) |
| `ALLOFLOW_MCP_VERBOSE` | off | forward ALL page console lines to stderr |
| `ALLOFLOW_MCP_HEADFUL` | off | visible Chromium (debugging) |

## Tests

`npx vitest run tests/mcp_remediation_stdio_smoke.test.js` — protocol + validation smoke
(no key, no browser: pins that bad arguments and a missing key are rejected **before** Chromium
launches or quota is spent). The pipeline behavior itself is covered by the existing
fault-injection and corpus e2e goldens, which drive the identical headless recipe.
