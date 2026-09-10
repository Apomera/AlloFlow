import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
const { inspectHtml, runAcceptance } = require('../../dev-tools/document_export_at_acceptance.cjs');
const documentHtml = (body: string, head = '') => '<!doctype html><html lang="en"><head><title>Coverage check</title>' + head + '</head><body><main>' + body + '</main></body></html>';
const contract = { title: 'Coverage check', language: 'en', headings: [], readingOrder: ['Read this.'], tables: [] };
const passed = (report: any) => report.checks.every((check: any) => check.status === 'passed');
const inspected = (browser: any, body: string, head = '', expected = contract) => inspectHtml(browser, 'unused.html', expected, Buffer.from(documentHtml(body, head)));
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfZkAAAAASUVORK5CYII=';

for (const [name, expected, actual] of [['superscript', 'x² + y²', 'x2 + y2'], ['subscript', 'H₂O', 'H2O']]) {
  test('reading anchors preserve ' + name + ' meaning', async ({ browser }) => {
    const report = await inspected(browser, '<p>' + actual + '</p>', '', { ...contract, readingOrder: [expected] });
    expect(report.checks.find((check: any) => check.id === 'html.reading-order').status).toBe('failed');
    expect(report.coverage.complete).toBe(true);
  });
}

test('canonically equivalent Unicode reading anchors remain accepted', async ({ browser }) => {
  const report = await inspected(browser, '<p>Cafe\u0301</p>', '', { ...contract, readingOrder: ['Caf\u00e9'] });
  expect(passed(report)).toBe(true);
});

for (const bytes of [[0xe9], [0xe2, 0x82]]) {
  test('invalid UTF-8 bytes ' + bytes.join('-') + ' remain unavailable instead of being replaced', async ({ browser }) => {
    const report = await inspectHtml(browser, 'unused.html', contract, Buffer.concat([Buffer.from(documentHtml('<p>Read this.</p>') + '<!--'), Buffer.from(bytes), Buffer.from('-->')]));
    expect(report.checks).toEqual([{ id: 'html.utf8-encoding', status: 'unavailable', observed: { reason: 'invalid-utf8' } }]);
    expect(report.coverage).toMatchObject({ complete: false, reasons: ['invalid-utf8'] });
  });
}

for (const declaration of ['<meta charset="windows-1252">', '<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">']) {
  test('legacy declaration ' + declaration + ' makes inspection unavailable', async ({ browser }) => {
    const report = await inspected(browser, '<p>Read this.</p>', declaration);
    expect(report.checks[0]).toMatchObject({ id: 'html.utf8-encoding', status: 'unavailable', observed: { reason: 'incompatible-charset' } });
    expect(report.coverage.complete).toBe(false);
  });
}

test('UTF-8 BOM and declarations pass while commented metadata remains inert', async ({ browser }) => {
  const html = documentHtml('<p>Read this.</p>', '<meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><!-- <meta charset="windows-1252"> --><meta data-charset="windows-1252">');
  const report = await inspectHtml(browser, 'unused.html', contract, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(html)]));
  expect(passed(report)).toBe(true);
});

for (const [name, markup] of [
  ['executable script', '<script>document.querySelector("p").textContent="Changed";</script>'],
  ['event handler', '<button onclick="this.textContent=\'Changed\'">Continue</button>'],
  ['javascript link', '<a href="java&#10;script:void(0)">Continue</a>'],
]) {
  test(name + ' cannot imply complete script-disabled coverage', async ({ browser }) => {
    const report = await inspected(browser, '<p>Read this.</p>' + markup);
    expect(report.coverage).toMatchObject({ complete: false });
    expect(report.coverage.reasons).toContain('script-dependent-content');
    expect(report.resources.scripts).toBeGreaterThan(0);
    expect(report.checks.find((check: any) => check.id === 'html.inspection-coverage').status).toBe('unavailable');
    expect(report.checks.filter((check: any) => check.status === 'failed')).toEqual([]);
  });
}

test('JSON data and plain-text script blocks remain valid inert content', async ({ browser }) => {
  const report = await inspected(browser, '<p>Read this.</p><script type="application/json">{"value":1}</script><script type="application/ld+json">{"@context":"https://schema.org"}</script><script type="text/plain">Example code</script>');
  expect(passed(report)).toBe(true);
  expect(report.resources.scripts).toBe(0);
});

for (const [name, markup] of [
  ['relative stylesheet', '<link rel="stylesheet" href="required.css">'],
  ['preload-none relative video', '<video controls preload="none" src="required.mp4"></video>'],
  ['blocked network image', '<img alt="Chart" src="https://example.invalid/chart.png">'],
  ['external SVG use', '<svg><use href="required.svg#chart"></use></svg>'],
  ['mixed embedded/external srcset', '<img alt="" src="' + pixel + '" srcset="' + pixel + ' 1x, required.png 2x">'],
]) {
  test(name + ' cannot imply complete unloaded-resource coverage', async ({ browser }) => {
    const report = await inspected(browser, '<p>Read this.</p>' + markup);
    expect(report.coverage.complete).toBe(false);
    expect(report.coverage.reasons).toContain('unresolved-resource-references');
    expect(report.resources.unresolved).toBeGreaterThan(0);
    expect(report.checks.find((check: any) => check.id === 'html.inspection-coverage').status).toBe('unavailable');
    expect(report.checks.filter((check: any) => check.status === 'failed')).toEqual([]);
  });
}

test('embedded images, data-only srcset, and local SVG references remain accepted', async ({ browser }) => {
  const report = await inspected(browser, '<p>Read this.</p><img alt="" src="' + pixel + '" srcset="' + pixel + ' 1x, ' + pixel + ' 2x"><svg><defs><symbol id="dot"><circle r="2"></circle></symbol></defs><use href="#dot"></use></svg>');
  expect(passed(report)).toBe(true);
  expect(report.resources).toMatchObject({ blocked: 0, unresolved: 0 });
});

test('pending animations leave temporal coverage unavailable', async ({ browser }) => {
  const report = await inspected(browser, '<p>Read this.</p>', '<style>@keyframes hide { to { opacity: 0; } } p { animation: hide 1ms step-end 60s forwards; }</style>');
  expect(report.coverage.complete).toBe(false);
  expect(report.coverage.reasons).toContain('active-animations');
  expect(report.checks.find((check: any) => check.id === 'html.reading-order').status).toBe('passed');
});

test('baseline acceptance without sourceFidelity cannot pass dependent HTML and preserves artifact identity', async ({ browser }, testInfo) => {
  const bytes = Buffer.from(documentHtml('<p>Read this.</p><video preload="none" src="required.mp4"></video>'));
  const file = testInfo.outputPath('dependent.html'), manifest = testInfo.outputPath('manifest.json');
  fs.writeFileSync(file, bytes);
  fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts: [{ id: 'baseline', kind: 'html', path: file, expected: contract }] }));
  const report = await runAcceptance(manifest, { browser });
  expect(report.automatedStatus).toBe('failed');
  expect(report.artifacts[0].renderedFidelity).toBeUndefined();
  expect(report.artifacts[0].sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
  expect(report.artifacts[0].checks.find((check: any) => check.id === 'artifact.byte-stability').status).toBe('passed');
  expect(report.artifacts[0].checks.find((check: any) => check.id === 'html.inspection-coverage').status).toBe('unavailable');
  expect(report.humanAcceptance.status).toBe('not-run');
});
