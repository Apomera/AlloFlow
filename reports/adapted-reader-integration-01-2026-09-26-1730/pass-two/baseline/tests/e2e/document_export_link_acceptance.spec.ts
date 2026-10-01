import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const { renderPdf } = require('../../dev-tools/build_document_at_fixture_suite.cjs');
const { inspectPdf } = require('../../dev-tools/document_export_at_acceptance.cjs');
const { PDFDocument, PDFName, PDFArray, PDFDict } = require('../../desktop/mcp/vendor/pdf-lib.min.js');

test.describe.configure({ mode: 'serial' });
test.setTimeout(180000);
const schedule = 'https://example.invalid/schedule';
const tutoring = 'https://example.invalid/tutoring';
const expected = {
  title: 'Resource links', headings: [{ level: 1, name: 'Resource links' }],
  readingOrder: ['Resource links', 'Course schedule', 'Tutoring support'], tables: [],
  pdfLinks: [{ name: 'Course schedule', url: schedule }, { name: 'Tutoring support', url: tutoring }],
};
let files: Record<string, string>;

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(420000);
  const directory = path.resolve('reports', 'at-link-fixtures-' + process.pid + '-' + Date.now());
  fs.mkdirSync(directory, { recursive: true });
  files = {};
  for (const [id, first, second, secondName] of [
    ['correct', schedule, tutoring, 'Tutoring support'],
    ['swapped', tutoring, schedule, 'Tutoring support'],
    ['ambiguous', schedule, tutoring, 'Course schedule'],
  ]) {
    const html = path.join(directory, id + '.html');
    files[id] = path.join(directory, id + '.pdf');
    // The first link wraps onto multiple lines/annotations; association must retain them all.
    fs.writeFileSync(html, '<!doctype html><html lang="en"><head><title>Resource links</title></head><body><main><h1>Resource links</h1><p style="width:55px"><a href="' + first + '">Course schedule</a></p><p><a href="' + second + '">' + secondName + '</a></p></main></body></html>');
    await renderPdf(html, files[id]);
  }
  // Keep the valid link annotations and tagged text, but detach the annotations from Link tags.
  // This is a valid PDF fixture with missing accessibility association, not a mocked inspector.
  const document = await PDFDocument.load(fs.readFileSync(files.correct));
  let removed = 0;
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict) || String(object.get(PDFName.of('S'))) !== '/Link') continue;
    const children = object.lookup(PDFName.of('K'));
    if (!(children instanceof PDFArray)) continue;
    for (let i = children.size() - 1; i >= 0; i--) {
      const child = children.lookup(i);
      if (child instanceof PDFDict && String(child.get(PDFName.of('Type'))) === '/OBJR') {
        children.remove(i); removed++;
      }
    }
  }
  expect(removed).toBeGreaterThanOrEqual(3);
  files.unbound = path.join(directory, 'unbound.pdf');
  fs.writeFileSync(files.unbound, await document.save({ useObjectStreams: false }));
});

test('PDF link acceptance binds a named multi-line link to all of its own annotations', async ({}, testInfo) => {
  const report = await inspectPdf(files.correct, expected);
  fs.writeFileSync(testInfo.outputPath('link-association-correct.json'), JSON.stringify(report, null, 2));
  expect(report.checks.every((check: any) => check.status === 'passed')).toBe(true);
  const first = report.checks.find((check: any) => check.id === 'pdf.link-1');
  expect(first.observed.matchingTags).toBe(1);
  expect(first.observed.bindings[0].references.length).toBeGreaterThanOrEqual(2);
  expect(first.observed.bindings[0].annotationUrls.every((url: string) => url === schedule)).toBe(true);
});

test('PDF link acceptance rejects swapped destinations even when every expected URL is present', async ({}, testInfo) => {
  const report = await inspectPdf(files.swapped, expected);
  fs.writeFileSync(testInfo.outputPath('link-association-swapped.json'), JSON.stringify(report, null, 2));
  const links = report.checks.filter((check: any) => check.id.startsWith('pdf.link-'));
  expect(links.map((check: any) => check.status)).toEqual(['failed', 'failed']);
  expect(links[0].observed.bindings[0].annotationUrls.every((url: string) => url === tutoring)).toBe(true);
  expect(links[1].observed.bindings[0].annotationUrls).toEqual([schedule]);
  expect(report.checks.filter((check: any) => !check.id.startsWith('pdf.link-')).every((check: any) => check.status === 'passed')).toBe(true);
});

test('PDF link acceptance refuses a matching name without its own annotation references', async ({}, testInfo) => {
  const report = await inspectPdf(files.unbound, expected);
  fs.writeFileSync(testInfo.outputPath('link-association-unbound.json'), JSON.stringify(report, null, 2));
  const links = report.checks.filter((check: any) => check.id.startsWith('pdf.link-'));
  expect(links.map((check: any) => check.status)).toEqual(['failed', 'failed']);
  for (const link of links) {
    expect(link.observed.matchingTags).toBe(1);
    expect(link.observed.bindings[0].references).toEqual([]);
  }
  expect(report.checks.find((check: any) => check.id === 'pdf.tagged-reading-order').status).toBe('passed');
});

test('PDF link acceptance refuses duplicate matching names with different destinations', async () => {
  const report = await inspectPdf(files.ambiguous, expected);
  const first = report.checks.find((check: any) => check.id === 'pdf.link-1');
  expect(first.status).toBe('failed');
  expect(first.observed.matchingTags).toBe(2);
  expect(first.observed.bindings.map((binding: any) => binding.annotationUrls[0])).toEqual([schedule, tutoring]);
});
