const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(p));
const frozen='46f7638b058845f934dea933668fbab15c2aecf91928274b16770ca2476056a3',baseline='7e307c872';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});const scope=read(dir+'/source-scope.json');
assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);assert.equal(scope.baselineCommit,baseline);
for(const k of ['onlyGuideAndNewNavigationChanged','existingCalculationsScalesRowsBarsAndTranslationsUnchanged','existingHandlersPracticeRecordsAndExportsUnchanged','sourceMirrorParity','syntax'])assert.equal(scope[k],true);
const review=read(dir+'/source-review.json');assert.equal(review.sourceSha256,frozen);assert.equal(review.verdict,'pass');assert.deepEqual(review.findings,[]);
const out=dir+'/tests/run-02',manifest=read(out+'/processes.json'),final=read(out+'/final.json'),observed=read(out+'/observed-wrapper.json');
assert.equal(manifest.sourceSha256,frozen);assert.equal(manifest.baselineCommit,baseline);assert.equal(manifest.runnerSha256,hash(dir+'/run-tests.cjs'));assert.equal(manifest.runnerSha256,hash(out+'/runner-snapshot.cjs'));assert.equal(hash(manifest.helper.path),manifest.helper.sha256);
const files=['tests/machinelab_force_practice_entry.test.js','tests/machinelab_force_practice_entry.test.js','tests/machinelab_force_practice_entry.test.js','tests/machinelab_force_speed.test.js','tests/machinelab_force_speed.test.js','tests/machinelab_a11y.test.js','tests/machinelab_i18n_hygiene.test.js'];
assert.deepEqual(manifest.tests.map(t=>t.file),files);assert.deepEqual(manifest.runs.map(r=>r.file),files);
for(const t of manifest.tests){assert.equal(t.sha256,hash(t.file));if(t.baselineSha256){assert.equal(t.sha256,t.baselineSha256);assert.equal(t.sha256,sha(cp.execFileSync('git',['show',baseline+':'+t.file],{maxBuffer:5e6})));}else assert.equal(t.file,'tests/machinelab_force_practice_entry.test.js');}
const allPassed=[];
for(const [i,row] of manifest.runs.entries()){
  assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);assert.equal(row.sourceAfterSha256,frozen);assert.equal(row.mirrorAfterSha256,frozen);assert.equal(row.expected,[8,14,5,6,8,28,8][i]);
  assert.equal(hash(out+'/'+row.log),row.logSha256);assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);const receipt=read(out+'/'+row.receipt);assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,row.expected);
  const passed=receipt.testResults.flatMap(r=>r.assertionResults.filter(t=>t.status==='passed').map(t=>t.fullName));assert.deepEqual(passed,row.passedNames);assert.equal(new Set(passed).size,row.expected);if(row.pattern)assert(passed.every(n=>new RegExp(row.pattern).test(n)));allPassed.push(...passed);
}
assert.equal(allPassed.length,77);assert.equal(new Set(allPassed).size,77);assert.equal(final.passed,77);assert.equal(final.failed,0);assert.equal(final.processes,7);assert.equal(final.sourceSha256,frozen);assert.equal(final.mirrorSha256,frozen);assert.equal(final.manifestSha256,hash(out+'/processes.json'));assert.equal(observed.observedExitCode,0);assert.equal(observed.observedPassedTests,77);assert.equal(observed.sourceSha256,frozen);

// Preserve the unsuccessful first attempt and prove the repair changed only its mock commit.
const oldOut=dir+'/tests/run-01',oldManifest=read(oldOut+'/processes.json'),oldObserved=read(oldOut+'/observed-wrapper.json');
assert.equal(oldManifest.sourceSha256,frozen);assert.equal(oldManifest.baselineCommit,baseline);assert.equal(oldManifest.runnerSha256,hash(oldOut+'/runner-snapshot.cjs'));assert.equal(oldObserved.observedExitCode,1);assert.equal(oldObserved.completedSuccessfulGroupTests,22);assert.equal(oldObserved.sourceSha256,frozen);assert.equal(oldManifest.runs.length,3);
for(const t of oldManifest.tests.filter(t=>t.file==='tests/machinelab_force_practice_entry.test.js'))assert.equal(t.sha256,hash(oldOut+'/test-snapshot.js'));
for(const [i,row] of oldManifest.runs.entries()){
  assert.equal(row.exitCode,i===2?1:0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);assert.equal(row.sourceAfterSha256,frozen);assert.equal(row.mirrorAfterSha256,frozen);assert.equal(hash(oldOut+'/'+row.log),row.logSha256);assert.equal(hash(oldOut+'/'+row.receipt),row.receiptSha256);
  const receipt=read(oldOut+'/'+row.receipt);assert.equal(receipt.numFailedTests,i===2?1:0);assert.equal(receipt.numPassedTests,[8,14,4][i]);assert.equal(receipt.success,i!==2);
}
const failed=read(oldOut+'/group-03.json').testResults.flatMap(t=>t.assertionResults.filter(a=>a.status==='failed'));assert.equal(failed.length,1);assert.equal(failed[0].fullName,'Machine Lab: force practice entry guards rejects stale callbacks after assumptions, geometry, question, bench or view change');assert.equal(failed[0].failureMessages.length,1);assert(failed[0].failureMessages[0].startsWith("TypeError: Cannot read properties of undefined (reading 'props')\n    at flush "));
const oldTest=fs.readFileSync(oldOut+'/test-snapshot.js','utf8').replace(/\r\n/g,'\n'),newTest=fs.readFileSync('tests/machinelab_force_practice_entry.test.js','utf8').replace(/\r\n/g,'\n');
const unsafe="        root.querySelector('#ml-power-question-' + s.state().bench).value = s.id('question').props.value;";
const guarded="        const selection = root.querySelector('#ml-power-question-' + s.state().bench), renderedSelection = s.id('question');\n        if (selection && renderedSelection) selection.value = renderedSelection.props.value;";
assert.equal(oldTest.split(unsafe).length,2);assert.equal(oldTest.replace(unsafe,guarded),newTest,'Only the mock selection-sync guard changed after the failed run');

const bd=dir+'/browser',bf=read(bd+'/final.json'),native=read(bd+'/run-01/native-exit.json'),bo=read(bd+'/run-01/observed-wrapper-exit.json'),br=read(bd+'/run-01/results.json');
assert.equal(bf.status,'passed');assert.equal(bf.finalRun,'run-01');assert.equal(bf.sourceSha256,frozen);assert.equal(bf.baselineSha256,scope.baselineSha256);assert.equal(bf.observedWrapperExitCode,0);assert.equal(bf.nativeExitCode,0);assert.equal(hash(bf.harness.file),bf.harness.sha256);for(const a of bf.artifacts)assert.equal(hash(bd+'/'+a.file),a.sha256);
assert.equal(native.exitCode,0);assert.equal(native.signal,null);assert.equal(native.error,null);assert.equal(native.frozenSourceSha256,frozen);assert.equal(native.unchanged,true);assert.equal(native.nodeOptions,'--max-old-space-size=512 --max-semi-space-size=8');assert.equal(native.timeoutMs,300000);assert.equal(bo.observedExitCode,0);assert.equal(bo.sessionId,30304);assert.equal(bo.nativeReceipt,'native-exit.json');assert.deepEqual(read(bd+'/run-01/'+bo.nativeReceipt),native);
for(const group of ['sourceBefore','sourceAfter']){assert.equal(native[group].length,2);for(const a of native[group]){assert.equal(a.sha256,frozen);assert.equal(hash(a.file),frozen);}}
assert.deepEqual(native.runnerBefore,native.runnerAfter);for(const a of native.runnerBefore)assert.equal(hash(a.file),a.sha256);
assert.equal(hash(bd+'/run-01/harness-snapshot.cjs'),bf.harness.sha256);assert.equal(hash(bd+'/run-01/runner-snapshot.cjs'),hash(bd+'/run-native.cjs'));
assert.equal(br.sourceSha256,frozen);assert.equal(br.baselineSha256,scope.baselineSha256);assert.deepEqual(br.errors,[]);assert.deepEqual(bf.errors,[]);assert.deepEqual(bf.preservedFailedRuns,[]);assert.equal(br.checks.length,681);assert.equal(bf.checks,681);assert.equal(br.scenarios,9);assert.equal(bf.scenarios,9);assert.equal(br.shots.length,4);assert.equal(bf.screenshots,4);
assert.deepEqual([...br.routes].sort(),['lever','pulley','ramp','screw','wedge','windlass']);assert.deepEqual(bf.routes,br.routes);for(const a of br.dependencies)assert.equal(hash(a.file),a.sha256);
const views=br.observations.filter(o=>o.visual);assert.equal(views.length,12);
for(const {visual:view} of views){assert(view.page&&view.panel);assert.deepEqual(view.clipped,[]);assert.equal(view.cards.length,2);for(const card of view.cards)assert(card.buttonHeight>=42&&card.buttonWidth>0);}
assert(views.find(v=>v.label==='forced-colors-phone').visual.forced);
const quantities=br.observations.filter(o=>o.card),fixture={lever:[400,2],pulley:[400,2],windlass:[400,4.5],ramp:[400,4],wedge:[800,5],screw:[2000,2*Math.PI*.15/.005]};assert.equal(quantities.length,30);
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
for(const o of quantities){
  const [load,ma]=fixture[o.kind],input=o.skill==='effortFromPower',expected=input?{watts:load*.5/(o.percent/100)/o.seconds,speed:.5*ma/o.seconds,force:load/ma/(o.percent/100)}:{watts:load*.5/o.seconds,speed:.5/o.seconds,force:load};for(const key of ['watts','speed','force'])assert(near(o.expected[key],expected[key]));
  const c=o.card,m=c.equation.match(/([\d.e+-]+) W\s*÷\s*\(([\d.e+-]+) m\/s\)\s*=\s*([\d.e+-]+) N/);assert(m);for(const [i,key] of ['watts','speed','force'].entries())assert(Math.abs(Number(m[i+1])-expected[key])<=Math.max(1e-10,Math.abs(expected[key])*.000005));
  assert.equal(c.tag,'SECTION');assert(c.heading&&c.localHeading&&c.uniqueHeading);assert.equal(c.equationTag,'P');assert.equal(c.equationCount,1);assert.equal(c.row,input?'input':'output');assert.equal(c.button.type,'button');assert.equal(c.button.skill,o.skill);assert.equal(c.button.count,1);assert(c.localHelp&&c.uniqueHelp&&/save|keep|kept/i.test(c.help));assert(/do not apply/i.test(c.text)&&!/NaN|Infinity|undefined/.test(c.text));if(o.kind==='ramp'&&!input)assert(/vertical rise.*not speed along the ramp/i.test(c.text));
}
const focused=br.observations.filter(o=>o.focus);assert.equal(focused.length,54);assert(focused.every(o=>o.focus.active&&o.focus.visible&&o.focus.outline!=='none'&&o.focus.width>=3));
const vr=read(bd+'/visual-review.json'),rr=read(bd+'/root-visual-review.json');assert.equal(vr.sourceSha256,frozen);assert.equal(rr.sourceSha256,frozen);assert.equal(vr.images.length,4);assert.equal(rr.screenshots.length,4);assert.equal(rr.verdict,'pass');
for(const shot of br.shots){const file='run-01/'+shot.file;assert.equal(hash(bd+'/'+file),shot.sha256);const a=vr.images.find(s=>s.file===file),b=rr.screenshots.find(s=>s.path.endsWith('/'+file));assert(a&&b);assert.equal(a.sha256,shot.sha256);assert.equal(b.sha256,shot.sha256);assert.equal(a.verdict,'pass');assert.equal(b.visuallyInspected,true);}
const summary={sourceSha256:frozen,newTests:27,selectedExistingTests:50,totalSelectedTests:77,testFiles:4,nativeTestProcesses:7,finalTestRun:'run-02',preservedFailedTestRuns:['run-01'],failedAttemptOnlyMockGuardChanged:true,browserChecks:681,benchRoutes:6,browserScenarios:9,inspectedScreenshots:4,keyboardFocusChecks:54,inverseCalculationInspections:30,onlyGuideAndNewNavigationChanged:true,existingCalculationsScalesRowsBarsAndTranslationsUnchanged:true,existingHandlersPracticeRecordsAndExportsUnchanged:true,sourceMirrorParity:true};
fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
