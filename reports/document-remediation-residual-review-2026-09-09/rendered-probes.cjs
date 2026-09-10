'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const { compareRenderedHtml } = require(path.join(root, 'dev-tools/rendered_document_fidelity.cjs'));
const { inspectHtml } = require(path.join(root, 'dev-tools/document_export_at_acceptance.cjs'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const implementations = ['doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'desktop/web-app/public/doc_pipeline_module.js', 'dev-tools/rendered_document_fidelity.cjs', 'dev-tools/document_export_at_acceptance.cjs'];
const hashes = Object.fromEntries(implementations.map(file => [file, hash(file)]));
const doc = body => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Residual probe</title></head><body>' + body + '</body></html>';
const duplicate = '<main id="p"><p>Do <span>not</span> open the valve.</p><p hidden>Do not open the valve.</p></main>';
const ordinary = '<main id="p"><p>Do <span>not</span> open the valve.</p></main>';
const data = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%222%22%20height=%222%22%3E%3Crect%20width=%222%22%20height=%222%22/%3E%3C/svg%3E';
const base = '<main><p id="p">Read the original instructions.</p>';
const cases = [
  { id: 'duplicate-instruction-masks-original-negation-loss', source: duplicate, candidate: duplicate.replace('<span>', '<span hidden>').replace('<p hidden>', '<p>'), expected: 'review-required' },
  { id: 'negation-loss-without-duplicate-control', source: ordinary, candidate: ordinary.replace('<span>', '<span hidden>'), expected: 'review-required' },
  { id: 'revealing-duplicate-without-source-loss-control', source: duplicate, candidate: duplicate.replace('<p hidden>', '<p>'), expected: 'passed' },
  { id: 'inert-xml-dependency-parity', source: base + '<script type="application/xml">window.__probeExecuted = true;</script></main>', expected: 'passed', baseline: true },
  { id: 'embedded-srcset-dependency-parity', source: base + '<img alt="" src="' + data + '" srcset="' + data + ' 1x, ' + data + ' 2x"></main>', expected: 'passed', baseline: true },
  { id: 'executable-script-control', source: base + '<script>window.__probeExecuted = true;</script></main>', expected: 'unavailable', baseline: true },
];
async function native(browser, html) {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  try {
    await context.route('**/*', route => route.abort());
    const page = await context.newPage(); await page.setContent(html);
    return { aria: await page.locator('#p').ariaSnapshot(), state: await page.evaluate(() => ({
      domText: document.querySelector('#p').textContent, renderedText: document.querySelector('#p').innerText,
      images: Array.from(document.images).map(image => ({ complete: image.complete, width: image.naturalWidth })),
    })) };
  } finally { await context.close(); }
}
(async () => {
  const output = path.join(__dirname, 'rendered-results.json');
  if (fs.existsSync(output)) throw Error('Preserve existing review evidence');
  const browser = await require('playwright').chromium.launch({ headless: true });
  const results = [];
  try {
    for (const fixture of cases) {
      const source = doc(fixture.source), candidate = doc(fixture.candidate || fixture.source);
      const report = await compareRenderedHtml(browser, source, candidate, { checkpoints: [{ id: 'p', sourceSelector: '#p', properties: ['text', 'visible', 'exposed'] }] });
      const result = { id: fixture.id, source, candidate, expected: fixture.expected, actual: report.status,
        mismatch: fixture.expected !== report.status, report, native: { source: await native(browser, source), candidate: await native(browser, candidate) } };
      if (fixture.baseline) {
        result.baseline = await inspectHtml(browser, 'synthetic.html', { title: 'Residual probe', language: 'en', headings: [], tables: [], readingOrder: ['Read the original instructions.'] }, Buffer.from(source));
        result.baselineAllPassed = result.baseline.checks.every(check => check.status === 'passed');
      }
      results.push(result);
      console.log(JSON.stringify({ id: fixture.id, expected: fixture.expected, actual: report.status, mismatch: result.mismatch, coverage: report.coverage, baselineAllPassed: result.baselineAllPassed, native: result.native }));
    }
  } finally { await browser.close(); }
  fs.writeFileSync(output, JSON.stringify({ reviewedAt: new Date().toISOString(), implementationHashes: hashes,
    implementationsUnchanged: implementations.every(file => hashes[file] === hash(file)), browserVersion: browser.version(), results }, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
