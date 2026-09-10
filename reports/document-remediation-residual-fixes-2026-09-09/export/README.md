# Export residual fixes

Fixed residual findings 4, 5, and 8 in the HTML export acceptance checker:

- Every expected data/header cell must be exposed with its required native role and remain owned by the actual corresponding row and table in Chromium's accessibility tree. Hidden data rows/cells, role downgrades, and `aria-owns` reassignment now fail.
- Native accessible names for every expected cell must match the contract, including column and row headers. Nonempty DOM text is checked independently. Image-only headers can supply their content through a matching native alternative name.
- Heading text, native names, and expected names use NFC normalization, with the heading's own identity and level retained. Normalized level/name matches must remain unique. Canonical accents and combining-mark order pass; missing accents, compatibility substitutions, wrong accessible names, and hidden headings with exposed substitutes fail.

The dependency-analysis block was unchanged by this subtask; the parent task integrates its shared collector separately.

## Evidence

- [Playwright results](playwright-results.json): **65 passed, 0 failed, 0 skipped**, covering 28 new cases in `tests/e2e/document_export_residual_fixes.spec.ts` and 37 existing cases in `tests/e2e/document_export_review_fixes.spec.ts`. Duration: 35.4 seconds. Test observations are preserved beneath `test-results/`.
- [Original residual cases](original-case-results.json): **all 5 match their intended result**, including the three previously failing behaviors and both original positive controls. Recheck script: [recheck-original.cjs](recheck-original.cjs).
- Relevant documentation updated in `docs/document-export-at-acceptance.md`.

Commands:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/document_export_residual_fixes.spec.ts tests/e2e/document_export_review_fixes.spec.ts --workers=1 --retries=0 --reporter=json --output=reports/document-remediation-residual-fixes-2026-09-09/export/test-results
node reports/document-remediation-residual-fixes-2026-09-09/export/recheck-original.cjs
```

These are local synthetic Chromium observations. They do not establish full document delivery, complex spanning-header usability, human screen-reader acceptance, or PDF heading normalization. Prior review evidence was preserved. No deployment or model requests were made.
