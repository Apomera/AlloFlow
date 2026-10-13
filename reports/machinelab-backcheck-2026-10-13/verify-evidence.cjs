const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),cp=require('child_process');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const frozen='de186324605236e2b2761b2f67b3aab757a99615254777bd76d1938a357eb559';
for(const file of ['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js'])assert.equal(hash(file),frozen);
cp.execFileSync(process.execPath,[path.join(dir,'verify-scope.cjs')],{stdio:'pipe',windowsHide:true});
const scope=read(path.join(dir,'source-scope.json'));
for(const key of ['onlyStationPowerLabChanged','onlyReadOnlyPanelAndCallAdded','calculationGradingRecordAndOtherViewHelpersUnchanged','changeAndSaveCallbacksUnchanged','resultFeedbackTextUnchanged','sourceMirrorParity','syntax'])assert.equal(scope[key],true);
const manifestCache=new Map(),regressionOrigins=new Map();
const relative=f=>path.relative(root,f).replaceAll('\\','/');
function regressionManifest(file){
  const absolute=path.resolve(file);if(manifestCache.has(absolute))return manifestCache.get(absolute);
  const manifest=read(absolute);assert.equal(manifest.sourceSha256,frozen);manifestCache.set(absolute,manifest);
  if(manifest.resumedFrom){
    const prior=manifest.resumedFrom;assert.equal(hash(prior.path),prior.sha256);assert.equal(hash(prior.runnerSnapshot),prior.runnerSha256);
    const parent=regressionManifest(prior.path);assert.equal(parent.runnerSha256,prior.runnerSha256);
  }
  return manifest;
}
function nativeOrigin(file,index,visited=new Set()){
  const absolute=path.resolve(file),key=absolute+':'+index;assert(!visited.has(key),'Cyclic regression provenance');visited.add(key);
  const manifest=regressionManifest(absolute);assert(Number.isInteger(index)&&index>=0&&index<manifest.runs.length);
  const run=manifest.runs[index],out=path.dirname(absolute);
  assert.equal(run.exitCode,0);assert.equal(run.signal,null);assert.equal(run.error,null);
  for(const field of ['sourceSha256','sourceAfterSha256','mirrorAfterSha256'])assert.equal(run[field],frozen);
  assert.equal(run.testSha256,hash(run.file));assert.equal(run.testAfterSha256,run.testSha256);
  assert.equal(hash(path.join(out,run.receipt)),run.receiptSha256);assert.equal(hash(path.join(out,run.log)),run.logSha256);
  const receipt=read(path.join(out,run.receipt));assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,run.expected);assert.equal(run.passed,run.expected);
  if(!run.resumedFrom)return relative(absolute);
  assert(manifest.resumedFrom);assert.equal(run.resumedFrom.manifest,manifest.resumedFrom.path);assert.equal(run.resumedFrom.index,index);
  const parent=regressionManifest(run.resumedFrom.manifest),prior=parent.runs[run.resumedFrom.index];assert(prior);
  for(const field of ['file','pattern','expected','testSha256','testAfterSha256','sourceSha256','sourceAfterSha256','mirrorAfterSha256','exitCode','signal','error','receiptSha256','logSha256','passed'])assert.deepEqual(run[field],prior[field]);
  return nativeOrigin(run.resumedFrom.manifest,run.resumedFrom.index,visited);
}
let total=0,processCount=0;const files=new Set();
for(const [folder,expected,nativeCount,runner] of [['new-tests/run-03',44,4,'run-new-tests.cjs'],['regressions/run-03',445,31,'run-regressions.cjs']]){
  const out=path.join(dir,folder),final=read(path.join(out,'final.json')),manifest=read(path.join(out,'processes.json'));
  assert.equal(final.sourceSha256,frozen);assert.equal(final.passed,expected);assert.equal(final.failed,0);
  assert.equal(hash(path.join(out,'processes.json')),final.processManifestSha256||final.processManifest.sha256);
  assert.equal(hash(path.join(out,'inventory.json')),final.inventorySha256||final.inventory.sha256);
  assert.equal(manifest.runnerSha256,hash(path.join(dir,runner)));assert.equal(manifest.runs.length,nativeCount);
  const observed=read(path.join(out,'observed-wrapper.json'));
  assert.equal(observed.observedWrapperExitCode,0);assert.equal(observed.sourceSha256,frozen);assert.equal(observed.publicMirrorSha256,frozen);
  assert.deepEqual(observed.observedNativeChildExitCodes,manifest.runs.map(r=>r.exitCode));assert.equal(observed.passed,expected);assert.equal(observed.nativeProcesses,nativeCount);
  assert.equal(observed.runner.path,path.relative(root,path.join(dir,runner)).replaceAll('\\','/'));assert.equal(hash(observed.runner.path),observed.runner.sha256);
  for(const key of ['final','inventory','processes']){assert.equal(observed[key].path,key==='processes'?'processes.json':key+'.json');assert.equal(hash(path.join(out,observed[key].path)),observed[key].sha256);}
  if(folder.startsWith('regressions')){
    assert.equal(manifest.runs.filter(r=>r.resumedFrom).length,29);assert.equal(manifest.runs.filter(r=>!r.resumedFrom).length,2);assert.equal(observed.reusedNativeProcesses,29);assert.equal(observed.newNativeProcesses,2);
    assert.equal(path.resolve(manifest.resumedFrom.path),path.join(dir,'regressions/run-02/processes.json'));
    const prior=regressionManifest(manifest.resumedFrom.path);assert.equal(path.resolve(prior.resumedFrom.path),path.join(dir,'regressions/run-01/processes.json'));
    assert.equal(regressionManifest(prior.resumedFrom.path).resumedFrom,undefined);
  }else assert.equal(manifest.resumedFrom,undefined);
  if(folder.startsWith('new-tests')){assert.equal(final.helper,'tests/helpers/stem_widgets_smoke_harness.js');assert.equal(final.helperSha256,hash(final.helper));assert.equal(manifest.helperSha256,final.helperSha256);assert.equal(observed.test.path,final.file);assert.equal(observed.test.sha256,hash(final.file));assert.equal(observed.helper.path,final.helper);assert.equal(observed.helper.sha256,final.helperSha256);}
  const coverage=new Map();let passed=0;
  for(const [index,run] of manifest.runs.entries()){
    assert.equal(run.exitCode,0);assert.equal(run.signal,null);assert.equal(run.error,null);
    for(const key of ['sourceSha256','sourceAfterSha256','mirrorAfterSha256'])assert.equal(run[key],frozen);
    assert.equal(run.testSha256,hash(run.file));assert.equal(run.testAfterSha256,run.testSha256);
    assert.equal(hash(path.join(out,run.receipt)),run.receiptSha256);assert.equal(hash(path.join(out,run.log)),run.logSha256);
    if(folder.startsWith('regressions')){const origin=nativeOrigin(path.join(out,'processes.json'),index);regressionOrigins.set(origin,(regressionOrigins.get(origin)||0)+1);}else assert.equal(run.resumedFrom,undefined);
    const receipt=read(path.join(out,run.receipt));assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,run.expected);
    assert.equal(receipt.testResults.length,1);
    const cases=receipt.testResults[0].assertionResults;
    assert.equal(cases.filter(c=>c.status==='passed').length,receipt.numPassedTests);
    if(!coverage.has(run.file))coverage.set(run.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});
    const item=coverage.get(run.file);assert.deepEqual(cases.map(c=>c.fullName),item.names);
    cases.forEach((c,i)=>{if(c.status==='passed')item.counts[i]++;else assert(['pending','skipped'].includes(c.status));});
    total+=receipt.numPassedTests;passed+=receipt.numPassedTests;processCount++;files.add(run.file);
  }
  assert.equal(passed,expected);for(const item of coverage.values())assert(item.counts.every(n=>n<=1));
  const inventory=read(path.join(out,'inventory.json'));
  if(folder.startsWith('new-tests')){
    assert.equal(coverage.size,1);const item=coverage.get(inventory.file);assert(item);assert.equal(inventory.sha256,hash(inventory.file));assert(item.counts.every(n=>n===1));
    assert.deepEqual(inventory.assertions,item.names.map((fullName,index)=>({index,fullName,executedPassCount:item.counts[index]})));
  }else assert.deepEqual(inventory.files,[...coverage].map(([file,value])=>({file,...value})));
}
assert.equal(total,489);assert.equal(processCount,35);assert.equal(files.size,14);
assert.deepEqual([...regressionOrigins],[['run-01',16],['run-02',13],['run-03',2]].map(([attempt,count])=>[relative(path.join(dir,'regressions',attempt,'processes.json')),count]));
for(const attempt of ['run-01','run-02']){
  const out=path.join(dir,'new-tests',attempt),observed=read(path.join(out,'observed-wrapper.json')),manifest=read(path.join(out,'processes.json'));
  assert.equal(observed.observedWrapperExitCode,1);assert.equal(observed.sourceSha256,frozen);
  assert.equal(hash(path.join(out,observed.testAtRun.path)),observed.testAtRun.sha256);assert.equal(observed.testAtRun.sha256,manifest.testSha256);
  assert.equal(hash(path.join(out,observed.runnerAtRun.path)),observed.runnerAtRun.sha256);assert.equal(observed.runnerAtRun.sha256,manifest.runnerSha256);
  for(const run of manifest.runs){assert.equal(run.sourceSha256,frozen);assert.equal(hash(path.join(out,run.log)),run.logSha256);assert.equal(hash(path.join(out,run.receipt)),run.receiptSha256);}
}
const interruptedDir=path.join(dir,'regressions/run-01'),interrupted=read(path.join(interruptedDir,'interruption.json')),interruptedManifest=read(path.join(interruptedDir,'processes.json'));
assert.equal(interrupted.observedWrapperExitCode,null);assert.equal(interruptedManifest.runs.at(-1).exitCode,2147483651);
for(const key of ['processManifest','runnerSnapshot','failedLog'])assert.equal(hash(path.join(interruptedDir,interrupted[key].path)),interrupted[key].sha256);
assert.equal(interrupted.runnerSnapshot.sha256,interruptedManifest.runnerSha256);assert(fs.readFileSync(path.join(interruptedDir,interrupted.failedLog.path),'utf8').includes('Fatal process out of memory: Worklist::Segment::Create'));
assert.equal(interrupted.failedLog.path,interruptedManifest.runs.at(-1).log);assert.equal(interrupted.failedLog.sha256,interruptedManifest.runs.at(-1).logSha256);
const startupDir=path.join(dir,'regressions/run-02'),startup=read(path.join(startupDir,'observed-wrapper.json')),startupManifest=read(path.join(startupDir,'processes.json')),startupRun=startupManifest.runs.at(-1);
assert.equal(startup.observedWrapperExitCode,1);assert.equal(startup.sourceSha256,frozen);assert.equal(startup.publicMirrorSha256,frozen);
assert.equal(startupManifest.runs.length,30);assert.equal(startupRun.exitCode,1);assert.equal(startupRun.signal,null);assert.equal(startupRun.error,null);assert.equal(startupRun.passed,undefined);
assert.equal(startupManifest.runs.filter(run=>run.resumedFrom).length,16);assert.equal(startupManifest.runs.filter(run=>!run.resumedFrom&&run.exitCode===0).length,13);
for(const field of ['sourceSha256','sourceAfterSha256','mirrorAfterSha256'])assert.equal(startupRun[field],frozen);
assert.equal(startupRun.testSha256,hash(startupRun.file));assert.equal(startupRun.testAfterSha256,startupRun.testSha256);
for(const field of ['processManifest','runnerSnapshot','failedLog','failedReceipt'])assert.equal(hash(path.join(startupDir,startup[field].path)),startup[field].sha256);
assert.equal(startup.processManifest.path,'processes.json');assert.equal(startup.runnerSnapshot.sha256,startupManifest.runnerSha256);
assert.equal(startup.failedLog.path,startupRun.log);assert.equal(startup.failedLog.sha256,startupRun.logSha256);assert.equal(startup.failedReceipt.path,startupRun.receipt);assert.equal(startup.failedReceipt.sha256,startupRun.receiptSha256);
const startupReceipt=read(path.join(startupDir,startupRun.receipt));assert.equal(startupReceipt.success,false);assert.equal(startupReceipt.numTotalTests,0);assert.equal(startupReceipt.numPassedTests,0);assert.equal(startupReceipt.numFailedTests,0);assert.deepEqual(startupReceipt.testResults,[]);
const startupLog=fs.readFileSync(path.join(startupDir,startupRun.log),'utf8');assert(startupLog.includes('ERR_MODULE_NOT_FOUND'));assert(startupLog.includes('parse5/dist/common/error-codes.js'));
const browserInterruption=read(path.join(dir,'browser/run-01/interruption.json'));
assert.equal(browserInterruption.status,'incomplete');assert.equal(browserInterruption.excludedFromFinalEvidence,true);assert.equal(browserInterruption.sourceSha256,frozen);
assert.equal(browserInterruption.observedNativeChildExitCode,null);assert.equal(browserInterruption.observedWrapperExitCode,null);assert.equal(browserInterruption.completedScreenshots,3);
for(const item of browserInterruption.files)assert.equal(hash(item.path),item.sha256);
assert.equal(browserInterruption.files.filter(item=>item.path.endsWith('.png')).length,3);
const pointer=read(path.join(dir,'browser/final.json')),browser=read(pointer.process.path);
assert.equal(path.resolve(pointer.process.path),path.join(dir,'browser/run-03/process.json'));
const failedBrowser=read(path.join(dir,'browser/run-02/observed-wrapper.json'));
assert.equal(failedBrowser.excludedFromFinalEvidence,true);assert.equal(failedBrowser.sourceSha256,frozen);assert.equal(failedBrowser.observedNativeChildExitCode,1);assert.equal(failedBrowser.observedWrapperExitCode,1);
for(const key of ['process','results','harnessSnapshot','wrapperSnapshot','attempt'])assert.equal(hash(failedBrowser[key].path),failedBrowser[key].sha256);
const failedBrowserProcess=read(failedBrowser.process.path),failedBrowserResults=read(failedBrowser.results.path),failedBrowserAttempt=read(failedBrowser.attempt.path);
assert.equal(failedBrowserProcess.observedExitCode,1);assert.equal(failedBrowserProcess.harnessSnapshot.sha256,failedBrowser.harnessSnapshot.sha256);assert.equal(failedBrowserProcess.results.sha256,failedBrowser.results.sha256);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(failedBrowserProcess[key],frozen);
assert.equal(failedBrowserProcess.errors.length,1);assert.deepEqual(failedBrowserResults.errors,failedBrowserProcess.errors);assert(failedBrowserProcess.errors[0].includes('Rounded screw radians recover total turns: restored bar'));
assert.equal(failedBrowserAttempt.productionChanged,false);assert(failedBrowserAttempt.absoluteDifferenceInPercentagePoints>failedBrowserAttempt.oldTolerance);assert(failedBrowserAttempt.absoluteDifferenceInPercentagePoints<failedBrowserAttempt.newTolerance);
assert.equal(hash(pointer.process.path),pointer.process.sha256);
assert.equal(pointer.status,'passed');assert.equal(pointer.sourceSha256,frozen);
for(const key of ['results','harness']){assert.equal(pointer[key].path,browser[key].path);assert.equal(pointer[key].sha256,browser[key].sha256);}
assert.equal(pointer.observedNativeChildExitCode,0);assert.equal(pointer.observedWrapperExitCode,0);
for(const key of ['results','visualReview','harness','wrapper'])assert.equal(hash(pointer[key].path),pointer[key].sha256);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);assert.deepEqual(browser.errors,[]);
for(const key of ['harness','harnessSnapshot','helperPreamble','baseHarness','results','console'])assert.equal(hash(browser[key].path),browser[key].sha256);
assert.equal(browser.harness.sha256,browser.harnessSnapshot.sha256);
const results=read(browser.results.path);assert.equal(results.sourceSha256,frozen);assert.deepEqual(results.errors,[]);
const baseKinds=['inputPower','usefulPower','lossPower','handSpeed','loadSpeed','budgetTime','budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency','effortFromPower','loadFromPower','powerKilowatts','powerWatts','timeMinutes','timeSeconds','speedCentimetres','speedMetres'];
const expectedRoutes=['lever','pulley','ramp','wedge','windlass','screw'].flatMap(bench=>baseKinds.concat(['windlass','screw'].includes(bench)?['torque','rpm','turns','angularTravel','omega','rotationalWork','rotationalPower']:[]).map(kind=>bench+'/'+kind));
assert.equal(results.routes.length,122);assert.equal(new Set(results.routes).size,122);assert.deepEqual([...results.routes].sort(),expectedRoutes.sort());
assert.equal(results.checks.length,browser.checks);assert(browser.checks>0);assert.equal(browser.scenarios,4);assert.equal(results.scenarios,4);assert.equal(browser.screenshots.length,4);
assert.equal(new Set(browser.screenshots.map(shot=>shot.path)).size,4);
assert.deepEqual(results.shots.map(name=>name+'.png').sort(),browser.screenshots.map(shot=>path.basename(shot.path)).sort());
const visual=read(pointer.visualReview.path),rootVisual=read(path.join(dir,'browser/root-visual-review.json'));
assert.equal(rootVisual.sourceSha256,frozen);assert.equal(visual.screenshots.length,4);assert.equal(rootVisual.screenshots.length,4);
for(const shot of browser.screenshots){
  assert.equal(hash(shot.path),shot.sha256);assert(shot.width>0&&shot.height>0);
  const reviewer=visual.screenshots.filter(s=>s.name===path.basename(shot.path)),rootReviewer=rootVisual.screenshots.filter(s=>s.path===shot.path);
  assert.equal(reviewer.length,1);assert.equal(reviewer[0].visuallyInspected,true);assert.equal(rootReviewer.length,1);assert.equal(rootReviewer[0].sha256,shot.sha256);assert.equal(rootReviewer[0].visuallyInspected,true);
}
const summary={sourceSha256:frozen,onlyStationPowerLabChanged:true,onlyReadOnlyPanelAndCallAdded:true,tests:total,testFiles:files.size,nativeTestProcesses:processCount,regressionNativeProcessOrigins:Object.fromEntries(regressionOrigins),browserChecks:browser.checks,browserScenarios:browser.scenarios,inspectedScreenshots:browser.screenshots.length,sourceMirrorParity:true};
fs.writeFileSync(path.join(dir,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
