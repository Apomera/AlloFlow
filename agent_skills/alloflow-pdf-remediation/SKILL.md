---
name: alloflow-pdf-remediation
description: Drive AlloFlow's PDF accessibility remediation MCP connector (alloflow-remediation) well. Use when a teacher asks to make a PDF accessible, audit a document's accessibility, check PDF/UA conformance, or batch-remediate a folder of handouts.
---

# AlloFlow PDF remediation via MCP

The `alloflow-remediation` connector runs AlloFlow's real remediation pipeline
(headless) on local PDFs. It produces an accessible HTML version, a tagged PDF,
and an **honesty-gated verdict** — the pipeline is deliberately conservative
about what it claims, and you must be too.

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

## Standard flow

1. `remediation_capabilities` — confirm `ready: true`. If `geminiKeyPresent`
   is false, stop and tell the user how to set `GEMINI_API_KEY` (free key at
   aistudio.google.com; note it is NOT covered by a school's Workspace DPA —
   they should avoid student-identifiable documents on a personal key).
2. Optional but cheap context: `pdf_audit` (1–3 min) for the before-score and
   issue list. Skip it if the user already asked for remediation — the
   remediation run audits internally anyway.
3. `pdf_remediate_start` with the file path. Defaults are right for most
   documents (target 95, 2 fix passes, tagged PDF on). Set `ocr_language`
   (Tesseract code, e.g. `spa`) only when the user says the scan is in a
   specific non-English language.
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
