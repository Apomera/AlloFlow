// Local deterministic acceptance-cost baseline. No model, network, or export claims.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { JSDOM } = require('jsdom');
const { performance } = require('perf_hooks');
const dom = new JSDOM('');
global.DOMParser = dom.window.DOMParser; global.NodeFilter = dom.window.NodeFilter;
const source = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const make = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn harness;')(fs, path);
const h = make(s => s);
const block = '<section><h2>Observations</h2><p>Read the original instructions and record three observations in the notebook.</p><table><tr><th scope="col">Name</th><th scope="col">Score</th></tr><tr><td>Ada</td><td>95</td></tr></table><label>Name <input value="Ada"></label><math><mi>x</mi><mo>+</mo><mi>y</mi></math></section>';
const results = [];
for (const count of [10, 100, 400]) {
 const input = '<html lang="en"><body>' + block.repeat(count) + '</body></html>';
 const output = input.replace('lang="en"', 'lang="en-US"');
 const samples = [];
 for (let trial = 0; trial < 4; trial++) {
  const start = performance.now();
  const decision = h.acceptFixedHtmlDetailed(output, input, { strictContent: true, mode: 'faithful' });
  const elapsedMs = performance.now() - start;
  if (!decision.accepted) throw Error(JSON.stringify(decision));
  if (trial) samples.push(elapsedMs);
 }
 results.push({ blocks: count, inputBytes: Buffer.byteLength(input), samplesMs: samples, medianMs: [...samples].sort((a,b)=>a-b)[1] });
}
const report = { schemaVersion: 1, kind: 'synthetic-local-acceptance-cost', measuredAt: new Date().toISOString(), node: process.version,
 sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), warmupPerSize: 1, trialsPerSize: 3,
 limitations: ['Synthetic repeated content in jsdom; not production documents or rendered browser timing.', 'Concurrent host work affects these timings; no latency threshold or speedup claim.', 'Model latency, retry cost, end-to-end memory, and human review burden are not measured.'], results };
fs.writeFileSync(path.join(__dirname, 'timing-baseline.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(results));
dom.window.close();
