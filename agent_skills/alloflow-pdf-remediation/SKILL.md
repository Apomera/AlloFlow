---
name: alloflow-pdf-remediation
description: Drive AlloFlow's PDF accessibility remediation MCP connector (alloflow-remediation) well. Use when a teacher asks to make a PDF accessible, audit a document's accessibility, check PDF/UA conformance, or batch-remediate a folder of handouts.
---

# AlloFlow PDF remediation via MCP

The `alloflow-remediation` connector runs AlloFlow's real remediation pipeline
(headless) on local PDFs, Word documents, slides, spreadsheets, images and text
files. It produces an accessible HTML version, a tagged PDF,
and an **honesty-gated verdict** — the pipeline is deliberately conservative
about what it claims, and you must be too.

## Inspect capabilities before choosing a path

Call `remediation_capabilities` before opening a document. Follow
`onboarding` when `actionRequired` is true, then classify the intended tool
through `dataHandling`:

- `offlineToolNames` make no external request from the connector process. Tool results still enter
  the MCP client conversation; agent-bridge results deliberately carry document-derived prompts and
  optional page images to the client's model provider.
- `publicDependencyDownloadToolNames` fetch Chromium or pinned exporter
  libraries without intentionally including document content.
- `geminiDocumentEgressToolNames` send the document or derived content to
  Gemini under the user's key.
- `geminiOptionalToolNames` (currently `audit_html`) send content to Gemini only when a key
  exists; without one they run the model-free engines and report `aiEngine: not-run` with a
  `partial` verification state. Say so when you relay the result; never present it as the
  full three-engine audit.

A false `fullAiPipelineReady` does not make the connector unusable. Use its
keyless tools when they satisfy the request. For full semantic remediation,
default to the agent-bridge flow below. Use the Gemini-powered job flow when
the user selects that engine and is authorized to send the document to Gemini.

Use `$alloflow-portable-remediation` when the document exists only as an
attachment in the active file sandbox, no usable local path is available to
the connector, or the user explicitly wants the portable no-key rebuild. That
is a fallback for a different execution boundary, not a reason to bypass an
installed connector's local tools.

## Golden rules

1. **Never overstate the result.** Relay the verdict tier and its cautions
   verbatim-in-spirit. "Ready to hand out" is the tool's claim to make, not
   yours; if the verdict says review-first, tell the teacher to review first.
2. **The two scores are different artifacts.** The remediation score judges the
   accessible-HTML *content* (semantics, alt text, structure). `pdf_validate_ua`
   judges the exported PDF *bytes* against ISO 14289-1. Never mix them up and
   never average or blend them.
3. **Use the selected engine.** For keyless work, use the agent-bridge flow.
   For Gemini, use jobs rather than synchronous calls. Remediation takes 5–30 minutes. Always prefer
   `pdf_remediate_start` → poll `remediation_job_status` (every 30–60 s; the
   status includes live pipeline telemetry — a throttle wait is normal, not a
   hang) → `remediation_job_result`. The synchronous `pdf_remediate` is only
   for very small documents.
4. **Quota is the teacher's.** Each remediation makes dozens of Gemini calls on
   their key. Don't re-run on a whim. Use the folder and processing scope the user authorized;
   ask only when the scope or model-provider choice is genuinely unresolved.
5. **Never handle their key.** Do not ask the user to paste an API key into the
   conversation, do not read it out of a file, and do not write it into an MCP
   client config. If a key is needed, relay the `setup` text that
   `remediation_verify_key` returns and let them set it themselves, then
   re-check. A key pasted into chat is in the transcript permanently.
6. **Presence is not validity.** `remediation_capabilities` only reads whether a
   key exists; `onboarding.state: "key-present-untested"` means exactly that. If
   a Gemini-powered tool fails, or before relying on one, call
   `remediation_verify_key` — it sends no document content and spends no
   generation quota. `invalid` means their key is bad (relay the setup steps);
   `valid-but-quota-exhausted` means wait, not re-key; `unreachable` means you
   could not test it, not that it is broken.

## Gemini job flow (when selected)

1. `remediation_capabilities`: follow `onboarding`, then inspect
   `dataHandling` and `keylessToolNames`. If setup is required, call
   `remediation_setup` once. Treat `keyless-ready` as usable. Mention a
   Gemini key only when the requested operation is listed in
   `geminiDocumentEgressToolNames`; a personal key may not be covered by an
   institution's agreements, so avoid student-identifiable data unless the
   user confirms an authorized processing arrangement.
2. Optional but cheap context: `pdf_audit` (1–3 min) for the before-score and
   issue list. Skip it if the user already asked for remediation — the
   remediation run audits internally anyway.
3. `pdf_remediate_start` with the file path. Defaults are right for most
   documents (target 95, 2 fix passes, tagged PDF on). Set `ocr_language` only
   when the user identifies the language. Use the schema's lower-case ISO/BCP-47
   value (for example `es`, `fr`, or `zh-hant`), never a legacy Tesseract code
   such as `spa` or a compound value such as `eng+spa`. Add
   `auto_continue: true` when the user
   wants the strongest result and accepts extra time/quota — it runs the
   app's own improvement loop (same canonical round merge) after the primary
   pass; report `autoContinue.roundsRun` and any reverted rounds from its log.
4. Poll `remediation_job_status`. Report meaningful transitions ("OCR running",
   "throttled — waiting, not stuck"), not every poll.
5. `remediation_job_result` → report:
   - the **verdict** and every caution in it,
   - before → after scores, and whether `aiVerificationIncomplete` is set
     (if true: say the AI semantic audit was incomplete and the score leans on
     structural checks — that is a disclosure, not a failure),
   - **fidelity notes** (each one is a real "the output may differ from the
     original here" warning — surface them all),
   - the three written file paths.
6. For the tagged PDF: offer `pdf_validate_ua` as an independent ISO check
   (needs no key, ~1 min). A `clause 5, test 1` failure alone usually means
   the pipeline *withheld* the PDF/UA identification on purpose because the
   file didn't earn it — report it as "not claiming conformance", not as a
   defect it forgot.

## Agent-bridge flow (no Gemini key: YOU are the model)

When no Gemini key is configured (or the user prefers not to use one),
`pdf_remediate_agent_start` runs the same pipeline with you as the engine.
The pipeline pauses at each internal model call and publishes it as a pending
request; you answer, it continues.

1. Start with `pdf_remediate_agent_start`: pass `file_path` for one document or
   `dir_path` for a folder. Use `effort: "thorough"` when the user wants the strongest
   result; it enables bounded improvement plus independent PDF/UA validation.
   Loop `remediation_agent_requests` → `remediation_agent_respond_batch` until
   completed, failed, cancelled, or interrupted. Batch only currently pending
   independent replies. The batch response includes the next requests and images;
   consume it before polling again. Drive this loop autonomously; the user does
   not need to approve or compose each internal model reply.
2. **Follow each embedded prompt's format contract exactly.** Strict JSON
   where it asks for JSON (no code fences, no commentary), raw HTML where it
   asks for HTML. Malformed replies are discarded by the pipeline's strict
   parsers and re-asked — they waste your own turns.
3. **Answer honestly from the provided content.** The audit prompts are
   evidence collection for the honesty-gated verdict teachers rely on. Never
   invent issues, scores, or passes; if the content shown doesn't support a
   claim, don't make it. Vision requests include the rendered page images —
   describe what is actually there.
   If `promptNextOffset` is non-null, page the selected prompt with
   `request_id` + `prompt_offset` and concatenate it before answering. If
   `omittedImages` is present, fetch each transportable image with its
   `request_id` + `image_index`; do not answer a vision request without all
   required images.
4. Tell the user before starting that document content will pass through this
   conversation (that is where the "model calls" go), and expect roughly
   10–40 requests. Text-first documents are the sweet spot.
5. The result carries `modelTransport: "agent-bridge"` — relay that the
   engine was your model, plus the same honesty fields as any run.
6. `remediation_agent_cancel` aborts; written files stay. Run records survive a
   server restart: find saved run IDs with `remediation_agent_runs`, poll the intended run, then call `remediation_agent_resume`
   when it is interrupted. Verified completed files and audio sections are reused;
   an unfinished document may restart. The client must remain active to answer
   new model requests. Resumption does not promise background model execution.

## Narration and deliverables

Keep both listening styles. `narration: "accessible"` is the recommended default
when audio is requested: it announces headings, lists, tables and image descriptions.
`narration: "natural"` provides continuous reading. Do not describe either as a
replacement for a screen reader. Omit narration when the user did not request audio.

Add narration to an agent start, or call `document_narrate_start` on existing
accessible HTML to avoid repeating remediation. The narration-only tool defaults
to accessible mode. Use `document_narration_voices` to inspect configured language support.
`narration_provider: "auto"` selects Kokoro for English and Piper for supported
other languages. `narration_language` defaults to the document's HTML language;
set an explicit BCP-47 override when that metadata is missing or wrong. This does
not translate the document. `narration_voice` defaults to `auto`.
Accessible announcements are localized for en/es/fr/de/pt/it. Other configured
Piper languages support natural narration. When the user asks for audio without
a specific style, choose accessible where localized, otherwise natural and state
the choice. Respect an explicit style request; do not silently substitute another.
Language-tagged blocks and inline phrases switch automatically between Kokoro
and Piper, including nested phrases in headings, lists, tables and captions.
Leave provider and voice on auto for multilingual documents. Preserve language
tags and document structure; no paragraph splitting is required. Both providers run
locally after public dependency downloads; there is no TTS model API call.
`readalong_epub` defaults to true when narration is requested.

For a large document or folder, call `document_narration_preflight` first. It uses
only bundled local helpers and returns ready/blocked files, voice routes, chunk
counts and a rough audio-duration range. It does not download models or certify
accessibility. Inspect `contentCoverage` as well as language/style readiness.
Correct blocked text omissions or missing spoken descriptions before synthesis;
use authored image alt text, equation `aria-label`/`alttext`, and SVG descriptions.
Do not invent visual or mathematical meaning to make a coverage check pass.
Controls, hidden markup and explicitly decorative images are reported exclusions.
`cachedSections` and `sectionsToSynthesize` show how much audio can be reused.
`document_narrate_start` accepts `dir_path` for up to 60 accessible HTML files,
processed sequentially; generated read-along players are excluded from folder inputs.
Per-file failures remain visible in the final summary. Inspect `outcome` and
`failedFiles`: terminal status `completed` means the batch finished, not that every
file succeeded. After correcting the failure, use the returned `retry` tool and
arguments. Verified final narration files are reused without creating duplicates.
Changed or missing artifacts are rebuilt using valid cached sections. Editing or
reordering a document reuses unchanged speech; the final package is always rebuilt
in the current order. Reports expose `reusedSections` and `generatedSections`.

Remediation `contentCoverage.reviewRequired` blocks automatic narration and tagged
PDF delivery. Inspect the referenced remediation report for source token ranges,
extraction problems and scope. Missing tokens can be rewording rather than loss;
review against the source without bypassing the check or claiming semantic proof.
The completed state of a run is not proof of full source coverage or certification.

Poll `remediation_agent_requests` for progress. Narration requires no model replies.
Deliver the MP3/WAV, HTML player and synchronized EPUB resource links, preserving
coverage and verification disclosures. The HTML player and its MP3 must travel
together; the EPUB contains its audio. A failed section prevents a complete result;
resume retries it using the saved sections. EPUB outputs (read-along and `export_alt_format`)
carry independent `epubValidation` evidence from bundled EPUBCheck and DAISY Ace (runtime
readiness is `epubVerification` in capabilities/preflight): report each
check's status (`passed`, `failed`, `review-required`, `unavailable`, `skipped`) and the raw report
paths. `unavailable` means a runtime (Java, Chromium) was missing, not that the EPUB passed. A
passing result still sets `humanReviewRequired: true`; never describe it as certification.

## Gemini batch flow

`pdf_batch_remediate_start` on a folder (non-recursive, ≤60 PDFs, skips
`*-tagged.pdf`). Use the folder and scope the user authorized. The
result has a per-file scoreboard: report failures per file and the verdict
distribution, not just "done". A cancelled batch keeps its partial scoreboard
(`remediation_job_result` still works; `partial: true`).

## When things look stuck

- Job status telemetry showing `[GeminiGate]`/throttle lines = the service is
  rate-limiting; the pipeline waits deliberately. Slow ≠ stuck; do not cancel.
- No status change AND no new telemetry for >10 minutes → cancel the job,
  report the last telemetry lines, and suggest retrying once.
- `remediation_job_cancel` kills the running browser context; files already
  written stay on disk.

## Interpreting honesty fields (quick reference)

| Field | Meaning |
| --- | --- |
| `verdict` | Distribution readiness (ready / cautions / review-first). Relay it. |
| `aiVerificationIncomplete` | AI semantic audit didn't fully complete; score leans structural. Disclose. |
| `integrityWarning` / `fidelityNotes` | Content may differ from the original (numbers, tables, reading order, stripped headers…). Surface every note. |
| `estimatedMinimumScore` | Floor estimate when the exact score was withheld. Say "at least N", never "N". |
| `taggedPdfError` | Tagged export failed; HTML output is still valid. |
