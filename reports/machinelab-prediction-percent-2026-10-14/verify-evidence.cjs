const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),cp=require('child_process');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const frozen='63019f670d4a624220e36d4c3d1bf13e506f2d41f7bf76e49fb6b694a6884a06';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});
const scope=read(dir+'/source-scope.json');assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);
for(const key of ['onlyPredictionHelpersChanged','physicalPredictionModelUnchanged','legacyValueGradingByteIdentical','mainCalculationsAndSavedRecordsUnchanged','sourceMirrorParity','syntax'])assert.equal(scope[key],true);
const out=dir+'/tests/run-01',manifest=read(out+'/processes.json'),final=read(out+'/final.json'),observed=read(out+'/observed-wrapper.json');
const formatting=read(dir+'/test-formatting.json'),testedSource=read(formatting.testedSnapshot).source;assert.equal(formatting.file,'tests/machinelab_prediction_percent.test.js');assert.equal(hash(formatting.file),formatting.currentSha256);assert.equal(hash(formatting.testedSnapshot),formatting.snapshotSha256);assert.equal(crypto.createHash('sha256').update(testedSource).digest('hex'),formatting.testedSha256);assert.equal(testedSource,fs.readFileSync(formatting.file,'utf8')+'\n');
const testedHash=file=>file===formatting.file?formatting.testedSha256:hash(file);
assert.equal(manifest.sourceSha256,frozen);assert.equal(manifest.runnerSha256,hash(out+'/runner-snapshot.cjs'));assert.equal(manifest.runnerSha256,hash(dir+'/run-tests.cjs'));assert.equal(manifest.runs.length,17);
assert.equal(final.sourceSha256,frozen);assert.equal(final.passed,119);assert.equal(final.failed,0);assert.equal(final.uncovered,0);assert.equal(hash(out+'/processes.json'),final.processManifest.sha256);assert.equal(hash(out+'/inventory.json'),final.inventory.sha256);
assert.equal(observed.observedWrapperExitCode,0);assert.equal(observed.sourceSha256,frozen);assert.equal(observed.publicMirrorSha256,frozen);assert.equal(observed.passed,119);assert.deepEqual(observed.observedNativeChildExitCodes,manifest.runs.map(r=>r.exitCode));
for(const key of ['final','inventory','processes'])assert.equal(hash(out+'/'+observed[key].path),observed[key].sha256);
assert.equal(hash(manifest.helper),manifest.helperSha256);assert.equal(observed.runner.sha256,manifest.runnerSha256);assert.deepEqual(observed.tests,manifest.tests);
const coverage=new Map();let passed=0;
for(const row of manifest.runs){
  assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);
  for(const key of ['sourceSha256','sourceAfterSha256','mirrorBeforeSha256','mirrorAfterSha256'])assert.equal(row[key],frozen);
  assert.equal(row.testSha256,testedHash(row.file));assert.equal(row.testAfterSha256,row.testSha256);assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);assert.equal(hash(out+'/'+row.log),row.logSha256);
  const receipt=read(out+'/'+row.receipt);assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,row.expected);assert.equal(receipt.testResults.length,1);
  const cases=receipt.testResults[0].assertionResults;assert.equal(cases.filter(c=>c.status==='passed').length,row.expected);
  if(!coverage.has(row.file))coverage.set(row.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});const item=coverage.get(row.file);assert.deepEqual(cases.map(c=>c.fullName),item.names);
  cases.forEach((c,i)=>{if(c.status==='passed')item.counts[i]++;else assert(['pending','skipped'].includes(c.status));});passed+=row.expected;
}
assert.equal(passed,119);assert.equal(coverage.size,5);for(const item of coverage.values())assert(item.counts.every(n=>n===1));
assert.deepEqual(read(out+'/inventory.json').files,[...coverage].map(([file,item])=>({file,sha256:testedHash(file),...item})));
for(const test of manifest.tests){assert.equal(test.sha256,testedHash(test.file));if(test.baselineSha256){assert.equal(test.sha256,test.baselineSha256);assert.equal(crypto.createHash('sha256').update(cp.execFileSync('git',['show','3c3deb314:'+test.file],{maxBuffer:4e6})).digest('hex'),test.sha256);}else assert.equal(test.file,'tests/machinelab_prediction_percent.test.js');}
const correction=read(dir+'/browser/harness-correction.json'),failed=read(correction.observedWrapper.path);assert.equal(correction.productionSourceUnchanged,frozen);
assert.equal(hash(correction.snapshot.path),correction.previousHarnessSha256);assert.equal(hash('dev-tools/ml_prediction_percent_qa.cjs'),correction.harnessSha256);
assert.equal(fs.readFileSync(correction.snapshot.path,'utf8').replace(correction.oldAssertion,correction.newAssertion),fs.readFileSync('dev-tools/ml_prediction_percent_qa.cjs','utf8'));
assert.equal(hash(correction.observedWrapper.path),correction.observedWrapper.sha256);assert.equal(failed.observedWrapperExitCode,1);assert.equal(failed.observedNativeChildExitCode,1);for(const key of ['process','results','harnessSnapshot'])assert.equal(hash(failed[key].path),failed[key].sha256);
const failedResults=read(failed.results.path);assert.equal(failedResults.errors.length,1);assert(failedResults.errors[0].includes('selected radio card'));
const browser=read(dir+'/browser/run-02/process.json'),results=read(browser.results.path),browserObserved=read(dir+'/browser/run-02/observed-wrapper.json');
assert.equal(browserObserved.observedWrapperExitCode,0);assert.equal(browserObserved.observedNativeChildExitCode,0);assert.equal(browserObserved.sourceSha256,frozen);assert.equal(browserObserved.process.sha256,hash(dir+'/browser/run-02/process.json'));assert.deepEqual(browserObserved.results,browser.results);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);assert.deepEqual(browser.errors,[]);assert.deepEqual(results.errors,[]);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);assert.equal(browser.dependenciesUnchanged,true);for(const item of browser.dependencies)assert.equal(hash(item.path),item.sha256);for(const key of ['results','console'])assert.equal(hash(browser[key].path),browser[key].sha256);
const routes=['lever','pulley','ramp','wedge','windlass','screw'].flatMap(b=>['time','efficiency','load','work'].map(k=>b+'/'+k));assert.equal(results.sourceSha256,frozen);assert.equal(results.routes.length,24);assert.deepEqual([...results.routes].sort(),routes.sort());
assert.equal(browser.checks,results.checks.length);assert(browser.checks>700);assert.equal(browser.scenarios,4);assert.equal(browser.screenshots.length,4);
const names=['desktop-pending-percent','desktop-checked-percent','dark-phone-increase-percent','forced-colors-phone-zero-percent'];assert.deepEqual([...results.shots].sort(),[...names].sort());assert.deepEqual(browser.screenshots.map(s=>path.basename(s.path)).sort(),names.map(n=>n+'.png').sort());
const focus=results.observations.filter(o=>o.focus);assert.deepEqual(focus.map(o=>o.label).sort(),names.flatMap(n=>['check','check-number','target','number'].map(a=>n+' '+a+' keyboard focus')).sort());for(const o of focus)assert(o.focus.active&&o.focus.visible&&o.focus.outline!=='none'&&o.focus.width>=3&&o.focus.contrast>=3);
const visual=read(dir+'/browser/visual-review.json'),rootVisual=read(dir+'/browser/root-visual-review.json');
for(const review of [visual,rootVisual]){assert.equal(review.sourceSha256,frozen);assert.equal(review.screenshots.length,4);for(const shot of browser.screenshots){assert.equal(hash(shot.path),shot.sha256);const match=review.screenshots.filter(s=>s.path===shot.path);assert.equal(match.length,1);assert.equal(match[0].sha256,shot.sha256);assert.equal(match[0].visuallyInspected,true);}}
const summary={sourceSha256:frozen,tests:119,newTests:28,unchangedTests:91,testFiles:5,nativeTestGroups:17,browserChecks:browser.checks,percentRoutes:24,browserScenarios:4,inspectedScreenshots:4,physicalPredictionModelUnchanged:true,legacyValueGradingUnchanged:true,sourceMirrorParity:true};fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
