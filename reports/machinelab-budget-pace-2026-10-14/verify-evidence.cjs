const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert/strict');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const frozen='5a8b2a49887866acfac8e85ea3e9d94370e576233aa17074436d85b58f649231';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});
const scope=read(dir+'/source-scope.json');assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);
for(const key of ['onlyBudgetPracticeAndPaceNavigationChanged','existingPhysicsAndPredictionPracticeUnchanged','ordinaryPracticeAndRecordsUnchanged','sourceMirrorParity','syntax'])assert.equal(scope[key],true);
const out=dir+'/tests/run-01',manifest=read(out+'/processes.json'),final=read(out+'/final.json'),observed=read(out+'/observed-wrapper.json');
const expectedFiles=['tests/machinelab_budget_pace.test.js','tests/machinelab_budget_utilization.test.js','tests/machinelab_practice_flow.test.js','tests/machinelab_i18n_hygiene.test.js','tests/machinelab_a11y.test.js'].sort();
assert.deepEqual(manifest.tests.map(t=>t.file).sort(),expectedFiles);
for(const item of [scope,manifest,final,observed,read(out+'/inventory.json')])assert.equal(item.baselineCommit,'dea24fa02');
assert.equal(manifest.sourceSha256,frozen);assert.equal(manifest.runnerSha256,hash(out+'/runner-snapshot.cjs'));assert.equal(manifest.runnerSha256,hash(dir+'/run-tests.cjs'));assert.equal(manifest.runs.length,13);assert.equal(hash(manifest.helper),manifest.helperSha256);
assert.equal(final.sourceSha256,frozen);assert.equal(final.publicMirrorSha256,frozen);assert.equal(final.passed,107);assert.equal(final.failed,0);assert.equal(final.uncovered,0);assert.equal(hash(out+'/processes.json'),final.processManifest.sha256);assert.equal(hash(out+'/inventory.json'),final.inventory.sha256);
assert.equal(observed.observedWrapperExitCode,0);assert.equal(observed.sourceSha256,frozen);assert.equal(observed.publicMirrorSha256,frozen);assert.equal(observed.passed,107);assert.deepEqual(observed.observedNativeChildExitCodes,manifest.runs.map(r=>r.exitCode));
for(const key of ['final','inventory','processes'])assert.equal(hash(out+'/'+observed[key].path),observed[key].sha256);
assert.equal(observed.runner.sha256,manifest.runnerSha256);assert.deepEqual(observed.tests,manifest.tests);
const coverage=new Map();let passed=0;
for(const row of manifest.runs){
  assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);
  for(const key of ['sourceSha256','sourceAfterSha256','mirrorBeforeSha256','mirrorAfterSha256'])assert.equal(row[key],frozen);
  assert.equal(row.testSha256,hash(row.file));assert.equal(row.testAfterSha256,row.testSha256);assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);assert.equal(hash(out+'/'+row.log),row.logSha256);
  const receipt=read(out+'/'+row.receipt);assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,row.expected);assert.equal(receipt.testResults.length,1);
  const cases=receipt.testResults[0].assertionResults;assert.equal(cases.filter(c=>c.status==='passed').length,row.expected);
  if(!coverage.has(row.file))coverage.set(row.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});const item=coverage.get(row.file);assert.deepEqual(cases.map(c=>c.fullName),item.names);
  cases.forEach((c,i)=>{if(c.status==='passed')item.counts[i]++;else assert(['pending','skipped'].includes(c.status));});passed+=row.expected;
}
assert.equal(passed,107);assert.equal(coverage.size,5);for(const item of coverage.values())assert(item.counts.every(n=>n===1));
assert.deepEqual([...coverage.keys()].sort(),expectedFiles);
assert.deepEqual(read(out+'/inventory.json').files,[...coverage].map(([file,item])=>({file,sha256:hash(file),...item})));
for(const test of manifest.tests){assert.equal(test.sha256,hash(test.file));if(test.baselineSha256){assert.equal(test.sha256,test.baselineSha256);assert.equal(crypto.createHash('sha256').update(cp.execFileSync('git',['show','dea24fa02:'+test.file],{maxBuffer:4e6})).digest('hex'),test.sha256);}else assert.equal(test.file,'tests/machinelab_budget_pace.test.js');}
const browser=read(dir+'/browser/run-01/process.json'),results=read(browser.results.path),browserObserved=read(dir+'/browser/run-01/observed-wrapper.json');
assert.equal(browserObserved.observedWrapperExitCode,0);assert.equal(browserObserved.observedNativeChildExitCode,0);assert.equal(browserObserved.sourceSha256,frozen);assert.equal(browserObserved.process.sha256,hash(dir+'/browser/run-01/process.json'));assert.deepEqual(browserObserved.results,browser.results);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);assert.deepEqual(browser.errors,[]);assert.deepEqual(results.errors,[]);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert.equal(browser.sourceExactInNativePage,true);assert.equal(browser.dependenciesUnchanged,true);for(const item of browser.dependencies)assert.equal(hash(item.path),item.sha256);for(const key of ['results','console'])assert.equal(hash(browser[key].path),browser[key].sha256);
const routes=['lever','pulley','ramp','wedge','windlass','screw'].flatMap(b=>['below','at','over'].map(k=>b+'/'+k));assert.equal(results.sourceSha256,frozen);assert.equal(results.routes.length,18);assert.deepEqual([...results.routes].sort(),routes.sort());
for(const route of routes){const observations=results.observations.filter(o=>o.label===route.replace('/',' ')+' pace');assert.equal(observations.length,1);assert(observations[0].view.metrics.length===2&&observations[0].view.bars.length===2);}
for(const bench of ['lever','pulley','ramp','wedge','windlass','screw'])for(const suffix of ['time-skill shortcut navigation','same-skill shortcut continue navigation']){const observations=results.observations.filter(o=>o.label===bench+' '+suffix);assert.equal(observations.length,1);assert.equal(observations[0].active,'ml-power-answer-'+bench);if(suffix==='time-skill shortcut navigation'){assert.equal(observations[0].after.question,'budgetTime');assert.equal(observations[0].after.answer,'');assert.equal(observations[0].after.unit,'');}}
assert.equal(browser.checks,results.checks.length);assert(browser.checks>594);assert.equal(browser.scenarios,4);assert.equal(browser.screenshots.length,4);
const names=['desktop-pending-pace','desktop-checked-pace','dark-phone-over-pace','forced-colors-phone-at-pace'];assert.deepEqual([...results.shots].sort(),[...names].sort());assert.deepEqual(browser.screenshots.map(s=>path.basename(s.path)).sort(),names.map(n=>n+'.png').sort());
const focus=results.observations.filter(o=>o.focus);assert.equal(focus.length,23);assert.deepEqual(focus.map(o=>o.label).sort(),names.flatMap(n=>['check','reveal','retry','answer','classification',...(n==='desktop-pending-pace'?[]:['pace'])].map(a=>n+' '+a+' keyboard focus')).sort());for(const o of focus)assert(o.focus.active&&o.focus.visible&&o.focus.style!=='none'&&o.focus.width>=3&&o.focus.contrast>=3);
for(const file of ['visual-review.json','root-visual-review.json']){const review=read(dir+'/browser/'+file);assert.equal(review.sourceSha256,frozen);assert.equal(review.screenshots.length,4);for(const shot of browser.screenshots){assert.equal(hash(shot.path),shot.sha256);const match=review.screenshots.filter(s=>s.path===shot.path);assert.equal(match.length,1);assert.equal(match[0].sha256,shot.sha256);assert.equal(match[0].visuallyInspected,true);}}
const summary={sourceSha256:frozen,tests:107,newTests:21,unchangedTests:86,testFiles:5,nativeTestGroups:13,browserChecks:browser.checks,budgetRoutes:18,paceRoutes:18,paceNavigationChecks:12,browserScenarios:4,inspectedScreenshots:4,keyboardFocusChecks:focus.length,existingPhysicsAndPredictionPracticeUnchanged:true,ordinaryPracticeAndRecordsUnchanged:true,sourceMirrorParity:true};
fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
