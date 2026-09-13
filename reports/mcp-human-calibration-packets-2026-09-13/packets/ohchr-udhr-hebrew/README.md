# Review packet: Universal Declaration of Human Rights, Hebrew (OHCHR)

**Source document:** `mcp-testing/corpus/born-digital/ohchr-udhr-hebrew.pdf` (4 page(s); public copy at https://www.ohchr.org/sites/default/files/UDHR/Documents/UDHR_Translations/hbr.pdf). Not included in this folder; open it from the corpus or the URL.
**Output under review:** `ohchr-udhr-hebrew-accessible.html` (SHA-256 `72ece37c24ddbdb2cc462dd921f38d47eb17e80703d6cb89dc9c914177177688`). Open it in a browser and, if you can, with a screen reader.
**Produced by:** AlloFlow remediation connector v0.11.0 morning build (before the five fixes of 13 September), keyless agent-bridge lane (the answering model was Claude in a Claude Code session; no Gemini key). Run `arun-fe680c0b`, 20 model calls.

Right-to-left Hebrew. The source's text layer decodes to control characters (fonts without a ToUnicode map), so the pipeline re-read the pages by OCR; Tesseract has no Hebrew model in this bundle, so the text is the answering model's transcription. The output declares lang="he" dir="rtl" and renders right-to-left in Chromium. A Hebrew reader is needed to judge fidelity; the pipeline withheld the tagged PDF over nine clause numerals, a coverage defect fixed the same day.

## What the pipeline claims

- Score before: 0. Score after: 96 (the weakest of the three verification layers: AI audit 100, axe 100, Equal Access 96).
- Verdict: review (2 review reason(s), 0 caution(s)).
- Remaining automated findings: axe 0 violation(s), Equal Access 0 failure(s) plus 2 review finding(s) a person must confirm, AI audit 0 remaining issue(s).
- Content coverage: review_required, 99.3% of source tokens found in the output, 9 missing.
- Tagged PDF: withheld because content coverage requires review.
- Fidelity notes: none.
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

- `ohchr-udhr-hebrew-accessible.html`: the output under review.
- `ohchr-udhr-hebrew-remediation-report.json`, `ohchr-udhr-hebrew-remediation-completion.json`: the pipeline's own report and completion manifest (machine-readable claims).
- `pipeline-log.txt`: the decision-bearing lines the pipeline logged while producing this output.
- `observation.json`: the pipeline's claims in the calibration corpus format, ready to import once your review is done.
- `review.json`: your review form (pending until you complete it).
