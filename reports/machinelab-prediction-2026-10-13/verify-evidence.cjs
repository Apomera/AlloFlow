const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),cp=require('child_process');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const frozen='ead716145aa5dda704b6f3fe3dd0e624b57456054af2a1036a6c0e69c38152b3';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});
const scope=read(dir+'/source-scope.json');assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);assert.equal(scope.onlyPredictionHelpersAndRenderCallAdded,true);assert.equal(scope.existingMathGradingRecordsAndCallbacksUnchanged,true);
let total=0,nativeGroups=0;const files=new Set();
for(const [folder,expected,groupCount,runner] of [['new-tests/run-04',28,5,'run-new-tests.cjs'],['regressions/run-03',218,13,'run-regressions.cjs']]){
  const out=dir+'/'+folder,manifest=read(out+'/processes.json'),final=read(out+'/final.json'),observed=read(out+'/observed-wrapper.json');
  assert.equal(manifest.sourceSha256,frozen);assert.equal(manifest.runnerSha256,hash(dir+'/'+runner));assert.equal(manifest.runs.length,groupCount);
  assert.equal(final.sourceSha256,frozen);assert.equal(final.passed,expected);assert.equal(final.failed,0);
  assert.equal(hash(out+'/processes.json'),final.processManifestSha256||final.processManifest.sha256);assert.equal(hash(out+'/inventory.json'),final.inventorySha256||final.inventory.sha256);
  assert.equal(observed.observedWrapperExitCode,0);assert.equal(observed.sourceSha256,frozen);assert.equal(observed.publicMirrorSha256,frozen);assert.equal(observed.passed,expected);assert.equal(observed.nativeProcesses,groupCount);
  assert.deepEqual(observed.observedNativeChildExitCodes,manifest.runs.map(r=>r.exitCode));
  for(const key of ['final','inventory','processes']){assert.equal(observed[key].path,key+'.json');assert.equal(hash(out+'/'+observed[key].path),observed[key].sha256);}
  assert.equal(observed.runner.sha256,hash(dir+'/'+runner));
  if(folder.startsWith('regressions')){assert.equal(observed.reusedNativeProcesses,10);assert.equal(observed.newNativeProcesses,3);assert.equal(manifest.runs.filter(r=>r.resumedFrom).length,10);assert.equal(hash(manifest.resumedFrom.path),manifest.resumedFrom.sha256);assert.equal(hash(manifest.resumedFrom.runnerSnapshot),manifest.resumedFrom.runnerSha256);}
  const coverage=new Map();let passed=0;
  for(const row of manifest.runs){
    assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert(!row.timedOut);assert.equal(row.sourceSha256,frozen);
    for(const key of ['sourceAfterSha256','mirrorBeforeSha256','mirrorAfterSha256','mirrorSha256'])if(row[key])assert.equal(row[key],frozen);
    assert.equal(row.testSha256,hash(row.file));if(row.testAfterSha256)assert.equal(row.testAfterSha256,row.testSha256);
    assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);assert.equal(hash(out+'/'+row.log),row.logSha256);
    if(row.resumedFrom){assert.equal(row.resumedFrom.manifest,manifest.resumedFrom.path);assert.equal(row.resumedFrom.index,manifest.runs.indexOf(row));const prior=read(row.resumedFrom.manifest);assert.equal(prior.sourceSha256,frozen);assert.equal(prior.runnerSha256,manifest.resumedFrom.runnerSha256);const old=prior.runs[row.resumedFrom.index];for(const key of ['file','pattern','expected','testSha256','exitCode','signal','error','sourceSha256','mirrorSha256','receiptSha256','logSha256','passed'])assert.deepEqual(row[key],old[key]);const oldDir=path.dirname(row.resumedFrom.manifest);assert.equal(hash(oldDir+'/'+old.receipt),old.receiptSha256);assert.equal(hash(oldDir+'/'+old.log),old.logSha256);}
    const receipt=read(out+'/'+row.receipt);assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,row.expected);assert.equal(receipt.testResults.length,1);
    const cases=receipt.testResults[0].assertionResults;assert.equal(cases.filter(c=>c.status==='passed').length,row.expected);
    if(!coverage.has(row.file))coverage.set(row.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});
    const item=coverage.get(row.file);assert.deepEqual(cases.map(c=>c.fullName),item.names);cases.forEach((c,i)=>{if(c.status==='passed')item.counts[i]++;else assert(['pending','skipped'].includes(c.status));});
    passed+=row.expected;total+=row.expected;nativeGroups++;files.add(row.file);
  }
  assert.equal(passed,expected);for(const item of coverage.values())assert(item.counts.every(n=>n<=1));
  const inventory=read(out+'/inventory.json');
  if(folder.startsWith('new-tests')){
    assert.equal(hash(final.helper),final.helperSha256);assert.equal(manifest.helperSha256,final.helperSha256);assert.equal(observed.test.sha256,hash(final.file));assert.equal(observed.helper.sha256,final.helperSha256);
    const item=coverage.get(final.file);assert(item.counts.every(n=>n===1));assert.deepEqual(inventory.assertions,item.names.map((fullName,index)=>({index,fullName,executedPassCount:item.counts[index]})));
  }else{assert.equal(hash(manifest.helper),manifest.helperSha256);assert.deepEqual(inventory.files,[...coverage].map(([file,item])=>({file,...item})));}
}
assert.equal(total,246);assert.equal(files.size,7);assert.equal(nativeGroups,18);
const spaceDir=dir+'/regressions/run-02',spaceFailure=read(spaceDir+'/observed-wrapper.json'),spaceManifest=read(spaceDir+'/processes.json');
assert.equal(spaceFailure.observedWrapperExitCode,1);assert.equal(spaceFailure.sourceSha256,frozen);assert.equal(spaceManifest.runs.length,11);assert.equal(spaceManifest.runs.at(-1).exitCode,1);assert.equal(spaceManifest.runs.at(-1).passed,undefined);
for(const key of ['processManifest','runnerSnapshot','failedLog','failedReceipt'])assert.equal(hash(spaceDir+'/'+spaceFailure[key].path),spaceFailure[key].sha256);
assert.equal(spaceFailure.runnerSnapshot.sha256,spaceManifest.runnerSha256);assert.equal(spaceFailure.failedLog.path,spaceManifest.runs.at(-1).log);assert.equal(spaceFailure.failedReceipt.path,spaceManifest.runs.at(-1).receipt);
assert.equal(fs.statSync(spaceDir+'/'+spaceFailure.failedReceipt.path).size,0);assert(fs.readFileSync(spaceDir+'/'+spaceFailure.failedLog.path,'utf8').includes('ENOSPC'));
const preflightDir=dir+'/new-tests/run-01',preflight=read(preflightDir+'/observed-wrapper.json');
assert.equal(preflight.observedWrapperExitCode,1);assert.equal(preflight.nativeProcesses,0);assert.equal(preflight.passed,0);assert.equal(preflight.sourceSha256AfterRejection,'066f5c3c30dcb04fdf120a3add27cdb9ba716cfbfc6f8ca7dfb296e0af132ed6');
for(const key of ['runnerSnapshot','testSnapshot'])assert.equal(hash(preflightDir+'/'+preflight[key].path),preflight[key].sha256);
const failureDir=dir+'/new-tests/run-02',failure=read(failureDir+'/observed-wrapper.json'),failedManifest=read(failureDir+'/processes.json');
assert.equal(failure.observedWrapperExitCode,1);assert.equal(failure.sourceSha256,'066f5c3c30dcb04fdf120a3add27cdb9ba716cfbfc6f8ca7dfb296e0af132ed6');assert.deepEqual(failure.observedNativeChildExitCodes,failedManifest.runs.map(r=>r.exitCode));
for(const key of ['processManifest','runnerSnapshot','testSnapshot'])assert.equal(hash(failureDir+'/'+failure[key].path),failure[key].sha256);
assert.equal(failure.testSnapshot.sha256,failedManifest.testSha256);assert.equal(failure.runnerSnapshot.sha256,failedManifest.runnerSha256);
for(const row of failedManifest.runs){assert.equal(hash(failureDir+'/'+row.receipt),row.receiptSha256);assert.equal(hash(failureDir+'/'+row.log),row.logSha256);assert.equal(row.sourceSha256,'066f5c3c30dcb04fdf120a3add27cdb9ba716cfbfc6f8ca7dfb296e0af132ed6');}
assert.equal(failedManifest.runs.at(-1).exitCode,1);assert.equal(read(failureDir+'/'+failedManifest.runs.at(-1).receipt).numFailedTests,1);
const priorSource='066f5c3c30dcb04fdf120a3add27cdb9ba716cfbfc6f8ca7dfb296e0af132ed6',labelCorrection=read(dir+'/label-correction.json');
assert.equal(labelCorrection.previousSourceSha256,priorSource);assert.equal(labelCorrection.sourceSha256,frozen);
let initialCandidate=fs.readFileSync('stem_lab/stem_tool_machinelab.js','utf8');
for(const [short,long] of [['Time → input power','Change time → predict input power'],['Efficiency → input power','Change efficiency → predict input power'],['Load → input power','Change load → predict input power'],['Time → input energy','Change time → predict input energy']])initialCandidate=initialCandidate.replace("'"+short+"'","'"+long+"'");
assert.equal(crypto.createHash('sha256').update(initialCandidate).digest('hex'),priorSource);
for(const [folder,expected,snapshot] of [['new-tests/run-03',28,'runner-at-run.cjs'],['regressions/run-01',218,'runner-snapshot.cjs']]){
  const out=dir+'/'+folder,observed=read(out+'/observed-wrapper.json'),manifest=read(out+'/processes.json'),final=read(out+'/final.json');
  assert.equal(observed.observedWrapperExitCode,0);assert.equal(observed.sourceSha256,priorSource);assert.equal(manifest.sourceSha256,priorSource);assert.equal(final.sourceSha256,priorSource);assert.equal(final.passed,expected);assert.equal(observed.passed,expected);
  assert.equal(hash(out+'/'+snapshot),manifest.runnerSha256);assert.equal(observed.runner.sha256,manifest.runnerSha256);
  for(const key of ['final','inventory','processes']){assert.equal(observed[key].path,key+'.json');assert.equal(hash(out+'/'+observed[key].path),observed[key].sha256);}
  assert.deepEqual(observed.observedNativeChildExitCodes,manifest.runs.map(r=>r.exitCode));let count=0;
  for(const row of manifest.runs){assert.equal(row.exitCode,0);assert.equal(row.sourceSha256,priorSource);assert.equal(row.testSha256,hash(row.file));assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);assert.equal(hash(out+'/'+row.log),row.logSha256);const receipt=read(out+'/'+row.receipt);assert.equal(receipt.success,true);assert.equal(receipt.numPassedTests,row.expected);assert.equal(receipt.numFailedTests,0);count+=row.expected;}
  assert.equal(count,expected);
}
const failedBrowser=read(dir+'/browser/run-01/observed-wrapper.json');assert.equal(failedBrowser.sourceSha256,priorSource);assert.equal(failedBrowser.observedWrapperExitCode,1);assert.equal(failedBrowser.observedNativeChildExitCode,1);
for(const key of ['process','results','harnessSnapshot','wrapperSnapshot'])assert.equal(hash(failedBrowser[key].path),failedBrowser[key].sha256);
const failedBrowserProcess=read(failedBrowser.process.path),failedBrowserResults=read(failedBrowser.results.path);assert.equal(failedBrowserProcess.observedExitCode,1);assert.equal(failedBrowserProcess.sourceSha256,priorSource);
assert.deepEqual(failedBrowserResults.errors,failedBrowser.findings);assert.deepEqual(failedBrowserProcess.errors,failedBrowser.findings);assert.equal(failedBrowser.findings.length,2);
for(const shot of failedBrowserProcess.screenshots)assert.equal(hash(shot.path),shot.sha256);
const pointer=read(dir+'/browser/final.json'),browser=read(pointer.process.path),results=read(pointer.results.path);
assert.equal(path.resolve(pointer.process.path),path.join(dir,'browser/run-02/process.json'));assert.equal(browser.harness.sha256,failedBrowser.harnessSnapshot.sha256);
assert.equal(pointer.status,'passed');assert.equal(pointer.sourceSha256,frozen);assert.equal(pointer.observedNativeChildExitCode,0);assert.equal(pointer.observedWrapperExitCode,0);
for(const key of ['process','results','harness','wrapper','visualReview'])assert.equal(hash(pointer[key].path),pointer[key].sha256);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);assert.deepEqual(browser.errors,[]);assert.deepEqual(results.errors,[]);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);for(const key of ['harness','harnessSnapshot','wrapperSnapshot','helperPreamble','baseHarness','console','results'])assert.equal(hash(browser[key].path),browser[key].sha256);
assert.equal(browser.harness.sha256,browser.harnessSnapshot.sha256);assert.equal(pointer.results.sha256,browser.results.sha256);assert.equal(pointer.wrapper.sha256,browser.wrapperSnapshot.sha256);
const routes=['lever','pulley','ramp','wedge','windlass','screw'].flatMap(b=>['time','efficiency','load','work'].map(k=>b+'/'+k));
assert.equal(results.sourceSha256,frozen);assert.equal(results.routes.length,24);assert.equal(new Set(results.routes).size,24);assert.deepEqual([...results.routes].sort(),routes.sort());
assert.equal(browser.checks,results.checks.length);assert(browser.checks>0);assert.equal(browser.scenarios,4);assert.equal(results.scenarios,4);assert.equal(browser.screenshots.length,4);
assert.deepEqual(results.shots.map(n=>n+'.png').sort(),browser.screenshots.map(s=>path.basename(s.path)).sort());
assert.equal(new Set(browser.screenshots.map(s=>s.path)).size,4);
assert.deepEqual([...results.shots].sort(),['desktop-time-prediction','desktop-efficiency-prediction','dark-phone-work-prediction','forced-colors-phone-load-prediction'].sort());
const visual=read(pointer.visualReview.path),rootVisual=read(dir+'/browser/root-visual-review.json');assert.equal(rootVisual.sourceSha256,frozen);assert.equal(visual.screenshots.length,4);assert.equal(rootVisual.screenshots.length,4);
for(const shot of browser.screenshots){assert.equal(hash(shot.path),shot.sha256);const a=visual.screenshots.filter(s=>s.name===path.basename(shot.path)),b=rootVisual.screenshots.filter(s=>s.path===shot.path);assert.equal(a.length,1);assert.equal(b.length,1);assert.equal(a[0].visuallyInspected,true);assert.equal(b[0].visuallyInspected,true);assert.equal(b[0].sha256,shot.sha256);}
const summary={sourceSha256:frozen,tests:total,testFiles:files.size,nativeTestGroups:nativeGroups,browserChecks:browser.checks,browserScenarios:4,predictionRoutes:24,inspectedScreenshots:4,onlyPredictionHelpersAndRenderCallAdded:true,sourceMirrorParity:true};
fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
