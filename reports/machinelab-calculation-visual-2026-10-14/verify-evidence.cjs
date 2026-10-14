const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),cp=require('child_process');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const frozen='25d51a5672a1cf55bbaed925203e136be895a5cf8cde7f9adbb9ca2f10115603';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});
const scope=read(dir+'/source-scope.json');assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);
for(const key of ['onlyPracticeRenderingChanged','skillMapAndGuideSelectionUnchanged','allInlineCallbacksByteIdentical','sourceMirrorParity','syntax'])assert.equal(scope[key],true);assert.equal(scope.inlineCallbacks,20);
const testDir=dir+'/tests/run-01',manifest=read(testDir+'/processes.json'),final=read(testDir+'/final.json');
assert.equal(manifest.sourceSha256,frozen);assert.equal(manifest.runnerSha256,hash(dir+'/run-tests.cjs'));assert.equal(manifest.runnerSha256,hash(testDir+'/runner-snapshot.cjs'));assert.equal(manifest.runs.length,15);
assert.equal(final.sourceSha256,frozen);assert.equal(final.publicMirrorSha256,frozen);assert.equal(final.passed,110);assert.equal(final.failed,0);assert.equal(final.uncoveredSelected,0);
assert.equal(hash(testDir+'/processes.json'),final.processManifest.sha256);assert.equal(hash(testDir+'/inventory.json'),final.inventory.sha256);assert.equal(hash(manifest.helper),manifest.helperSha256);
const coverage=new Map();let passed=0;
for(const row of manifest.runs){
  assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);
  for(const key of ['sourceSha256','sourceAfterSha256','mirrorBeforeSha256','mirrorAfterSha256'])assert.equal(row[key],frozen);
  assert.equal(row.testSha256,hash(row.file));assert.equal(row.testAfterSha256,row.testSha256);
  assert.equal(hash(testDir+'/'+row.receipt),row.receiptSha256);assert.equal(hash(testDir+'/'+row.log),row.logSha256);
  const report=read(testDir+'/'+row.receipt);assert.equal(report.success,true);assert.equal(report.numFailedTests,0);assert.equal(report.numPassedTests,row.expected);assert.equal(report.testResults.length,1);
  const cases=report.testResults[0].assertionResults,selected=cases.map(c=>manifest.runs.some(r=>r.file===row.file&&(!r.pattern||new RegExp(r.pattern).test(c.fullName))));
  if(!coverage.has(row.file))coverage.set(row.file,{names:cases.map(c=>c.fullName),selected,counts:cases.map(()=>0)});
  const item=coverage.get(row.file);assert.deepEqual(cases.map(c=>c.fullName),item.names);assert.deepEqual(selected,item.selected);
  cases.forEach((c,i)=>{if(!row.pattern||new RegExp(row.pattern).test(c.fullName)){assert.equal(c.status,'passed');item.counts[i]++;passed++;}else assert(['pending','skipped'].includes(c.status));});
}
assert.equal(passed,110);assert.equal(coverage.size,5);for(const item of coverage.values())assert(item.counts.every((n,i)=>n===(item.selected[i]?1:0)));
const inventory=read(testDir+'/inventory.json');assert.deepEqual(inventory.files,[...coverage].map(([file,item])=>({file,sha256:hash(file),...item})));
for(const test of manifest.tests){assert.equal(test.sha256,hash(test.file));assert.equal(test.sha256,test.baselineSha256);assert.equal(crypto.createHash('sha256').update(cp.execFileSync('git',['show','4eeb666c7:'+test.file],{maxBuffer:4e6})).digest('hex'),test.sha256);}
const observed=read(testDir+'/observed-wrapper.json');assert.equal(observed.observedWrapperExitCode,0);assert.equal(observed.sourceSha256,frozen);assert.deepEqual(observed.observedNativeChildExitCodes,manifest.runs.map(r=>r.exitCode));
assert.equal(observed.publicMirrorSha256,frozen);assert.equal(observed.passed,110);assert.equal(observed.nativeProcesses,15);assert.deepEqual(observed.tests,manifest.tests);assert.equal(observed.runner.sha256,manifest.runnerSha256);assert.equal(observed.helper.sha256,manifest.helperSha256);
for(const key of ['final','inventory','processes','runnerSnapshot'])assert.equal(hash(path.join(testDir,observed[key].path)),observed[key].sha256);
const pointer=read(dir+'/browser/final.json');assert.equal(pointer.status,'passed');assert.equal(pointer.sourceSha256,frozen);assert.equal(pointer.observedNativeChildExitCode,0);assert.equal(pointer.observedWrapperExitCode,0);
for(const key of ['process','results','observedWrapper','excludedAttempt','captureCorrection'])assert.equal(hash(pointer[key].path),pointer[key].sha256);
assert.equal(path.resolve(pointer.process.path),path.join(dir,'browser/run-02/process.json'));
const browser=read(pointer.process.path),results=read(browser.results.path),browserObserved=read(pointer.observedWrapper.path);
assert.equal(browserObserved.observedWrapperExitCode,0);assert.equal(browserObserved.observedNativeChildExitCode,0);assert.equal(browserObserved.sourceSha256,frozen);assert.deepEqual(browserObserved.process,pointer.process);assert.deepEqual(browserObserved.results,pointer.results);assert.deepEqual(browser.results,pointer.results);
const interrupted=read(pointer.excludedAttempt.path);assert.equal(interrupted.countedInFinalValidation,false);assert.equal(interrupted.observedNativeChildExitCode,null);for(const file of interrupted.files)assert.equal(hash(file.path),file.sha256);
const correction=read(pointer.captureCorrection.path),oldHarness=fs.readFileSync(dir+'/browser/run-01/harness-snapshot.cjs','utf8');assert.equal(correction.sourceChanged,false);assert.equal(hash(dir+'/browser/run-01/harness-snapshot.cjs'),correction.previousHarnessSha256);assert.equal(hash('dev-tools/ml_calculation_visual_qa.cjs'),correction.harnessSha256);assert.equal(oldHarness.replace(correction.before,correction.after),fs.readFileSync('dev-tools/ml_calculation_visual_qa.cjs','utf8'));
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);assert.deepEqual(browser.errors,[]);assert.deepEqual(results.errors,[]);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);assert.equal(browser.dependenciesUnchanged,true);for(const item of browser.dependencies)assert.equal(hash(item.path),item.sha256);
for(const key of ['results','console'])assert.equal(hash(browser[key].path),browser[key].sha256);
assert.equal(results.sourceSha256,frozen);assert.equal(results.routes.length,43);assert.equal(new Set(results.routes).size,43);assert.equal(results.routes.filter(r=>r.startsWith('windlass/')).length,25);assert.equal(results.routes.filter(r=>r.startsWith('lever/')).length,18);
assert.equal(browser.checks,results.checks.length);assert(browser.checks>400);assert.equal(browser.scenarios,4);assert.equal(results.scenarios,4);assert.equal(browser.screenshots.length,4);
const names=['desktop-fresh-calculation','desktop-checked-calculation','dark-phone-rotation-solution','forced-colors-phone-conversion'];assert.deepEqual([...results.shots].sort(),[...names].sort());assert.deepEqual(browser.screenshots.map(s=>path.basename(s.path)).sort(),names.map(n=>n+'.png').sort());
const focused=results.observations.filter(o=>o.focus);const screenshotFocus=focused.filter(o=>names.some(n=>o.label.startsWith(n+' ')));
assert.deepEqual(screenshotFocus.map(o=>o.label).sort(),names.flatMap((n,i)=>(i?['check','save','answer','unit']:['check','answer','unit']).map(a=>n+' '+a+' focus')).sort());
for(const o of focused)assert(o.focus.active&&o.focus.visible&&o.focus.inside&&o.focus.outline!=='none'&&o.focus.width>=3&&o.focus.contrast>=3);
for(const name of names){const entry=results.observations.find(o=>o.label===name&&o.entry).entry,layout=results.observations.find(o=>o.label===name&&o.layout).layout;assert.equal(entry.columns,entry.viewport<=600?1:2);assert(entry.answer.height>=52&&entry.answer.font>=22&&entry.unit.height>=44);assert(layout.page&&layout.panel&&!layout.clipped.length);for(const action of layout.primary)assert(action.height>=44&&(action.disabled||action.contrast>=4.5));}
const visual=read(dir+'/browser/visual-review.json'),rootVisual=read(dir+'/browser/root-visual-review.json');
assert.equal(visual.sourceSha256,frozen);assert.equal(rootVisual.sourceSha256,frozen);assert.equal(visual.screenshots.length,4);assert.equal(rootVisual.screenshots.length,4);
for(const shot of browser.screenshots){assert.equal(hash(shot.path),shot.sha256);for(const review of [visual,rootVisual]){const matches=review.screenshots.filter(s=>s.path===shot.path);assert.equal(matches.length,1);assert.equal(matches[0].sha256,shot.sha256);assert.equal(matches[0].visuallyInspected,true);}}
const summary={sourceSha256:frozen,tests:110,testFiles:5,nativeTestGroups:15,browserChecks:browser.checks,browserScenarios:4,skillForms:43,inspectedScreenshots:4,onlyPracticeRenderingChanged:true,allInlineCallbacksByteIdentical:true,sourceMirrorParity:true};
fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
