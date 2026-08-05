# Run: IRS i1040 instructions, pages 1-104 — portable (no-key) pathway

**Date:** 2026-08-05
**Pathway:** `agent_skills/alloflow-portable-remediation` (engine 0.2.2)
**Source:** `mcp-testing/corpus/born-digital/irs-i1040-instructions.pdf`
**Plan:** the 44 tranches in `mcp-testing/corpus/round-06/i1040/`, merged
**Source binding:** sha256, **matched**

## Why this run happened

Forty-four sessions had produced a plan that `merge-plans` called `ok: true`, and that was being
reported as progress. It is not the same claim as "this produces a good remediated document":
**every check to that point graded the PLAN, and nothing had ever built the artifact.** This is the
first end-to-end pass on this document — `merge-plans` → `remediate` → `validate-pdf` →
`verify-init` — run deliberately at 104 of 126 pages rather than at the end, so that a structural
blocker would surface while there was still something to do about it.

It surfaced one. See "What broke" below.

**The artifacts are NOT a delivery.** The plan covers 104 of 126 pages; pages 105-126 are
unauthored. Nothing here should be handed to anyone as a remediated i1040.

## Result (after the two fixes below)

```
verdict:              pdf_generated_with_known_issues
sourceBinding:        matched (sha256)
blocks:               1,614 · 514 headings · 154 lists · 58 tables · 1 image
staticHtmlAudit:      ok — 0 errors, 0 warnings (514 headings, 132 links, 58 tables)
outputTextRecall:     1.0        (the artifact contains everything the plan says)
sourceTextRecall:     0.8354     (see below — this is the unauthored 22 pages, not loss)
taggedPdfGeneration:  completed — structTreeRoot, markInfo, marked, lang, title, xmpMetadata
blockedNetworkRequests: 0
pdfUaCompliant:       false      — 1 remaining failed check, down from 22
```

`sourceTextRecall` 0.8354 against 104 of 126 pages (82.5%) is the unauthored tail, not dropped
content: `outputTextRecall` is **1.0**, so nothing the plan carries went missing on the way out.

## What broke, and what it cost

### 1. Empty table cells vanish from the tagged PDF — FIXED (21 of 22 failures)

veraPDF reported 22 failures of PDF/UA-1 **clause 7.2**, "table rows shall have the same number of
columns". The natural reading is a plan defect, and it was not:

* the merged plan: **0** tables with ragged row widths, out of 58;
* the generated HTML: **0** ragged tables, out of 58;
* the tagged PDF: 22 rows short a column.

The tell was in the shape counts. Exactly **22 tables have three columns with row headers**, and
there were exactly **22 failed checks**. Those are the fill-in worksheets, whose third column is
`Amount` — blank in the printed form, because that is where a filer writes.

**Chromium's tagged-PDF export builds structure elements from MARKED CONTENT.** A cell with nothing
in it paints nothing, so no `/TD` is emitted at all and the row reaches veraPDF one column short.

Confirmed by experiment rather than inference:

| fixture | result |
| --- | --- |
| 3 one-row 3-column worksheets, `Amount` blank | 3 failed checks — one per table |
| the same 3 tables with every empty cell filled | **0 failed checks, `pdfUaCompliant: true`** |
| a 180-row 6-column tax table (spans many pages) | **0 failed checks, `pdfUaCompliant: true`** |

The 180-row result also killed the obvious hypothesis: page-spanning is *not* the cause.

**Fix:** an empty cell renders a zero-width space (`&#8203;`). It paints no ink, adds no width, and
carries no text to announce, so the cell is still reported as blank — but it exists in the
structure tree. Padding with a visible character or `&nbsp;` would put content into a cell the
printed form deliberately leaves empty, which is a worse lie than a validation failure.
22 → 1 failures on the full document; 22 zero-width spaces appear in the output HTML, one per
affected table.

### 2. One clause 7.2 failure remains — NOT root-caused

It is **pagination-dependent**, which is why it appears only in a whole document:

| fixture | 7.2 failed checks |
| --- | --- |
| tables 0-28 | 0 |
| tables 29-42 | 0 |
| tables 43-57 | 0 |
| tables 29-57 | **1** |
| all 58 (full document) | **1** |

Each half validates clean alone and the union does not, so it is not a property of any one table —
it is something about where a table lands on a page. `tr, th, td { break-inside: avoid }` was added
on the theory that a tall row was splitting across a page break. **It did not change the count**
(1 before, 1 after). The rule is kept because it is correct for tagged output, not because it was
shown to fix this. The cause is still open.

### 3. Clause 5 is a consequence, not an independent defect

"The PDF/UA version and conformance level shall be specified using the PDF/UA Identification
extension schema" fails because `pdfuaIdentifierClaimed: false` — the finalizer **declines to stamp
the PDF/UA identifier while any rule is failing**. That is the right behaviour: claiming
conformance you do not have is worse than failing a check. Every fixture above that reached 0
failed checks claimed the identifier and validated as `pdfUaCompliant: true`, so clause 5 clears
itself the moment 7.2 does.

### 4. `--verapdf required` discards the artifacts

When the gate fails, the output directory is left **empty**, so there is nothing to inspect and the
failure cannot be diagnosed from the run that produced it. Every diagnosis here had to be re-run
with `--verapdf auto`. Worth changing: a failed gate should still leave the artifacts and the
report behind.

## The prior run's two failures are gone

`2026-08-03_high-impact-reports_portable` recorded 7.1/8 (no XMP metadata stream) and 7.1/3
(content not marked as artifact or tagged). Neither appears here: `xmpMetadata: true` and no
clause 7.1 failure at all. Those were fixed between the two runs.

## Independent verification: derived, NOT run

`verify-init` produced a **1,344-item** worksheet — 126 page attestations, 514 headings, 154 lists,
58 tables, 88 inline links, 399 inline styles, 1 image alt, 4 global.

`verify-check` was **not** run and must not be run against a worksheet I filled. I authored all 44
tranches; an attestation from the same context that wrote the plan is the generator grading itself,
which is the exact failure the two-model rule exists to prevent. This needs a fresh-context reader
who has never seen the plan.

Note the worksheet derives **126** page items from the source while the plan covers 104 — so
verification would correctly flag pages 105-126 as unattested.

## Artifacts

The accessibility report and privacy receipt are here. The 12MB tagged PDF and the 888KB HTML are
deliberately **not** committed; regenerate with:

```bash
python agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py merge-plans \
  --tranches mcp-testing/corpus/round-06/i1040/tranche-*.json --out /tmp/i1040-merged.json
python agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py remediate \
  --source mcp-testing/corpus/born-digital/irs-i1040-instructions.pdf \
  --plan /tmp/i1040-merged.json --out-dir /tmp/i1040-out --pdf required --verapdf auto
```

`verapdf-before-fixes.json` is the validation result before the empty-cell fix, kept so the 22 → 1
change is checkable rather than asserted.
