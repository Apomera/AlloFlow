# Catalog capability accuracy — 2026-09-19

Catalog generation now derives four capability tags from actual pack resources: `memory-aid`, `applied-challenge`, `illustrated`, and `text-only`. Curated titles, credits, subjects, and topical tags remain supported. These four capability tags are reconciled after overrides, so an older curated list cannot hide a newly added activity or retain a capability that was removed.

Image detection inspects native image fields, including glossary, chart, sort, and lesson panel images. A planned image prompt, empty slot, or placeholder such as `pending` does not count as an illustration. The tag indicates an image reference is present; it does not certify that a remote image is reachable, that every slot is filled, or that artwork has passed visual review.

Five existing local catalog entries gained missing memory-aid and applied-challenge tags:

- Forces and Motion, grade 3
- States of Matter, grade 4
- Weather vs. Climate, grade 5
- Plant Needs, grade 3
- Materials, grade 2

The catalog searches tags as well as titles, so these existing activities become discoverable by their capability tags. All 43 entries remain present, with the same paths and identities. No pack contents, images, or alt text were edited in this pass. Changes remain local and were not published.

The edition-consistency checker also now reports malformed source and illustrated resource rows, duplicate source IDs, non-array objectives, invalid objective rows, and malformed lesson references without throwing. This extends the existing missing-activity and dangling-reference checks; it does not perform a semantic comparison of every original and illustrated lesson.

Regression coverage includes inline images without standalone image resources, planned-image placeholders, remote and repository image references, stale overrides, added/removed activities, all published entries, and malformed edition data. Run:

```text
npx vitest run tests/catalog_allopack_capabilities.test.js tests/catalog_index.test.js tests/allopack_edition_consistency.test.js --no-isolate --maxWorkers=1 --testTimeout=60000
node dev-tools/verify_allopack_refinements_20260919.cjs
```

Maintainer rule: edit `catalog/published_allopacks.json` for curated metadata, and regenerate the index through `catalog/generate_index.js`. Do not manually maintain resource capability tags; those are derived from the referenced AlloPack. Existing manual copies of capability tags are reconciled automatically.

Final verification: all 73 tests across the three targeted suites passed. The exact content/provenance verifier also passed for all 105 files, with 43 consistent edition pairs and no missing source activities. Whitespace checks passed for the changed code and catalog files.

