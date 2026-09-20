const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
const { chromium } = require('playwright');
process.chdir(path.resolve(__dirname, '../..'));
const hash = () => crypto.createHash('sha256').update(fs.readFileSync('doc_pipeline_source.jsx')).digest('hex');
const before = hash();
const dom = new JSDOM('');
global.DOMParser = dom.window.DOMParser; global.NodeFilter = dom.window.NodeFilter;
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
const form = '<form><label for="answer">Required response</label><input id="answer" required><button type="submit">Submit response</button></form>';
const slider = '<label for="temperature">Temperature</label><input id="temperature" type="range" min="0" max="100" value="50" aria-valuetext="Warm">';
const cases = [
  { id: 'form-validation-disabled', expected: 'reject', body: form, change: s => s.replace('<form>', '<form novalidate>') },
  { id: 'submit-validation-disabled', expected: 'reject', body: form, change: s => s.replace('<button ', '<button formnovalidate ') },
  { id: 'slider-spoken-value-changed', expected: 'reject', body: slider, change: s => s.replace('aria-valuetext="Warm"', 'aria-valuetext="Cold"') },
  { id: 'form-wrapper-control', expected: 'accept', body: form, change: s => s.replace('<form>', '<div><form>').replace('</form>', '</form></div>') },
  { id: 'unchanged-validation-bypass-control', expected: 'accept', body: form.replace('<form>', '<form novalidate>'), change: s => s.replace('<form ', '<div><form ').replace('</form>', '</form></div>') },
  { id: 'slider-wrapper-control', expected: 'accept', body: slider, change: s => s.replace('<input ', '<span><input ').replace('aria-valuetext="Warm">', 'aria-valuetext="Warm"></span>') },
];
async function observe(context, html) {
  const page = await context.newPage();
  try {
    await page.setContent(html);
    const behavior = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      let submissions = 0;
      form.addEventListener('submit', event => { event.preventDefault(); submissions++; });
      const valid = form.checkValidity();
      form.requestSubmit(form.querySelector('button'));
      return { valid, submissions, noValidate: form.noValidate, submitterNoValidate: form.querySelector('button').formNoValidate };
    });
    const session = await context.newCDPSession(page);
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    const sliders = nodes.filter(n => n.role?.value === 'slider').map(n => ({ name: n.name, value: n.value, properties: n.properties }));
    await session.detach();
    return { behavior, sliders, aria: await page.locator('main').ariaSnapshot() };
  } finally { await page.close(); }
}
(async () => {
  const output = path.join(__dirname, 'results.json');
  if (fs.existsSync(output)) throw new Error('Refusing to overwrite review evidence');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ javaScriptEnabled: true, serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    const results = [];
    for (const entry of cases) {
      const source = wrap(entry.body), candidate = entry.change(source), h = make(entry.change);
      const decision = h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
      const repaired = await h.run(source);
      results.push({ id: entry.id, expected: entry.expected, source, candidate, decision, pipelineReturnedCandidate: repaired === candidate, pipelineReturnedSource: repaired === source, evidence: h.evidence, native: { source: await observe(context, source), candidate: await observe(context, candidate) } });
    }
    const record = { measuredAt: new Date().toISOString(), policy: fs.readFileSync('doc_pipeline_source.jsx', 'utf8').match(/const _PIPELINE_PROMPT_VERSION = '([^']+)'/)[1], sourceSha256: before, sourceUnchanged: before === hash(), browserVersion: browser.version(), scope: 'Strict source gate, actual aiFixChunked with mocked model transport, native Chromium validation and accessibility tree; no downstream export or human screen-reader claim.', results };
    fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify({ sourceUnchanged: record.sourceUnchanged, results: results.map(r => ({ id: r.id, accepted: r.decision.accepted, reason: r.decision.reason, pipelineReturnedCandidate: r.pipelineReturnedCandidate, sourceBehavior: r.native.source.behavior, candidateBehavior: r.native.candidate.behavior, sourceSliders: r.native.source.sliders, candidateSliders: r.native.candidate.sliders })) }, null, 2));
    await context.close();
  } finally { await browser.close(); dom.window.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
