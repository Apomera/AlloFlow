# Export acceptance and review controls — 2026-09-08

Implemented an executable local acceptance harness, representative mixed-education export packet, and human screen-reader protocol. **No screen reader or human user testing was run.** The human decision remains **pending-human-at**.

## Changed paths

- `dev-tools/document_export_at_acceptance.cjs`: reusable manifest-driven HTML/PDF checker and separate manual result template. Reports include exact artifact SHA-256/bytes, reader/browser version, observations, and limitations.
- `dev-tools/build_document_at_fixture_suite.cjs`: produces actual portable reading/table HTML and tagged PDF exports from shared benchmark sources/plans, plus the native HTML form fixture.
- `tests/fixtures/document-at/worksheet-controls.html`: privacy-safe, script-free form with named native controls, skip/reference links, and visible focus styles.
- `tests/e2e/document_export_at_acceptance.spec.ts`: actual exports and negative mutations.
- `tests/e2e/remediation_preservation_review.spec.ts`: new component exercised in isolated Chromium with real React, DOMParser, SHA-256, keyboard, and iframe focus.
- `docs/document-export-at-acceptance.md`: executable instructions, explicit automated/manual boundary, concrete screen-reader tasks and comparison values, result/issue protocol.

No production source was edited by this agent in this task. The root agent corrected the focus issue discovered by the component test.

## Results

| Focused suite | Result |
|---|---|
| Export acceptance | **4/4 passed**, 49.8 seconds |
| Preservation-review component, after correction | **4/4 passed**, 4.3 seconds |
| Two new CLI files, Node syntax | Passed |

Browser: Chromium 148.0.7778.96. PDF inspection uses the repository PDF.js 3.11.174.

The five artifacts passed **61 individual automated observations**:

| Artifact | Checks | Scope |
|---|---:|---|
| education-reading-html | 10 | Main landmark, title/language, heading levels/names/order, approved reading anchors, skip-link/tab/focus semantics |
| education-reading-pdf | 4 | Metadata title, tagged reading order, heading tags/names, expected absence of tables |
| education-table-html | 11 | Caption, column/row headers, exact cells/positions, reading anchors, title/headings/keyboard |
| education-table-pdf | 5 | Tagged reading order and headings, exact table cells/positions and header roles |
| education-form-html | 31 | Native keyboard entry/selection/check/reset, skip/reference activation and focus, names/states, structural semantics |

Negative tests prove the checker rejects a heading demotion/positive tabindex, changed table values in a freshly rendered tagged PDF, and searchable text in an untagged PDF.

The component tests cover keyboard acknowledgment, Workbench draft prefill, reference initialization persisting through host re-render, locating an exact table cell, and refusing ambiguous/changed references. Its strict test host only permits navigation/acknowledgment metadata and retains synthetic non-enumerable live proof descriptors; **production host commit/wrapper integration is tested separately by the root agent**, not implied by this isolated test.

The first component run found immediate focus loss: removing temporary tabindex on a native cell changed activeElement from TD to BODY, while the UI reported success. The root fix retains tabindex and a visible outline until blur. The final regression verifies actual focus, a 3px outline, Tab reaching the next host control, and restoration of previous tabindex/outline/offset.

Export setup initially exceeded the default 120-second hook under variable host load. The suite now declares its bounded setup budget explicitly. Final execution completed in 49.8 seconds; no path-length error was established.

## Evidence

- [Stable artifact manifest](acceptance-manifest.json)
- [Automated artifact-bound results](automated-results.json)
- [Human result template — every task not-run](manual-results.template.json)
- [Export test log](../at-browser-tests.log)
- [Final component test log](../at-review-browser-tests-final.log)
- [Initial component failure log](../at-review-browser-tests.log)
- [Minimal focus-loss reproduction](review-focus-reproduction.json)

The initial packet uses synthetic reading/table sources and a hand-authored HTML form. It does not establish portable PDF form support, meaningful figure/scan/OCR acceptance, mathematical or multilingual acceptance, spoken header usefulness, or visual layout quality. Independent validator results are not rerun or promoted by this harness. It does not alter delivery readiness or claim WCAG/PDF/UA compliance.

To reuse the generated packet without rendering again:

~~~powershell
node dev-tools/document_export_at_acceptance.cjs reports/document-remediation-improvements-2026-09-07/at/acceptance-manifest.json reports/at-new-acceptance-run
~~~

Use a new output directory to protect human records. Complete human tasks on the exact recorded bytes and intended user environments before changing the pending decision.
