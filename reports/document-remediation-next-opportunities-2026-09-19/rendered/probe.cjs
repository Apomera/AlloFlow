'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../..');
const { compareRenderedHtml } = require(path.join(root, 'dev-tools/rendered_document_fidelity.cjs'));
const { runAcceptance } = require(path.join(root, 'dev-tools/document_export_at_acceptance.cjs'));
const inputPaths = ['dev-tools/rendered_document_fidelity.cjs', 'dev-tools/document_export_at_acceptance.cjs', 'dev-tools/document_html_dependencies.cjs'];
const hashes = () => Object.fromEntries(inputPaths.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const doc = body => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Reading</title></head><body><main><h1>Reading</h1>' + body + '</main></body></html>';
const svgLink = (attr = 'href', target = 'https://example.test/source') => doc('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="220" height="50"><a id="p" ' + attr + '="' + target + '"><text x="10" y="25">Read the chapter</text></a></svg>');
const svgLanguage = language => doc('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="50" xml:lang="' + language + '"><text id="p" x="10" y="25">Bonjour</text></svg>');
const cases = [
  { id: 'svg-absolute-link-change', source: svgLink(), candidate: svgLink('href', 'https://example.test/changed'), properties: ['href', 'text', 'name', 'role'], intended: 'review-required', navigation: true, acceptance: true },
  { id: 'svg-link-harmless-class', source: svgLink(), candidate: svgLink().replace('id="p"', 'id="p" class="reading"'), properties: ['href', 'text', 'name', 'role'], intended: 'passed', navigation: true },
  { id: 'svg-xlink-relative-change', source: svgLink('xlink:href', 'source'), candidate: svgLink('xlink:href', 'changed'), properties: ['href', 'text', 'name', 'role'], intended: 'review-required', navigation: true },
  { id: 'svg-xml-language-change', source: svgLanguage('fr'), candidate: svgLanguage('de'), properties: ['language', 'text', 'name', 'role'], intended: 'review-required', acceptance: true },
  { id: 'svg-xml-language-harmless-class', source: svgLanguage('fr'), candidate: svgLanguage('fr').replace('id="p"', 'id="p" class="reading"'), properties: ['language', 'text', 'name', 'role'], intended: 'passed' },
  { id: 'html-language-equivalent-case', source: doc('<p id="p" lang="en-US">Read the chapter</p>'), candidate: doc('<p id="p" lang="EN-us">Read the chapter</p>'), properties: ['language', 'text', 'name', 'role'], intended: 'passed' },
];
async function nativeFacts(browser, html, navigation) {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  const entry = 'https://rendered-fidelity.invalid/document';
  let served = false;
  const requests = [];
  let confirmBlocked;
  const blocked = new Promise(resolve => { confirmBlocked = resolve; });
  await context.route('**/*', route => {
    if (!served && route.request().url() === entry && route.request().isNavigationRequest()) { served = true; return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }); }
    return route.abort('blockedbyclient').then(() => { requests.push(route.request().url()); confirmBlocked(); });
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.goto(entry);
    const facts = await page.locator('#p').evaluate(el => ({
      namespace: el.namespaceURI, hrefType: el.href?.constructor?.name || null,
      hrefBaseVal: el.href?.baseVal ?? null, xmlLanguage: (() => { for (let node = el; node; node = node.parentElement) { const lang = node.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'lang'); if (lang !== null) return lang; } return null; })(),
      inheritedHtmlLang: el.closest('[lang]')?.getAttribute('lang') ?? null,
      languageMatches: Object.fromEntries(['fr', 'de', 'en', 'en-US'].map(lang => [lang, el.matches(':lang(' + lang + ')')])),
    }));
    if (navigation) {
      const request = page.waitForRequest(r => r.isNavigationRequest() && r.url() !== entry);
      await page.locator('#p text').click({ noWaitAfter: true });
      facts.nativeNavigationTarget = (await request).url();
      await blocked;
    }
    facts.blockedRequests = requests;
    return facts;
  } finally { await context.close(); }
}
(async () => {
  const startHashes = hashes(), browser = await chromium.launch({ headless: true });
  const results = [], browserVersion = browser.version();
  try {
    for (const item of cases) {
      const sourcePath = path.join(__dirname, item.id + '.source.html');
      const candidatePath = path.join(__dirname, item.id + '.candidate.html');
      fs.writeFileSync(sourcePath, item.source); fs.writeFileSync(candidatePath, item.candidate);
      const checkpoints = [{ id: 'p', sourceSelector: '#p', properties: item.properties }];
      const report = await compareRenderedHtml(browser, item.source, item.candidate, { checkpoints });
      const nativeSource = await nativeFacts(browser, item.source, item.navigation);
      const nativeCandidate = await nativeFacts(browser, item.candidate, item.navigation);
      const result = { ...item, report, nativeSource, nativeCandidate };
      if (item.acceptance) {
        const manifest = path.join(__dirname, item.id + '.manifest.json');
        fs.writeFileSync(manifest, JSON.stringify({ schema: 1, artifacts: [{ id: item.id, documentKind: 'reading', kind: 'html', path: candidatePath, expected: { title: 'Reading', language: 'en', headings: [{ level: 1, name: 'Reading' }], tables: [] }, sourceFidelity: { sourcePath, checkpoints } }] }, null, 2));
        result.acceptance = await runAcceptance(manifest, { browser });
      }
      results.push(result);
      fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({ complete: false, startHashes, results }, null, 2));
      console.log(JSON.stringify({ id: item.id, intended: item.intended, actual: report.status, nativeSource, nativeCandidate, acceptance: result.acceptance?.automatedStatus }));
    }
  } finally { await browser.close(); }
  assert.equal(results.length, 6);
  assert.deepEqual(results.map(result => result.report.status), ['passed', 'passed', 'passed', 'passed', 'passed', 'review-required']);
  for (const index of [0, 2]) assert.notEqual(results[index].nativeSource.nativeNavigationTarget, results[index].nativeCandidate.nativeNavigationTarget);
  assert.equal(results[1].nativeSource.nativeNavigationTarget, results[1].nativeCandidate.nativeNavigationTarget);
  assert.equal(results[0].acceptance.automatedStatus, 'passed');
  assert.equal(results[3].acceptance.automatedStatus, 'passed');
  assert.equal(results[3].nativeSource.languageMatches.fr, true);
  assert.equal(results[3].nativeCandidate.languageMatches.de, true);
  assert.deepEqual(results[4].nativeSource.languageMatches, results[4].nativeCandidate.languageMatches);
  assert.deepEqual(results[5].nativeSource.languageMatches, results[5].nativeCandidate.languageMatches);
  const finalHashes = hashes();
  assert.deepEqual(startHashes, finalHashes);
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({ complete: true, browserVersion, nodeVersion: process.version, playwrightVersion: require('playwright/package.json').version, startHashes, finalHashes, inputsUnchanged: JSON.stringify(startHashes) === JSON.stringify(finalHashes), cases: results.length, results }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
