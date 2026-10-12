const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),cp=require('child_process');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const frozen='d9a463bab0000a52be4d585de4ecf45ae6ed894dd5b4fbff49027f2b39fc6735';
for(const file of ['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js'])assert.equal(hash(file),frozen);
cp.execFileSync(process.execPath,[path.join(dir,'verify-scope.cjs')],{stdio:'pipe',windowsHide:true});
const scope=read(path.join(dir,'source-scope.json'));assert.equal(scope.onlyReadoutChanged,true);assert.equal(scope.sourceSha256,frozen);
const nativeDir=path.join(dir,'native/run-01'),final=read(path.join(nativeDir,'regression-final.json'));
const processes=read(path.join(nativeDir,final.processManifest));
assert.equal(hash(path.join(nativeDir,final.processManifest)),final.processManifestSha256);
assert.equal(final.sourceSha256,frozen);assert.equal(final.publicMirrorSha256,frozen);
assert.equal(final.runnerSha256,hash(path.join(dir,'run-regressions.cjs')));
assert.equal(processes.runnerSha256,final.runnerSha256);
assert.equal(processes.runs.length,3);assert.equal(final.passed,73);assert.equal(final.failed,0);assert.equal(final.uncovered,0);
const inventory=read(path.join(nativeDir,final.inventory.path));assert.equal(hash(path.join(nativeDir,final.inventory.path)),final.inventory.sha256);
let testCount=0;
for(const run of processes.runs){
  assert.equal(run.exitCode,0);assert.equal(run.signal,null);assert.equal(run.error,null);
  for(const key of ['sourceSha256','mirrorBeforeSha256','sourceAfterSha256','mirrorAfterSha256'])assert.equal(run[key],frozen);
  assert.equal(run.testSha256,hash(run.file));assert.equal(run.testAfterSha256,run.testSha256);
  assert.equal(hash(path.join(nativeDir,run.receipt)),run.receiptSha256);assert.equal(hash(path.join(nativeDir,run.log)),run.logSha256);
  const report=read(path.join(nativeDir,run.receipt)),cases=report.testResults[0].assertionResults;
  assert.equal(report.success,true);assert.equal(report.numFailedTests,0);assert.equal(report.numPassedTests,run.expected);
  assert.equal(cases.length,run.expected);assert(cases.every(c=>c.status==='passed'));
  const listed=inventory.files.find(i=>i.file===run.file);assert.equal(listed.sha256,run.testSha256);
  assert.deepEqual(listed.assertions,cases.map((c,index)=>({index,fullName:c.fullName,executedPassCount:1})));
  testCount+=cases.length;
}
assert.equal(testCount,73);
const pointer=read(path.join(dir,'browser/final.json'));
// The browser reviewer writes its final pointer only after inspecting every image.
const processPath=path.resolve(dir,'browser',pointer.process);
assert.equal(hash(processPath),pointer.sha256);
const browser=read(processPath);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);assert.deepEqual(browser.errors,[]);
for(const key of ['harness','harnessSnapshot','helperPreamble','baseHarness','results','console'])assert.equal(hash(browser[key].path),browser[key].sha256);
assert.equal(browser.harness.sha256,browser.harnessSnapshot.sha256);
const results=read(browser.results.path);assert.equal(results.sourceSha256,frozen);assert.deepEqual(results.errors,[]);assert.equal(results.checks.length,browser.checks);assert(browser.checks>0);
assert.equal(results.scenarios,browser.scenarios);assert(browser.scenarios>=6);
assert(browser.screenshots.length>=4);
for(const shot of browser.screenshots){assert.equal(hash(shot.path),shot.sha256);assert.equal(shot.visuallyInspected,true);assert(shot.width>0&&shot.height>0);}
if(browser.downloadedRecord)assert.equal(hash(browser.downloadedRecord.path),browser.downloadedRecord.sha256);
const summary={sourceSha256:frozen,onlyReadoutChanged:true,tests:testCount,testFiles:3,nativeTestProcesses:3,browserChecks:browser.checks,
  browserScenarios:browser.scenarios,inspectedScreenshots:browser.screenshots.length,sourceMirrorParity:true};
fs.writeFileSync(path.join(dir,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
