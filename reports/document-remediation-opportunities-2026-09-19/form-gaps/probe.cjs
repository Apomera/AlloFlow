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
const hard = '<form><label>Student response<textarea name="answer" cols="10" wrap="hard">abcdefghijklmnopqrstuvwxyz</textarea></label></form>';
const direction = '<form><label>Student response<input name="answer" dirname="answer.dir" dir="rtl" value="مرحبا"></label></form>';
const cases = [
  { id: 'textarea-hard-to-soft', body: hard, change: s => s.replace('wrap="hard"', 'wrap="soft"') },
  { id: 'textarea-hard-cols-changed', body: hard, change: s => s.replace('cols="10"', 'cols="20"') },
  { id: 'input-dirname-removed', body: direction, change: s => s.replace(' dirname="answer.dir"', '') },
  { id: 'input-dirname-renamed', body: direction, change: s => s.replace('dirname="answer.dir"', 'dirname="ignored.dir"') },
  { id: 'textarea-wrapper-control', body: hard, change: s => s.replace('<form>', '<div><form>').replace('</form>', '</form></div>') },
  { id: 'textarea-soft-cols-control', body: hard.replace('wrap="hard"', 'wrap="soft"'), change: s => s.replace('cols="10"', 'cols="20"') },
];
(async () => {
  const output = path.join(__dirname, 'results.json');
  if (fs.existsSync(output)) throw new Error('Refusing to overwrite review evidence');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    const observe = async html => {
      await page.setContent(html);
      return page.evaluate(() => {
        const form = document.querySelector('form'), el = form.querySelector('input,textarea');
        return { value: el.value, payload: Array.from(new FormData(form).entries()), wrap: el.wrap ?? null, cols: el.cols ?? null, dirname: el.dirName ?? null, direction: getComputedStyle(el).direction };
      });
    };
    const results = [];
    for (const entry of cases) {
      const source = wrap(entry.body), candidate = entry.change(source);
      const result = await page.evaluate(async ({ program, source, candidate }) => {
        const h = new Function(program + '\nreturn harness;')()(() => candidate);
        const decision = h.acceptFixedHtmlDetailed(candidate, source, { strictContent: true, mode: 'faithful' });
        const repaired = await h.run(source);
        return { decision, pipelineReturnedCandidate: repaired === candidate, pipelineReturnedSource: repaired === source, evidence: h.evidence };
      }, { program, source, candidate });
      results.push({ id: entry.id, source, candidate, ...result, native: { source: await observe(source), candidate: await observe(candidate) } });
    }
    const record = { measuredAt: new Date().toISOString(), sourceSha256: before, sourceUnchanged: before === hash(), browserVersion: browser.version(), scope: 'Read-only strict source gate and actual aiFixChunked with mocked transport, native Chromium FormData; no network submissions or downstream export verification.', results };
    fs.writeFileSync(output, JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify({ sourceUnchanged: record.sourceUnchanged, results: results.map(({id,decision,pipelineReturnedCandidate,native}) => ({id,decision,pipelineReturnedCandidate,native})) }, null, 2));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
