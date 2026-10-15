const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
process.chdir(path.resolve(__dirname,'../..'));
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const source='stem_lab/stem_tool_machinelab.js',frozen='f253abaf842de6a16003053526359561b78b3cea1412a9e07f8eb302f1715d7d';
assert.equal(hash(source),frozen);assert.equal(hash('desktop/web-app/public/'+source),frozen);cp.execFileSync(process.execPath,[__dirname+'/verify-scope.cjs']);
let passed=0;const names=[];
for(const [folder,indexes] of [['tests/run-01',[0,1]],['tests/run-02',[0]]]){
  const dir=path.join(__dirname,folder),m=read(dir+'/processes.json');assert.equal(m.sourceSha256,frozen);assert.equal(hash(dir+'/runner-snapshot.cjs'),m.runnerSha256);assert.equal(hash(m.helper.path),m.helper.sha256);for(const t of m.tests)assert.equal(hash(t.file),t.sha256);
  for(const i of indexes){const run=m.runs[i];assert.equal(run.exitCode,0);assert.equal(run.signal,null);assert.equal(run.error,null);assert.equal(run.timedOut,false);assert.equal(run.sourceAfterSha256,frozen);assert.equal(run.mirrorAfterSha256,frozen);assert.equal(hash(dir+'/'+run.receipt),run.receiptSha256);assert.equal(hash(dir+'/'+run.log),run.logSha256);const r=read(dir+'/'+run.receipt);assert.equal(r.success,true);assert.equal(r.numFailedTests,0);assert.equal(r.numPassedTests,run.expected);passed+=run.expected;names.push(...run.passedNames);}
}
assert.equal(passed,67);assert.equal(new Set(names).size,67);
const dir=path.join(__dirname,'browser/run-03'),n=read(dir+'/native-exit.json'),b=read(dir+'/results.json');assert.equal(n.exitCode,0);assert.equal(n.signal,null);assert.equal(n.error,null);assert.equal(n.unchanged,true);assert.equal(n.frozenSourceSha256,frozen);
for(const r of [...n.sourceBefore,...n.sourceAfter,...n.runnerBefore,...n.runnerAfter,...b.dependencies])assert.equal(hash(r.file),r.sha256);
assert.equal(b.sourceSha256,frozen);assert.deepEqual(b.errors,[]);assert.deepEqual(b.routes,['lever','pulley','windlass','ramp','wedge','screw']);assert.equal(b.mounts,3);assert.equal(b.shots.length,3);assert.equal(b.tempCleaned,true);assert.equal(b.hostPageRemoved,true);for(const s of b.shots)assert.equal(hash(dir+'/'+s.file),s.sha256);
const review=read(__dirname+'/source-review.json');assert.equal(review.sourceSha256,frozen);assert.equal(review.verdict,'pass');assert.deepEqual(review.findings,[]);
console.log(JSON.stringify({status:'passed',sourceSha256:frozen,tests:passed,browserChecks:b.checks.length,stations:b.routes.length,screenshots:b.shots.length}));
