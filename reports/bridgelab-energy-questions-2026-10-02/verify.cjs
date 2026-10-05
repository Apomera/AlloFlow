const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/bridgelab-energy-questions-2026-10-02/';
const source = fs.readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
if (source !== fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_bridgelab.js', 'utf8')) throw new Error('Bridge mirrors differ');
const keys = new Map();
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === '__alloT'
    && typeof node.arguments[0]?.value === 'string' && typeof node.arguments[1]?.value === 'string') {
    const [key, value] = node.arguments.map(argument => argument.value);
    if (keys.has(key) && keys.get(key) !== value) throw new Error('Conflicting fallback: ' + key);
    keys.set(key, value);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(acorn.parse(source, { ecmaVersion: 'latest' }));
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const registry = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  for (const [key, value] of keys) {
    if (key.split('.').reduce((object, part) => object?.[part], registry) !== value) throw new Error(file + ': mismatch for ' + key);
  }
}
// Preserve runner reports. Count the latest complete suite result once.
// The retry must finish successfully, and every original failed assertion
// must be present and pass in its replacement suite.
const unitFiles=['unit-results.json','unit-retry-results.json'];
const unitRuns=unitFiles.map(file=>({file,report:JSON.parse(fs.readFileSync(folder+file,'utf8'))}));
const retry=unitRuns[1].report;
if(!retry.success||retry.numFailedTests||retry.numPendingTests)throw Error('Unit retry did not complete successfully');
const latest=new Map();
for(const {report} of unitRuns)for(const suite of report.testResults){
  const name=suite.name.replaceAll('\\','/').split('/').pop();
  const previous=latest.get(name);
  if(previous){
    const assertions=new Map(suite.assertionResults.map(assertion=>[assertion.fullName,assertion.status]));
    for(const assertion of previous.assertionResults)if(assertion.status!=='passed'&&assertions.get(assertion.fullName)!=='passed')throw Error('Retry omitted failed assertion: '+assertion.fullName);
  }
  latest.set(name,suite);
}
const completed=new Set();let checks=0;
for(const [name,suite] of latest){
  if(suite.status!=='passed')throw Error('Unresolved suite: '+name);
  completed.add(name);
  for(const assertion of suite.assertionResults){if(assertion.status!=='passed')throw Error('Unresolved assertion: '+assertion.fullName);checks++;}
}
for(const name of fs.readdirSync('tests').filter(name=>/^bridgelab_.*\.test\.js$/.test(name)))if(!completed.has(name))throw Error('Missing suite: '+name);
if(checks!==276)throw Error('Incomplete unit coverage: '+checks);
const browser=JSON.parse(fs.readFileSync(folder+'browser-results.json','utf8'));
if(browser.errors.length)throw Error('Browser runner errors');
const workflows=[];
function collect(suites){for(const suite of suites){for(const spec of suite.specs||[])for(const test of spec.tests)workflows.push({name:spec.title,test});collect(suite.suites||[]);}}
collect(browser.suites);
if(workflows.length!==25)throw Error('Incomplete browser coverage: '+workflows.length);
for(const {name,test} of workflows)if(test.status!=='expected'||test.results.at(-1)?.status!=='passed')throw Error('Unresolved browser workflow: '+name);
const result={syntax:'passed',sourceMirrors:'identical',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),matchingEnglishKeys:keys.size,coveredUnitFiles:completed.size,unitChecksPassed:checks,browserChecksPassed:workflows.length,totalDistinctChecksPassed:checks+workflows.length,unitPool:'threads',unitRuns:unitRuns.map(({file,report})=>({file,runnerSuccess:report.success,passed:report.numPassedTests,failed:report.numFailedTests})),unitRetryReason:'Two 30 s test timeouts and a missing worker startup; affected suites rerun with 120 s per-test allowance.',commit:'not created; changes left uncommitted at user request'};
fs.writeFileSync(folder+'source-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
