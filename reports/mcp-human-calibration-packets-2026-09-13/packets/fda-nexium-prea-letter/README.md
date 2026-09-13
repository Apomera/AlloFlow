# Review packet: AstraZeneca response to FDA PREA non-compliance letter (NEXIUM, 2019)

**Source document:** `mcp-testing/corpus/figures/fda-nexium-prea-letter.pdf` (7 page(s); public copy at https://www.fda.gov/media/135691/download). Not included in this folder; open it from the corpus or the URL.
**Output under review:** `fda-nexium-prea-letter-accessible.html` (SHA-256 `e6cf52ee50c6826272eba8e94b46df4259c195951e9dc12d59657647cdbd6a09`). Open it in a browser and, if you can, with a screen reader.
**Produced by:** AlloFlow remediation connector v0.11.0 with all five fixes of 13 September plus the headless palette-prompt skip, keyless agent-bridge lane (the answering model was Claude in a Claude Code session; no Gemini key). Run `arun-daa7061e`, 28 model calls.

An untagged seven-page regulatory letter with a logo, a four-row timelines table, bulleted and numbered lists, block quotations and a gray FOIA (b)(4) redaction box covering four list items. The answering model transcribed the letter from the page images and described the redaction as withheld content. The pipeline withheld the tagged PDF because 7.2% of source tokens were not found in the output: the running header that repeats on six pages was transcribed once, and the page 1 footer address moved to the end of the letter. Its integrity check also notes that the NDA number 021957 occurs fewer times than in the source for the same reason; a reviewer should confirm no number changed.

## What the pipeline claims

- Score before: 20. Score after: 86 (the weakest of the three verification layers: AI audit 100, axe 100, Equal Access 86).
- Verdict: review (4 review reason(s), 1 caution(s)).
- Remaining automated findings: axe 0 violation(s), Equal Access 0 failure(s) plus 7 review finding(s) a person must confirm, AI audit 0 remaining issue(s).
- Content coverage: review_required, 92.8% of source tokens found in the output, 166 missing.
- Tagged PDF: withheld because content coverage requires review.
- Fidelity notes: {"kind":"numeric","msg":"1 source numeric value(s) not found unchanged in the output (021957). A remediation should never change numbers — review the Diff to confirm scores, dates, and percentages are intact."}.
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

- `fda-nexium-prea-letter-accessible.html`: the output under review.
- `fda-nexium-prea-letter-remediation-report.json`, `fda-nexium-prea-letter-remediation-completion.json`: the pipeline's own report and completion manifest (machine-readable claims).
- `pipeline-log.txt`: the decision-bearing lines the pipeline logged while producing this output.
- `observation.json`: the pipeline's claims in the calibration corpus format, ready to import once your review is done.
- `review.json`: your review form (pending until you complete it).
