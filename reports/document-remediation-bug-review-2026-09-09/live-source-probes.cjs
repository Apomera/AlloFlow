'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
process.chdir(path.resolve(__dirname, '../..'));
const output = path.join(__dirname, 'live-source-probes.json');
if (fs.existsSync(output)) throw Error('Evidence already exists; preserve the earlier run.');
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const sourceBytes = fs.readFileSync('doc_pipeline_source.jsx');
const dom = new JSDOM('');
global.DOMParser = dom.window.DOMParser;
global.NodeFilter = dom.window.NodeFilter;
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const padding = '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body + padding + '</main></body></html>';
const cases = [
  { id: 'native-label-aria-override', expected: 'reject', selector: '#student',
    body: '<label for="student">Student name</label><input id="student" value="Ada">',
    change: s => s.replace('<input ', '<input aria-label="Teacher name" ') },
  { id: 'field-description-reassigned', expected: 'reject', selector: '#weight',
    body: '<label for="weight">Weight</label><input id="weight" aria-describedby="kg"><p id="kg">Enter weight in kilograms.</p><p id="lb">Enter weight in pounds.</p>',
    change: s => s.replace('aria-describedby="kg"', 'aria-describedby="lb"') },
  { id: 'linked-exponent-base-moved', expected: 'reject', selector: 'a',
    body: '<p>Compute <a href="https://school.example/expression">x<sup>2</sup> plus y2</a> for this expression.</p>',
    change: s => s.replace('x<sup>2</sup> plus y2', 'x2 plus y<sup>2</sup>') },
  { id: 'exponent-moved-between-links', expected: 'reject', selector: 'p',
    body: '<p>Compute <a href="https://school.example/first">x<sup>2</sup></a> plus <a href="https://school.example/second">y2</a>.</p>',
    change: s => s.replace('x<sup>2</sup>', 'x2').replace('>y2</a>', '>y<sup>2</sup></a>') },
  { id: 'header-role-downgrade', expected: 'reject', selector: 'table',
    body: '<table><tr><th scope="col">Group</th><th scope="col">Score</th></tr><tr><td>North</td><td>95</td></tr></table>',
    change: s => s.replace(/<th /g, '<th role="cell" ') },
  { id: 'fixed-linked-script-kind-control', expected: 'reject', selector: 'a',
    body: '<p>Compute <a href="https://school.example/expression">x<sup>2</sup></a> for this expression.</p>',
    change: s => s.replace('<sup>2</sup>', '<sub>2</sub>') },
  { id: 'equivalent-native-name-control', expected: 'accept', selector: '#student',
    body: '<label for="student">Student name</label><input id="student" value="Ada">',
    change: s => s.replace('<input ', '<input aria-label="Student name" ') },
];
async function main() {
  const results = [];
  for (const fixture of cases) {
    const source = wrap(fixture.body), candidate = fixture.change(source), harness = make(() => candidate);
    const decision = harness.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
    const repaired = await harness.run(source);
    results.push({ id: fixture.id, expected: fixture.expected, selector: fixture.selector, source, candidate, decision,
      pipelineReturnedCandidate: repaired === candidate, pipelineReturnedSource: repaired === source,
      rejectionEvidence: harness.evidence, mismatch: decision.accepted !== (fixture.expected === 'accept') });
  }
  if (process.argv.includes('--browser')) {
    // A few local static snapshots verify the observable name/role differences;
    // this is not a browser regression suite or a downstream export verdict.
    const browser = await require('@playwright/test').chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
      await context.route('**/*', route => route.abort());
      const page = await context.newPage();
      for (const result of results) {
        result.browser = {};
        for (const side of ['source', 'candidate']) {
          await page.setContent(result[side]);
          const locator = page.locator(result.selector).first();
          result.browser[side] = { aria: await locator.ariaSnapshot(), dom: await locator.evaluate(el => ({
            html: el.outerHTML, labelledby: el.getAttribute('aria-labelledby'), describedby: el.getAttribute('aria-describedby'),
            descriptionText: (el.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' '),
          })) };
        }
      }
      await context.close();
    } finally { await browser.close(); }
  }
  const report = { measuredAt: new Date().toISOString(), sourceSha256: sha256(sourceBytes),
    policyVersion: sourceBytes.toString('utf8').match(/const _PIPELINE_PROMPT_VERSION = '([^']+)'/)[1],
    sourceUnchangedDuringRun: sha256(fs.readFileSync('doc_pipeline_source.jsx')) === sha256(sourceBytes),
    scope: 'Strict live candidate gate and aiFixChunked with transport mocked. Optional local ARIA snapshots establish observable fixture differences; no downstream export conclusion.',
    results };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, sourceUnchangedDuringRun: report.sourceUnchangedDuringRun, results: results.map(({ id, expected, decision, pipelineReturnedCandidate, mismatch }) => ({ id, expected, decision, pipelineReturnedCandidate, mismatch })) }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
