# Review packet: IRS Form 1040 (1954), scanned, image-only

**Source document:** `mcp-testing/corpus/scanned/irs-f1040-1954-scan.pdf` (4 page(s); public copy at https://www.irs.gov/pub/irs-prior/f1040--1954.pdf). Not included in this folder; open it from the corpus or the URL.
**Output under review:** `irs-f1040-1954-scan-accessible.html` (SHA-256 `eee0be982f92bc59e5ee8089bb89c39c2b233fdc670e336f36e94e3fa29c3f68`). Open it in a browser and, if you can, with a screen reader.
**Produced by:** AlloFlow remediation connector v0.11.0 after the OCR reconciliation, list-marker, Tesseract and console fixes (b77f0376b) but before the auto-fix loop fix (ede873969), keyless agent-bridge lane (the answering model was Claude in a Claude Code session; no Gemini key). Run `arun-0084bf67`, 30 model calls.

The source has no text layer at all: everything in the output came from OCR (Tesseract plus the answering model's transcription of the page images) and from the model's structuring of that text. The fix loop of this build discarded the client's fixes (a defect fixed the same afternoon), so the output is the structured baseline without the header landmark and row headers the client had supplied. The pipeline withheld the tagged PDF because 10.9% of source tokens were not found in the output; most of those are the model's own 'Item N.' prefixes and reworded table headers.

## What the pipeline claims

- Score before: 0. Score after: 65 (the weakest of the three verification layers: AI audit 65, axe 100, Equal Access 88).
- Verdict: review (4 review reason(s), 2 caution(s)).
- Remaining automated findings: axe 0 violation(s), Equal Access 0 failure(s) plus 6 review finding(s) a person must confirm, AI audit 2 remaining issue(s).
- Content coverage: review_required, 89.1% of source tokens found in the output, 332 missing.
- Tagged PDF: withheld because content coverage requires review.
- Fidelity notes: {"kind":"numeric","msg":"6 source numeric value(s) not found unchanged in the output (65, 10, 11, 12, 16, 70997). A remediation should never change numbers — review the Diff to confirm scores, dates, and percentages are intact."} | {"kind":"lowOcrConfidence","msg":"1 page(s) were OCR’d at low confidence (mean <60) (page 2) — the recognized text may contain errors; verify against the original before distributing."}.
- Document Safety scan: verified, no active content.

## What we need from you

Judge the output on its own terms as a document a person would use. Budget 20 to 30 minutes.

1. Open the source and the output side by side. Is everything in the source present in the output, in the right order, with nothing invented? Note any passage that is missing, garbled or reworded in a way that changes meaning.
2. Navigate the output by headings, landmarks and links (screen reader or keyboard). Do the headings describe the sections? Are tables usable cell by cell? Are lists real lists? Do images have alternatives that say what the image is for?
3. Decide an overall readiness for the output: `ready` (could be distributed as is), `caution` (usable, with reservations you would tell the recipient), `review-required` (someone must fix something first), or `unavailable` (you could not assess it).
4. For each layer you assessed, give an outcome (`passed`, `failed`, `review-required`, `partial`, `unavailable`, `not-applicable`): `ai` (the semantic audit's claims about structure and wording), `axe` and `equalAccess` (automated checks; you may leave these unassessed), `fidelity` (does the output say what the source says), `export` (the tagged PDF, if one was produced).
5. Record each problem you found as a finding: an id, the layer, one sentence, and whether the pipeline's own report already mentions it (`detectedByAutomation`).

Write your notes in `review-notes.md` (free text is fine) and fill in `review.json`: set `status` to `completed`, `independent` to `true` if you had no part in producing this output, your name or initials as `reviewer`, the ISO date and time as `reviewedAt`, then `readiness`, `layers` and `findings`. The artifact hash is already filled in; do not change it.

## Files in this folder

- `irs-f1040-1954-scan-accessible.html`: the output under review.
- `irs-f1040-1954-scan-remediation-report.json`, `irs-f1040-1954-scan-remediation-completion.json`: the pipeline's own report and completion manifest (machine-readable claims).
- `pipeline-log.txt`: the decision-bearing lines the pipeline logged while producing this output.
- `observation.json`: the pipeline's claims in the calibration corpus format, ready to import once your review is done.
- `review.json`: your review form (pending until you complete it).
