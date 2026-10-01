import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
const { compareRenderedHtml, compareFiles, validateCheckpoints } = require('../../dev-tools/rendered_document_fidelity.cjs');
const { runAcceptance } = require('../../dev-tools/document_export_at_acceptance.cjs');
const cases = require('../fixtures/rendered_fidelity/cases.cjs');
test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);
for (const fixture of cases) test('rendered corpus: ' + fixture.id, async ({ browser }, testInfo) => {
  const report = await compareRenderedHtml(browser, fixture.sourceHtml, fixture.candidateHtml, { checkpoints: fixture.checkpoints });
  fs.writeFileSync(testInfo.outputPath('rendered-fidelity.json'), JSON.stringify(report, null, 2));
  expect(report.status).toBe(fixture.expectedStatus);
  expect(report.source.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(report.candidate.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(report.coverage.wholeDocument).toBe(false);
  expect(report.humanValidation).toBe('not-run');
});
test('ambiguous and missing checkpoints cannot pass', async ({ browser }) => {
  const report = await compareRenderedHtml(browser, '<p>One</p><p>Two</p>', '<p>One</p>', { checkpoints: [
    { id: 'ambiguous', sourceSelector: 'p', properties: ['visible'] },
    { id: 'missing', sourceSelector: '#missing', properties: ['text'] },
  ] });
  expect(report.status).toBe('unavailable');
  expect(report.coverage.complete).toBe(false);
  expect(report.checks.every((c: any) => c.status === 'unavailable')).toBe(true);
});
test('scripts and resource dependencies cannot produce a verified result', async ({ browser }) => {
  const html = '<p id="p">Original</p><script>document.getElementById("p").textContent="Executed";fetch("https://beacon.invalid/")</script><img src="https://beacon.invalid/pixel">';
  const report = await compareRenderedHtml(browser, html, html, { checkpoints: [{ id: 'content', sourceSelector: '#p', properties: ['text'] }] });
  expect(report.status).toBe('unavailable');
  expect(report.checks[0].properties[0].source).toBe('Original');
  expect(report.resources.source.scripts).toBe(1);
  expect(report.resources.source.blocked).toBeGreaterThan(0);
});
test('post-export report retains source-bound failure and does not promote human acceptance', async ({ browser }, testInfo) => {
  const source = testInfo.outputPath('source.html'), output = testInfo.outputPath('candidate.html');
  const original = '<!doctype html><html lang="en"><head><title>Reading</title></head><body><main><h1>Reading</h1><p id="instruction">Keep this instruction.</p></main></body></html>';
  fs.writeFileSync(source, original);
  fs.writeFileSync(output, original.replace('<p id="instruction">', '<p id="instruction" style="display:none">'));
  const manifest = testInfo.outputPath('manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts: [{ id: 'reading', documentKind: 'reading', kind: 'html', path: output,
    expected: { title: 'Reading', language: 'en', headings: [{ level: 1, name: 'Reading' }], tables: [] },
    sourceFidelity: { sourcePath: source, checkpoints: [{ id: 'instruction', sourceSelector: '#instruction', properties: ['visible', 'exposed', 'text'] }] },
  }] }));
  const report = await runAcceptance(manifest, { browser });
  expect(report.automatedStatus).toBe('failed');
  expect(report.artifacts[0].renderedFidelity.status).toBe('review-required');
  expect(report.artifacts[0].renderedFidelity.candidate.sha256).toBe(report.artifacts[0].sha256);
  expect(report.artifacts[0].renderedFidelity.source.path).toBe(path.resolve(source));
  expect(report.humanAcceptance.status).toBe('not-run');
});
test('file reports bind exact bytes and reject vacuous contracts', async ({ browser }, testInfo) => {
  expect(() => validateCheckpoints([])).toThrow();
  expect(() => validateCheckpoints([{ id: 'x', sourceSelector: '#x', properties: ['unknown'] }])).toThrow();
  const source = testInfo.outputPath('source.html'), output = testInfo.outputPath('output.html');
  fs.writeFileSync(source, '<p id="x">Text</p>'); fs.copyFileSync(source, output);
  const report = await compareFiles(browser, source, output, { checkpoints: [{ id: 'x', sourceSelector: '#x', properties: ['text'] }] });
  expect(report.status).toBe('passed');
  expect(report.source.sha256).toBe(report.candidate.sha256);
});

test('suppressed handlers and script MIME variants report incomplete coverage', async ({ browser }) => {
  for (const markup of ['<body onload="document.querySelector(\'p\').remove()"><p id="x">Text</p></body>', '<p id="x">Text</p><script type="text/ecmascript">document.querySelector("p").remove()</script>']) {
    const report = await compareRenderedHtml(browser, markup, markup, { checkpoints: [{ id: 'x', sourceSelector: '#x', properties: ['text'] }] });
    expect(report.status).toBe('unavailable'); expect(report.resources.source.scripts).toBeGreaterThan(0); expect(report.coverage.complete).toBe(false);
  }
});
test('external href cannot borrow a same-named local target', async ({ browser }) => {
  const source = '<a id="link" href="#target">Read</a><p id="target">Required text</p>';
  const report = await compareRenderedHtml(browser, source, source.replace('href="#target"', 'href="https://other.invalid/#target"'), { checkpoints: [{ id: 'link', sourceSelector: '#link', properties: ['targetText'] }] });
  expect(report.status).toBe('unavailable');
});
test('display contents preserves visible descendants', async ({ browser }) => {
  const source = '<section id="section"><p>Text</p></section>';
  const report = await compareRenderedHtml(browser, source, source.replace('id="section"', 'id="section" style="display:contents"'), { checkpoints: [{ id: 'section', sourceSelector: '#section', properties: ['visible', 'text'] }] });
  expect(report.status).toBe('passed');
});
test('incompatible file encodings cannot collapse source characters', async ({ browser }, testInfo) => {
  const source = testInfo.outputPath('legacy-source.html'), candidate = testInfo.outputPath('legacy-candidate.html');
  fs.writeFileSync(source, Buffer.from('<p id="x">caf\xe9</p>', 'latin1')); fs.writeFileSync(candidate, Buffer.from('<p id="x">caf\xe8</p>', 'latin1'));
  await expect(compareFiles(browser, source, candidate, { checkpoints: [{ id: 'x', sourceSelector: '#x', properties: ['text'] }] })).rejects.toThrow();
  fs.writeFileSync(source, '<meta charset="windows-1252"><p id="x">Text</p>'); fs.copyFileSync(source, candidate);
  await expect(compareFiles(browser, source, candidate, { checkpoints: [{ id: 'x', sourceSelector: '#x', properties: ['text'] }] })).rejects.toThrow(/UTF-8/);
});
