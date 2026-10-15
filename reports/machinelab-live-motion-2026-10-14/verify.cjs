const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
process.chdir(path.resolve(__dirname,'../..'));
const expected='c007670ebf89440fb6549bc8b26eab54343fa027feb9dee49b1950bca25ad67c',canonical='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+canonical;
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),read=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),json=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file)));
assert.equal(hash(canonical),expected);assert.equal(hash(mirror),expected);
const baseline=cp.execFileSync('git',['show','51e17d011:'+canonical],{maxBuffer:5e6}).toString().replace(/\r\n/g,'\n');
let restored=read(canonical);
for(const [start,end] of [
 ['        function syncShopStroke(progress) {','        function recordShopPhase('],
 ["            d.shopAnimating ? h('div', { key: 'demo-phase'","            h('div', {\n              key: 'bay', ref: shopGlRef"]
]){
 const a=restored.indexOf(start),b=restored.indexOf(end,a+start.length),c=baseline.indexOf(start),d=baseline.indexOf(end,c+start.length);assert(a>=0&&b>a&&c>=0&&d>c);restored=restored.slice(0,a)+baseline.slice(c,d)+restored.slice(b);
}
assert.equal(restored,baseline,'Changes escaped stroke synchronization and phase-panel presentation');
const final=json('tests/run-03/final.json'),manifest=json('tests/run-03/processes.json');assert.equal(final.sourceSha256,expected);assert.equal(final.mirrorSha256,expected);assert.equal(final.passed,85);assert.equal(final.failed,0);assert.equal(final.manifestSha256,hash(path.join(__dirname,'tests/run-03/processes.json')));
assert.equal(manifest.runs.length,4);let passed=0;
for(const run of manifest.runs){assert.equal(run.exitCode,0);assert.equal(run.signal,null);assert.equal(run.error,null);assert.equal(run.timedOut,false);assert.equal(run.sourceAfterSha256,expected);assert.equal(run.mirrorAfterSha256,expected);const report=json('tests/run-03/'+run.receipt);assert(report.success);assert.equal(report.numPassedTests,run.expected);assert.equal(report.numFailedTests,0);assert.equal(hash(path.join(__dirname,'tests/run-03',run.receipt)),run.receiptSha256);assert.equal(hash(path.join(__dirname,'tests/run-03',run.log)),run.logSha256);passed+=report.numPassedTests;}
assert.equal(passed,85);for(const test of manifest.tests)assert.equal(hash(test.file),test.sha256);assert.equal(hash(manifest.helper.path),manifest.helper.sha256);
const browser=json('browser/run-07/results.json');assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.before,browser.after);for(const row of browser.before)assert.equal(hash(row.file),row.sha256);assert.equal(browser.before[0].sha256,expected);assert.equal(browser.shots.length,3);assert.equal(browser.checks.length,123);
const browserExit=json('browser/run-07/native-exit.json');assert.equal(browserExit.exitCode,0);assert.equal(browserExit.error,null);assert.equal(browserExit.signal,null);assert(browserExit.unchanged);assert.deepEqual(browserExit.before,browserExit.after);
for(const kind of ['lever','pulley','windlass','ramp','wedge','screw'])assert(browser.checks.includes(kind+': only the phase boundary updates the live region'));
for(const phase of ['work','return'])assert(browser.checks.includes('forced doubled phone '+phase+': both phase cards retain readable text contrast'));
for(const shot of browser.shots)assert.equal(hash(path.join(__dirname,'browser/run-07',shot.file)),shot.sha256);
console.log(JSON.stringify({sourceSha256:expected,sourceMirrorEqual:true,scopeRestoresBaseline:true,unitTests:85,browserChecks:browser.checks.length,screenshots:browser.shots.length}));
