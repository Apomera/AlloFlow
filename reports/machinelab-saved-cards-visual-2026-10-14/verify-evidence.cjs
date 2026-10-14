const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(p));
const frozen='935d6480a3a0f80645671628113edd0cd8004a803c8683c166626e08b04c7559',baseline='1a68d0d70';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});const scope=read(dir+'/source-scope.json');
assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);assert.equal(scope.baselineCommit,baseline);
for(const k of ['onlySavedRendererAndCallChanged','existingCalculationsHandlersPracticeRecordsAndExportsUnchanged','savedValuesUseOnlyRecordSnapshot','sourceMirrorParity','syntax'])assert.equal(scope[k],true);
const review=read(dir+'/source-review.json');assert.equal(review.sourceSha256,frozen);assert.equal(review.verdict,'pass');assert.deepEqual(review.findings,[]);
const out=dir+'/tests/run-01',manifest=read(out+'/processes.json'),final=read(out+'/final.json'),observed=read(out+'/observed-wrapper.json');
assert.equal(manifest.sourceSha256,frozen);assert.equal(manifest.baselineCommit,baseline);assert.equal(manifest.runnerSha256,hash(dir+'/run-tests.cjs'));assert.equal(manifest.runnerSha256,hash(out+'/runner-snapshot.cjs'));assert.equal(hash(manifest.helper.path),manifest.helper.sha256);
const files=['tests/machinelab_power_lab.test.js','tests/machinelab_power_lab.test.js','tests/machinelab_a11y.test.js','tests/machinelab_i18n_hygiene.test.js'];
assert.deepEqual(manifest.tests.map(t=>t.file),files);assert.deepEqual(manifest.runs.map(r=>r.file),files);
for(const t of manifest.tests){assert.equal(t.sha256,hash(t.file));assert.equal(t.sha256,t.baselineSha256);assert.equal(t.sha256,sha(cp.execFileSync('git',['show',baseline+':'+t.file],{maxBuffer:5e6})));}
const allPassed=[];
for(const [i,row] of manifest.runs.entries()){
  assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);assert.equal(row.sourceAfterSha256,frozen);assert.equal(row.mirrorAfterSha256,frozen);assert.equal(row.expected,[12,16,28,8][i]);
  assert.equal(hash(out+'/'+row.log),row.logSha256);assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);const receipt=read(out+'/'+row.receipt);assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,row.expected);
  const passed=receipt.testResults.flatMap(r=>r.assertionResults.filter(t=>t.status==='passed').map(t=>t.fullName));assert.deepEqual(passed,row.passedNames);assert.equal(new Set(passed).size,row.expected);if(row.pattern)assert(passed.every(n=>new RegExp(row.pattern).test(n)));allPassed.push(...passed);
}
assert.equal(allPassed.length,64);assert.equal(new Set(allPassed).size,64);assert.equal(final.passed,64);assert.equal(final.failed,0);assert.equal(final.processes,4);assert.equal(final.sourceSha256,frozen);assert.equal(final.mirrorSha256,frozen);assert.equal(final.manifestSha256,hash(out+'/processes.json'));assert.equal(observed.observedExitCode,0);assert.equal(observed.observedPassedTests,64);assert.equal(observed.sourceSha256,frozen);

const bd=dir+'/browser',bf=read(bd+'/final.json'),native=read(bd+'/run-01/native-exit.json'),bo=read(bd+'/run-01/observed-wrapper-exit.json'),br=read(bd+'/run-01/results.json');
assert.equal(bf.status,'passed');assert.equal(bf.finalRun,'run-01');assert.equal(bf.sourceSha256,frozen);assert.equal(bf.baselineSha256,scope.baselineSha256);assert.equal(bf.observedWrapperExitCode,0);assert.equal(bf.nativeExitCode,0);assert.equal(hash(bf.harness.file),bf.harness.sha256);for(const a of bf.artifacts)assert.equal(hash(bd+'/'+a.file),a.sha256);
assert.equal(native.exitCode,0);assert.equal(native.signal,null);assert.equal(native.error,null);assert.equal(native.frozenSourceSha256,frozen);assert.equal(native.unchanged,true);assert.equal(bo.observedExitCode,0);assert.equal(bo.nativeReceipt,'native-exit.json');assert.deepEqual(read(bd+'/run-01/'+bo.nativeReceipt),native);
for(const group of ['sourceBefore','sourceAfter']){assert.equal(native[group].length,2);for(const a of native[group]){assert.equal(a.sha256,frozen);assert.equal(hash(a.file),frozen);}}
assert.deepEqual(native.runnerBefore,native.runnerAfter);for(const a of native.runnerBefore)assert.equal(hash(a.file),a.sha256);
assert.equal(hash(bd+'/run-01/harness-snapshot.cjs'),bf.harness.sha256);assert.equal(hash(bd+'/run-01/runner-snapshot.cjs'),hash(bd+'/run-native.cjs'));
assert.equal(br.sourceSha256,frozen);assert.equal(br.baselineSha256,scope.baselineSha256);assert.deepEqual(br.errors,[]);assert.deepEqual(bf.errors,[]);assert.equal(br.checks.length,638);assert.equal(bf.checks,638);assert.equal(br.scenarios,10);assert.equal(br.shots.length,6);
assert.deepEqual([...br.routes].sort(),['lever','pulley','ramp','screw','wedge','windlass']);assert.deepEqual(bf.routes,br.routes);for(const a of br.dependencies)assert.equal(hash(a.file),a.sha256);
const views=br.observations.filter(o=>o.view);assert.equal(views.length,17);
for(const {view} of views){
  assert(view.page&&view.panel&&!view.live);assert.deepEqual(view.clipped,[]);
  for(const card of view.cards){
    assert.equal(card.tag,'ARTICLE');assert.equal(card.headingTag,'H3');assert(card.uniqueHeading&&card.headingStyle.font>=18);assert.equal(card.result.label,'Calculated result');assert.equal(card.result.parent,'DL');assert.equal(card.entered.parent,'DL');assert(card.result.style.font>=28&&card.entered.style.font>=18);
    assert(['checked','solution'].includes(card.status));assert.equal(card.statusStyle.border,card.status==='solution'?'dashed':'solid');assert.equal(card.detail.tag,'DETAILS');assert.equal(card.images,0);assert(card.snapshot.includes(card.completion));
  }
}
const rotary=views.find(o=>o.label==='windlass desktop').view.cards;assert.equal(rotary.length,10);assert.equal(rotary.filter(c=>c.status==='checked').length,5);assert.equal(rotary.filter(c=>c.status==='solution').length,5);
const focused=br.observations.filter(o=>o.focus);assert.equal(focused.length,14);assert(focused.every(o=>o.focus.active&&o.focus.visible&&o.focus.outline!=='none'&&o.focus.width>=3));
assert.equal(br.exports.length,6);
for(const exported of br.exports){const file=bd+'/run-01/'+exported.file;assert.equal(hash(file),exported.sha256);const text=fs.readFileSync(file,'utf8'),desktop=views.find(o=>o.label===exported.kind+' desktop');assert(desktop);for(const card of desktop.view.cards)assert(text.includes(card.snapshot));}
const vr=read(bd+'/visual-review.json'),rr=read(bd+'/root-visual-review.json');assert.equal(vr.sourceSha256,frozen);assert.equal(rr.sourceSha256,frozen);assert.equal(vr.images.length,6);assert.equal(rr.screenshots.length,6);assert.equal(rr.verdict,'pass');
for(const shot of br.shots){const file='run-01/'+shot.file;assert.equal(hash(bd+'/'+file),shot.sha256);const a=vr.images.find(s=>s.file===file),b=rr.screenshots.find(s=>s.path.endsWith('/'+file));assert(a&&b);assert.equal(a.sha256,shot.sha256);assert.equal(b.sha256,shot.sha256);assert.equal(a.verdict,'pass');assert.equal(b.visuallyInspected,true);}
const summary={sourceSha256:frozen,selectedExistingTests:64,testFiles:3,nativeTestProcesses:4,browserChecks:638,benchRoutes:6,browserScenarios:10,inspectedScreenshots:6,keyboardFocusChecks:14,nativeTextExports:6,existingCalculationsHandlersPracticeRecordsAndExportsUnchanged:true,sourceMirrorParity:true};
fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
