# AlloFlow PDF Remediation — Garry Demo Summary

**Date:** _YYYY-MM-DD_
**Pipeline build:** `@________` _(get from the AlloFlow header / release.json)_
**Validator:** `dev-tools/demo/exported_pdf_validator.cjs`

---

## The three documents

| # | Document | Type | Pages | Notes |
|---|---|---|---|---|
| 1 | _filename.pdf_ | ordinary form / syllabus | _N_ | _e.g., UMaine CS101 syllabus_ |
| 2 | _filename.pdf_ | complex-table | _N_ | _e.g., course catalog page with merged-cell headers_ |
| 3 | _filename.pdf_ | scanned non-Latin | _N_ | _e.g., Arabic handout from World Languages dept_ |

---

## Pipeline scores

For each document, fill in from the AlloFlow Conformance Report:

| # | Structural (axe-core) | Semantic (AI rubric) | Divergence | Content Integrity | Auditor Agreement | Overall |
|---|---|---|---|---|---|---|
| 1 | _XX_/100 | _XX_/100 | _ok / >15_ | _XX_% | _heuristic index XX_ | _PASS / NOTES_ |
| 2 | _XX_/100 | _XX_/100 | _ok / >15_ | _XX_% | _heuristic index XX_ | _PASS / NOTES_ |
| 3 | _XX_/100 | _XX_/100 | _ok / >15_ | _XX_% | _heuristic index XX_ | _PASS / NOTES_ |

---

## Validator results

Run `node dev-tools/demo/exported_pdf_validator.cjs <each.pdf>` and paste the summary line:

| # | Overall | Pass / Fail count | Orphaned leaves | Notable check failures |
|---|---|---|---|---|
| 1 | _PASS / FAIL_ | _X pass, Y fail_ | _0 / N_ | _e.g., "All checks pass"_ |
| 2 | _PASS / FAIL_ | _X pass, Y fail_ | _0 / N_ | _e.g., "TD missing ActualText on 2 cells"_ |
| 3 | _PASS / FAIL_ | _X pass, Y fail_ | _0 / N_ | _e.g., "OCR coverage 100%, non-Latin font embedded"_ |

---

## What the pipeline does NOT claim

To pre-empt the Knowbility-grade puncture:

- ✗ NOT a PDF/UA-1 certification. We self-check PDF/UA-1 conformance and label the conformance report **advisory**. The recommendation is to pair with PAC 2024 or Adobe Acrobat Accessibility Checker before high-stakes use.
- ✗ NOT a substitute for human expert review. Multi-pass agreement heuristics measure ONE AI model's prompt-induced variance across personas — they're internal calibration, not inter-rater reliability against expert verdicts.
- ✗ NOT calibrated against expert WCAG audits. That work (expert-verdict calibration corpus) is on the roadmap pending a Knowbility-grade auditor commitment.
- ✗ For scanned single-page PDFs, the tag tree currently uses shared-MCID-0 linkage (every semantic element references the page-wrap MCID, not per-element MCIDs). This is **valid per PDF spec** and **passes PAC's "no orphaned semantic elements" check**, but isn't maximally granular. Per-leaf MCID work is in progress.

## What it DOES claim

- ✓ Tagged-PDF export with StructTreeRoot, MarkInfo, /Lang, and proper /K linkage
- ✓ Honest agreement heuristics labeled as such (not as psychometric coefficients)
- ✓ Structural-vs-Semantic score split visible to reviewers (no 50/50 blend hiding AI-only failures)
- ✓ Content Integrity coverage metric on every export (warns when <100% character preservation)
- ✓ OCR layer for scanned PDFs with per-word positioning + Unicode font embedding (Arabic, CJK, etc.)
- ✓ Tagged-PDF tag tree references the OCR text via /K → MCR for scanned single-page documents
- ✓ Deterministic auto-fixes for ~10 high-frequency WCAG failure modes (heading hierarchy, text-spacing, focus-visible, prefers-reduced-motion, form aria-required, icon-only button labels, empty figcaption, contrast, min font-size, decorative-image marking)
- ✓ Every check in this report runs automated, in seconds, on the exported bytes

---

## Asks / next steps

- _e.g., Would Paul Cochrane's accessibility team be willing to run PAC 2024 against these three exports?_
- _e.g., Are there 5-10 representative UMaine documents you'd want to throw at the pipeline as a stress test before any commitment?_
- _e.g., Aaron available for live walkthrough at __ am/pm Wednesday?_
