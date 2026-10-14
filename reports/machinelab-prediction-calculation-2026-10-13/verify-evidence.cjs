const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),cp=require('child_process');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const frozen='a870651502478d2885948b0c08f2065cbebefcf135241efb4c8da6ec0837f5ee';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});
const scope=read(dir+'/source-scope.json');assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);
for(const key of ['onlyPredictionHelpersChanged','predictionModelUnchanged','existingMathGradingRecordsAndCallbacksUnchanged','sourceMirrorParity','syntax'])assert.equal(scope[key],true);
let total=0,nativeGroups=0;const files=new Set();
for(const [folder,expected,groupCount,runner,snapshot] of [['new-tests/run-01',27,5,'run-new-tests.cjs','runner-at-run.cjs'],['regressions/run-01',117,9,'run-regressions.cjs','runner-snapshot.cjs']]){
  const out=dir+'/'+folder,manifest=read(out+'/processes.json'),final=read(out+'/final.json'),observed=read(out+'/observed-wrapper.json');
  assert.equal(manifest.sourceSha256,frozen);assert.equal(manifest.runnerSha256,hash(dir+'/'+runner));assert.equal(hash(out+'/'+snapshot),manifest.runnerSha256);assert.equal(manifest.runs.length,groupCount);
  assert.equal(final.sourceSha256,frozen);assert.equal(final.passed,expected);assert.equal(final.failed,0);
  assert.equal(hash(out+'/processes.json'),final.processManifestSha256||final.processManifest.sha256);assert.equal(hash(out+'/inventory.json'),final.inventorySha256||final.inventory.sha256);
  assert.equal(observed.observedWrapperExitCode,0);assert.equal(observed.sourceSha256,frozen);assert.equal(observed.publicMirrorSha256,frozen);assert.equal(observed.passed,expected);assert.equal(observed.nativeProcesses,groupCount);
  assert.deepEqual(observed.observedNativeChildExitCodes,manifest.runs.map(r=>r.exitCode));assert.equal(observed.runner.sha256,hash(dir+'/'+runner));
  for(const key of ['final','inventory','processes']){assert.equal(observed[key].path,key+'.json');assert.equal(hash(out+'/'+observed[key].path),observed[key].sha256);}
  const coverage=new Map();let passed=0;
  for(const row of manifest.runs){
    assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert(!row.timedOut);assert.equal(row.sourceSha256,frozen);
    for(const key of ['sourceAfterSha256','mirrorBeforeSha256','mirrorAfterSha256','mirrorSha256'])if(row[key])assert.equal(row[key],frozen);
    assert.equal(row.testSha256,hash(row.file));if(row.testAfterSha256)assert.equal(row.testAfterSha256,row.testSha256);
    assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);assert.equal(hash(out+'/'+row.log),row.logSha256);
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
    assert.equal(hash(out+'/test-at-run.js'),hash(final.file));const item=coverage.get(final.file);assert(item.counts.every(n=>n===1));
    assert.deepEqual(inventory.assertions,item.names.map((fullName,index)=>({index,fullName,executedPassCount:item.counts[index]})));
  }else{
    assert.equal(hash(manifest.helper),manifest.helperSha256);assert.deepEqual(inventory.files,[...coverage].map(([file,item])=>({file,...item})));
    for(const file of coverage.keys())assert.equal(crypto.createHash('sha256').update(cp.execFileSync('git',['show','3594d5c4f:'+file],{maxBuffer:4e6})).digest('hex'),hash(file));
  }
}
assert.equal(total,144);assert.equal(files.size,5);assert.equal(nativeGroups,14);
const pointer=read(dir+'/browser/final.json'),browser=read(pointer.process.path),results=read(pointer.results.path);
assert.equal(path.resolve(pointer.process.path),path.join(dir,'browser/run-01/process.json'));
assert.equal(pointer.status,'passed');assert.equal(pointer.sourceSha256,frozen);assert.equal(pointer.observedNativeChildExitCode,0);assert.equal(pointer.observedWrapperExitCode,0);
for(const key of ['process','results','harness','wrapper','visualReview'])assert.equal(hash(pointer[key].path),pointer[key].sha256);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);assert.deepEqual(browser.errors,[]);assert.deepEqual(results.errors,[]);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);for(const key of ['harness','harnessSnapshot','wrapperSnapshot','helperPreamble','baseHarness','console','results'])assert.equal(hash(browser[key].path),browser[key].sha256);
assert.equal(browser.harness.sha256,browser.harnessSnapshot.sha256);assert.equal(pointer.results.sha256,browser.results.sha256);assert.equal(pointer.wrapper.sha256,browser.wrapperSnapshot.sha256);
const routes=['lever','pulley','ramp','wedge','windlass','screw'].flatMap(b=>['time','efficiency','load','work'].map(k=>b+'/'+k));
assert.equal(results.sourceSha256,frozen);assert.equal(results.routes.length,24);assert.equal(new Set(results.routes).size,24);assert.deepEqual([...results.routes].sort(),routes.sort());
assert.equal(browser.checks,results.checks.length);assert(browser.checks>0);assert.equal(browser.scenarios,4);assert.equal(results.scenarios,4);assert.equal(browser.screenshots.length,4);
assert.deepEqual(results.shots.map(n=>n+'.png').sort(),browser.screenshots.map(s=>path.basename(s.path)).sort());assert.equal(new Set(browser.screenshots.map(s=>s.path)).size,4);
assert.deepEqual([...results.shots].sort(),['desktop-pending-calculation','desktop-checked-calculation','dark-phone-energy-calculation','forced-colors-phone-load-calculation'].sort());
const visual=read(pointer.visualReview.path),rootVisual=read(dir+'/browser/root-visual-review.json');
assert.equal(rootVisual.sourceSha256,frozen);assert.equal(visual.sourceSha256,frozen);assert.equal(visual.screenshots.length,4);assert.equal(rootVisual.screenshots.length,4);
for(const shot of browser.screenshots){assert.equal(hash(shot.path),shot.sha256);const a=visual.screenshots.filter(s=>s.name===path.basename(shot.path)),b=rootVisual.screenshots.filter(s=>s.path===shot.path);assert.equal(a.length,1);assert.equal(b.length,1);assert.equal(a[0].visuallyInspected,true);assert.equal(b[0].visuallyInspected,true);assert.equal(a[0].sha256,shot.sha256);assert.equal(b[0].sha256,shot.sha256);}
const summary={sourceSha256:frozen,tests:total,testFiles:files.size,nativeTestGroups:nativeGroups,browserChecks:browser.checks,browserScenarios:4,calculationRoutes:24,inspectedScreenshots:4,onlyPredictionHelpersChanged:true,predictionModelUnchanged:true,sourceMirrorParity:true};
fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
