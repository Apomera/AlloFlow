# PDF link acceptance refinement — 2026-09-08

## Demonstrated gap

A real tagged PDF containing **Course schedule** and **Tutoring support** passed both optional PDF link checks after their destinations were swapped. The checker independently found each expected name somewhere in the tags and each expected URL somewhere in the annotation list. It did not establish that the named link owned that URL.

The before-change reproduction is preserved in [link-association-before.json](link-association-before.json), including the original PDF.js tree and annotations. Both wrong links show a passed result there.

## Change

Only these implementation/test paths changed in this refinement:

- `dev-tools/document_export_at_acceptance.cjs`
- `tests/e2e/document_export_link_acceptance.spec.ts`

The checker now keeps page-scoped structure object references and annotation IDs. Each expected name must identify one Link tag with at least one resolved annotation reference. Every associated annotation must have the expected URL. Links split across lines can own multiple annotations; they pass when all destinations agree. Missing associations and ambiguous names fail.

The fixture builder was audited but did not require a change for this issue. No production remediation code, review component, validator adapter, or delivery decision was changed.

## Validation

**8/8 focused Playwright tests passed**, one worker, approximately 1.4 minutes:

- Existing four export acceptance tests, reusing the saved five-artifact education manifest.
- Correct named link split across multiple annotations.
- Both expected URLs present, but swapped between links.
- Tagged link text and PDF annotations retained, with their OBJR associations removed using the repository PDF library.
- Duplicate link names with different destinations.

The new cases use actual locally rendered tagged PDFs and the repository PDF.js reader; the inspector is not mocked. The detached-association fixture still passes tagged reading-order checks, confirming its failure is specifically the missing link binding.

Evidence:

- [Focused browser log](browser-tests.log)
- [Correct multi-line binding](link-association-correct.json)
- [Swapped destinations rejected](link-association-swapped.json)
- [Missing object-reference bindings rejected](link-association-unbound.json)

Run from the repository root:

~~~powershell
$env:ALLOFLOW_AT_MANIFEST = (Resolve-Path reports/document-remediation-improvements-2026-09-07/at/acceptance-manifest.json).Path
node node_modules/@playwright/test/cli.js test tests/e2e/document_export_at_acceptance.spec.ts tests/e2e/document_export_link_acceptance.spec.ts --workers=1 --retries=0
~~~

These are artifact structure observations. Native reader activation, spoken output, and destination usefulness still require the human protocol. **No human assistive-technology testing was run; human acceptance remains pending.**
