import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
const { inspectHtml, inspectPdf } = require('../../dev-tools/document_export_at_acceptance.cjs');
const html = (body: string, head = '') => '<!doctype html><html lang="en"><head><title>Export review</title>' + head + '</head><body><main>' + body + '</main></body></html>';
const base = { title: 'Export review', language: 'en', headings: [], readingOrder: [], tables: [] };
const table = (attributes = '', value = 'Caf\u00e9', columnAttributes = '', rowAttributes = '') => '<table ' + attributes + '><caption>Field study</caption><tr><th scope="col" ' + columnAttributes + '>Area</th><th scope="col">Score</th></tr><tr><th scope="row" ' + rowAttributes + '>' + value + '</th><td>x²</td></tr></table>';
const tableContract = (value = 'Caf\u00e9') => ({ ...base, tables: [{ caption: 'Field study', headers: ['Area', 'Score'], rows: [[value, 'x²']], rowHeaders: true }] });
const status = (report: any, id: string) => report.checks.find((check: any) => check.id === id)?.status;
const allPassed = (report: any) => report.checks.every((check: any) => check.status === 'passed');
const inspect = (browser: any, body: string, expected: any = base, head = '') => inspectHtml(browser, 'unused.html', expected, Buffer.from(html(body, head)));

test('native exposed tables and headers remain accepted', async ({ browser }, testInfo) => {
  const report = await inspect(browser, table(), tableContract());
  expect(allPassed(report)).toBe(true);
  expect(report.checks.find((check: any) => check.id === 'html.table-1').observed.exposure).toEqual({ table: true, columnHeaders: [true, true], rowHeaders: [true] });
  fs.writeFileSync(testInfo.outputPath('table-control.json'), JSON.stringify(report, null, 2));
});

for (const [name, body] of [
  ['presentational table', table('role="presentation"')],
  ['ARIA-hidden table', table('aria-hidden="true"')],
  ['ARIA-hidden ancestor', '<div aria-hidden="true">' + table() + '</div>'],
  ['downgraded column header', table('', 'Caf\u00e9', 'role="cell"')],
  ['ARIA-hidden column header', table('', 'Caf\u00e9', 'aria-hidden="true"')],
  ['ARIA-hidden row header', table('', 'Caf\u00e9', '', 'aria-hidden="true"')],
  ['unrelated exposed header', table('', 'Caf\u00e9', 'role="cell"') + '<div role="columnheader">Area</div>'],
]) {
  test(name + ' fails the selected table exposure contract', async ({ browser }, testInfo) => {
    const report = await inspect(browser, body, tableContract());
    expect(status(report, 'html.table-1')).toBe('failed');
    expect(report.coverage.complete).toBe(true);
    fs.writeFileSync(testInfo.outputPath('table-exposure.json'), JSON.stringify(report, null, 2));
  });
}

for (const [actual, expected] of [['Cafe\u0301', 'Cafe\u0301'], ['Cafe\u0301', 'Caf\u00e9'], ['Caf\u00e9', 'Cafe\u0301']]) {
  test('HTML table canonical equivalents pass ' + actual.length + '-' + expected.length, async ({ browser }) => {
    const report = await inspect(browser, table('', actual), tableContract(expected));
    expect(allPassed(report)).toBe(true);
  });
}

test('HTML table normalization retains accents and superscript meaning', async ({ browser }) => {
  for (const [actual, expected] of [['Cafe', 'Caf\u00e9'], ['x2', 'x²']]) {
    const report = await inspect(browser, table('', actual), tableContract(expected));
    expect(status(report, 'html.table-1')).toBe('failed');
  }
});

test('tagged PDF table contracts normalize both sides without compatibility folding', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  try {
    await context.route('**/*', (route: any) => route.abort());
    const page = await context.newPage();
    await page.setContent(html(table()));
    const file = testInfo.outputPath('canonical-table.pdf');
    await page.pdf({ path: file, tagged: true });
    const report = await inspectPdf(file, tableContract('Cafe\u0301'));
    expect(allPassed(report)).toBe(true);
    fs.writeFileSync(testInfo.outputPath('pdf-canonical-table.json'), JSON.stringify(report, null, 2));
    for (const changed of ['Cafe', 'x2']) {
      const expected = tableContract('Cafe\u0301');
      expected.tables[0].rows[0][changed === 'Cafe' ? 0 : 1] = changed;
      const altered = await inspectPdf(file, expected);
      expect(status(altered, 'pdf.table-1')).toBe('failed');
    }
  } finally { await context.close(); }
});

for (const [name, body, head, active] of [
  ['relative background', '<div style="height:40px;background-image:url(required-chart.png)"></div>', '', true],
  ['hidden background', '<div style="display:none;background-image:url(required-chart.png)"></div>', '', false],
  ['inactive media rule', '<p>Read this.</p>', '<style>@media (min-width:9000px) { p { background:url(required-chart.png); } }</style>', false],
  ['relative import', '<p>Read this.</p>', '<style>@import "required-chart.css";</style>', true],
  ['unused font', '<p>Read this.</p>', '<style>@font-face { font-family:Unused; src:url(required.woff2); }</style>', false],
  ['pseudo-element image', '<p>Read this.</p>', '<style>p::before { content:url(required-chart.png); }</style>', true],
  ['hidden image-set strings', '<div style="display:none;background-image:image-set(\'required-chart.png\' 1x, \'other-chart.png\' 2x)"></div>', '', false],
]) {
  test(name + ' remains an unresolved CSS dependency', async ({ browser }, testInfo) => {
    const report = await inspect(browser, body as string, base, head as string);
    expect(report.coverage.complete).toBe(false);
    expect(report.coverage.reasons).toContain('unresolved-resource-references');
    expect(report.resources.unresolved).toBeGreaterThan(0);
    if (active) expect(report.resources.blocked).toBeGreaterThan(0);
    fs.writeFileSync(testInfo.outputPath('css-dependency.json'), JSON.stringify(report, null, 2));
  });
}

test('embedded CSS images, local filters, and literal URL text remain self-contained', async ({ browser }) => {
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfZkAAAAASUVORK5CYII=';
  const report = await inspect(browser, '<p>Read this.</p><svg><filter id="local"><feGaussianBlur stdDeviation="0"/></filter></svg>', base,
    '<style>/* url(required.png) */ p { background-image:url("' + pixel + '"); filter:url(#local); } p::before { content:\'url(required.png) image-set(ignored.png)\'; }</style>');
  expect(allPassed(report)).toBe(true);
  expect(report.resources).toMatchObject({ blocked: 0, unresolved: 0 });
});

for (const attributes of ['type="application/xml"', 'type="text/xml"', 'type="application/example+xml"', 'type="text/template"', 'type="text/javascript; charset=utf-8"', 'language="unrecognized"']) {
  test('native inert script data stays supported: ' + attributes, async ({ browser }) => {
    const markup = html('<p>Read this.</p><script ' + attributes + '>window.__dataExecuted = true;</script>');
    const report = await inspectHtml(browser, 'unused.html', base, Buffer.from(markup));
    expect(allPassed(report)).toBe(true);
    expect(report.resources.scripts).toBe(0);
    const context = await browser.newContext({ javaScriptEnabled: true, serviceWorkers: 'block' });
    try {
      await context.route('**/*', (route: any) => route.abort());
      const page = await context.newPage();
      await page.setContent(markup);
      expect(await page.evaluate(() => (window as any).__dataExecuted)).toBeUndefined();
    } finally { await context.close(); }
  });
}

for (const attributes of ['', 'type=""', 'type="text/javascript"', 'type="application/ecmascript"', 'language="javascript"', 'type="module"', 'type="MODULE"', 'type="importmap"', 'type="IMPORTMAP"', 'type="speculationrules"']) {
  test('executable or document behavior script remains unavailable: ' + (attributes || 'default'), async ({ browser }) => {
    const report = await inspect(browser, '<p>Read this.</p><script ' + attributes + '>{}</script>');
    expect(report.coverage.reasons).toContain('script-dependent-content');
    expect(report.resources.scripts).toBe(1);
  });
}
