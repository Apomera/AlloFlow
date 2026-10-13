const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),cp=require('child_process');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const frozen='301b7f605d71623e58af46454d15bea56b4710ed643191523b69593815ff714f';
for(const file of ['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js'])assert.equal(hash(file),frozen);
cp.execFileSync(process.execPath,[path.join(dir,'verify-scope.cjs')],{stdio:'pipe',windowsHide:true});assert.equal(read(path.join(dir,'source-scope.json')).onlyPowerRegionChanged,true);
let total=0,processCount=0;const files=new Set();
for(const [folder,expected,nativeCount,runner] of [['new-tests/run-01',43,4,'run-new-tests.cjs'],['regressions/run-01',286,16,'run-regressions.cjs']]){
  const out=path.join(dir,folder),final=read(path.join(out,'final.json')),manifest=read(path.join(out,'processes.json'));
  assert.equal(final.sourceSha256,frozen);assert.equal(final.passed,expected);assert.equal(final.failed,0);
  assert.equal(hash(path.join(out,'processes.json')),final.processManifestSha256||final.processManifest.sha256);
  assert.equal(hash(path.join(out,'inventory.json')),final.inventorySha256||final.inventory.sha256);
  assert.equal(manifest.runnerSha256,hash(path.join(dir,runner)));assert.equal(manifest.runs.length,nativeCount);
  const coverage=new Map();let passed=0;
  for(const run of manifest.runs){
    assert.equal(run.exitCode,0);assert.equal(run.signal,null);assert.equal(run.error,null);
    for(const key of ['sourceSha256','sourceAfterSha256','mirrorAfterSha256'])assert.equal(run[key],frozen);
    assert.equal(run.testSha256,hash(run.file));assert.equal(run.testAfterSha256,run.testSha256);
    assert.equal(hash(path.join(out,run.receipt)),run.receiptSha256);assert.equal(hash(path.join(out,run.log)),run.logSha256);
    const receipt=read(path.join(out,run.receipt));assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,run.expected);
    const cases=receipt.testResults[0].assertionResults;
    if(!coverage.has(run.file))coverage.set(run.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});
    const item=coverage.get(run.file);assert.deepEqual(cases.map(c=>c.fullName),item.names);
    cases.forEach((c,i)=>{if(c.status==='passed')item.counts[i]++;else assert(['pending','skipped'].includes(c.status));});
    total+=receipt.numPassedTests;passed+=receipt.numPassedTests;processCount++;files.add(run.file);
  }
  assert.equal(passed,expected);for(const item of coverage.values())assert(item.counts.every(n=>n<=1));
  if(folder.startsWith('new-tests'))for(const item of coverage.values())assert(item.counts.every(n=>n===1));
}
assert.equal(total,329);assert.equal(processCount,20);assert.equal(files.size,10);
const pointer=read(path.join(dir,'browser/final.json')),processPath=path.resolve(dir,'browser',pointer.process);
assert.equal(hash(processPath),pointer.sha256);const browser=read(processPath);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);assert.deepEqual(browser.errors,[]);
for(const key of ['harness','harnessSnapshot','helperPreamble','baseHarness','results','console','downloadedRecord'])assert.equal(hash(browser[key].path),browser[key].sha256);
assert.equal(browser.harness.sha256,browser.harnessSnapshot.sha256);
const results=read(browser.results.path);assert.equal(results.sourceSha256,frozen);assert.deepEqual(results.errors,[]);
assert.equal(results.checks.length,browser.checks);assert(browser.checks>0);assert.equal(browser.scenarios,8);assert.equal(results.scenarios,8);
assert.equal(browser.screenshots.length,4);
for(const shot of browser.screenshots){assert.equal(hash(shot.path),shot.sha256);assert.equal(shot.visuallyInspected,true);assert(shot.width>0&&shot.height>0);}
const summary={sourceSha256:frozen,onlyPowerRegionChanged:true,tests:total,testFiles:files.size,nativeTestProcesses:processCount,browserChecks:browser.checks,browserScenarios:browser.scenarios,inspectedScreenshots:browser.screenshots.length,sourceMirrorParity:true};
fs.writeFileSync(path.join(dir,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
