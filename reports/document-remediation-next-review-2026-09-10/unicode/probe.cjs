const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../..');
process.chdir(root);
const sha = () => crypto.createHash('sha256').update(fs.readFileSync('doc_pipeline_source.jsx')).digest('hex');
const before = sha();
const dom = new JSDOM('');
global.DOMParser = dom.window.DOMParser;
global.NodeFilter = dom.window.NodeFilter;
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
const cases = [
  { id: 'unit-name-compatibility-fold', expected: 'reject', source: '<label for="area">Area (m²)</label><input id="area">', candidate: '<label for="area">Area (m²)</label><input id="area" aria-label="Area (m2)">' },
  { id: 'unit-description-compatibility-fold', expected: 'reject', source: '<label for="area">Area</label><input id="area" aria-description="Answer in m²">', candidate: '<label for="area">Area</label><input id="area" aria-description="Answer in m2">' },
  { id: 'canonical-name-equivalence-control', expected: 'accept', source: '<label for="area">Café</label><input id="area">', candidate: '<label for="area">Café</label><input id="area" aria-label="Cafe\u0301">' },
  { id: 'unit-name-preserving-control', expected: 'accept', source: '<label for="area">Area (m²)</label><input id="area">', candidate: '<label for="area">Area (m²)</label><input id="area" aria-label="Area (m²)">' },
];
async function native(context, html) {
  const page = await context.newPage();
  try {
    await page.setContent(html);
    const cdp = await context.newCDPSession(page);
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#area' });
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId });
    const textbox = nodes.find(n => n.role?.value === 'textbox');
    return { role: textbox?.role?.value, name: textbox?.name?.value, description: textbox?.description?.value || '', aria: await page.locator('#area').ariaSnapshot() };
  } finally { await page.close(); }
}
(async () => {
  const destination = path.join(__dirname, 'results.json');
  if (fs.existsSync(destination)) throw new Error('Refusing to overwrite existing review evidence');
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    for (const entry of cases) {
      const source = wrap(entry.source), candidate = wrap(entry.candidate), h = make(() => candidate);
      const decision = h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
      const repaired = await h.run(source);
      results.push({ ...entry, source, candidate, decision, pipelineReturnedCandidate: repaired === candidate, pipelineReturnedSource: repaired === source, evidence: h.evidence, mismatch: decision.accepted !== (entry.expected === 'accept'), browser: { source: await native(context, source), candidate: await native(context, candidate) } });
    }
    const record = { measuredAt: new Date().toISOString(), policyVersion: '20260909-6', sourceSha256: before, sourceUnchangedDuringRun: before === sha(), browserVersion: browser.version(), scope: 'Actual strict source gate plus mocked aiFixChunked transport and native Chromium AX names/descriptions. No downstream export or human-screen-reader conclusion.', results };
    fs.writeFileSync(destination, JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify({ destination, sourceUnchangedDuringRun: record.sourceUnchangedDuringRun, cases: results.map(r => ({ id: r.id, expected: r.expected, accepted: r.decision.accepted, pipelineReturnedCandidate: r.pipelineReturnedCandidate, browser: r.browser })) }, null, 2));
    await context.close();
  } finally { await browser.close(); dom.window.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
