# Document Safety scan: examine bookmarks, forms and open actions (2026-09-13)

Follow-up to the two [12 September calibration rounds](../mcp-calibration-2026-09-12/README.md). Both live pilots there ended with the tagged PDF withheld by `active_content_scan_unavailable`. This pass traced that outcome to the scanner rather than the documents, changed the scanner, and rebuilt the connector as v0.11.0. No scoring threshold, canonical severity or delivery policy changed; no live model run was performed.

## What was wrong

`_alloScanActiveContent` (in `doc_pipeline_source.jsx`) counted any catalog `/AcroForm`, `/Outlines` or `/Collection` as an unexamined structure without walking it, and counted any `/OpenAction` as an auto-run action without reading it. The tagged-PDF gate in `remediation_headless_driver.cjs` requires `unexaminedStructures === 0` and no findings. Bookmarks are a WCAG-recommended navigation aid that most born-digital PDFs carry, an `/AcroForm` with an empty `/Fields` array is what Word and Acrobat leave after a form-free export, and a destination-only `/OpenAction` means "open at page 1". The pipeline's own tagged export writes `/Outlines`, so its output would not have passed its own scanner.

Across the 16-document testing corpus the scan reported a clean, complete result for 2 documents (the two scans, which have neither bookmarks nor forms). The 12 September pilot sources (OSEP IEP letter, Spanish UDHR) were both blocked this way. The round-1 [empty-AcroForm prototype](../mcp-calibration-2026-09-12/empty-acroform-investigation.cjs) had started on the form half but never shipped and never covered bookmarks.

## What changed

- `/Outlines` is walked from `/First` through `/Next` and nested `/First`, under the shared walk budgets and cycle protection. Each item is checked against the documented key set; `/A`, `/AA` and `/AF` go through the same classifiers as page annotations, Form XObjects and structure elements. A JavaScript or Launch bookmark is disclosed under its own type; a URI bookmark counts as an ordinary external link.
- `/AcroForm` is checked against its documented keys, then `/Fields` (with `/Kids`), `/CO` and the default resources are walked. Field-level `/AA` and `/A` are disclosed. A widget that is both a page annotation and a field is classified once. `/XFA` is outside the key set on purpose and keeps the form unexamined.
- `/OpenAction` is passive when it is an explicit or named destination, or a `/GoTo` with only `/Type`, `/S`, `/D`, `/SD`. Anything else is disclosed as `open-action`, as before, and now also classified, so JavaScript on open surfaces as `javascript`.
- `/Collection` (PDF portfolios), nested name trees, undocumented keys, an absent `/Fields`, unresolvable members and walk-budget overruns still count as unexamined. An incomplete scan is never treated as clean.

The result shape (`schema: 1`, the fixed finding types, `externalLinks`) is unchanged, so checkpoints, capsules and the driver contract are unaffected.

## Corpus census

`corpus-census.cjs` scans every corpus PDF with the scanner extracted from git HEAD and with the working-tree scanner, on the same parsed document, and hashes the object table around each scan. Results are in `corpus-census.json`.

| Outcome | Before | After |
| --- | ---: | ---: |
| Complete scan, no findings (tagged PDF can be delivered) | 2 / 16 | 12 / 16 |
| Objects mutated by either scanner | 0 | 0 |

The four documents still withheld, with the reason attributed by `attribute-unexamined.cjs`:

| Document | After | Why |
| --- | --- | --- |
| `born-digital/nist-hb44-excerpt.pdf` | 9 `launch` findings, 1 unexamined | Real Launch actions; correctly withheld |
| `forms/irs-f1040.pdf` | 3 `javascript` findings, 1 unexamined | Live form with XFA and field scripts; correctly withheld |
| `figures/usgs-water-cycle.pdf` | 1 unexamined, no findings | Structure tree is 193 levels deep; the pre-existing walk depth budget is 128 |
| `born-digital/irs-i1040-instructions.pdf` | 1 `embedded-files`, 2 unexamined | 81,997 structure objects against the 20,000 budget, plus a nested `EmbeddedFiles` name tree |

The last two are budget decisions this change deliberately does not touch. Raising `MAX_REACHABLE_DEPTH` and `MAX_REACHABLE_OBJECTS` is a separate, small change; the numbers above are the evidence for it.

## Walk budgets (same day, second commit)

The two budget-limited documents above were the only benign sources still withheld, so the shared walk budgets were raised: `MAX_REACHABLE_OBJECTS` 20,000 -> 400,000 and `MAX_REACHABLE_DEPTH` 128 -> 1,024 (`MAX_CONTAINER_ENTRIES` unchanged at 10,000). Every object is still visited once, so the object budget bounds linear work and the depth budget bounds recursion; both remain far below what any JavaScript engine handles while still ending a hostile walk. The over-depth tests now build 1,100 levels.

`corpus-census-after-budgets.json` repeats the census against the previous commit: deliverable documents 12 / 16 -> **13 / 16**, no object mutated. `figures/usgs-water-cycle.pdf` (depth 193) now passes. `born-digital/irs-i1040-instructions.pdf` remains withheld for its real embedded file and its nested `EmbeddedFiles` name tree, which is correct. The scanner suites stayed at 34 / 34 and `verify:mcpb-ci` at 41 / 41 after the rebuild.

## Verification

| Gate | Result |
| --- | --- |
| `tests/active_content_scan_completeness.test.js` + new `tests/active_content_scan_bookmarks_forms.test.js` (fake-object harness and real pdf-lib documents) | 34 / 34 |
| `npm run verify:mcpb-ci` (before and after the version bump) | 41 / 41, 9 files |
| `npm run verify:mcp-parity` | 73 / 73 |
| `tests/e2e/remediation_corpus_golden.spec.ts` in Chromium (Document Safety fixture, clean rebuilt PDF, full runs) | 6 / 6 |
| `check-pipeline-integrity.js`, `npm run verify:pipeline` | OK, 178 / 134 exports |
| Pre-commit checks (source-pair drift, Lumen sweep, staleness delta) | OK |

`doc_pipeline_module.js` and `desktop/web-app/public/doc_pipeline_module.js` were rebuilt from source and are byte-identical. The rebuild also restored the `RemediationReview` footer that `_build_doc_pipeline_module.js` has appended since 8 September and that the module committed on 13 September lacked; the PDF-audit view carries its own copy of that helper, so this was a parity gap rather than a runtime break.

## Installer

`desktop/dist/mcpb/alloflow-remediation.mcpb`, v0.11.0, 71,105,830 bytes, SHA-256 `8a6a3eb013af6de361c636f22b88ed2a04062a6bb90832c003e713c6af0f7af6`, built 2026-09-13 15:04 UTC. Build-time verification passed: 41 tools, 1 skill, 1 prompt, 59 hashed vendor files, HTTP transport probed; `sha256sum -c SHA256SUMS.txt` OK. This supersedes the v0.10.0 bundle of 5 September, which carried none of the 12 September fixes. Nothing was published, pushed or sent to anyone. Superseded the same afternoon by the rebuild recorded in [the gap-lane report](../mcp-gap-lane-pilots-2026-09-13/installer.txt) (71,108,845 bytes, SHA-256 `7bd8ba60498f290fc2ce25634b19f184a435bf9ccd007a9450b3a35a1b7a3612`), which carries the OCR, list-marker, Tesseract and auto-fix fixes found by the pilots.

## Limits

This is a scanner and packaging change verified by deterministic tests and a corpus census. It does not add a live remediation run, a human review, or any PDF/UA claim; the documents that now pass the safety scan still have to clear content coverage, the honesty-gated verdict and veraPDF before a `-tagged.pdf` is delivered.
