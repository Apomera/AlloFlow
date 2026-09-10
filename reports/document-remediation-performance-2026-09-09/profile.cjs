const fs = require('fs'), path = require('path'), crypto = require('crypto'), inspector = require('inspector');
const { performance } = require('perf_hooks');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
process.chdir(root);
const dom = new JSDOM('');
global.DOMParser = dom.window.DOMParser; global.NodeFilter = dom.window.NodeFilter;
const harness = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
function currentFunctions() {
 return new Function('fs', 'path', harness.slice(harness.indexOf('const SRC ='), harness.indexOf('function harness(')) + '\nreturn sourceFunctions;')(fs, path);
}
const compile = source => new Function(source + '\nreturn acceptFixedHtmlDetailed;')();
const block = '<section><h2>Observations</h2><p>Read the original instructions and record three observations in the notebook.</p><table><tr><th scope="col">Name</th><th scope="col">Score</th></tr><tr><td>Ada</td><td>95</td></tr></table><label>Name <input value="Ada"></label><math><mi>x</mi><mo>+</mo><mi>y</mi></math></section>';
const input = count => '<html lang="en"><body>' + block.repeat(count) + '</body></html>';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
async function main() {
 const baselinePath = path.join(__dirname, 'baseline-functions.txt');
 if (process.argv.includes('--capture')) {
  if (fs.existsSync(baselinePath)) throw Error('Baseline already captured');
  const functions = currentFunctions(); fs.writeFileSync(baselinePath, functions);
  write('baseline-source.json', { sourceSha256: sha(fs.readFileSync('doc_pipeline_source.jsx')), functionsSha256: sha(functions), node: process.version });
  const accept = compile(functions), html = input(400), session = new inspector.Session(); session.connect();
  const post = (method, args = {}) => new Promise((resolve, reject) => session.post(method, args, (err, result) => err ? reject(err) : resolve(result)));
  await post('Profiler.enable'); await post('Profiler.start');
  const start = performance.now(), decision = accept(html.replace('lang="en"', 'lang="en-US"'), html, { strictContent: true, mode: 'faithful' });
  const elapsedMs = performance.now() - start;
  const { profile } = await post('Profiler.stop'); session.disconnect();
  write('baseline.cpuprofile', profile);
  const weight = new Map(); profile.samples.forEach((id, i) => weight.set(id, (weight.get(id) || 0) + profile.timeDeltas[i]));
  const top = profile.nodes.map(n => ({ name: n.callFrame.functionName, url: n.callFrame.url, line: n.callFrame.lineNumber + 1, selfMs: (weight.get(n.id) || 0) / 1000 })).sort((a,b) => b.selfMs - a.selfMs).slice(0, 30);
  write('profile-summary.json', { elapsedMs, decision, top }); console.log(JSON.stringify({ elapsedMs, decision, top: top.slice(0, 12) }));
 } else {
  const baseline = fs.readFileSync(baselinePath, 'utf8'), current = currentFunctions();
  const gates = { baseline: compile(baseline), current: compile(current) }, results = [];
  for (const count of [10, 100, 400]) {
   const html = input(count), output = html.replace('lang="en"', 'lang="en-US"'), samples = { baseline: [], current: [] };
   for (let trial = 0; trial < 4; trial++) {
    for (const name of (trial % 2 ? ['current','baseline'] : ['baseline','current'])) {
     const start = performance.now(), decision = gates[name](output, html, { strictContent: true, mode: 'faithful' });
     const elapsed = performance.now() - start;
     if (!decision.accepted) throw Error(name + ': ' + JSON.stringify(decision));
     if (trial) samples[name].push(elapsed);
    }
   }
   const median = name => [...samples[name]].sort((a,b) => a-b)[1];
   const row = { blocks: count, inputBytes: Buffer.byteLength(html), samplesMs: samples, medianMs: { baseline: median('baseline'), current: median('current') }, ratio: median('baseline') / median('current') };
   results.push(row); console.log(JSON.stringify(row));
  }
  write('paired-timing.json', { node: process.version, measuredAt: new Date().toISOString(), baselineFunctionsSha256: sha(baseline), currentSourceSha256: sha(fs.readFileSync('doc_pipeline_source.jsx')), currentFunctionsSha256: sha(current), methodology: 'Same-process jsdom; alternating order; one warmup and three measured trials per size; synthetic repeated mixed content.', results });
 }
 dom.window.close();
}
main().catch(e => { console.error(e); process.exitCode = 1; dom.window.close(); });
