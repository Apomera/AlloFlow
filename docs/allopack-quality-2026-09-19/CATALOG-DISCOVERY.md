# Community catalog discovery improvements — 2026-09-19

The Browse tab now accepts ordinary activity phrases: `memory aid` matches `memory-aid`, and `applied challenge` matches `applied-challenge`. Search terms can appear across the title and tags in any order. Case, accents, punctuation, and repeated spaces are normalized while non-Latin letters remain searchable. Every query word must match; this is not typo correction or semantic search.

Grade filtering now compares actual grades instead of substrings. Grade 1 no longer matches grade 10. Grade 7 matches a 6–8 lesson, and a requested range matches lessons whose grade ranges overlap it. Kindergarten, Pre-K, ordinal grade labels, numeric metadata, and lists such as `3, 5 and 7` are supported. Missing grade information does not match a specific numeric grade request.

Active filters expose a **Clear filters** button. Empty results explain how to recover, and the result count is a polite live region. Clearing filters returns keyboard focus to the search box. The desktop/web-app public module is byte-identical to the root module.

Verification uses both unit/regression tests and the actual production catalog component in Chromium with an intercepted local manifest. The browser check exercises title/tag phrase search, exclusion of a grade-10 fixture when grade 1 is requested, zero-result recovery, Enter-key activation of Clear filters, return of focus to search, and filtering at a 390-pixel viewport. No resource is loaded into the user's app, downloaded, or published by this check. Screenshots are captured as evidence but are not a visual-layout certification.

Reproduce:

```text
npx vitest run tests/catalog_discovery.test.js tests/pd_catalog_render.test.js tests/catalog_index.test.js --no-isolate --maxWorkers=1 --testTimeout=60000
node dev-tools/qa_catalog_discovery.cjs
```

Evidence: `scratch/catalog-discovery-tests.log`, `scratch/catalog-discovery-final-tests.log`, and `scratch/catalog-discovery/report.json`. Changes remain local; no deployment or publication was performed. AlloPack contents, artwork, and alt text are unchanged in this pass.
