import { test, expect } from '@playwright/test';
const { inspectHtml } = require('../../dev-tools/document_export_at_acceptance.cjs');
const { compareRenderedHtml } = require('../../dev-tools/rendered_document_fidelity.cjs');

test.describe.configure({ mode: 'serial' });
const image = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%222%22%20height=%222%22/%3E';
const documentHtml = (body: string, head = '') => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Dependency parity</title>' + head + '</head><body><main><p id="instruction">Read the original instructions.</p>' + body + '</main></body></html>';
const expected = { title: 'Dependency parity', language: 'en', headings: [], tables: [], readingOrder: ['Read the original instructions.'] };
const cases = [
  { id: 'plain document', body: '', complete: true },
  { id: 'inert XML data', body: '<script type="application/xml">window.changed = true;</script>', complete: true },
  { id: 'inert JSON data', body: '<script type="application/ld+json">{"name":"A document"}</script>', complete: true },
  { id: 'inert XML external src is not loaded', body: '<script type="application/xml" src="ignored.xml"></script>', complete: true },
  { id: 'embedded image', body: '<img alt="" src="' + image + '">', complete: true },
  { id: 'embedded responsive image', body: '<img alt="" src="' + image + '" srcset="' + image + ' 1x, ' + image + ' 2x">', complete: true },
  { id: 'embedded picture source', body: '<picture><source srcset="' + image + ' 1x"><img alt="" src="' + image + '"></picture>', complete: true },
  { id: 'local SVG use', body: '<svg aria-hidden="true"><defs><circle id="dot" r="2"/></defs><use href="#dot"/></svg>', complete: true },
  { id: 'literal CSS url text', body: '', head: '<style>#instruction::after { content: "url(example.png)"; }</style>', complete: true },
  { id: 'classic executable script', body: '<script>window.changed = true;</script>', complete: false },
  { id: 'uppercase module script', body: '<script type="MODULE">window.changed = true;</script>', complete: false },
  { id: 'inline event handler', body: '<button onclick="window.changed = true">Continue</button>', complete: false },
  { id: 'script form action', body: '<button formaction="java&#x9;script:alert(1)">Continue</button>', complete: false },
  { id: 'external responsive candidate', body: '<img alt="" src="' + image + '" srcset="' + image + ' 1x, unavailable.png 2x">', complete: false },
  { id: 'relative CSS background', body: '<div style="width:20px;height:20px;background-image:url(chart.png)"></div>', complete: false },
  { id: 'inactive relative CSS dependency', body: '', head: '<style>@media (min-width:9000px) { #instruction { background-image:url(chart.png); } }</style>', complete: false },
];

for (const fixture of cases) test('export and rendered dependency policy agree: ' + fixture.id, async ({ browser }) => {
  const html = documentHtml(fixture.body, fixture.head);
  const baseline = await inspectHtml(browser, 'synthetic.html', expected, Buffer.from(html));
  const rendered = await compareRenderedHtml(browser, html, html, { checkpoints: [{ id: 'instruction', sourceSelector: '#instruction', properties: ['role', 'exposed'] }] });
  expect(baseline.coverage.complete).toBe(fixture.complete);
  expect(baseline.checks.every((check: any) => check.status === 'passed')).toBe(fixture.complete);
  expect(rendered.coverage.complete).toBe(fixture.complete);
  expect(rendered.status).toBe(fixture.complete ? 'passed' : 'unavailable');
  for (const side of ['source', 'candidate']) {
    for (const kind of ['scripts', 'unresolved', 'animations']) expect(rendered.resources[side][kind]).toBe(baseline.resources[kind]);
  }
});
