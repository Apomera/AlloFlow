const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const suites=new Map();
// The final planner/table run replaces the initial stale table assertions.
for(const report of ['unit-results.json','final-unit-results.json'])for(const suite of read(report).testResults)suites.set(suite.name,{suite,report});
const unitSuites=[...suites.values()].map(({suite,report})=>{
 assert.equal(suite.status,'passed',suite.name);assert.ok(suite.assertionResults.every(test=>test.status==='passed'),suite.name);
 return{name:path.basename(suite.name),passed:suite.assertionResults.length,resultFile:report};
});
const unitPassed=unitSuites.reduce((total,suite)=>total+suite.passed,0);assert.equal(unitSuites.length,14);assert.equal(unitPassed,159);
// Seven focused cases passed before the phone table fix; both affected phone
// cases passed in the final rerun. Each distinct case is counted once.
const log=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
assert.match(log('browser-checks.log'),/\b7 passed/);assert.match(log('phone-browser-checks.log'),/\b2 passed/);
assert.match(log('regression-browser-checks.log'),/\b13 passed/);
const visual=read('after-metrics.json');assert.equal(visual.length,14);
assert.ok(visual.every(item=>item.errors.length===0&&item.scrollWidth<=item.width+1&&item.minimumContrast>=4.5&&item.minimumTargetHeight>=43.5&&Math.abs(item.canvas.inspection.width-item.canvas.contentWidth)<1));
const canonical=fs.readFileSync('stem_lab/stem_tool_solarsystem.js'),mirror=fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_solarsystem.js');assert.ok(canonical.equals(mirror));
const summary={verifiedOn:'2026-10-04',uncommitted:true,unitPassed,unitSuites,focusedBrowserPassed:9,regressionBrowserPassed:13,visualStatesPassed:14,
 minimumEnabledTextContrast:Math.min(...visual.map(item=>item.minimumContrast)),minimumVisibleControlHeight:Math.min(...visual.map(item=>item.minimumTargetHeight)),
 canonicalMirrorSHA256:crypto.createHash('sha256').update(canonical).digest('hex').toUpperCase()};
fs.writeFileSync(path.join(__dirname,'verification-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
