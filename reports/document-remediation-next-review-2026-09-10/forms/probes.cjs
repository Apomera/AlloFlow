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
const limited = '<form><label for="response">Explain your observations</label><textarea id="response" maxlength="200"></textarea></form>';
const grouped = '<form><fieldset id="student"><legend>Student details</legend><label for="student-name">Name</label><input id="student-name"></fieldset><fieldset id="teacher"><legend>Teacher details</legend><label for="teacher-name">Name</label><input id="teacher-name"></fieldset></form>';
const cases = [
  { id: 'maxlength-truncates-response', expected: 'reject', body: limited, typeInto: '#response', change: s => s.replace('maxlength="200"', 'maxlength="5"') },
  { id: 'maxlength-preserving-wrapper-control', expected: 'accept', body: limited, typeInto: '#response', change: s => s.replace('<textarea ', '<span><textarea ').replace('</textarea>', '</textarea></span>') },
  { id: 'fieldset-name-association-lost', expected: 'reject', body: grouped, change: s => s.replace('<legend>Student details</legend>', '<legend>Student details</legend></fieldset>').replace('<input id="student-name"></fieldset>', '<input id="student-name">') },
  { id: 'fieldset-preserving-wrapper-control', expected: 'accept', body: grouped, change: s => s.replace('<label for="student-name">', '<div><label for="student-name">').replace('<input id="student-name">', '<input id="student-name"></div>') },
];
async function main() {
  const results = [];
  const browser = await require('@playwright/test').chromium.launch({ headless: true });
  const browserVersion = browser.version();
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
        const locator = page.locator('form');
        result.browser[side] = { aria: await locator.ariaSnapshot(), dom: await locator.evaluate(el => ({
          html: el.outerHTML, text: el.textContent,
          controls: Array.from(el.querySelectorAll('input,textarea')).map(control => ({
            id: control.id, maxLength: control.maxLength, minLength: control.minLength,
            fieldsetId: control.closest('fieldset')?.id || null,
            fieldsetLegend: control.closest('fieldset')?.querySelector(':scope > legend')?.textContent || null,
          })),
        })) };
        if (fixture.typeInto) {
          const typed = 'Blueberries grow well.';
          await page.locator(fixture.typeInto).pressSequentially(typed);
          result.browser[side].typing = { typed, received: await page.locator(fixture.typeInto).inputValue() };
        }
      }
      results.push(result);
    }
    await context.close();
  } finally { await browser.close(); }
  const report = { measuredAt: new Date().toISOString(), policyVersion: sourceBytes.toString('utf8').match(/const _PIPELINE_PROMPT_VERSION = '([^']+)'/)[1],
    sourceSha256: sha256(sourceBytes), sourceUnchangedDuringRun: sha256(fs.readFileSync('doc_pipeline_source.jsx')) === sha256(sourceBytes), browserVersion,
    scope: 'Actual source strict gate and aiFixChunked with transport mocked; native Chromium input typing and accessibility snapshots verify local functional changes. No downstream export or human-screen-reader conclusion.', results };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, sourceUnchangedDuringRun: report.sourceUnchangedDuringRun, results: results.map(({ id, expected, decision, pipelineReturnedCandidate, mismatch, browser }) => ({ id, expected, decision, pipelineReturnedCandidate, mismatch, browser })) }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
