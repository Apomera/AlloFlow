import { test, expect, Browser } from '@playwright/test';
import * as fs from 'node:fs';
const { compareRenderedHtml } = require('../../dev-tools/rendered_document_fidelity.cjs');
const { runAcceptance } = require('../../dev-tools/document_export_at_acceptance.cjs');

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);
const entry = 'https://rendered-fidelity.invalid/document';
const doc = (body: string, head = '') => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Reading</title>' + head + '</head><body><main><h1>Reading</h1>' + body + '</main></body></html>';
const svg = (body: string, attributes = '') => '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="220" height="50" ' + attributes + '>' + body + '</svg>';
const link = (attributes: string, head = '') => doc(svg('<a id="p" ' + attributes + '><text x="10" y="25">Read the chapter</text></a>'), head);
const language = (attributes: string, childAttributes = '', head = '') => doc(svg('<text id="p" x="10" y="25" ' + childAttributes + '>Bonjour</text>', attributes), head);
const meta = (language: string) => '<meta http-equiv="content-language" content="' + language + '">';
const metadataDocument = (head: string, attributes = '') => '<!doctype html><html><head>' + head + '</head><body><p id="p" ' + attributes + '>Reading</p></body></html>';
const checkpoint = (property: string) => [{ id: 'p', sourceSelector: '#p', properties: [property] }];

type LinkCase = { id: string, source: string, candidate: string, expected: string, sourceURL?: string, candidateURL?: string };
const linkCases: LinkCase[] = [
  { id: 'SVG absolute destinations differ', source: link('href="https://example.test/source"'), candidate: link('href="https://example.test/changed"'), expected: 'review-required', sourceURL: 'https://example.test/source', candidateURL: 'https://example.test/changed' },
  { id: 'SVG relative xlink destinations differ', source: link('xlink:href="source"'), candidate: link('xlink:href="changed"'), expected: 'review-required', sourceURL: 'https://rendered-fidelity.invalid/source', candidateURL: 'https://rendered-fidelity.invalid/changed' },
  { id: 'SVG href overrides changed xlink fallback', source: link('href="https://example.test/source" xlink:href="first"'), candidate: link('href="https://example.test/source" xlink:href="second"'), expected: 'passed', sourceURL: 'https://example.test/source', candidateURL: 'https://example.test/source' },
  { id: 'removing SVG href activates xlink fallback', source: link('href="https://example.test/source" xlink:href="changed"'), candidate: link('xlink:href="changed"'), expected: 'review-required', sourceURL: 'https://example.test/source', candidateURL: 'https://rendered-fidelity.invalid/changed' },
  { id: 'empty SVG href overrides changed xlink fallback', source: link('href="" xlink:href="first"'), candidate: link('href="" xlink:href="second"'), expected: 'passed', sourceURL: entry, candidateURL: entry },
  { id: 'SVG relative destination changes with authored base', source: link('xlink:href="chapter"', '<base href="https://example.test/first/">'), candidate: link('xlink:href="chapter"', '<base href="https://example.test/second/">'), expected: 'review-required', sourceURL: 'https://example.test/first/chapter', candidateURL: 'https://example.test/second/chapter' },
  { id: 'SVG relative spelling remains part of contract', source: link('href="chapter"'), candidate: link('href="./chapter"'), expected: 'review-required', sourceURL: 'https://rendered-fidelity.invalid/chapter', candidateURL: 'https://rendered-fidelity.invalid/chapter' },
  { id: 'SVG xlink migration preserves relative destination', source: link('xlink:href="chapter"'), candidate: link('href="chapter"'), expected: 'passed', sourceURL: 'https://rendered-fidelity.invalid/chapter', candidateURL: 'https://rendered-fidelity.invalid/chapter' },
  { id: 'SVG class addition preserves destination', source: link('href="https://example.test/source"'), candidate: link('href="https://example.test/source" class="reading"'), expected: 'passed', sourceURL: 'https://example.test/source', candidateURL: 'https://example.test/source' },
  { id: 'SVG invalid URL stays unavailable', source: link('href="https://["'), candidate: link('href="https://["'), expected: 'unavailable' },
  { id: 'SVG absent destination stays unavailable', source: link(''), candidate: link(''), expected: 'unavailable' },
  { id: 'HTML invalid URL stays unavailable', source: doc('<a id="p" href="https://[">Read</a>'), candidate: doc('<a id="p" href="https://[">Read</a>'), expected: 'unavailable' },
  { id: 'HTML invalid URL replacing a valid destination stays unavailable', source: doc('<a id="p" href="https://example.test/source">Read</a>'), candidate: doc('<a id="p" href="https://[">Read</a>'), expected: 'unavailable' },
  { id: 'HTML canonical absolute destinations remain equivalent', source: doc('<a id="p" href="https://EXAMPLE.test/source">Read the chapter</a>'), candidate: doc('<a id="p" href="https://example.test/source">Read the chapter</a>'), expected: 'passed', sourceURL: 'https://example.test/source', candidateURL: 'https://example.test/source' },
];

// Observe a real native click while aborting every request except the fixture.
// This checks browser behavior independently of the production URL projection.
async function nativeDestination(browser: Browser, html: string) {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  try {
    let served = false;
    await context.route('**/*', route => {
      if (!served && route.request().url() === entry && route.request().isNavigationRequest()) {
        served = true;
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
      }
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    await page.goto(entry);
    const request = page.waitForRequest(request => request.isNavigationRequest());
    await page.locator('#p').click({ noWaitAfter: true });
    return (await request).url();
  } finally { await context.close(); }
}

for (const item of linkCases) test(item.id, async ({ browser }, testInfo) => {
  const report = await compareRenderedHtml(browser, item.source, item.candidate, { checkpoints: checkpoint('href') });
  fs.writeFileSync(testInfo.outputPath('comparison.json'), JSON.stringify(report, null, 2));
  expect(report.status).toBe(item.expected);
  const property = report.checks[0].properties[0];
  expect(property.status).toBe(item.expected === 'passed' ? 'passed' : item.expected === 'unavailable' ? 'unavailable' : 'failed');
  for (const side of ['source', 'candidate']) {
    const observed = property[side];
    if (item.expected !== 'unavailable') expect(typeof observed === 'string' || typeof observed?.relative === 'string' && typeof observed?.resolved === 'string').toBe(true);
  }
  if (item.sourceURL) {
    expect(await nativeDestination(browser, item.source)).toBe(item.sourceURL);
    expect(await nativeDestination(browser, item.candidate)).toBe(item.candidateURL);
  }
});

type LanguageCase = { id: string, source: string, candidate: string, sourceLanguage: string, candidateLanguage: string };
const languageCases: LanguageCase[] = [
  { id: 'SVG namespaced language inheritance changes', source: language('xml:lang="fr"'), candidate: language('xml:lang="de"'), sourceLanguage: 'fr', candidateLanguage: 'de' },
  { id: 'SVG xml language overrides changed plain language', source: language('xml:lang="fr" lang="de"'), candidate: language('xml:lang="fr" lang="en"'), sourceLanguage: 'fr', candidateLanguage: 'fr' },
  { id: 'removing empty SVG xml language activates plain language', source: language('xml:lang="" lang="fr"'), candidate: language('lang="fr"'), sourceLanguage: '', candidateLanguage: 'fr' },
  { id: 'child language overrides ancestor xml language', source: language('xml:lang="fr"', 'lang="de"'), candidate: language('xml:lang="en"', 'lang="de"'), sourceLanguage: 'de', candidateLanguage: 'de' },
  { id: 'SVG equivalent language casing passes', source: language('xml:lang="fr-CA"'), candidate: language('xml:lang="FR-ca"'), sourceLanguage: 'fr-ca', candidateLanguage: 'fr-ca' },
  { id: 'HTML equivalent language casing passes', source: doc('<p id="p" lang="en-US">Reading</p>'), candidate: doc('<p id="p" lang="EN-us">Reading</p>'), sourceLanguage: 'en-us', candidateLanguage: 'en-us' },
  { id: 'foreignObject child inherits SVG xml language', source: doc(svg('<foreignObject width="200" height="40"><p id="p">Bonjour</p></foreignObject>', 'xml:lang="fr"')), candidate: doc(svg('<foreignObject width="200" height="40"><p id="p">Bonjour</p></foreignObject>', 'xml:lang="de"')), sourceLanguage: 'fr', candidateLanguage: 'de' },
  { id: 'HTML nonnamespaced xml spelling does not override language', source: doc('<p id="p" xml:lang="fr">Reading</p>'), candidate: doc('<p id="p" xml:lang="de">Reading</p>'), sourceLanguage: 'en', candidateLanguage: 'en' },
  { id: 'empty child language retains unknown reset', source: language('xml:lang="fr"', 'lang=""'), candidate: language('xml:lang="de"', 'lang=""'), sourceLanguage: '', candidateLanguage: '' },
  { id: 'removing empty child language restores inherited language', source: language('xml:lang="fr"', 'lang=""'), candidate: language('xml:lang="fr"'), sourceLanguage: '', candidateLanguage: 'fr' },
  { id: 'metadata language changes without explicit attributes', source: metadataDocument(meta('fr')), candidate: metadataDocument(meta('de')), sourceLanguage: 'fr', candidateLanguage: 'de' },
  { id: 'metadata language casing remains equivalent', source: metadataDocument(meta('fr-CA')), candidate: metadataDocument(meta('FR-ca')), sourceLanguage: 'fr-ca', candidateLanguage: 'fr-ca' },
  { id: 'metadata earlier declaration is overridden by the last applicable declaration', source: metadataDocument(meta('fr') + meta('de')), candidate: metadataDocument(meta('en') + meta('de')), sourceLanguage: 'de', candidateLanguage: 'de' },
  { id: 'metadata last applicable declaration changes the language', source: metadataDocument(meta('fr') + meta('de')), candidate: metadataDocument(meta('fr') + meta('en')), sourceLanguage: 'de', candidateLanguage: 'en' },
  { id: 'metadata absent content does not override an earlier declaration', source: metadataDocument(meta('fr') + '<meta http-equiv="content-language">'), candidate: metadataDocument(meta('fr')), sourceLanguage: 'fr', candidateLanguage: 'fr' },
  { id: 'metadata explicit empty content resets the language', source: metadataDocument(meta('fr') + meta('')), candidate: metadataDocument(meta('fr')), sourceLanguage: '', candidateLanguage: 'fr' },
  { id: 'metadata empty first declaration permits a later language', source: metadataDocument(meta('') + meta('fr')), candidate: metadataDocument(meta('fr')), sourceLanguage: 'fr', candidateLanguage: 'fr' },
  { id: 'metadata comma lists remain literal browser language values', source: metadataDocument(meta('fr,de')), candidate: metadataDocument(meta('de,fr')), sourceLanguage: 'fr,de', candidateLanguage: 'de,fr' },
  { id: 'metadata whitespace is not normalized into another language', source: metadataDocument(meta(' fr ')), candidate: metadataDocument(meta('fr')), sourceLanguage: ' fr ', candidateLanguage: 'fr' },
  { id: 'metadata full language beats a matching prefix candidate', source: metadataDocument(meta('fr') + meta('fr-CA')), candidate: metadataDocument(meta('fr-CA') + meta('fr')), sourceLanguage: 'fr-ca', candidateLanguage: 'fr' },
  { id: 'metadata body declaration supplies the language', source: metadataDocument(meta('fr') + '</head><body>' + meta('de')), candidate: metadataDocument(meta('fr') + '</head><body>' + meta('en')), sourceLanguage: 'de', candidateLanguage: 'en' },
  { id: 'metadata fallback yields to explicit empty lang reset', source: metadataDocument(meta('fr'), 'lang=""'), candidate: metadataDocument(meta('de'), 'lang=""'), sourceLanguage: '', candidateLanguage: '' },
  { id: 'metadata fallback yields to explicit lang', source: metadataDocument(meta('fr'), 'lang="en"'), candidate: metadataDocument(meta('de'), 'lang="en"'), sourceLanguage: 'en', candidateLanguage: 'en' },
  { id: 'metadata foster parenting does not confuse processing order', source: metadataDocument('</head><body><table><tr><td>' + meta('fr') + '</td></tr>' + meta('de') + '</table>'), candidate: metadataDocument(meta('de')), sourceLanguage: 'de', candidateLanguage: 'de' },
  { id: 'SVG class addition preserves inherited language', source: language('xml:lang="fr"'), candidate: language('xml:lang="fr"', 'class="reading"'), sourceLanguage: 'fr', candidateLanguage: 'fr' },
];
async function nativeLanguage(browser: Browser, html: string, expectedLanguage: string) {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  try {
    await context.route('**/*', route => route.abort('blockedbyclient'));
    const page = await context.newPage();
    await page.setContent(html);
    return await page.locator('#p').evaluate((el, expectedLanguage) => Object.fromEntries([...new Set(['en', 'en-US', 'fr', 'fr-CA', 'de', ...(expectedLanguage ? [expectedLanguage] : [])])].map(language => [language.toLowerCase(), el.matches(':lang(' + CSS.escape(language) + ')')])), expectedLanguage);
  } finally { await context.close(); }
}
for (const item of languageCases) test(item.id, async ({ browser }, testInfo) => {
  const report = await compareRenderedHtml(browser, item.source, item.candidate, { checkpoints: checkpoint('language') });
  fs.writeFileSync(testInfo.outputPath('comparison.json'), JSON.stringify(report, null, 2));
  expect(report.status).toBe(item.sourceLanguage === item.candidateLanguage ? 'passed' : 'review-required');
  expect(report.checks[0].properties[0]).toMatchObject({ source: item.sourceLanguage, candidate: item.candidateLanguage });
  for (const [html, language] of [[item.source, item.sourceLanguage], [item.candidate, item.candidateLanguage]]) {
    const native = await nativeLanguage(browser, html, language);
    if (language) expect(native[language]).toBe(true);
    else expect(Object.values(native).every(value => value === false)).toBe(true);
  }
});

const exportCases = [
  { ...linkCases[0], property: 'href' },
  { ...linkCases[8], property: 'href' },
  { ...languageCases[0], property: 'language', expected: 'review-required' },
  { ...languageCases[5], property: 'language', expected: 'passed' },
];
for (const item of exportCases) test('export preserves namespace verdict: ' + item.id, async ({ browser }, testInfo) => {
  const source = testInfo.outputPath('source.html'), candidate = testInfo.outputPath('candidate.html'), manifest = testInfo.outputPath('manifest.json');
  fs.writeFileSync(source, item.source); fs.writeFileSync(candidate, item.candidate);
  fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts: [{ id: 'reading', documentKind: 'reading', kind: 'html', path: candidate,
    expected: { title: 'Reading', language: 'en', headings: [{ level: 1, name: 'Reading' }], tables: [] },
    sourceFidelity: { sourcePath: source, checkpoints: checkpoint(item.property) },
  }] }));
  const report = await runAcceptance(manifest, { browser });
  fs.writeFileSync(testInfo.outputPath('acceptance.json'), JSON.stringify(report, null, 2));
  expect(report.automatedStatus).toBe(item.expected === 'passed' ? 'passed' : 'failed');
  expect(report.artifacts[0].renderedFidelity.status).toBe(item.expected);
  expect(report.artifacts[0].renderedFidelity.candidate.sha256).toBe(report.artifacts[0].sha256);
  expect(report.humanAcceptance.status).toBe('not-run');
});
