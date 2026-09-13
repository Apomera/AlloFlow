# Review packet: IRS Form 1040 (current), fillable form with XFA and JavaScript

**Source document:** `mcp-testing/corpus/forms/irs-f1040.pdf` (2 page(s); public copy at https://www.irs.gov/pub/irs-pdf/f1040.pdf). Not included in this folder; open it from the corpus or the URL.
**Output under review:** `irs-f1040-accessible.html` (SHA-256 `25d26d3cacb2f6a6ae0c13d273a69c5c12d320fce2ee6544c8d094f1235a537e`). Open it in a browser and, if you can, with a screen reader.
**Produced by:** AlloFlow remediation connector v0.11.0 with all five fixes of 13 September (first run on the corrected auto-fix loop), keyless agent-bridge lane (the answering model was Claude in a Claude Code session; no Gemini key). Run `arun-bcdd26fc`, 23 model calls.

The 199 fillable fields became read-only text and the checkboxes are rendered as box characters; the pipeline discloses this in its fidelity notes. The tagged PDF was withheld because the source carries an XFA form the Document Safety scan does not examine. Judge the HTML as a readable copy of the form, not as a form to fill in.

## What the pipeline claims

- Score before: 63. Score after: 94 (the weakest of the three verification layers: AI audit 95, axe 100, Equal Access 94).
- Verdict: review (4 review reason(s), 2 caution(s)).
- Remaining automated findings: axe 0 violation(s), Equal Access 0 failure(s) plus 3 review finding(s) a person must confirm, AI audit 1 remaining issue(s).
- Content coverage: review_required, 95.2% of source tokens found in the output, 76 missing.
- Tagged PDF: withheld because active content scan unavailable.
- Fidelity notes: {"kind":"formFields","msg":"Form fields: the source is a fillable form with 199 field(s) but the output has 0 — the accessible version can be read but not filled in. Give learners the tagged PDF, or an editable copy, if they need to type answers."} | {"kind":"numeric","msg":"18 source numeric value(s) not found unchanged in the output (31, 20, 10, 14, 15, 16, 17, 18, …). A remediation should never change numbers — review the Diff to confirm scores, dates, and percentages are intact."} | {"kind":"activeContent","msg":"The ORIGINAL PDF contains 3 embedded JavaScript action(s). The remediated HTML and generated exports do not carry active content, but the standard tagged-PDF export preserves the original bytes — including these. For a distributable PDF without them, use the 🧼 Rebuild-clean export."}.
- Document Safety scan: not verified.

## What we need from you

Judge the output on its own terms as a document a person would use. Budget 20 to 30 minutes.

1. Open the source and the output side by side. Is everything in the source present in the output, in the right order, with nothing invented? Note any passage that is missing, garbled or reworded in a way that changes meaning.
2. Navigate the output by headings, landmarks and links (screen reader or keyboard). Do the headings describe the sections? Are tables usable cell by cell? Are lists real lists? Do images have alternatives that say what the image is for?
3. Decide an overall readiness for the output: `ready` (could be distributed as is), `caution` (usable, with reservations you would tell the recipient), `review-required` (someone must fix something first), or `unavailable` (you could not assess it).
4. For each layer you assessed, give an outcome (`passed`, `failed`, `review-required`, `partial`, `unavailable`, `not-applicable`): `ai` (the semantic audit's claims about structure and wording), `axe` and `equalAccess` (automated checks; you may leave these unassessed), `fidelity` (does the output say what the source says), `export` (the tagged PDF, if one was produced).
5. Record each problem you found as a finding: an id, the layer, one sentence, and whether the pipeline's own report already mentions it (`detectedByAutomation`).

Write your notes in `review-notes.md` (free text is fine) and fill in `review.json`: set `status` to `completed`, `independent` to `true` if you had no part in producing this output, your name or initials as `reviewer`, the ISO date and time as `reviewedAt`, then `readiness`, `layers` and `findings`. The artifact hash is already filled in; do not change it.

## Files in this folder

- `irs-f1040-accessible.html`: the output under review.
- `irs-f1040-remediation-report.json`, `irs-f1040-remediation-completion.json`: the pipeline's own report and completion manifest (machine-readable claims).
- `pipeline-log.txt`: the decision-bearing lines the pipeline logged while producing this output.
- `observation.json`: the pipeline's claims in the calibration corpus format, ready to import once your review is done.
- `review.json`: your review form (pending until you complete it).
