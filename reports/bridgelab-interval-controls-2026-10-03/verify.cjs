const fs = require('node:fs');
const crypto = require('node:crypto');
const acorn = require('acorn');
const folder = 'reports/bridgelab-interval-controls-2026-10-03/';
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
const unit=JSON.parse(fs.readFileSync(folder+'unit-results.json','utf8'));
const assertions=unit.testResults.flatMap(s=>s.assertionResults),passed=assertions.filter(a=>a.status==='passed');
if(!unit.success || unit.numFailedTests || passed.length!==10 || assertions.some(a=>!['passed','pending','skipped'].includes(a.status)))throw Error('Focused unit checks incomplete');
for(const phrase of ['interval time controls edit exact','interval time controls preserve selected'])if(!passed.some(a=>(a.fullName||a.title).includes(phrase)))throw Error('New draft workflow missing');
const browser=JSON.parse(fs.readFileSync(folder+'browser-results.json','utf8'));let specs=[];
function collect(s){for(const item of s.specs||[])specs.push(item);for(const child of s.suites||[])collect(child);}collect(browser);
if(browser.errors?.length || specs.length!==9 || specs.some(s=>!s.ok || s.tests.some(t=>t.status!=='expected' || t.results.some(r=>r.status!=='passed'))))throw Error('Browser checks incomplete');
const result={syntax:'passed',sourceMirrors:'identical',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),matchingEnglishKeys:keys.size,focusedUnitChecksPassed:passed.length,unitChecksSkipped:assertions.length-passed.length,browserChecksPassed:specs.length,commit:'not created; changes left uncommitted'};
fs.writeFileSync(folder+'source-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
