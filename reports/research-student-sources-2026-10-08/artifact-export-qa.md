# Artifact And Export Verification

Final local verification on 2026-10-09 against the synchronized canonical modules.

- `tests/student_sources_export.test.js`: 13 passed.
- `tests/leveled_text_citation_resilience.test.js`: 18 passed.
- `tests/document_citation_adaptation.test.js`: 25 passed after correcting the approved-source fixture to declare `shareExcerpt: true` explicitly.

The initial combined run is preserved in `artifact-export-tests-final.json`: 54 passed, 2 failed. Both failures came from the same outdated fixture, which supplied excerpts without the explicit sharing permission now required by the projection contract. No assertions were removed or weakened. The corrected adaptation run is preserved separately in `adaptation-tests-final.json`: 25 passed, exit code 0. Together the latest results cover all 56 focused cases.

Checks include private appendix redaction, missing-helper failure, private-sharing consent, stale-record rejection, citation conservation, saved-reading provenance selection, public link preservation, escaped exact excerpts, evidence labels, and excluding export source excerpts from reading narration. Teacher artifacts remain unchanged during export.

The runs used `vitest-startup.cjs` to extend Windows worker startup to 300 seconds in memory. Dependencies and test assertion timeouts were not modified. The final verification agent changed only the one test-fixture permission field and this report, not product code. No live model or search requests, full production build, commit, push, or deployment were performed.
