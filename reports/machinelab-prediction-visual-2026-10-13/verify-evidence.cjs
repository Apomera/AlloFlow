const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),cp=require('child_process');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const frozen='beec1ea14944e6225b401e3f8b6235413535ed8f6059dbf3f4160ddf817b5af3',previous='458d63e5be5dbceeb459959efff12b4c900ca00913a851946deb5116d2f5db04';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});
const scope=read(dir+'/source-scope.json');assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);
for(const key of ['onlyPredictionPracticeChanged','predictionOutcomeAndModelSelectionUnchanged','allEventCallbacksByteIdentical','existingMathStateGradingRecordsAndOtherViewsUnchanged','sourceMirrorParity','syntax'])assert.equal(scope[key],true);assert.equal(scope.eventCallbacks,6);
const correction=read(dir+'/focus-correction.json'),source=fs.readFileSync('stem_lab/stem_tool_machinelab.js','utf8');assert.equal(correction.sourceSha256,frozen);assert.equal(correction.previousSourceSha256,previous);
assert.equal(source.split(correction.newSelectors).length,2);assert.equal(crypto.createHash('sha256').update(source.replace(correction.newSelectors,correction.oldSelectors)).digest('hex'),previous);
function verifyTests(folder,pinned,current){
  const out=dir+'/'+folder,manifest=read(out+'/processes.json'),final=read(out+'/final.json'),observed=read(out+'/observed-wrapper.json');
  assert.equal(manifest.sourceSha256,pinned);assert.equal(manifest.runnerSha256,hash(out+'/runner-snapshot.cjs'));if(current)assert.equal(manifest.runnerSha256,hash(dir+'/run-tests.cjs'));assert.equal(manifest.runs.length,12);
  assert.equal(final.sourceSha256,pinned);assert.equal(final.passed,91);assert.equal(final.failed,0);assert.equal(final.uncovered,0);
  assert.equal(hash(out+'/processes.json'),final.processManifest.sha256);assert.equal(hash(out+'/inventory.json'),final.inventory.sha256);
  assert.equal(observed.observedWrapperExitCode,0);assert.equal(observed.sourceSha256,pinned);assert.equal(observed.publicMirrorSha256,pinned);assert.equal(observed.passed,91);assert.equal(observed.nativeProcesses,12);
  assert.deepEqual(observed.observedNativeChildExitCodes,manifest.runs.map(r=>r.exitCode));assert.equal(observed.runner.sha256,manifest.runnerSha256);
  for(const key of ['final','inventory','processes']){assert.equal(observed[key].path,key+'.json');assert.equal(hash(out+'/'+observed[key].path),observed[key].sha256);}
  assert.equal(hash(manifest.helper),manifest.helperSha256);assert.equal(observed.helper.sha256,manifest.helperSha256);assert.deepEqual(observed.tests,manifest.tests);
  const coverage=new Map();let passed=0;
  for(const row of manifest.runs){
    assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);
    for(const key of ['sourceSha256','sourceAfterSha256','mirrorBeforeSha256','mirrorAfterSha256'])assert.equal(row[key],pinned);
    assert.equal(row.testSha256,hash(row.file));assert.equal(row.testAfterSha256,row.testSha256);
    assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);assert.equal(hash(out+'/'+row.log),row.logSha256);
    const receipt=read(out+'/'+row.receipt);assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,row.expected);assert.equal(receipt.testResults.length,1);
    const cases=receipt.testResults[0].assertionResults;assert.equal(cases.filter(c=>c.status==='passed').length,row.expected);
    if(!coverage.has(row.file))coverage.set(row.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});
    const item=coverage.get(row.file);assert.deepEqual(cases.map(c=>c.fullName),item.names);cases.forEach((c,i)=>{if(c.status==='passed')item.counts[i]++;else assert(['pending','skipped'].includes(c.status));});passed+=row.expected;
  }
  assert.equal(passed,91);assert.equal(coverage.size,4);for(const item of coverage.values())assert(item.counts.every(n=>n===1));
  const inventory=read(out+'/inventory.json');assert.deepEqual(inventory.files,[...coverage].map(([file,item])=>({file,sha256:hash(file),...item})));
  for(const test of manifest.tests){assert.equal(test.sha256,hash(test.file));assert.equal(test.sha256,test.baselineSha256);assert.equal(crypto.createHash('sha256').update(cp.execFileSync('git',['show','9891a85c1:'+test.file],{maxBuffer:4e6})).digest('hex'),test.sha256);}
}
verifyTests('tests/run-01',previous,false);verifyTests('tests/run-02',frozen,true);
const failed=read(dir+'/browser/run-01/observed-wrapper.json'),failedProcess=read(failed.process.path),failedResults=read(failed.results.path);
assert.equal(failed.sourceSha256,frozen);assert.equal(failed.observedWrapperExitCode,1);assert.equal(failed.observedNativeChildExitCode,1);assert.equal(failedProcess.observedExitCode,1);
for(const key of ['process','results','harnessSnapshot','wrapperSnapshot'])assert.equal(hash(failed[key].path),failed[key].sha256);
assert.equal(failedResults.errors.length,8);assert(failedResults.errors.every(e=>e.includes('keyboard focus')));
const diagnostic=read(dir+'/browser/focus-diagnostic-receipt.json');assert.equal(diagnostic.sourceSha256,frozen);assert.equal(diagnostic.sourceChanged,false);assert.equal(diagnostic.observedDiagnosticExitCode,0);assert.equal(diagnostic.observedSettledDiagnosticExitCode,0);
for(const key of ['diagnostic','observations','settledDiagnostic','settledObservations'])assert.equal(hash(diagnostic[key].path),diagnostic[key].sha256);
const settled=read(diagnostic.settledObservations.path);assert.deepEqual(settled.errors,[]);assert.equal(settled.observations.length,6);
for(const o of settled.observations){assert(o.afterTwoFrames.active&&o.afterTwoFrames.visible);assert.equal(o.afterTwoFrames.width,'3px');assert.equal(o.afterTwoFrames.offset,'3px');}
const oldHarness=fs.readFileSync(failed.harnessSnapshot.path,'utf8'),currentHarness=fs.readFileSync('dev-tools/ml_prediction_visual_qa.cjs','utf8');
assert.equal(currentHarness,oldHarness.replace("await pg.keyboard.press('Shift+Tab');","await pg.keyboard.press('Shift+Tab');await settle();"));
const pointer=read(dir+'/browser/final.json'),browser=read(pointer.process.path),results=read(pointer.results.path);
assert.equal(path.resolve(pointer.process.path),path.join(dir,'browser/run-02/process.json'));assert.equal(pointer.status,'passed');assert.equal(pointer.sourceSha256,frozen);assert.equal(pointer.observedNativeChildExitCode,0);assert.equal(pointer.observedWrapperExitCode,0);
for(const key of ['process','results','harness','wrapper','visualReview','observedWrapper','focusDiagnostic'])assert.equal(hash(pointer[key].path),pointer[key].sha256);
assert.equal(pointer.excludedAttempts.length,1);assert.equal(path.resolve(pointer.excludedAttempts[0].path),path.join(dir,'browser/run-01/observed-wrapper.json'));assert.equal(hash(pointer.excludedAttempts[0].path),pointer.excludedAttempts[0].sha256);
const browserObserved=read(pointer.observedWrapper.path);assert.equal(browserObserved.observedWrapperExitCode,0);assert.equal(browserObserved.observedNativeChildExitCode,0);assert.equal(browserObserved.sourceSha256,frozen);assert.equal(browserObserved.process.sha256,pointer.process.sha256);assert.equal(browserObserved.results.sha256,pointer.results.sha256);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);assert.deepEqual(browser.errors,[]);assert.deepEqual(results.errors,[]);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);for(const key of ['harness','harnessSnapshot','wrapperSnapshot','helperPreamble','baseHarness','console','results'])assert.equal(hash(browser[key].path),browser[key].sha256);
assert.equal(browser.harness.sha256,browser.harnessSnapshot.sha256);assert.equal(pointer.harness.sha256,browser.harness.sha256);assert.equal(pointer.results.sha256,browser.results.sha256);assert.equal(pointer.wrapper.sha256,browser.wrapperSnapshot.sha256);
const routes=['lever','pulley','ramp','wedge','windlass','screw'].flatMap(b=>['time','efficiency','load','work'].map(k=>b+'/'+k));
assert.equal(results.sourceSha256,frozen);assert.equal(results.routes.length,24);assert.equal(new Set(results.routes).size,24);assert.deepEqual([...results.routes].sort(),routes.sort());
assert.equal(browser.checks,results.checks.length);assert(browser.checks>=742);assert.equal(browser.scenarios,4);assert.equal(results.scenarios,4);assert.equal(browser.screenshots.length,4);
assert.deepEqual(results.shots.map(n=>n+'.png').sort(),browser.screenshots.map(s=>path.basename(s.path)).sort());assert.equal(new Set(browser.screenshots.map(s=>s.path)).size,4);
assert.deepEqual([...results.shots].sort(),['desktop-pending-calculation','desktop-checked-calculation','dark-phone-energy-calculation','forced-colors-phone-load-calculation'].sort());
const focused=results.observations.filter(o=>o.focus);assert.equal(focused.length,8);
assert.deepEqual(focused.map(o=>o.label).sort(),results.shots.flatMap(shot=>['check','check-number'].map(action=>shot+' '+action+' keyboard focus')).sort());
for(const o of focused){assert(o.focus.active&&o.focus.visible&&o.focus.outline!=='none'&&o.focus.width>=3&&o.focus.contrast>=3);}
const styled=results.observations.filter(o=>o.visual);assert(styled.length>=4);
for(const o of styled){assert(o.visual.primary.length>=1);for(const button of o.visual.primary)assert(button.class&&button.height>=44&&button.contrast>=4.5);assert.equal(o.visual.columns,o.visual.viewport<=600?1:3);}
const visual=read(pointer.visualReview.path),rootVisual=read(dir+'/browser/root-visual-review.json');
assert.equal(rootVisual.sourceSha256,frozen);assert.equal(visual.sourceSha256,frozen);assert.equal(visual.screenshots.length,4);assert.equal(rootVisual.screenshots.length,4);
for(const shot of browser.screenshots){assert.equal(hash(shot.path),shot.sha256);const a=visual.screenshots.filter(s=>s.name===path.basename(shot.path)),b=rootVisual.screenshots.filter(s=>s.path===shot.path);assert.equal(a.length,1);assert.equal(b.length,1);assert.equal(a[0].visuallyInspected,true);assert.equal(b[0].visuallyInspected,true);assert.equal(a[0].sha256,shot.sha256);assert.equal(b[0].sha256,shot.sha256);}
const summary={sourceSha256:frozen,tests:91,testFiles:4,nativeTestGroups:12,browserChecks:browser.checks,browserScenarios:4,calculationRoutes:24,inspectedScreenshots:4,onlyPredictionPracticeChanged:true,allEventCallbacksByteIdentical:true,sourceMirrorParity:true};
fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
