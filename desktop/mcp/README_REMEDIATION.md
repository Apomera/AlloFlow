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
```

## Tools

| Tool | What it does | Writes | Typical time |
| --- | --- | --- | --- |
| `remediation_capabilities` | Honest environment report (key present, Chromium available, modules found, models, limits). Call first. | nothing | instant |
| `pdf_audit` | Accessibility audit: score, per-severity issues, scanned/searchable detection, language, page count. | nothing | 1–3 min |
| `pdf_remediate` | Full pipeline: audit → accessible HTML rebuild → AI fix passes to `target_score` → honesty-gated verification → tagged-PDF export. | `<stem>-accessible.html`, `<stem>-tagged.pdf`, `<stem>-remediation-report.json` (collision-safe names, never overwrites) | 5–30 min |

`pdf_remediate` options: `output_dir`, `target_score` (default 95), `fix_passes` (default 2),
`polish_passes` (default 0), `tagged_pdf` (default true), `ocr_language` (Tesseract code for
scanned docs, e.g. `spa`; omit for auto-detect).

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
| `ALLOFLOW_MCP_VERBOSE` | off | forward ALL page console lines to stderr |
| `ALLOFLOW_MCP_HEADFUL` | off | visible Chromium (debugging) |

## Tests

`npx vitest run tests/mcp_remediation_stdio_smoke.test.js` — protocol + validation smoke
(no key, no browser: pins that bad arguments and a missing key are rejected **before** Chromium
launches or quota is spent). The pipeline behavior itself is covered by the existing
fault-injection and corpus e2e goldens, which drive the identical headless recipe.
