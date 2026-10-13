const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),cp=require('child_process');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const frozen='fb53d0759f9a101822a0475af19706991fa48a40c23c439d8f7773600944746c';
for(const file of ['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js'])assert.equal(hash(file),frozen);
cp.execFileSync(process.execPath,[path.join(dir,'verify-scope.cjs')],{stdio:'pipe',windowsHide:true});
const scope=read(path.join(dir,'source-scope.json'));
for(const key of ['onlyStationPowerLabChanged','calculationGradingRecordAndOtherViewHelpersUnchanged','changeAndSaveCallbacksUnchanged','resultFeedbackTextUnchanged','sourceMirrorParity','syntax'])assert.equal(scope[key],true);
let total=0,processCount=0;const files=new Set();
for(const [folder,expected,nativeCount,runner] of [['new-tests/run-02',25,3,'run-new-tests.cjs'],['regressions/run-02',329,20,'run-regressions.cjs']]){
  const out=path.join(dir,folder),final=read(path.join(out,'final.json')),manifest=read(path.join(out,'processes.json'));
  assert.equal(final.sourceSha256,frozen);assert.equal(final.passed,expected);assert.equal(final.failed,0);
  assert.equal(hash(path.join(out,'processes.json')),final.processManifestSha256||final.processManifest.sha256);
  assert.equal(hash(path.join(out,'inventory.json')),final.inventorySha256||final.inventory.sha256);
  assert.equal(manifest.runnerSha256,hash(path.join(dir,runner)));assert.equal(manifest.runs.length,nativeCount);
  const resumed=manifest.resumedFrom;
  if(resumed){assert.equal(hash(resumed.path),resumed.sha256);assert.equal(hash(resumed.runnerSnapshot),resumed.runnerSha256);assert.equal(read(resumed.path).runnerSha256,resumed.runnerSha256);}
  const coverage=new Map();let passed=0;
  for(const run of manifest.runs){
    assert.equal(run.exitCode,0);assert.equal(run.signal,null);assert.equal(run.error,null);
    for(const key of ['sourceSha256','sourceAfterSha256','mirrorAfterSha256'])assert.equal(run[key],frozen);
    assert.equal(run.testSha256,hash(run.file));assert.equal(run.testAfterSha256,run.testSha256);
    if(run.resumedFrom){
      assert(resumed);assert.equal(run.resumedFrom.manifest,resumed.path);
      const original=read(resumed.path).runs[run.resumedFrom.index];
      for(const key of Object.keys(original))assert.deepEqual(run[key],original[key]);
      for(const key of ['receipt','log'])assert.equal(hash(path.join(path.dirname(resumed.path),original[key])),original[key+'Sha256']);
    }
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
assert.equal(total,354);assert.equal(processCount,23);assert.equal(files.size,11);
const pointer=read(path.join(dir,'browser/final.json')),processPath=path.resolve(root,pointer.process.path);
assert.equal(hash(processPath),pointer.process.sha256);const browser=read(processPath);
assert.equal(pointer.observedNativeChildExitCode,0);assert.equal(pointer.observedWrapperExitCode,0);
for(const key of ['results','visualReview','preflight','harness','wrapper'])assert.equal(hash(pointer[key].path),pointer[key].sha256);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);assert.deepEqual(browser.errors,[]);
for(const key of ['harness','harnessSnapshot','helperPreamble','baseHarness','results','console'])assert.equal(hash(browser[key].path),browser[key].sha256);
assert.equal(browser.harness.sha256,browser.harnessSnapshot.sha256);
const results=read(browser.results.path);assert.equal(results.sourceSha256,frozen);assert.deepEqual(results.errors,[]);
assert.equal(results.checks.length,browser.checks);assert(browser.checks>0);assert.equal(browser.scenarios,4);assert.equal(results.scenarios,4);
assert.equal(browser.screenshots.length,4);
const visual=read(pointer.visualReview.path),rootVisual=read(path.join(dir,'browser/root-visual-review.json'));
assert.equal(rootVisual.sourceSha256,frozen);assert.equal(visual.screenshots.length,4);assert.equal(rootVisual.screenshots.length,4);
for(const shot of browser.screenshots){
  assert.equal(hash(shot.path),shot.sha256);assert(shot.width>0&&shot.height>0);
  const reviewer=visual.screenshots.filter(s=>s.name===path.basename(shot.path)),rootReviewer=rootVisual.screenshots.filter(s=>s.path===shot.path);
  assert.equal(reviewer.length,1);assert.equal(reviewer[0].visuallyInspected,true);assert.equal(rootReviewer.length,1);assert.equal(rootReviewer[0].sha256,shot.sha256);assert.equal(rootReviewer[0].visuallyInspected,true);
}
const summary={sourceSha256:frozen,onlyStationPowerLabChanged:true,tests:total,testFiles:files.size,nativeTestProcesses:processCount,browserChecks:browser.checks,browserScenarios:browser.scenarios,inspectedScreenshots:browser.screenshots.length,sourceMirrorParity:true};
fs.writeFileSync(path.join(dir,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
