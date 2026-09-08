import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const { buildFixtureSuite, renderPdf } = require('../../dev-tools/build_document_at_fixture_suite.cjs');
const { runAcceptance, inspectPdf, manualTemplate } = require('../../dev-tools/document_export_at_acceptance.cjs');

test.describe.configure({ mode: 'serial' });
test.setTimeout(180000);
let manifestPath: string;
let manifest: any;
test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(360000);
  manifestPath = process.env.ALLOFLOW_AT_MANIFEST || await buildFixtureSuite(path.resolve('reports', 'at-fixtures-' + process.pid + '-' + Date.now()));
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
});
test('education HTML/PDF exports expose expected semantics and keyboard behavior; human AT stays not run', async ({ browser }, testInfo) => {
  const report = await runAcceptance(manifestPath, { browser });
  fs.writeFileSync(testInfo.outputPath('automated-results.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(testInfo.outputPath('manual-results.template.json'), JSON.stringify(manualTemplate(report), null, 2));
  expect(report.artifacts).toHaveLength(5);
  expect(report.artifacts.flatMap((artifact: any) => artifact.checks.filter((check: any) => check.status !== 'passed').map((check: any) => ({ artifact: artifact.id, ...check })))).toEqual([]);
  expect(report.automatedStatus).toBe('passed');
  expect(report.humanAcceptance).toMatchObject({ status: 'not-run', releaseDecision: 'pending-human-at' });
  for (const artifact of report.artifacts) {
    expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.bytes).toBeGreaterThan(0);
    expect(artifact.manualATStatus).toBe('not-run');
  }
  expect(manualTemplate(report).artifacts.every((a: any) => a.tasks.every((task: any) => task.status === 'not-run'))).toBe(true);
});
test('a heading demotion and positive tabindex fail the keyboard/semantic acceptance contract', async ({ browser }, testInfo) => {
  const artifact = structuredClone(manifest.artifacts.find((a: any) => a.id === 'education-form-html'));
  const file = testInfo.outputPath('broken-worksheet.html');
  fs.writeFileSync(file, fs.readFileSync(path.resolve(path.dirname(manifestPath), artifact.path), 'utf8')
    .replace('<h2>Your response</h2>', '<p>Your response</p>')
    .replace('id="learner"', 'id="learner" tabindex="3"'));
  artifact.path = file;
  const input = testInfo.outputPath('broken-manifest.json');
  fs.writeFileSync(input, JSON.stringify({ schema: 1, artifacts: [artifact] }));
  const report = await runAcceptance(input, { browser });
  expect(report.automatedStatus).toBe('failed');
  const failures = report.artifacts[0].checks.filter((check: any) => check.status === 'failed').map((check: any) => check.id);
  expect(failures).toContain('html.heading-navigation-semantics');
  expect(failures).toContain('html.no-positive-tabindex');
  expect(failures).toContain('html.keyboard-order-1');
  expect(report.humanAcceptance.status).toBe('not-run');
});
test('a tagged PDF with changed table values fails cell and reading-order expectations', async ({}, testInfo) => {
  const html = manifest.artifacts.find((a: any) => a.id === 'education-table-html');
  const expected = manifest.artifacts.find((a: any) => a.id === 'education-table-pdf').expected;
  const source = fs.readFileSync(path.resolve(path.dirname(manifestPath), html.path), 'utf8');
  expect(source).toContain('Library');
  const altered = testInfo.outputPath('changed-table.html'), pdf = testInfo.outputPath('changed-table.pdf');
  fs.writeFileSync(altered, source.replace('Library', 'Gymnasium'));
  await renderPdf(altered, pdf);
  const report = await inspectPdf(pdf, expected);
  expect(report.checks.find((check: any) => check.id === 'pdf.table-1')?.status).toBe('failed');
  expect(report.checks.find((check: any) => check.id === 'pdf.tagged-reading-order')?.status).toBe('failed');
});
test('searchable but untagged PDF text does not establish tagged reading-order acceptance', async () => {
  const artifact = manifest.artifacts.find((a: any) => a.id === 'education-reading-pdf');
  const report = await inspectPdf(path.resolve(__dirname, '../../test-assets/multi-column-sample.pdf'), artifact.expected);
  const check = report.checks.find((check: any) => check.id === 'pdf.tagged-reading-order');
  expect(check.status).toBe('failed');
  expect(check.observed.untaggedPages).toBeGreaterThan(0);
});
