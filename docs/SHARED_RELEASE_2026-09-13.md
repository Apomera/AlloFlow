# Shared release preparation — 2026-09-13

The maintainer requested committing and deploying everyone's completed shared work.
This release includes the app sources and generated modules, regression tests,
illustrated AlloPacks, catalog metadata, and author/review documentation.
Temporary browser error snapshots, untracked screenshot runs, logs, and scratch
files remain local. Ignored configuration and credentials are not committed.

## Community library

The published AlloPack manifest expands from 6 to 43 illustrated editions.
Catalog entries retain the educator-review-pending credit. The seven remaining
original-only packs are not added as illustrated editions. Earlier dated pack
handoffs describe the pre-publication state and remain historical records.

All 93 local pack files (50 originals plus 43 illustrated editions), containing
1,125 resources, passed the import validator. The catalog and newest five pack
suites passed 341 tests. The PDF remediation workspace passed 32 focused tests.
These automated checks do not claim a full signed-in, teacher/student, translated
send-home round trip for every pack.

## Integration corrections

- Added six missing English translation entries. The concept-sort retry
  announcement uses the actual kept/returned interpolation parameters.
- Recorded 14 PDF workspace dependencies only after confirming their declarations
  in the builder-included fragments and React wrapper.
- Fixed generated-module discovery so a builder's name in a generated-file notice
  cannot be mistaken for the compiled module's filename.
- Regenerated production source/mirror assets through the existing build pipeline.

## Broader audit limits

The initial 60-check full audit reported 50 passes, 8 failures, and 2 informational
checks. Missing English keys were corrected afterward. Other reported findings
include unsafe find-result dereferences, command translation drift and English
fallbacks, incomplete runtime/UI language coverage, missing help entries, and a
pipeline/doc-builder test gate failure. This is not a claim that the entire
repository's audit or CI is green. The pre-release GitHub main already had failing
unit shards and static/documentation checks; its Cloudflare Pages check passed.
The deployment follows the repository's normal release gates without skip flags.

Production hosting is Cloudflare Pages at https://alloflow-cdn.pages.dev/app/;
the promotional site is GitHub Pages at https://apomera.github.io/AlloFlow/.
The repository's placeholder Firebase target must not select a maintainer demo.
Final commit identifiers, deployment status, and additional test results are
reported after the release completes.
