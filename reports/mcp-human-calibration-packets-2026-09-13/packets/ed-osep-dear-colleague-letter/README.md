# Review packet: OSEP Dear Colleague letter on translating IEPs for LEP parents (ED, 2016)

**Source document:** `mcp-testing/corpus/born-digital/ed-parent-guide-idea.pdf` (2 page(s); public copy at https://sites.ed.gov/idea/files/policy_speced_guid_idea_memosdcltrs_iep-translation-06-14-2016.pdf). Not included in this folder; open it from the corpus or the URL.
**Output under review:** `ed-parent-guide-idea-accessible.html` (SHA-256 `ad225a63992087f1164ea74100680746b6b38586e40aabc76c9e5c7177bd4954`). Open it in a browser and, if you can, with a screen reader.
**Produced by:** AlloFlow remediation connector v0.11.0 with all five fixes of 13 September plus the headless palette-prompt skip, keyless agent-bridge lane (the answering model was Claude in a Claude Code session; no Gemini key). Run `arun-eea9603c`, 16 model calls.

A tagged two-page letter with no headings in the source. The answering model gave it a title banner and a Footnotes heading. Its fix pass (a header landmark plus a shorter alt for the banner image) was rejected whole by the pipeline's text-shrink gate because the shorter alt reduced the text, so the delivered output keeps the banner as a plain div and the 287-character alt; Equal Access flags that alt as too long and asks for five items to be confirmed by a person, which is why the verdict is review.

## What the pipeline claims

- Score before: 90. Score after: 90 (the weakest of the three verification layers: AI audit 95, axe 100, Equal Access 90).
- Verdict: review (1 review reason(s), 1 caution(s)).
- Remaining automated findings: axe 0 violation(s), Equal Access 0 failure(s) plus 5 review finding(s) a person must confirm, AI audit 1 remaining issue(s).
- Content coverage: matched, 100% of source tokens found in the output, 0 missing.
- Tagged PDF: withheld because distribution review required.
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

- `ed-parent-guide-idea-accessible.html`: the output under review.
- `ed-parent-guide-idea-remediation-report.json`, `ed-parent-guide-idea-remediation-completion.json`: the pipeline's own report and completion manifest (machine-readable claims).
- `pipeline-log.txt`: the decision-bearing lines the pipeline logged while producing this output.
- `observation.json`: the pipeline's claims in the calibration corpus format, ready to import once your review is done.
- `review.json`: your review form (pending until you complete it).
