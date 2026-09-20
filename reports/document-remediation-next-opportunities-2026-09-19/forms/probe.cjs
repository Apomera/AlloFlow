const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
process.chdir(path.resolve(__dirname, '../../..'));
const hash = () => crypto.createHash('sha256').update(fs.readFileSync('doc_pipeline_source.jsx')).digest('hex');
const before = hash();
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const program = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn "const sourceFunctions = " + JSON.stringify(sourceFunctions) + ";\\n" + harness.toString();')(fs, path);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
const form = '<form action="https://remediation.invalid/result" target="feedback"><label>Response<input name="answer" value="Original"></label><button>Submit</button></form><iframe name="feedback" title="Submission feedback" srcdoc="<p>Feedback remains here.</p>"></iframe>';
const textarea = '<form><label>Response<textarea name="answer" wrap="hard" cols="10" style="width:100px;font:16px monospace">abcdefghijklmnopqrstuvwxyz</textarea></label></form>';
const cases = [
  { id: 'form-target-removal', mode: 'target', expected: 'reject', body: form, change: s => s.replace(' target="feedback"', '') },
  { id: 'submitter-formtarget-added', mode: 'target', expected: 'reject', body: form, change: s => s.replace('<button>', '<button formtarget="_self">') },
  { id: 'target-explicit-self-control', mode: 'target', expected: 'accept', body: form.replace(' target="feedback"', ''), change: s => s.replace('<form ', '<form target="_self" ') },
  { id: 'submitter-target-equivalent-control', mode: 'target', expected: 'accept', body: form, change: s => s.replace('<button>', '<button formtarget="feedback">') },
  { id: 'textarea-hard-width', mode: 'payload', expected: 'reject', body: textarea, change: s => s.replace('width:100px', 'width:200px') },
  { id: 'textarea-hard-font-size', mode: 'payload', expected: 'reject', body: textarea, change: s => s.replace('font:16px', 'font:12px') },
  { id: 'textarea-soft-width-control', mode: 'payload', expected: 'accept', body: textarea.replace('wrap="hard"', 'wrap="soft"'), change: s => s.replace('width:100px', 'width:200px') },
  { id: 'textarea-hard-color-control', mode: 'payload', expected: 'accept', body: textarea, change: s => s.replace('style="', 'style="color:navy;') },
];
(async () => {
  const output = path.join(__dirname, 'results.json');
  if (fs.existsSync(output)) throw new Error('Refusing to overwrite evidence');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 900, height: 600 } });
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  const observe = async (html, mode) => {
    const observationPage = await context.newPage();
    try {
      await observationPage.setContent(html);
      if (mode === 'target') {
        const requestPromise = observationPage.waitForRequest('https://remediation.invalid/result?answer=Original');
        await observationPage.evaluate(() => document.querySelector('form').requestSubmit(document.querySelector('button')));
        const request = await requestPromise;
        return { submissionDestination: request.frame() === observationPage.mainFrame() ? 'main document' : request.frame().name(), url: request.url(), method: request.method(), requestAbortedBeforeNetwork: true };
      }
      return await observationPage.evaluate(() => {
        const form = document.querySelector('form'), el = form.querySelector('textarea');
        return { value: el.value, payload: Array.from(new FormData(form).entries()), wrap: el.wrap, cols: el.cols, width: getComputedStyle(el).width, font: getComputedStyle(el).font };
      });
    } finally { await observationPage.close(); }
  };
  try {
    const results = [];
    for (const entry of cases) {
      const source = wrap(entry.body), candidate = entry.change(source);
      const result = await page.evaluate(async ({ program, source, candidate }) => {
        const h = new Function(program + '\nreturn harness;')()(() => candidate);
        const decision = h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
        const repaired = await h.run(source);
        return { decision, pipelineReturnedCandidate: repaired === candidate, pipelineReturnedSource: repaired === source, evidence: h.evidence };
      }, { program, source, candidate });
      results.push({ id: entry.id, expected: entry.expected, source, candidate, ...result, native: { source: await observe(source, entry.mode), candidate: await observe(candidate, entry.mode) } });
    }
    const source = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
    const record = { measuredAt: new Date().toISOString(), sourceSha256: before, sourceUnchanged: before === hash(), policy: source.match(/const _PIPELINE_PROMPT_VERSION = '([^']+)'/)[1], browserVersion: browser.version(), scope: 'Read-only strict source gate and actual aiFixChunked with mocked transport; native Chromium FormData and request destination. Every request is aborted before network. No external submissions, export verification, live model or assistive-technology testing.', results };
    fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify({ sourceUnchanged: record.sourceUnchanged, results: results.map(({ id, decision, pipelineReturnedCandidate, native }) => ({ id, decision, pipelineReturnedCandidate, native })) }, null, 2));
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
