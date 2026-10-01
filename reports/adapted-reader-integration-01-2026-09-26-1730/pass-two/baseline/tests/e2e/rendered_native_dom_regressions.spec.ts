import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
const { compareRenderedHtml } = require('../../dev-tools/rendered_document_fidelity.cjs');
const { runAcceptance } = require('../../dev-tools/document_export_at_acceptance.cjs');

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);
const documentHtml = (body: string, head = '') => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Reading</title>' + head + '</head><body><main><h1>Reading</h1>' + body + '</main></body></html>';
const form = (name: string, attributes = '', text = 'Required instruction') => documentHtml('<form id="p" ' + attributes + '><p>' + text + '</p><input name="' + name + '" value="original"></form>');
const checkpoint = (properties: string[]) => [{ id: 'native-contract', sourceSelector: '#p', properties }];
const compare = (browser: any, source: string, candidate: string, properties: string[]) => compareRenderedHtml(browser, source, candidate, { checkpoints: checkpoint(properties) });

for (const properties of [['text'], ['text', 'visible'], ['text', 'exposed']]) {
  for (const changed of [false, true]) test('native form text survives named property: ' + properties.join('+') + (changed ? ' changed' : ' preserved'), async ({ browser }) => {
    const source = form('textContent'), candidate = changed ? source.replace('Required instruction', 'Changed instruction') : source.replace('<form ', '<form class="reading" ');
    const page = await browser.newPage();
    try {
      await page.setContent(source);
      const native = await page.locator('#p').evaluate(el => ({ shadowed: String(el.textContent), text: Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')!.get!.call(el) }));
      expect(native.shadowed).toBe('[object HTMLInputElement]'); expect(native.text).toBe('Required instruction');
    } finally { await page.close(); }
    const report = await compare(browser, source, candidate, properties);
    expect(report.status).toBe(changed ? 'review-required' : 'passed');
    expect(report.checks[0].properties[0].source).toBe('Required instruction');
  });
}

for (const attribute of ['name', 'id']) {
  for (const changed of [false, true]) test('native formData survives ' + attribute + '=tagName: ' + changed, async ({ browser }) => {
    const source = documentHtml('<form id="p"><input ' + (attribute === 'name' ? 'name="tagName"' : 'name="answer" id="tagName"') + ' value="original"></form>');
    const page = await browser.newPage();
    try {
      await page.setContent(source);
      expect(await page.locator('#p').evaluate(el => (el as any).tagName instanceof HTMLInputElement)).toBe(true);
    } finally { await page.close(); }
    const candidate = changed ? source.replace('value="original"', 'value="changed"') : source.replace('<form ', '<form class="reading" ');
    const report = await compare(browser, source, candidate, ['formData']);
    expect(report.status).toBe(changed ? 'review-required' : 'passed');
    expect(report.checks[0].properties[0].source[0][1]).toBe('original');
  });
}

for (const name of ['getAttribute', 'getAttributeNS', 'parentElement', 'matches']) test('language uses native DOM with form control ' + name, async ({ browser }) => {
  const source = form(name);
  const preserved = await compare(browser, source, source.replace('<form ', '<form class="reading" '), ['language']);
  expect(preserved.status).toBe('passed'); expect(preserved.checks[0].properties[0].source).toBe('en');
  const changed = await compare(browser, source, source.replace('<html lang="en">', '<html lang="fr">'), ['language']);
  expect(changed.status).toBe('review-required');
});

test('metadata language matching cannot be shadowed on forms', async ({ browser }) => {
  const source = form('matches').replace('<html lang="en">', '<html>').replace('</head>', '<meta http-equiv="content-language" content="fr"></head>');
  expect((await compare(browser, source, source, ['language'])).status).toBe('passed');
  expect((await compare(browser, source, source.replace('content="fr"', 'content="de"'), ['language'])).status).toBe('review-required');
});

for (const name of ['querySelectorAll', 'checkVisibility', 'childNodes', 'parentNode', 'nodeType']) test('display contents and text traversal use native DOM with ' + name, async ({ browser }) => {
  const source = form(name, 'style="display:contents"');
  expect((await compare(browser, source, source, ['text', 'visible', 'exposed'])).status).toBe('passed');
  const candidate = source.replace('<p>', '<p style="display:none">');
  expect((await compare(browser, source, candidate, ['text', 'visible', 'exposed'])).status).toBe('review-required');
});

for (const property of ['value', 'checked']) test('named form control cannot manufacture an applicable ' + property + ' checkpoint', async ({ browser }) => {
  const report = await compare(browser, form(property), form(property), [property]);
  expect(report.status).toBe('unavailable'); expect(report.checks[0].properties[0].source).toBe(null);
});

for (const name of ['attributes', 'style']) test('named ' + name + ' cannot hide script or CSS dependencies', async ({ browser }) => {
  const source = form(name);
  expect((await compare(browser, source, source, ['text'])).status).toBe('passed');
  const scripted = source.replace('<form ', '<form onsubmit="return false" ');
  const scriptReport = await compare(browser, scripted, scripted, ['text']);
  expect(scriptReport.status).toBe('unavailable'); expect(scriptReport.resources.source.scripts).toBe(1);
  const dependent = source.replace('<form ', '<form style="display:none;background-image:url(https://unavailable.invalid/asset.png)" ');
  const resourceReport = await compare(browser, dependent, dependent, ['text']);
  expect(resourceReport.status).toBe('unavailable'); expect(resourceReport.resources.source.unresolved).toBe(1);
});

const svgLink = (attributes: string, text = 'Required explanation', id = 'destination', head = '') => documentHtml('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a id="p" ' + attributes + '><text x="10" y="25">Read</text></a></svg><p id="' + id + '">' + text + '</p>', head);
const targetCases = [
  { id: 'SVG same target preserved', source: svgLink('href="#destination"'), candidate: svgLink('href="#destination" class="reading"'), expected: 'passed' },
  { id: 'SVG target text changes', source: svgLink('href="#destination"'), candidate: svgLink('href="#destination"', 'Changed explanation'), expected: 'review-required' },
  { id: 'SVG xlink target text changes', source: svgLink('xlink:href="#destination"'), candidate: svgLink('xlink:href="#destination"', 'Changed explanation'), expected: 'review-required' },
  { id: 'SVG xlink migration preserves target', source: svgLink('xlink:href="#destination"'), candidate: svgLink('href="#destination"'), expected: 'passed' },
  { id: 'SVG encoded fragment text changes', source: svgLink('href="#caf%C3%A9"', 'Required explanation', 'café'), candidate: svgLink('href="#caf%C3%A9"', 'Changed explanation', 'café'), expected: 'review-required' },
  { id: 'SVG href ignores external xlink fallback', source: svgLink('href="#destination" xlink:href="https://other.invalid/#destination"'), candidate: svgLink('href="#destination"'), expected: 'passed' },
  { id: 'SVG external URL cannot borrow local target', source: svgLink('href="#destination"'), candidate: svgLink('href="https://other.invalid/#destination"'), expected: 'unavailable' },
  { id: 'SVG external base cannot borrow local target', source: svgLink('href="#destination"'), candidate: svgLink('href="#destination"', 'Required explanation', 'destination', '<base href="https://other.invalid/">'), expected: 'unavailable' },
  { id: 'SVG empty href overrides fragment fallback', source: svgLink('xlink:href="#destination"'), candidate: svgLink('href="" xlink:href="#destination"'), expected: 'unavailable' },
  { id: 'SVG absent target stays unavailable', source: svgLink('href="#missing"'), candidate: svgLink('href="#missing"'), expected: 'unavailable' },
  { id: 'SVG malformed fragment stays unavailable', source: svgLink('href="#%FF"'), candidate: svgLink('href="#%FF"'), expected: 'unavailable' },
];
for (const item of targetCases) test('native targetText: ' + item.id, async ({ browser }, testInfo) => {
  const report = await compare(browser, item.source, item.candidate, ['targetText']);
  fs.writeFileSync(testInfo.outputPath('rendered-fidelity.json'), JSON.stringify(report, null, 2));
  expect(report.status).toBe(item.expected);
  if (item.expected !== 'unavailable') expect(report.checks[0].properties[0].source).toBe('Required explanation');
});

test('SVG target evidence matches native fragment navigation', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  const entry = 'https://rendered-fidelity.invalid/document';
  let requests = 0;
  await context.route('**/*', route => {
    requests++;
    return route.request().url() === entry ? route.fulfill({ contentType: 'text/html; charset=utf-8', body: svgLink('xlink:href="#caf%C3%A9"', 'Required explanation', 'café') }) : route.abort();
  });
  try {
    const page = await context.newPage(); await page.goto(entry); await page.locator('#p').click();
    expect(await page.evaluate(() => location.hash)).toBe('#caf%C3%A9');
    expect(await page.locator(':target').textContent()).toBe('Required explanation');
    expect(requests).toBe(1);
  } finally { await context.close(); }
});

test('targetText reads native text when fragment target is a form', async ({ browser }) => {
  const source = form('textContent').replace('<form id="p"', '<a id="p" href="#target">Read</a><form id="target"');
  const report = await compare(browser, source, source.replace('Required instruction', 'Changed instruction'), ['targetText']);
  expect(report.status).toBe('review-required'); expect(report.checks[0].properties[0].source).toBe('Required instruction');
});

const exportCases = [
  { id: 'clobbered text change', source: form('textContent'), candidate: form('textContent', '', 'Changed instruction'), property: 'text', expected: 'review-required' },
  { id: 'clobbered text preserved', source: form('textContent'), candidate: form('textContent', 'class="reading"'), property: 'text', expected: 'passed' },
  { id: 'clobbered script dependency', source: form('attributes', 'onsubmit="return false"'), candidate: form('attributes', 'onsubmit="return false"'), property: 'text', expected: 'unavailable' },
  { ...targetCases[1], property: 'targetText' },
  { ...targetCases[0], property: 'targetText' },
];
for (const item of exportCases) test('export retains native evidence: ' + item.id, async ({ browser }, testInfo) => {
  const source = testInfo.outputPath('source.html'), candidate = testInfo.outputPath('candidate.html'), manifest = testInfo.outputPath('manifest.json');
  fs.writeFileSync(source, item.source); fs.writeFileSync(candidate, item.candidate);
  fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts: [{ id: 'reading', documentKind: 'reading', kind: 'html', path: candidate,
    expected: { title: 'Reading', language: 'en', headings: [{ level: 1, name: 'Reading' }], tables: [] },
    sourceFidelity: { sourcePath: source, checkpoints: checkpoint([item.property]) },
  }] }));
  const report = await runAcceptance(manifest, { browser });
  fs.writeFileSync(testInfo.outputPath('acceptance.json'), JSON.stringify(report, null, 2));
  expect(report.automatedStatus).toBe(item.expected === 'passed' ? 'passed' : 'failed');
  expect(report.artifacts[0].renderedFidelity.status).toBe(item.expected);
  expect(report.humanAcceptance.status).toBe('not-run');
});
