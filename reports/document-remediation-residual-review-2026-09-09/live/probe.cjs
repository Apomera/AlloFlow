'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
process.chdir(path.resolve(__dirname, '../../..'));
const output = path.join(__dirname, 'results.json');
if (fs.existsSync(output)) throw Error('Evidence already exists; preserve earlier results.');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceBytes = fs.readFileSync('doc_pipeline_source.jsx');
const dom = new JSDOM('');
global.DOMParser = dom.window.DOMParser;
global.NodeFilter = dom.window.NodeFilter;
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const padding = '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body + padding + '</main></body></html>';
const image = '<img alt="Student name" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E">';
const field = '<label for="student">' + image + '</label><input id="student" value="Ada">';
const table = '<table><tr><th scope="col">Group</th><th scope="col">Score</th></tr><tr><td>North</td><td>95</td></tr></table>';
const figure = '<figure><img alt="Expression graph" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E"><figcaption>Compare x<sup>2</sup> plus y2.</figcaption></figure>';
const cases = [
  { id: 'image-label-overridden', expected: 'reject', selector: '#student', body: field,
    change: s => s.replace('<input ', '<input aria-label="Teacher name" ') },
  { id: 'image-label-equivalent-control', expected: 'accept', selector: '#student', body: field,
    change: s => s.replace('<input ', '<input aria-label="Student name" ') },
  { id: 'table-role-list', expected: 'reject', selector: 'table', body: table,
    change: s => s.replace('<table>', '<table role="list">') },
  { id: 'table-explicit-role-control', expected: 'accept', selector: 'table', body: table,
    change: s => s.replace('<table>', '<table role="table">') },
  { id: 'caption-exponent-base-moved', expected: 'reject', selector: 'figcaption', body: figure,
    change: s => s.replace('x<sup>2</sup> plus y2', 'x2 plus y<sup>2</sup>') },
  { id: 'caption-inline-wrapper-control', expected: 'accept', selector: 'figcaption', body: figure,
    change: s => s.replace('x<sup>2</sup>', '<span>x</span><sup><span>2</span></sup>') },
];
async function main() {
  const results = [];
  const browser = await require('@playwright/test').chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    for (const fixture of cases) {
      const source = wrap(fixture.body), candidate = fixture.change(source), h = make(() => candidate);
      const decision = h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
      const repaired = await h.run(source);
      const result = { id: fixture.id, expected: fixture.expected, source, candidate, decision,
        pipelineReturnedCandidate: repaired === candidate, pipelineReturnedSource: repaired === source,
        evidence: h.evidence, mismatch: decision.accepted !== (fixture.expected === 'accept'), browser: {} };
      for (const side of ['source', 'candidate']) {
        await page.setContent(result[side]);
        const locator = page.locator(fixture.selector).first();
        result.browser[side] = { aria: await locator.ariaSnapshot(), dom: await locator.evaluate(el => ({
          html: el.outerHTML, text: el.textContent, role: el.getAttribute('role'), scripts: Array.from(el.querySelectorAll('sup,sub')).map(script => ({ kind: script.tagName, text: script.textContent, previousSiblingText: script.previousSibling && script.previousSibling.textContent })),
        })) };
      }
      results.push(result);
    }
    await context.close();
  } finally { await browser.close(); }
  const report = { measuredAt: new Date().toISOString(), policyVersion: sourceBytes.toString('utf8').match(/const _PIPELINE_PROMPT_VERSION = '([^']+)'/)[1],
    sourceSha256: sha256(sourceBytes), sourceUnchangedDuringRun: sha256(fs.readFileSync('doc_pipeline_source.jsx')) === sha256(sourceBytes),
    scope: 'Actual source strict gate and aiFixChunked with transport mocked; static Chromium accessibility snapshots verify local semantic changes. No downstream export or human-screen-reader conclusion.', results };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, sourceUnchangedDuringRun: report.sourceUnchangedDuringRun, results: results.map(({ id, expected, decision, pipelineReturnedCandidate, mismatch, browser }) => ({ id, expected, decision, pipelineReturnedCandidate, mismatch, aria: { source: browser.source.aria, candidate: browser.candidate.aria } })) }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
