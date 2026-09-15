# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_export_at_acceptance.spec.ts >> education HTML/PDF exports expose expected semantics and keyboard behavior; human AT stays not run
- Location: tests\e2e\document_export_at_acceptance.spec.ts:16:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 12

- Array []
+ Array [
+   Object {
+     "artifact": "education-reading-html",
+     "id": "inspection-executed",
+     "observed": "locator.evaluate: Timeout 2500ms exceeded.
+ Call log:
+   - waiting for getByRole('link', { name: 'Skip to main content', exact: true })
+     - locator resolved to visible <a class=\"skip-link\" href=\"#main-content\" title=\"Skip to main content\" aria-label=\"Skip to main content\">Skip to main content</a>
+ ",
+     "status": "unavailable",
+   },
+ ]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import * as fs from 'node:fs';
  3  | import * as path from 'node:path';
  4  | const { buildFixtureSuite, renderPdf } = require('../../dev-tools/build_document_at_fixture_suite.cjs');
  5  | const { runAcceptance, inspectPdf, manualTemplate } = require('../../dev-tools/document_export_at_acceptance.cjs');
  6  | 
  7  | test.describe.configure({ mode: 'serial' });
  8  | test.setTimeout(180000);
  9  | let manifestPath: string;
  10 | let manifest: any;
  11 | test.beforeAll(async ({}, testInfo) => {
  12 |   testInfo.setTimeout(360000);
  13 |   manifestPath = process.env.ALLOFLOW_AT_MANIFEST || await buildFixtureSuite(path.resolve('reports', 'at-fixtures-' + process.pid + '-' + Date.now()));
  14 |   manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  15 | });
  16 | test('education HTML/PDF exports expose expected semantics and keyboard behavior; human AT stays not run', async ({ browser }, testInfo) => {
  17 |   const report = await runAcceptance(manifestPath, { browser });
  18 |   fs.writeFileSync(testInfo.outputPath('automated-results.json'), JSON.stringify(report, null, 2));
  19 |   fs.writeFileSync(testInfo.outputPath('manual-results.template.json'), JSON.stringify(manualTemplate(report), null, 2));
  20 |   expect(report.artifacts).toHaveLength(5);
> 21 |   expect(report.artifacts.flatMap((artifact: any) => artifact.checks.filter((check: any) => check.status !== 'passed').map((check: any) => ({ artifact: artifact.id, ...check })))).toEqual([]);
     |                                                                                                                                                                                     ^ Error: expect(received).toEqual(expected) // deep equality
  22 |   expect(report.automatedStatus).toBe('passed');
  23 |   expect(report.humanAcceptance).toMatchObject({ status: 'not-run', releaseDecision: 'pending-human-at' });
  24 |   for (const artifact of report.artifacts) {
  25 |     expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
  26 |     expect(artifact.bytes).toBeGreaterThan(0);
  27 |     expect(artifact.manualATStatus).toBe('not-run');
  28 |   }
  29 |   expect(manualTemplate(report).artifacts.every((a: any) => a.tasks.every((task: any) => task.status === 'not-run'))).toBe(true);
  30 | });
  31 | test('a heading demotion and positive tabindex fail the keyboard/semantic acceptance contract', async ({ browser }, testInfo) => {
  32 |   const artifact = structuredClone(manifest.artifacts.find((a: any) => a.id === 'education-form-html'));
  33 |   const file = testInfo.outputPath('broken-worksheet.html');
  34 |   fs.writeFileSync(file, fs.readFileSync(path.resolve(path.dirname(manifestPath), artifact.path), 'utf8')
  35 |     .replace('<h2>Your response</h2>', '<p>Your response</p>')
  36 |     .replace('id="learner"', 'id="learner" tabindex="3"'));
  37 |   artifact.path = file;
  38 |   const input = testInfo.outputPath('broken-manifest.json');
  39 |   fs.writeFileSync(input, JSON.stringify({ schema: 1, artifacts: [artifact] }));
  40 |   const report = await runAcceptance(input, { browser });
  41 |   expect(report.automatedStatus).toBe('failed');
  42 |   const failures = report.artifacts[0].checks.filter((check: any) => check.status === 'failed').map((check: any) => check.id);
  43 |   expect(failures).toContain('html.heading-navigation-semantics');
  44 |   expect(failures).toContain('html.no-positive-tabindex');
  45 |   expect(failures).toContain('html.keyboard-order-1');
  46 |   expect(report.humanAcceptance.status).toBe('not-run');
  47 | });
  48 | test('a tagged PDF with changed table values fails cell and reading-order expectations', async ({}, testInfo) => {
  49 |   const html = manifest.artifacts.find((a: any) => a.id === 'education-table-html');
  50 |   const expected = manifest.artifacts.find((a: any) => a.id === 'education-table-pdf').expected;
  51 |   const source = fs.readFileSync(path.resolve(path.dirname(manifestPath), html.path), 'utf8');
  52 |   expect(source).toContain('Library');
  53 |   const altered = testInfo.outputPath('changed-table.html'), pdf = testInfo.outputPath('changed-table.pdf');
  54 |   fs.writeFileSync(altered, source.replace('Library', 'Gymnasium'));
  55 |   await renderPdf(altered, pdf);
  56 |   const report = await inspectPdf(pdf, expected);
  57 |   expect(report.checks.find((check: any) => check.id === 'pdf.table-1')?.status).toBe('failed');
  58 |   expect(report.checks.find((check: any) => check.id === 'pdf.tagged-reading-order')?.status).toBe('failed');
  59 | });
  60 | test('searchable but untagged PDF text does not establish tagged reading-order acceptance', async () => {
  61 |   const artifact = manifest.artifacts.find((a: any) => a.id === 'education-reading-pdf');
  62 |   const report = await inspectPdf(path.resolve(__dirname, '../../test-assets/multi-column-sample.pdf'), artifact.expected);
  63 |   const check = report.checks.find((check: any) => check.id === 'pdf.tagged-reading-order');
  64 |   expect(check.status).toBe('failed');
  65 |   expect(check.observed.untaggedPages).toBeGreaterThan(0);
  66 | });
  67 | 
```