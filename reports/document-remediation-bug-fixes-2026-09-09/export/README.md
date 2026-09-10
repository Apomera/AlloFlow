# Baseline export review fixes

Fixed review findings **5, 10, 11, and 13** in `dev-tools/document_export_at_acceptance.cjs`.

- HTML table checks now match exposed table and required header roles to the exact DOM table/cells. Presentational tables, hidden tables or ancestors, downgraded headers, and unrelated accessible headers cannot satisfy the contract.
- A fulfilled isolated document origin makes relative CSS requests observable while dependencies remain blocked. Parsed declarations also retain dependencies in hidden elements, inactive media queries, imports, unused fonts, pseudo-elements, and image-set URLs. Embedded images, local SVG filters, comments, and literal CSS text remain supported.
- Both HTML and tagged-PDF table comparisons normalize actual and expected cells with NFC. Canonical equivalents pass; changed accents and compatibility distinctions such as superscripts still fail.
- Script classification distinguishes executable or behavior-affecting script types from inert data blocks, including XML. Native Chromium controls verify inert MIME types; uppercase module/import-map types remain unavailable.

Added **37 regressions and positive controls** in `tests/e2e/document_export_review_fixes.spec.ts`, including a real tagged-PDF normalization check. Updated `docs/document-export-at-acceptance.md`.

Final validation: **77 passing tests**, no failures or skipped tests. The five browser suites cover the new review fixes, existing baseline, full HTML/PDF acceptance and keyboard behavior, artifact binding, and PDF link associations. Two unit tests verify failed inspections close their contexts and retain unavailable evidence. JavaScript syntax validation also passed.

Evidence: [final browser results](review-fix-complete-tests.json), [unit results](inspection-failure-tests.json), [summary and file hashes](summary.json). The initial development report retains the uppercase-module counterexample; the completed run includes its corrected regression.

These are synthetic local browser/PDF checks. Human assistive-technology acceptance remains not run. No deployment or live model request occurred, and the original bug-review evidence remains unchanged.
