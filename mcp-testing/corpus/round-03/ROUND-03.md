# Corpus refinement — Round 3 (2026-08-03)

**Focus:** structurally challenging document types. **Cost: $0 in API fees.**
Suites 22/22 green, packages resynced.

## Flagship: USCIS 100 civics questions (runs/uscis-civics/) — deep-hierarchy Q&A

The hardest *structure* so far: 100 numbered Q&A pairs under a 4-level hierarchy
(subject > section > question > answers), an asterisk system marking 20
questions for 65/20 applicants, a footnote repeated on every page, per-page
footers, bracketed officer notes placed differently per question, and an agency
seal.

```
verdict:           pdf_generated_validation_passed_review_required
veraPDF PDF/UA-1:  PASS, identifier claimed and earned
plan:              219 blocks, 113 headings (h1 > 3×h2 > 8×h3 > 100×h4)
sourceTextRecall:  0.7628 — and that number is CORRECT, see below
outputTextRecall:  1.0
verification:      228/228 items attested by a fresh-context verifier
                   (all 100 question headings verbatim incl. asterisks, every
                   answer list's count/order/wording, all disclosures accurate)
```

Design choice worth keeping as precedent: each question is a **level-4
heading**, so screen-reader users can navigate question-by-question — the
entire point of a study document. Answers stay unordered lists exactly as
bulleted in the source.

## The 0.76 recall is a feature demonstration, not a failure

All 707 missing tokens are the 65/20 footnote and `www.uscis.gov` footer that
print on *every page* and were deliberately consolidated/dropped with review
notes. The independent verifier confirmed: no undisclosed omission, no invented
content. Lesson institutionalized as **engine improvement #10**: the report now
includes `missingTokens` + `topMissingTokens` in `sourceTextRecall`, so a
reviewer can distinguish disclosed furniture from content loss at a glance
("you years been or have the www uscis gov..." is obviously a footnote).

This is the honest shape of the metric: raw recall stays raw; the evidence to
interpret it ships alongside. A metric that auto-excused "furniture" would be
gameable.

## Plan generation at scale (method note)

The 219-block plan was produced by a small generator script (data-driven
question table → blocks) rather than hand-written JSON — the same pattern the
126-page instruction book will need, at roughly 30× this size. Feasibility
numbers for `irs-i1040-instructions`: ~133k source tokens ≈ 700k chars (fits
the 2M char cap), est. 2-4k blocks (fits the 5k cap). The binding constraint is
model reading/authoring time across sessions, not engine limits.

## Cumulative scoreboard after 3 rounds

| Document | Type challenge | UA-1 | src recall | out recall | Verified |
| --- | --- | --- | --- | --- | --- |
| High Impact Reports (8pp) | pure scan, tables, sidebars | PASS | n/a (scan) | 1.0 | 51/51 |
| UDHR English (8pp) | cross-page joins, ord. lists | PASS | 1.0 | 1.0 | 57/57 |
| UDHR Spanish (9pp) | non-English, subset fonts | PASS | 1.0 | 1.0 | 58/58 |
| USCIS civics (11pp) | 4-level Q&A, furniture, asterisks | PASS | 0.76* | 1.0 | 228/228 |

\* fully explained disclosed furniture; verifier-confirmed zero content loss.

4 documents, 4 UA-1 passes, 394/394 verification items, 10 engine improvements.

## Round 4 queue

1. `irs-i1040-instructions` — multi-session generator-driven authoring (the
   scale test). Includes genuine tables (tax tables) — the first hard table
   exercise on a real document.
2. `nasa-artemis-plan` — image/figure-heavy glossy report; exercises
   extract-images reuse + alt authoring at volume.
3. `irs-f1040-1954-scan` — pure scan (non-form pages only are ineligible: it
   IS a form, so expect and document the audit-only refusal path).
4. Consider a wild-corpus expansion (state DOE docs, university syllabi,
   multi-column journals) once the above are done.
