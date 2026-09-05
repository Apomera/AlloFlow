# AlloFlow Document Remediation — local MCP connector (v1)

Despite the historical `pdf_*` tool names, the connector remediates PDFs, Word documents, slides, spreadsheets, images, markdown/text and accessible HTML.
It is host-agnostic: stdio for Claude Desktop, Claude Code, Codex CLI, Cursor, VS Code and Gemini CLI, plus an optional
bearer-token Streamable HTTP transport (`--http=<port>`) for ChatGPT and other HTTP-only hosts. See `HOSTS.md`.
From a checkout, run `node desktop/mcp/fetch_epubcheck.cjs` once: the EPUBCheck distribution is hash-pinned in
`vendor/manifest.json` but not stored in git.

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

## Keyless workflow and optional narration

Start with `pdf_remediate_agent_start`, passing either `file_path` or `dir_path`.
The client model answers pending requests; the server needs no Gemini key.
Use `effort: "thorough"` for three fix passes, one polish pass, bounded auto-continue,
and independent PDF/UA validation. Explicit options override the preset.

The client loops `remediation_agent_requests` and `remediation_agent_respond_batch`.
The latter accepts 1–32 pending replies atomically and returns the next work.
Folder runs are sequential (up to 60 supported files, non-recursive), continue past
per-file failures, and reuse completed outputs only after their hashes and options match.
After interruption, find saved work with `remediation_agent_runs`;
`remediation_agent_resume` takes the intended saved `run_id`.
The unfinished document may restart; completed files are verified and reused.
An active client conversation is still needed to answer model requests.

Add `narration: "accessible"` to announce headings, lists, tables and image descriptions,
or `narration: "natural"` for continuous reading. Audio is optional (default none).
For an existing accessible HTML file use `document_narrate_start`, which defaults
to accessible narration. `narration_provider: "auto"` uses Kokoro for English and
Piper for other configured languages; `narration_voice` defaults to `auto`.
Language comes from the HTML `lang` attribute, with an explicit BCP-47 override
through `narration_language`. Missing metadata assumes English with a report warning.
`document_narration_voices` lists 29 configured Piper language defaults and model cards.
Accessible structural announcements are localized in en/es/fr/de/pt/it; the other
configured languages support natural narration. Voice configuration does not mean
every voice has been downloaded or listening-tested. Piper uses the catalog's default
locale for each base language; it does not translate text. Language-tagged blocks and inline phrases inherit their nearest HTML language tag and switch voices
automatically, including nested phrases in headings, lists, tables and captions.
Leave provider and voice on auto for multilingual documents. Structural cues follow
their element language; punctuation stays with a spoken phrase. EPUB highlighting
uses the containing block while its phrases switch voices. Outputs include complete WAV and MP3, HTML with native audio controls,
and a synchronized read-along EPUB (disable with `readalong_epub: false`).
The HTML and companion MP3 must stay together; EPUB contains its audio.

`document_narration_preflight` checks one HTML file or a non-recursive folder
(up to 60 files) using local bundled helpers, without model downloads or synthesis.
It reports ready/blocked files, language routes, section counts and rough spoken
audio duration. This does not estimate processing time, detect unmarked languages,
or certify accessibility. `document_narrate_start` also accepts `dir_path` to narrate
a folder sequentially; generated read-along players are excluded.

Every synthesized section is normalized to 24 kHz mono before audio assembly.
The narration report records each section's language, provider, voice, start time,
duration, document target and cache reuse so a multilingual result can be checked.

Kokoro and Piper synthesis run locally. Public library/model downloads occur on first use
and may recur if dependencies are not cached. The private Chromium profile under
`<stateDir>/kokoro-browser` caches model assets for both providers (the folder name is retained for compatibility). Completed audio sections are stored
under `<stateDir>/narration-cache/clips-v1`, keyed by the exact spoken text, voice,
language, style and synthesis runtime. Document paths, IDs and source hashes do not
invalidate unchanged clips. Editing or reordering a document reuses valid clips,
then rebuilds the complete WAV/MP3/HTML/EPUB in the new order. Reports distinguish
`reusedSections` from `generatedSections`; preflight reports `cachedSections` and
`sectionsToSynthesize`. A runtime change can invalidate the clip cache.
These audio files contain document content and persist until removed by the owner.
A missing or failed section prevents a complete result; resume retries missing work.
Completed packages are indexed under `<stateDir>/narration-completions`. Repeating
or resuming the same source, options, runtime and output directory reuses final
files only after every output hash matches, including the narration report. This
path requires no browser launch or new dependency download. A changed or missing
output rebuilds the package, reusing valid section audio. Folder summaries report
`outcome: "completed_with_failures"`, `failedFiles` and a ready-to-call `retry` action
when needed; a finished batch does not mean every document succeeded.
The narration report lists section coverage and output hashes. Read-along and text-only
EPUBs are additionally validated by the bundled EPUBCheck 5.3.0 (local Java) and DAISY Ace 1.4.6
(local Node + Chromium). Each check reports `passed`, `failed`, `review-required`, `unavailable` or
`skipped`; a missing Java or Chromium runtime is reported, never treated as a pass. Raw JSON reports
are copied beside the EPUB and the result binds to the EPUB's SHA-256. A passing result is
`complete-for-tested-scope` with `humanReviewRequired: true`; it is not a conformance certification.
Each validator has a 600 s budget (`ALLOFLOW_MCP_EPUB_VALIDATION_TIMEOUT_MS` overrides it); on an
emulated or memory-starved host EPUBCheck alone can exceed that, and the check then reports
`unavailable` with the budget in its error so the run can be repeated with a larger budget.

## Content coverage

Remediation reports include a separate `contentCoverage` check comparing extracted
source token occurrences with HTML, including repeated words and numbers. Missing
tokens, absent source text, or reported extraction errors/low-confidence pages
require review before tagged-PDF delivery or automatic narration. Rewording can
also trigger review: this is a conservative lexical check, not semantic proof.
Reports bind the comparison to source and HTML hashes, identify token ranges with
possible omissions, and retain page-range scope and available extraction evidence.
Empty page candidates may be intentionally blank; matched text does not prove OCR
or reading order correct. Existing pipeline verification remains in force.

Narration preflight independently compares eligible HTML text and authored visual
descriptions against planned speech. It blocks omissions and undescribed visuals
before synthesis and reports affected document targets. Equations require an
`aria-label` or `alttext` spoken description; SVG can use a label or title/description.
Images may use alt text or a figure caption; explicitly decorative images are
excluded. Controls, hidden content and nonspoken markup are counted as exclusions.
Both styles preserve inline image descriptions, captions, disclosure summaries and
author verification notes. Legacy app string exports keep their existing behavior.
Narration reports carry this coverage result and upstream source coverage when the
HTML came from remediation. These checks do not certify pronunciation or accessibility.

## No-account mode

`remediation_capabilities` reports two distinct states. `fullAiPipelineReady` describes the
optional Gemini-powered app pipeline. `keylessModeAvailable` remains true without a key and
`keylessToolNames` is derived from the actual tool registry, so clients can offer local
validation, extraction, redaction, structure checks, exports, reports, and job inspection
instead of treating `ready: false` as “the connector is unusable.” Neither mode requires an
AlloFlow account, paid Worker, or institution account.

The same response now separates privacy from cost/account status. `dataHandling.offlineToolNames`
make no external network request. `publicDependencyDownloadToolNames` contains only
setup/export tools and the narration-capable start/resume tools: they download Chromium,
public model weights or pinned libraries, but do not intentionally include document content in those
requests (the provider can still see ordinary connection metadata such as IP address and
timing). `geminiDocumentEgressToolNames` is the exact list that sends a document or derived
content to Gemini. The four lists (including credential-only checks) are exhaustive and disjoint; server startup fails if a future
tool is left unclassified.

`onboarding` is the machine-readable first-run decision. A client should follow its `nextTool`
when `actionRequired` is true. `setup-required` means call `remediation_setup` once;
`reinstall-required` means the package or its integrity-checked assets are incomplete;
`restart-required` means the install is fine but the files changed after the server process
started (a just-updated extension) — quit the client app completely and reopen it.
`keyless-ready` is a usable state, not a failure. `remediation_selftest` is recommended but
optional once the browser is installed.

**Isolation:** one fresh browser page per run — a fresh pipeline instance per document, so runs
can never collide on the pipeline's ambient globals. **Single-flight:** one audit/remediation at
a time; concurrent calls get a clean busy error.

## Setup

From the repo root (the folder your clone lives in — `AlloFlow` for a fresh GitHub clone):

```bash
npm install                          # playwright is already a devDependency
npx playwright install chromium      # once, if Chromium isn't present
export GEMINI_API_KEY=...            # optional — see key auto-discovery below
```

### Supplying your own Gemini key (safely)

The optional Gemini tools run on **your** key, not a shared one. The client-model bridge needs no Gemini key. A free key from
[aistudio.google.com](https://aistudio.google.com/app/apikey) takes about two minutes and needs no
credit card. Pick one of these two, in this order of preference:

```bash
# Option A — OS environment variable (nothing on disk)
export GEMINI_API_KEY=...            # macOS/Linux
setx GEMINI_API_KEY "..."            # Windows, new shells only

# Option B — a key file OUTSIDE this repository
printf 'GEMINI_API_KEY=...\n' > ~/.alloflow-gemini.env
export ALLOFLOW_MCP_ENV_PATH=~/.alloflow-gemini.env
```

Then prove it works — this sends **no document content** and spends no generation quota:

```bash
node mcp-testing/tools/mcp_call.cjs call desktop/mcp/alloflow-remediation-mcp-stdio.cjs remediation_verify_key
```

**Do not** paste the key into a chat with an assistant, and **avoid** putting it in an MCP client
config `env` block (`claude mcp add --env ...`, or `claude_desktop_config.json`). Both leave the
secret sitting in a file the assistant routinely reads. The two options above keep it out of the
assistant's reach; the connector itself never logs or returns the value, only a source label such
as `env:GEMINI_API_KEY`.

Set `ALLOFLOW_MCP_NO_KEY_FILES=1` to guarantee no key file is ever read, whatever is on disk.

**Key auto-discovery order:** `GEMINI_API_KEY` env var → the file at `ALLOFLOW_MCP_ENV_PATH` →
the repo's gitignored `desktop/web-app/.env.maintainer-demo` (a maintainer artifact; a user should
not put their key there). Accepted names inside a key file are `GEMINI_API_KEY` and
`REACT_APP_GEMINI_API_KEY` only. The generic `REACT_APP_API_KEY` was accepted until 2026-08-04 and
is not, because in a CRA env file that name holds the **Firebase** web key — a different credential
for a different service, which the connector would then have transmitted to Google's Generative
Language API.

⚠ Presence is not validity. `remediation_capabilities` only reads whether a key *exists*; it
reports `onboarding.state: "key-present-untested"` and will not claim the key works. Call
`remediation_verify_key` for that. It distinguishes `valid`, `valid-but-quota-exhausted`,
`invalid` (revoked/mistyped/wrong API), `unreachable` (offline, so untested rather than bad), and
`no-key`.

Free-tier prompts may be used by the provider to improve its products and are subject to daily
caps. For student-identifiable documents use an approved client/provider account for the bridge, deterministic local tools, or the fully local
[portable pathway](../../agent_skills/alloflow-portable-remediation/SKILL.md), which sends nothing
anywhere.

The Gemini-backed audit/remediation tools require the Gemini API (**document content is sent to it**).
The full client-model bridge performs remediation without that API or key.
Core browser libraries and the preferred veraPDF Java CLI are bundled and run locally. The
legacy browser-based veraPDF compatibility path downloads CheerpJ/pdf-lib and is disabled unless
`ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS=1` is explicitly set; MCP validation fails closed when
the local Java CLI is unavailable. The one-time setup downloads Chromium, and the
editable-Office/ePub/DAISY/Braille exporters fetch pinned public libraries.
Those dependency requests do not intentionally include document content. Tools listed in
`dataHandling.offlineToolNames` make no external request from the connector process and need no
AlloFlow, Cloudflare, paid Worker, or institution account. Their results still enter the MCP client
conversation; for the agent-bridge tools this deliberately includes document-derived prompts and
optional rendered page images, which the client's model provider processes.

### Claude Code — nothing to install

The repo ships a project-scoped [`.mcp.json`](../../.mcp.json) at the root that registers this
connector (and the Agent Core one) with **relative** paths. Anyone who clones the repo and starts
Claude Code **from the repo root** is prompted to approve the servers and then has the tools; no
per-machine path editing, no `claude mcp add`. The key is not stored there — the connector's own
auto-discovery finds it (see above), so the file is safe to commit.

Two things this depends on, and both are the normal case: `node` must be on `PATH`, and Claude
Code must be launched from the repo root (project-scoped servers resolve relative to the project
directory). Starting Claude Code from a parent directory such as your home folder is the usual
reason the tools are silently absent.

To register it by hand instead — for a checkout somewhere unusual, or a client that has no
project scope:

```bash
# from the repo root; $PWD keeps it machine-independent.
# Deliberately NO --env GEMINI_API_KEY: that writes the key into ~/.claude.json,
# a file the assistant can read. Supply the key by env var or key file instead.
claude mcp add alloflow-remediation -- node "$PWD/desktop/mcp/alloflow-remediation-mcp-stdio.cjs"
```

### Claude Desktop (`claude_desktop_config.json`)

Claude Desktop has no project scope, so this config does need an absolute path — but generate it
rather than transcribing it, so it is right on every machine:

```bash
# from the repo root
node -e "console.log(JSON.stringify({mcpServers:{'alloflow-remediation':{command:'node',args:[require('path').resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs')]}}},null,2))"
```

```json
{
  "mcpServers": {
    "alloflow-remediation": {
      "command": "node",
      "args": ["<absolute path printed by the command above>"],
      "env": { "ALLOFLOW_MCP_ENV_PATH": "<absolute path to your key file>" }
    }
  }
}
```

Note this points at a key *file* rather than inlining the key. Putting
`"GEMINI_API_KEY": "..."` here would work, but it stores the secret in a config file the
assistant can read; the file path does not.

For distribution to people who do not have the repo at all, build the `.mcpb` bundle
(`node desktop/mcp/build_mcpb.cjs`) — see [MCPB_RELEASE.md](MCPB_RELEASE.md). That is the only
path that needs neither a checkout nor a hand-written path.

### Verify a registration on any machine

```bash
node mcp-testing/tools/mcp_call.cjs list desktop/mcp/alloflow-remediation-mcp-stdio.cjs
node mcp-testing/tools/mcp_call.cjs call desktop/mcp/alloflow-remediation-mcp-stdio.cjs remediation_selftest
```

The first proves the server starts and registers its tools; the second proves the install can
actually remediate. Neither needs a key or an MCP client. See [mcp-testing/README.md](../../mcp-testing/README.md).

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

**The other answer — no key at all:** the agent-bridge lane below runs the same pipeline with
the MCP client's own model as the engine.

## The agent-bridge lane: your Claude subscription as the engine (no key)

`pdf_remediate_agent_start` runs the full canonical pipeline — same audits, same honesty
gates, same tagged-PDF safety verdicts — but every internal model call **pauses and is
published as a pending request** that the MCP client answers:

```
pdf_remediate_agent_start   → { runId }
remediation_agent_requests  → run state + pending prompts (long-poll; vision requests
                              include the rendered page images as image content)
remediation_agent_respond   → the client's reply for one request; the pipeline continues
remediation_agent_cancel    → abort; files already written stay
```

The client's model — for example, the model in an existing MCP client subscription — plays the
role Gemini normally plays. Since MCP sampling is not yet supported by Claude's clients, this
is the same idea implemented over ordinary tool calls: the server never contacts Gemini, needs
no key, and makes no external model request at all.

Honesty notes, because this lane moves the data boundary rather than removing it:

- **Document-derived prompts are surfaced to the client conversation.** That content goes to
  whatever provider the client's model runs on (e.g. Anthropic under the user's own account) —
  the same place every keyless tool's *results* already go, but at prompt-level granularity.
  `dataHandling.note` states this; so do the tool descriptions.
- **The reply contract is the pipeline's, not the client's.** Each pending request embeds the
  pipeline's own prompt; the strict parsers discard malformed replies and re-ask, so a client
  that ignores the format contract wastes its own turns.
- **The verdict stays honesty-gated.** A client that answers the audit prompts carelessly gets
  a degraded, disclosed verdict — exactly as a misbehaving Gemini would. The result carries
  `modelTransport: "agent-bridge"` and `modelCallsAnswered` so nobody can mistake the engine.
- Large prompts are paged. When `promptNextOffset` is non-null, call
  `remediation_agent_requests` again with that request's `request_id` and the returned
  `prompt_offset`, concatenate the pages, and only then answer. Images carry request/index
  correlation metadata. If the combined image budget omits one, fetch it alone with
  `request_id` + `image_index`; an individually oversized image fails visibly rather than being
  silently discarded.
- Expect roughly 10–40 requests per document (more with `auto_continue` or scanned pages).
  Text-first documents are the sweet spot; scanned pages surface as images to describe. Agent
  runs hold the single-flight lane and default to a 60-minute per-document wall clock
  (`max_run_minutes`, cap 180). Saved run records support explicit resume after restart;
  the client supplies new model replies and unfinished documents may restart.
- **The transport is latency-tuned for a conversational client** (2026-08-19 perf report): the
  driver publishes a host transport profile that widens the pipeline's per-call deadlines to
  600s (vs 180s text / 120s vision tuned for HTTP sockets) and exempts the run from Gemini
  quota pacing and calm probes, since nothing goes to Gemini. If the pipeline ever does re-ask,
  re-asks are idempotent at the bridge: a re-ask of a still-pending prompt coalesces onto the
  same `requestId`, and a re-ask of an already-answered prompt is served from the delivered
  answer — client work is never destroyed. The result's `bridgeStats` reports published
  requests, coalesced re-asks, replayed answers, and measured per-request client latency.

End-to-end proof: `tests/mcp_agent_bridge_e2e.test.js` drives a real run through this exact
tool sequence with the selftest's scripted replies standing in for the client — no key in the
environment, tagged PDF delivery-verified.

## Tools

| Tool | What it does | Writes | Typical time |
| --- | --- | --- | --- |
| `remediation_capabilities` | Honest environment report (key present, Playwright package AND Chromium **binary** present, pipeline modules found, hash-verified local vendor assets, models, limits). Call first — a fresh packaged install reports `chromiumInstalled: false` with a hint. | nothing | instant |
| `remediation_selftest` | Proves this install can actually **remediate**, not merely have the parts: runs the real pipeline, in the real browser, through the real `fixAndVerifyPdf`, against a generated one-page PDF and a **scripted loopback model**. **No Gemini key, no quota, nothing leaves the machine.** On failure it names the stage (`assets` / `browser` / `module-boot` / `ownership-gate` / `audit-contract`) so a broken install is never confused with a bad key. | nothing kept | 20–60 s |
| `generate_resource_pack` | Calls the normal app's existing `generateFullPackHTML` exporter with app-shaped JSON to produce the same student/teacher resource pack. **No Gemini key, account, Worker, or upload.** This is a transport adapter, not a second renderer. | collision-safe `.html` | seconds |
| `remediation_setup` | One-time environment setup: downloads the Chromium binary via Playwright (~200MB, 1–5 min). Idempotent — returns instantly when already installed. No key needed. | Playwright browser cache | 1–5 min once |
| `pdf_audit` | Accessibility audit: score, per-severity issues, scanned/searchable detection, language, page count. Accepts `.pdf`, `.docx`, `.pptx` (Office files audit deterministically from extracted text). | nothing | 1–3 min |
| `pdf_validate_ua` | Independent **PDF/UA-1 (ISO 14289-1)** validation via the packaged veraPDF CLI and local Java. Validates one immutable snapshot, supports cancellation, emits progress pulses, and returns its SHA-256, byte count, profile, validator version, and validation time. **No Gemini key, account, Worker, upload, or automatic CDN fallback.** | nothing | ~30–300 s |
| `pdf_remediate` | Full pipeline, **synchronous**: audit → accessible HTML rebuild → AI fix passes to `target_score` → honesty-gated verification → tagged-PDF export. Blocks until done — use the job tools if your client enforces tool timeouts. | `<stem>-accessible.html`, `<stem>-tagged.pdf`, `<stem>-remediation-report.json` (collision-safe names, never overwrites) | 5–30 min |
| `pdf_remediate_start` | Same run as a **background job**; returns a `jobId` immediately. Jobs run one at a time in start order. | same as above | instant return |
| `pdf_batch_audit_start` | Background job **auditing** every document in a folder (non-recursive, ≤200 files) into one triage scoreboard. The cheap pass before remediating: find out *which* files need work instead of remediating a folder blind. Resumable (`skip_existing`, default true) and carries prior rows forward so a resumed scoreboard stays complete. | `accessibility-audit-scoreboard.json` + `.csv` (collision-safe) | instant return; 1–3 min per document |
| `pdf_batch_remediate_start` | Background job remediating **every .pdf in a folder** (non-recursive, ≤60 files, skips `-tagged.pdf` outputs), continuing past per-file failures. | same, per file | instant return |
| `pdf_remediate_from_scoreboard_start` | Background job remediating only the documents a triage scoreboard put in the bands you name (default `needs-work`). Closes the triage loop: audit a folder, then fix exactly what earned it. | same as `pdf_remediate`, per file | instant return |
| `remediation_job_status` | Job state, a batch `progress` block (files done/remaining, observed mean per file, estimated minutes left), and the last pipeline telemetry lines (throttle waits show here — a slow job is distinguishable from a stuck one). | nothing | instant |
| `remediation_job_result` | The completed job's summary (per-file summaries for batches). | nothing | instant |
| `remediation_job_cancel` | Cancels a queued job, or kills the running one (its browser context closes; in-flight AI calls die in seconds). Files already written stay. | nothing | instant |
| `remediation_job_diagnostics` | Numbers-only diagnostic snapshot for a run: per-call ledger (outcomes, timings, byte counts, retries, models), throttle events, constants in force. Pass `job_id` for a background job; omit it for the most recent run this session. Never contains prompts, responses, or document text. | nothing | instant |
| `audit_html` | Three-engine accessibility audit (AI content rubric + axe-core + IBM Equal Access) of a local `.html` file — the same evidence stack and canonical verification policy the remediation pipeline uses internally. Per-engine `checks` distinguish passed / failed / partial / review-required / unavailable; an engine error is reported in `engineErrors`, never counted as a pass. Without a Gemini key the two model-free engines still run and `aiEngine: not-run` says so. Never fetches URLs. | audited HTML → Gemini under your key (nothing when no key is set) | 1-2 min |
| `audit_two_engines` | Model-free axe-core + IBM Equal Access audit of a local `.html` file with the same per-engine status contract, reporting where the engines disagree. | nothing | < 1 min |

Since 0.3.2, `pdf_audit` and the remediation tools also accept **PNG/JPEG/WebP images** (photographed
worksheets are first-class inputs; magic-byte detection protects against mislabeled files), and the
single-file remediation tools take an optional **`page_range`** ("12-18" or "5") to remediate a span
of a long PDF instead of the whole document.

Since 0.3.4 they additionally accept **text-family files** — `.md`/`.markdown`/`.txt`/`.csv`/`.tsv`
and spreadsheets (`.xlsx`/`.xls`/`.xlsb`/`.ods`). The driver mirrors the app's own intake: spreadsheets
convert to markdown tables (first 200 rows per sheet, truncation disclosed), text decodes as UTF-8,
and both flow through the pipeline's native text payload. Like Office inputs, the deliverable is the
accessible HTML (no tagged-PDF export).

`generate_resource_pack` reads `{ "items": [...], "topic": "...", "isWorksheet": false,
"responses": {}, "config": {} }` from `resource_pack_json` and writes `output_path`. Those are the
normal app exporter's native inputs; the connector deliberately does not define a second resource
schema or rendering pipeline. Existing output files are never overwritten.

Maintainers: run `npm run verify:mcp-parity`. It fails if a transport-capable app area disappears from MCP and compares this tool's generated HTML against the production pipeline output, normalizing only the intentional `generatedAt` timestamp.

Remediate options (same on all three remediate tools): `output_dir`, `target_score` (default
95), `fix_passes` (default 2), `polish_passes` (default 0), `tagged_pdf` (default true),
`auto_continue` (default false), `auto_continue_rounds` (default 3, max 5), `validate_ua`
(default false — also run the keyless ISO 14289-1 veraPDF check on the tagged output and put
the verdict in the report; parity with the app's auto-veraPDF), `ocr_language` (Tesseract code
for scanned docs, e.g. `spa`; omit for auto-detect). Batch only: `skip_existing` (default
true) skips files whose `-remediation-report.json` already exists in the output folder — an
interrupted batch is resumable without re-spending quota on finished files.

**Auto-continue parity (#6-full):** with `auto_continue: true` the connector runs the SAME
improvement loop the app runs after the primary pass — axe violations go to the deterministic
fixer, AI-flagged + Equal-Access-confirmed issues go to the chunked AI fixer, a clean-but-
unverified doc gets one evidence refresh — and every accepted round is merged through
`finalizeRemediationRound`, the one canonical reducer the app itself uses. Same revert rule
(only a REAL deterministic regression reverts a round), same stall limit. The result carries
`autoContinue: { roundsRun, log }`. Costs extra time and Gemini quota; the verdict and the
tagged PDF are built from the final round's state.

**Office inputs:** the remediate/audit/batch tools also accept `.docx` and `.pptx` — the
pipeline routes them through its deterministic Office branches (mammoth/pptx extraction, no
Vision pass). Office inputs skip the tagged-PDF export; the accessible HTML is the deliverable.

**Skill:** `agent_skills/alloflow-pdf-remediation/SKILL.md` teaches an agent the job-polling
etiquette and how to relay the honesty fields without overstating them — install it alongside
the connector for best results.

**Recommended Gemini-powered remediation flow for a client like Claude:**
`remediation_capabilities` -> follow `onboarding` -> confirm the requested tool's
`dataHandling` tier -> `pdf_remediate_start` -> poll `remediation_job_status` every 30-60 s
-> `remediation_job_result`. The Gemini key is optional for every tool named in
`keylessToolNames`; do not route those requests away merely because `fullAiPipelineReady` is
false. Job records persist locally for 30 days and survive a server restart. Schema-3 queued
and running jobs are automatically requeued after their input, options, engine, journal, and
checkpoint compatibility are validated. See **Jobs survive a restart** below.

The result carries AlloFlow's honesty surfaces verbatim: the distribution verdict
(ready / cautions / review-before-handing-out), before/after scores with their source,
`aiVerificationIncomplete`, integrity coverage/warnings, and every fidelity note. **The tagged
PDF only carries a PDF/UA declaration when it earned one.** Treat the verdict the way the app's
results screen does: review the cautions before distributing.

## Triage first: which of these documents actually need work?

Remediation is 5–30 minutes per file and spends real quota, and the pipeline is single-flight, so
pointing `pdf_batch_remediate_start` at a 60-file folder is potentially an overnight run. Usually
you should not: in a typical folder a large share of documents are already fine, and some are
image-only scans that need OCR before any score means anything.

`pdf_batch_audit_start` is the cheap pass. It audits (1–3 min each, writes no document files) and
produces one scoreboard, in JSON and in CSV because the CSV is what opens in Excel:

```
name,file,band,score,critical,serious,moderate,minor,pages,scanned,searchableText,language,error
Student Handbook 2026.pdf,C:\queue\Student Handbook 2026.pdf,review,85,1,0,0,0,2,false,true,en,
IEP meeting guide.pdf,C:\queue\IEP meeting guide.pdf,review,85,1,0,0,0,2,false,true,en,
```

The `band` column names the **next action**, not a grade:

| Band | Meaning |
| --- | --- |
| `scanned` | Image-only. Needs OCR before its score means anything, so this outranks the number. |
| `needs-work` | Score < 70. Remediate these first. |
| `review` | 70–89. Worth a look. |
| `likely-ok` | 90+. Spend the quota elsewhere. |
| `failed` | The audit could not run on this file; `error` says why. |

Then close the loop with **`pdf_remediate_from_scoreboard_start`**, which remediates only the
documents in the bands you name (default `needs-work`) without you having to move files around:

```jsonc
{ "name": "pdf_batch_audit_start",                "arguments": { "dir_path": "S:/queue" } }
// ...poll to completion, read the scoreboard, then:
{ "name": "pdf_remediate_from_scoreboard_start",  "arguments": { "dir_path": "S:/queue" } }
```

Point it at a scoreboard with `scoreboard_path`, or at a folder with `dir_path` to use that
folder's newest scoreboard. Pass `bands: ["needs-work", "review"]` to widen the net;
`scanned` documents are remediable too, just slower, because they take the full OCR path. Files
listed in the scoreboard but no longer on disk are reported rather than silently dropped, and if
the band you asked for is empty the error tells you which bands the scoreboard actually holds.

Scores judge the **source** documents, never a remediated output.

### Why batches are serial, and why that is not being "fixed"

A 40-document remediation batch runs one file at a time and takes hours. That is deliberate, and
running them concurrently would make it worse rather than better.

The pipeline paces its own Gemini calls against a concurrency ceiling that is **per run** and
reset per run (`doc_pipeline` ~L4616). The driver builds a fresh pipeline instance per page per
run, so two concurrent remediations would be two independent gates, each pacing to its own
ceiling and neither aware of the other: exactly double the transport concurrency the pacing
exists to prevent. The pipeline's response to a storm is a cooldown plus deferred calls, so
parallel runs would likely finish *later* than serial ones, with more runs degraded into
honesty-gated partial results.

The real answer to "this folder would take all night" is to remediate fewer documents, which is
what triage plus `pdf_remediate_from_scoreboard_start` is for. In the meantime
`remediation_job_status` carries a `progress` block (files done, files remaining, observed mean
per file, estimated minutes left) so a long batch is legible rather than opaque. The estimate
appears only once a file has actually finished, and it says what it is extrapolating from.

Interrupted triage resumes for free: `skip_existing` (default true) reads the scoreboards already
in the output folder and skips anything recorded there, carrying those rows into the new
scoreboard so it stays a complete picture rather than one with holes where the skips were. Pass
`skip_existing: false` to force a re-audit.

## Getting the before/after documents and the report

Every run writes its outputs **next to the input file**, or wherever you point `output_dir`:

| Role | File |
|---|---|
| Before | your original document, untouched, at its original path |
| After | `<name>-accessible.html` |
| After (PDF) | `<name>-tagged.pdf` — only when the verdict allowed distribution |
| Report | `<name>-remediation-report.json` |
| Manifest | `<name>-remediation-completion.json` (role, size and sha256 of each artifact) |

So a document remediated straight out of `Downloads` leaves its accessible version and report
in `Downloads` alongside it. Nothing is uploaded and nothing is moved.

Paths alone are awkward for a chat client, though, so the connector **also publishes each run's
artifacts as MCP resources**. The tool result carries a `resources` array:

```json
"resources": [
  { "role": "source",         "label": "Original document (before)",
    "uri": "alloflow-remediation://artifact/rjob-.../source",
    "path": "C:\\Users\\you\\Downloads\\lesson.pdf",          "mimeType": "application/pdf" },
  { "role": "accessibleHtml", "label": "Accessible HTML (after)",
    "uri": "alloflow-remediation://artifact/rjob-.../accessibleHtml",
    "path": "C:\\Users\\you\\Downloads\\lesson-accessible.html", "mimeType": "text/html" },
  { "role": "report",         "label": "Remediation report",
    "uri": "alloflow-remediation://artifact/rjob-.../report",
    "path": "C:\\Users\\you\\Downloads\\lesson-remediation-report.json", "mimeType": "application/json" }
]
```

Any MCP client can fetch those with `resources/read` — text artifacts come back as text, the
PDF as base64 — or list them with `resources/list`. The server emits
`notifications/resources/list_changed` when a run finishes, so a client that listed earlier
refreshes on its own. The server keeps its own artifact index in the state directory, so
artifacts from previous sessions are republished after a restart whichever lane produced
them. Keyless runs save their own resumable records separately from Gemini job records. Files deleted or moved in the meantime are dropped from the listing rather than
advertised and then failed.

**This is not a general file-read channel.** A resource URI carries an opaque run id and a
fixed role name, never a path, and `resources/read` serves only entries the server itself
registered after writing them. Anything else — an unknown run, an invented role, a `file://`
URI, a raw path — is refused with `-32602`, and an artifact deleted after the run is reported
as gone rather than served from a stale cache. Reads over 12 MB are refused with the path, so
one fetch cannot wedge the stdio transport.

## Jobs survive a restart

Job records persist to `~/.alloflow-mcp/jobs` (override with `ALLOFLOW_MCP_STATE_DIR`) and are
reloaded when the server starts, so a client restart or a sleeping laptop no longer erases the
bookkeeping for a multi-hour batch. Records are kept 30 days.

Schema-3 queued and running jobs are requeued in their original FIFO order. A running
single-file remediation resumes from its last validated extraction/accepted-round checkpoint;
batches reuse digest-bound per-file journal rows and verified completion manifests. A manifest
is accepted only when its source/options/engine identity and every artifact hash match.

**`interrupted`** now means the stored state was legacy, incomplete, corrupt, or
compatibility-unsafe. AlloFlow stops that job instead of guessing against a changed input or
engine. Verified files already published remain on disk.

Durable acceptance and every checkpoint/file-boundary commit are fail-closed. If the state
directory is read-only or full, a new job or durability boundary fails explicitly rather than
claiming restart safety that was not actually committed.

## Restricting where it can read and write

By default the connector reads and writes anywhere you can, which is reasonable for a personal
stdio server behind a client that approves every call. Set **`ALLOFLOW_MCP_ALLOWED_ROOTS`** (an
OS path list: `;` on Windows, `:` elsewhere) and every `file_path`, `dir_path`, and `output_dir`
must resolve inside one of those roots:

```jsonc
// claude_desktop_config.json
"env": { "ALLOFLOW_MCP_ALLOWED_ROOTS": "S:\\accessibility-queue;D:\\scratch" }
```

Paths are resolved before the check, so `..` traversal cannot escape, and containment is a real
path-segment comparison rather than a string prefix (`S:\queue-archive` is **not** inside
`S:\queue`). `remediation_capabilities` reports `allowedRoots`, and `null` there means
unrestricted, which is the honest word for it rather than implying a boundary that is not set.

This is worth doing on any machine where the folders next door hold student data: it turns "the
connector only looks where I point it" from a promise into something a district can check.

## When it says ready but nothing works

`remediation_capabilities` is a **presence** check: key, Playwright, Chromium, module files, and
hash-verified local vendor assets. It
cannot tell you the pipeline will accept a run, and on 2026-07-28 it reported `ready: true` for a
connector where every remediation died at the pipeline's document-ownership gate. The field now
carries a `readyMeans` caveat saying exactly that.

`remediation_selftest` is the function check. It runs the whole thing for real against a scripted
local model, so it needs no key and spends nothing, and it distinguishes the two failures people
otherwise conflate:

- **`ok: true`** — the connector works; if live runs still fail, the problem is your key, quota,
  or the document.
- **`ok: false`** with a `stage` — the install itself is broken, and `stage` says where.
  `ownership-gate` or `audit-contract` specifically mean the connector has drifted out of sync
  with the pipeline it ships beside, which is a connector bug, not your configuration.

Run it after installing or updating the connector, and any time behaviour looks inexplicable.

## Watching (and stopping) a long run

A remediation legitimately runs 5-30 minutes. Two standard MCP affordances make that bearable
from the synchronous tools; the job tools already cover the same ground by polling.

**Progress.** Put a `progressToken` in the call's `_meta` and the run's live pipeline telemetry
comes back as `notifications/progress`:

```jsonc
{ "jsonrpc": "2.0", "id": 7, "method": "tools/call",
  "params": { "name": "pdf_remediate",
              "arguments": { "file_path": "C:/docs/handbook.pdf" },
              "_meta": { "progressToken": "run-7" } } }
```

```jsonc
{ "jsonrpc": "2.0", "method": "notifications/progress",
  "params": { "progressToken": "run-7", "progress": 34,
              "message": "fix — step 2: rebuilding reading order" } }
```

Opt-in per spec: no token, no notifications. Notifications are throttled to one per 250ms, and
`progress` counts every telemetry line (not just the sent ones) so it stays monotonic. Covers
`pdf_audit`, `pdf_remediate`, and `pdf_validate_ua`. There is no `total` — the pipeline's pass
count is not known up front, and inventing one would be a fake ETA.

**Cancellation.** Send `notifications/cancelled` for the in-flight request id:

```jsonc
{ "jsonrpc": "2.0", "method": "notifications/cancelled",
  "params": { "requestId": 7, "reason": "user stopped it" } }
```

For `pdf_audit` and `pdf_remediate` this closes the run's browser context, which kills queued and
in-flight Gemini calls within seconds (the same mechanism `remediation_job_cancel` uses).
`pdf_validate_ua` terminates its dedicated Java child and deletes its private immutable input
snapshot; it remains outside the remediation single-flight lane, so cancelling a remediation job
cannot accidentally kill an unrelated validation. No response is sent for a cancelled request,
per spec. Quota already spent is spent, and output files written before a cancel stay on disk.

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
| `GEMINI_API_KEY` | — | Gemini API key for text + vision calls (see auto-discovery above) |
| `ALLOFLOW_MCP_ENV_PATH` | — | env file to read the key from when the var isn't set |
| `ALLOFLOW_MCP_NO_KEY_FILES` | off | `1` disables key-file auto-discovery (tests; bundles) |
| `ALLOFLOW_MCP_ASSETS_DIR` | auto | where the pipeline modules + `verapdf/` live (repo root, or `assets/` in a bundle) |
| `ALLOFLOW_MCP_GEMINI_MODEL` | `gemini-3-flash-preview` | primary model |
| `ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL` | `gemini-2.5-flash-lite` | one retry on a 404/config failure |
| `ALLOFLOW_MCP_MAX_RUN_MINUTES` | `30` | hard wall clock per run |
| `ALLOFLOW_MCP_VERAPDF_URL` | local loopback server | override validator page URL (host must support HTTP Range) |
| `ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS` | off | `1` explicitly enables the legacy network-dependent CheerpJ browser validator for direct driver integrations; the MCP tool remains local-CLI-first and fail-closed |
| `ALLOFLOW_MCP_STATE_DIR` | `~/.alloflow-mcp/jobs` | where job records persist (kept 30 days) |
| `ALLOFLOW_MCP_ALLOWED_ROOTS` | unrestricted | OS path list; when set, every file/folder argument must resolve inside one of these roots |
| `ALLOFLOW_MCP_VERBOSE` | off | forward ALL page console lines to stderr |
| `ALLOFLOW_MCP_HEADFUL` | off | visible Chromium (debugging) |

## Packaging (MCPB bundle for Claude Desktop)

```bash
node desktop/mcp/build_mcpb.cjs          # → desktop/dist/mcpb/alloflow-remediation.mcpb
```

The bundle stages the server, all five shipped pipeline/view modules, `verapdf/`, the complete
hash-verified `vendor/` browser runtime plus its third-party notices, `PRIVACY.md`, Playwright
`node_modules`, the MCPB manifest, and the exact canonical
`agent_skills/alloflow-pdf-remediation/SKILL.md`. The server advertises the bounded
`io.modelcontextprotocol/skills` extension and serves that file through `skills/list`,
`skills/get`, `resources/list`, and `resources/read` with a SHA-256 digest. Supporting clients can
therefore import the safe workflow without a separately maintained copy; other clients ignore the
extension and keep using the same tools (the registry and the MCPB manifest are pinned to
each other by `tests/mcp_remediation_stdio_smoke.test.js`, so the count lives there, not here). The installer may accept an optional Gemini API key
(stored by Claude Desktop and injected as `GEMINI_API_KEY`; never embedded in the bundle).
Install by dragging the `.mcpb` into Claude Desktop Settings > Extensions. Host machines
still need Node 20+ on PATH, a local Java runtime (veraPDF and EPUBCheck) and a one-time
`npx playwright install chromium`; capabilities report separately on Playwright, Chromium, Java,
EPUBCheck/Ace runtimes, pipeline modules, and vendor hash integrity.
`--lean` skips `node_modules` for personal development and verifies protocol, registry parity, and
vendor integrity without pretending Playwright is bundled. Full distribution builds additionally
require the extracted artifact to resolve its own packaged Playwright. Distribution builds require
the official pinned MCPB validator; `--allow-unvalidated` creates only an explicitly labelled diagnostic ZIP.

## Releases

The public distribution lane is .github/workflows/mcpb-release.yml. A manual run builds and retains
a verified Actions artifact without publishing a release. Pushing a tag that exactly matches the
manifest version (for example, mcpb-v0.3.0) additionally creates a GitHub Release containing the
installable MCPB, SHA-256 checksum, CycloneDX npm-dependency SBOM, vendor hash manifest, third-party
notices, privacy policy, and installation guide. GitHub build-provenance and SBOM attestations bind
the downloadable MCPB bytes to the workflow that produced them; users can verify them with:

    gh attestation verify alloflow-remediation.mcpb -R Apomera/AlloFlow

The release job processes no user documents and requires no Worker, AlloFlow account, institution
account, or Gemini key.

Before pushing a release tag, run `npm run verify:mcpb-ci` — the exact vitest selection the tag
build runs in CI. The default local gates (`verify:mcp-parity`, the artifact boot-check) do not
cover it, and versions 0.3.1–0.3.3 all failed in CI on a test only that selection executes.

## Official MCP Registry

The GitHub-hosted MCPB is published on the official MCP Registry as
`io.github.Apomera/alloflow-remediation` (first published at 0.3.5); a second npm package or
hosted server is not required. The namespace must keep the GitHub account's exact casing:
registry publish grants are case-sensitive (a lowercase `apomera` 403s at the final publish
step even though every earlier verification passes), while registry search is case-insensitive. The release build generates server.json from the exact
MCPB bytes, including its SHA-256 and immutable GitHub Release URL. Registry publication is kept in
the separate, manual mcp-registry-publish workflow because published versions are immutable and
currently cannot be unpublished. The workflow requires an existing attested release, verifies its
checksum and provenance, regenerates server.json byte-for-byte, validates it with a checksum-pinned
official publisher, and requires the exact confirmation phrase before GitHub-OIDC publication.

Registry discovery does not turn this into a remote connector: it remains the same local Claude
Desktop extension, and documents stay local unless the user deliberately invokes a Gemini-dependent
tool.

## Tests

`npm run verify:mcp-parity` runs the capability regression gate plus protocol, validation, direct
production-output parity, and clean staged-package launch tests. It uses no Gemini key or quota;
when Chromium is installed it also compares deterministic MCP artifacts against direct production
pipeline calls. The clean-package fixture launches from a temporary directory with `NODE_PATH`
removed, verifies every vendored runtime hash, and confirms the bundle cannot silently borrow
assets or dependencies from the repository checkout.

Every build also extracts the exact emitted .mcpb into a fresh temporary directory, clears
NODE_PATH, launches only the shipped server, and verifies the unique tool-name set, manifest/server parity,
pipeline modules, keyless mode, and every bundled vendor-file hash. Repeat that acceptance check
without rebuilding with npm run verify:mcpb-artifact (which also requires packaged Playwright),
or pass a lean diagnostic artifact directly to
node desktop/mcp/verify_mcpb_artifact.cjs path/to/alloflow-remediation.mcpb.
