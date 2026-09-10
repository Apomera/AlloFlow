const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('@playwright/test');
process.chdir(path.resolve(__dirname, '../..'));
const harness = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const current = new Function('fs', 'path', harness.slice(harness.indexOf('const SRC ='), harness.indexOf('function harness(')) + '\nreturn sourceFunctions;')(fs, path);
const baseline = fs.readFileSync(path.join(__dirname, 'baseline-functions.txt'), 'utf8');
const test = fs.readFileSync('tests/remediation_semantic_fidelity.test.js', 'utf8');
const definitions = test.slice(test.indexOf('const doc ='), test.indexOf("describe('semantic fidelity failures"));
async function main() {
 const browser = await chromium.launch({ headless: true });
 try {
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  const data = await page.evaluate(({ current, baseline, definitions }) => {
   const gates = Object.fromEntries(Object.entries({ baseline, current }).map(([name, code]) => [name, new Function(code + '\nreturn acceptFixedHtmlDetailed;')()]));
   const fixtures = new Function(definitions + '\nreturn cases.map(([name,body,change,reason]) => { const original = doc(body); return {name, original, candidate:change(original), reason}; });')();
   const fidelity = fixtures.map(f => {
    const before = gates.baseline(f.candidate, f.original, { strictContent: true, mode: 'faithful' });
    const after = gates.current(f.candidate, f.original, { strictContent: true, mode: 'faithful' });
    return { name: f.name, expectedReason: f.reason, before, after, passed: !after.accepted && after.reason === f.reason && JSON.stringify(before) === JSON.stringify(after) };
   });
   const timings = [];
   for (const count of [10,100,400]) {
    const original = '<html lang="en"><body>' + '<section><h2>Observations</h2><p>Read the original instructions and record three observations in the notebook.</p><table><tr><th scope="col">Name</th><th scope="col">Score</th></tr><tr><td>Ada</td><td>95</td></tr></table><label>Name <input value="Ada"></label><math><mi>x</mi><mo>+</mo><mi>y</mi></math></section>'.repeat(count) + '</body></html>';
    const candidate = original.replace('lang="en"', 'lang="en-US"'), samples = { baseline: [], current: [] };
    for (let trial=0;trial<6;trial++) {
     for (const name of (trial % 2 ? ['current','baseline'] : ['baseline','current'])) {
      const start=performance.now(), decision=gates[name](candidate,original,{ strictContent:true, mode:'faithful' });
      const elapsed=performance.now()-start;
      if(!decision.accepted) throw Error(name+': '+JSON.stringify(decision));
      if(trial) samples[name].push(elapsed);
     }
    }
    const median=name=>[...samples[name]].sort((a,b)=>a-b)[2];
    timings.push({blocks:count,inputBytes:new TextEncoder().encode(original).length,samplesMs:samples,medianMs:{baseline:median('baseline'),current:median('current')},ratio:median('baseline')/median('current')});
   }
   return { fidelity, timings };
  }, {current,baseline,definitions});
  const report = { browser: browser.version(), measuredAt:new Date().toISOString(), sourceSha256:crypto.createHash('sha256').update(fs.readFileSync('doc_pipeline_source.jsx')).digest('hex'), methodology:'Local headless Chromium with network blocked; same-page paired gates, alternating order, one warmup and five measured timing trials per size.',...data };
  fs.writeFileSync(path.join(__dirname,'browser-comparison.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({browser:report.browser,fidelityPassed:data.fidelity.filter(f=>f.passed).length,fidelityTotal:data.fidelity.length,timings:data.timings}));
  if(data.fidelity.some(f=>!f.passed)) process.exitCode=1;
 } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
