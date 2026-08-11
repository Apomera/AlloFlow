# i1040 full-document run — 126 of 126 pages (2026-08-09)

The first end-to-end pass over the COMPLETE plan: `merge-plans t01..t63` (2,106
blocks, `ok: true`, `pagesWithoutBlocks: []`) -> `remediate --pdf required
--verapdf auto` -> `verify-init`. The 2026-08-05 run covered 104 pages; this one
covers all 126.

```
verdict:           pdf_generated_with_known_issues
veraPDF PDF/UA-1:  104 rules passed, 2 failed — 2,024,062 checks passed, 2 failed
outputTextRecall:  1.0      (129,785 plan tokens, all present in the tagged PDF)
sourceTextRecall:  0.9349   (8,684 of 133,406 tokens missing — see below)
output:            319 pages, 12.7 MB tagged PDF, 1.0 MB HTML
worksheet:         1,664 items (verify-init; the 104pp run derived 1,344)
```

## sourceTextRecall 0.9349 is furniture-shaped, not loss

Every top missing token counts ~126 or ~252 — once or twice PER PAGE:
`proofs` ×252, `fileid` ×126, `cycle08` ×126, `departmental` ×126,
`reproduction` ×126, `removed` ×126, `printing` ×126, `xml` ×127, `feb` ×127,
`2026` ×126, `126` ×128. That is the IRS print-production slug ("…prints on
all proofs including departmental reproduction proofs. MUST be removed before
printing. Fileid: …xml/cycle08…") plus the folio, repeated on every page and
deliberately not authored. The 104pp prediction that this figure would land
"near 1.0" undercounted the slug: it is ~69 tokens/page of furniture, so ~0.935
is the expected ceiling for this document. The long tail below the top tokens
still deserves eyes in the independent verification pass, but the shape of the
miss is per-page furniture, not content.

## The clause 7.2 failure PERSISTS at 126 pages — and is now localized

`7.2-43 "Table rows shall have the same number of columns (taking into account
column spans)"` — exactly 1 failed check, same as at 104pp. Clause 5 remains
the consequence, not a defect: the finalizer correctly withholds the PDF/UA
identifier while any rule fails.

This run root-caused it to a single table:

* **veraPDF names the object**: struct elem `64540 0 obj SETable`, K[1483] of
  the NonStruct wrapper — "Table rows 1 and 2 span different number of columns
  (4 and 3 respectively)".
* **A per-page struct-tree walk of the tagged PDF (pdfjs `getStructTree`,
  all 319 pages) finds exactly ONE table with unequal raw row widths**: output
  page 259, row cell-counts `[4,3,3,3,3,3,3]`.
* That table is the **IRA Deduction Worksheet for Schedule 1 line 20, part 2
  of 2** (lines 7-12, tranche 34 area — source page ~94).
* **The authored HTML is correct**: 7 rows x 4 cells, NO colspans, blank entry
  cells carry a zero-width-space filler (the 88109bd69 empty-cell fix). A scan
  of all 105 HTML tables finds zero span-adjusted width mismatches.
* **In the tagged PDF, each of the 6 body rows lost exactly ONE of its two
  ZWSP-filler cells** (4 -> 3); the header row kept all 4.
* **Part 1 of the same worksheet — identical shape, same ZWSP cells — passes
  clean on output page 258.**

So the defect is introduced between HTML and structure tree — Chromium's
tagger (or the finalizer's surgery) drops one empty cell per row, and only for
THIS instance, which is why the 104pp bisect found "each half validates clean
and the union does not": the failure follows where this table lands in
pagination, not which tables are present. The empty-cell fix is incompletely
effective under whatever layout condition page 259 produces (likely the table
landing mid-column after the part-1 break).

**Next concrete step**: reproduce with a minimal fixture — the part-2 table
alone, pushed to the same page position — then decide whether the repair
belongs in the HTML (e.g. `&nbsp;` instead of ZWSP in entry cells) or in the
finalizer (rebuild missing TD cells from the row's expected width, as the
LBody insertion already does for lists).

## Independent verification: derived, NOT run (unchanged from 104pp)

`verify-init` produced the 1,664-item worksheet committed alongside these
notes: 126 page attestations, headings/lists/tables/links/styles per plan, 4
globals. `verify-check` still must be run by a fresh-context reader who has
never seen the plan — the two-model rule. All 126 pages are now attested-able;
the 104pp run's 22 unauthored-page flags no longer apply.

## Artifacts

Committed: accessibility report, privacy receipt, full veraPDF JSON
(`verapdf-full.json`), verification worksheet. The 12.7 MB tagged PDF and 1 MB
HTML are deliberately not committed; regenerate with the commands in
`../2026-08-05_i1040-104pp_portable/NOTES.md` (unchanged).
