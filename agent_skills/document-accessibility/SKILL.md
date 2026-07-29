---
name: document-accessibility
description: Make documents accessible and verify it. Rebuild a PDF, DOCX or PPTX as accessible HTML and a tagged PDF, transcribe audio or video, translate the result, repair contrast, write alt text, and produce a conformance report. Use when asked to make something WCAG compliant, screen-reader friendly, Section 508 or ADA Title II ready, or to audit a folder of documents.
---

# Document accessibility with AlloFlow

Two ways in. Pick deliberately, because they have different guarantees.

**The MCP connector** (`alloflow-remediation`) runs the **real pipeline** — the same bytes the app
ships. Full parity: OCR fallback chains, multi-auditor triangulation, chunked fixing, contrast
repair. Needs a Gemini API key for anything AI-dependent.

**The agent-driven path** (`dev-tools/agent_remediate.cjs`) has you do the reading and uses only
AlloFlow's deterministic verifiers. **No API key.** Weaker on hard documents, honest on easy ones.

## The rule that matters most

**A clean axe-core result does not mean the document is fixed.**

Measured, twice, on this project:

- axe reported **100/0** on a rebuilt document while veraPDF found **four real structural failures**
  in the tagged output.
- axe reported **zero contrast findings**, in violations *and* incomplete, on text at roughly
  **1.6:1**. It cannot be trusted to measure contrast in this harness.

**veraPDF is the gate for PDF structure. For contrast, trust the deterministic fix count, not axe.**
Never tell a user a document is compliant because axe was quiet.

## Connector tools, and which need a key

| Tool | Key? | Does |
| --- | --- | --- |
| `remediation_capabilities` | no | Environment report. Call first. `ready` means parts present, not working. |
| `remediation_selftest` | no | Proves the install can actually remediate. Names the broken stage. |
| `pdf_audit` | yes | Score + issues for a PDF/DOCX/PPTX |
| `pdf_remediate` / `_start` | yes | Full pipeline → accessible HTML + tagged PDF |
| `pdf_batch_audit_start` | yes | **Triage a folder** into one scoreboard. The cheap first pass. |
| `pdf_remediate_from_scoreboard_start` | yes | Remediate only what triage flagged |
| `pdf_validate_ua` | **no** | veraPDF ISO 14289-1. The gate. |
| `fix_contrast` | **no** | Deterministic colour repair |
| `generate_conformance_report` | **no** | AlloFlow's own report |
| `export_accessible_office` | **no** | DOCX / ODT |
| `export_alt_format` | **no** | **ePub 3 / DAISY 3 / Braille BRF.** Packages offline. |
| `audit_two_engines` | **no** | axe-core **and** IBM Equal Access, with disagreements named |
| `check_document_structure` | **no** | Heading hierarchy, skipped levels, plain text |
| `extract_document_text` | **no** | Text out of PDF/DOCX/PPTX |
| `describe_images` | yes | Alt text, classifies equations/charts/decorative |
| `transcribe_media` | yes | Audio/video → transcript (speech, visual, dual, synthesis) |
| `translate_accessible_html` | yes | Translate, structure preserved, images protected |

Nine of these need no key at all. When a user has no key, say what still works rather than stopping.

## Order of operations

1. `remediation_capabilities`, then `remediation_selftest` if anything looks wrong. A selftest
   failure is never an API-key problem — it names the stage.
2. A folder? `pdf_batch_audit_start` first. Auditing is 1–3 min/file and writes nothing;
   remediation is 5–30 min and spends real quota. Read the bands, then
   `pdf_remediate_from_scoreboard_start` on `needs-work`. Do not remediate a folder blind.
3. Media? `transcribe_media` first, then treat the transcript as the source.
4. Remediate. Then **`pdf_validate_ua`**. Only `clause 5, test 1` remaining is success — that is
   the PDF/UA declaration withheld by design. `clause 7.2, test 10` is almost always lists nested
   inside table cells; fix and re-tag.
5. `generate_conformance_report`. Never hand-write one.
6. Offer `export_accessible_office`, `export_alt_format`, `translate_accessible_html` and
   `describe_images` as follow-ups. Match the format to the need rather than listing all of them:
   ePub for reading on a phone or e-reader, DAISY when the student uses a DAISY player, BRF only
   when there is an embosser or a refreshable display.

## Writing HTML yourself (the no-key path)

`DocBuilderRenderer` is **not** usable from outside — its dependencies live in the pipeline
closure. Write semantic HTML directly.

- One `<h1>`, then `<h2>`/`<h3>`/`<h4>`, **no skipped levels**
- Real `<table>` with `<caption>`, `<th scope="col">`, `<th scope="row">`
- **Never nest `<ul>` inside `<td>`.** It fails ISO 14289-1 clause 7.2 test 10. Use `<p>` per item.
  This is the single most likely defect you will introduce; it happened on the reference run.
- `lang` on `<html>`, a `<title>`, alt on every image or an explicit decorative mark
- Page boundaries as `<span role="doc-pagebreak" aria-label="Page N">`, not body text
- Drop running heads and page numbers from the reading order

Cross-check your transcription with `agent_remediate.cjs ocr` (Tesseract, independent, no model).
Expect benign differences: OCR hyphenation fragments you rejoined, and navigation you added.
Anything else is a flag. Report disagreements; do not silently prefer your own reading.

## What is NOT available through the connector

Say so plainly rather than improvising:

- **Contracted (Grade 2) UEB braille.** `export_alt_format` produces Grade 1 / uncontracted only.
  Most fluent braille readers expect contracted UEB, so say which one you produced rather than
  handing over a `.brf` and calling it braille. A certified transcriber should review anything
  going to a student.
- **A DAISY validator.** The package is built; nothing checks it. `selfChecked` is `false` and
  `valid` is absent for DAISY on purpose. Do not read an empty error list as a pass.
- **epubcheck.** The ePub self-check is structural only. `valid: true` means it opens, not that
  it conforms.
- Anything requiring visual fidelity to the original. This **rebuilds**; it does not patch layout.
  Wrong for signed forms and legal records.
- Very long documents — page rendering caps at 30 pages by default.
- Languages you cannot read confidently.

## Reporting honestly

**Never say a document is WCAG compliant.** Automated checks cover only machine-decidable criteria.
Whether a heading level is *right*, a reading order *logical*, or alt text *meaningful* needs a
person. State what a tool verified, state what rests on judgment, and recommend someone read the
rebuild beside the original.

Alt text from `describe_images` is model-generated and unverified. Translation is machine
translation; a fluent speaker should review it, because an accessible document in bad language is
not accessible.

## Reference run

Eight scanned book pages, ~7 minutes, no API key. axe 100/0 both rounds. veraPDF 5 failures → 1
(the by-design one). Tesseract agreement 94.7%, zero unsupported sentences. The four fixed failures
were invisible to axe and caught only by veraPDF. That is why the gate is the gate.
