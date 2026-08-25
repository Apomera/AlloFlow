---
name: alloflow-pdf-remediation
description: Drive AlloFlow's PDF accessibility remediation MCP connector (alloflow-remediation) well. Use when a teacher asks to make a PDF accessible, audit a document's accessibility, check PDF/UA conformance, or batch-remediate a folder of handouts.
---

# AlloFlow PDF remediation via MCP

The `alloflow-remediation` connector runs AlloFlow's real remediation pipeline
(headless) on local PDFs. It produces an accessible HTML version, a tagged PDF,
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

A false `fullAiPipelineReady` does not make the connector unusable. Use its
keyless tools when they satisfy the request. For full semantic remediation,
use the Gemini-powered job flow only when the user has an appropriate key and
is authorized to send that document to Gemini.

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
3. **Jobs, not sync calls.** Remediation takes 5–30 minutes. Always prefer
   `pdf_remediate_start` → poll `remediation_job_status` (every 30–60 s; the
   status includes live pipeline telemetry — a throttle wait is normal, not a
   hang) → `remediation_job_result`. The synchronous `pdf_remediate` is only
   for very small documents.
4. **Quota is the teacher's.** Each remediation makes dozens of Gemini calls on
   their key. Don't re-run on a whim; don't start a batch without confirming
   the folder and file count first.
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

## Standard flow

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

1. Start the run, then loop: `remediation_agent_requests` (long-poll,
   `wait_seconds: 20`) → answer every entry in `pendingRequests` with
   `remediation_agent_respond` → repeat until `status` is `completed`.
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
6. `remediation_agent_cancel` aborts; written files stay. Runs do not survive
   a server restart.

## Batch flow

`pdf_batch_remediate_start` on a folder (non-recursive, ≤60 PDFs, skips
`*-tagged.pdf`). Confirm the file count with the user before starting. The
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
