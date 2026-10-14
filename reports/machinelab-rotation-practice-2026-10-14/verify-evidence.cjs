const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(p));
const frozen='8fbf09087e942d99b52cc4a5c24c61718046cb3e7e3c6237d3208b70f915e040',baseline='cb2392852';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});const scope=read(dir+'/source-scope.json');
assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);assert.equal(scope.baselineCommit,baseline);
for(const k of ['onlyRotationGuideAndSharedNavigationChanged','existingCalculationsRotationBarsAndReferenceUnchanged','existingDraftUpdateFocusGradingRecordsAndExportsUnchanged','sourceMirrorParity','syntax'])assert.equal(scope[k],true);
const review=read(dir+'/source-review.json');assert.equal(review.sourceSha256,frozen);assert.equal(review.verdict,'pass');assert.deepEqual(review.findings,[]);
const out=dir+'/tests/run-01',manifest=read(out+'/processes.json'),final=read(out+'/final.json'),observed=read(out+'/observed-wrapper.json');
assert.equal(manifest.sourceSha256,frozen);assert.equal(manifest.baselineCommit,baseline);assert.equal(manifest.runnerSha256,hash(dir+'/run-tests.cjs'));assert.equal(manifest.runnerSha256,hash(out+'/runner-snapshot.cjs'));assert.equal(hash(manifest.helper.path),manifest.helper.sha256);
const files=["tests/machinelab_rotation_practice_entry.test.js","tests/machinelab_rotation_practice_entry.test.js","tests/machinelab_rotation_practice_entry.test.js","tests/machinelab_rotation_skills.test.js","tests/machinelab_rotation_skills.test.js","tests/machinelab_force_practice_entry.test.js","tests/machinelab_force_practice_entry.test.js","tests/machinelab_force_practice_entry.test.js","tests/machinelab_a11y.test.js","tests/machinelab_i18n_hygiene.test.js"];
assert.deepEqual(manifest.tests.map(t=>t.file),files);assert.deepEqual(manifest.runs.map(r=>r.file),files);
for(const t of manifest.tests){assert.equal(t.sha256,hash(t.file));if(t.baselineSha256){assert.equal(t.sha256,t.baselineSha256);assert.equal(t.sha256,sha(cp.execFileSync('git',['show',baseline+':'+t.file],{maxBuffer:5e6})));}else assert.equal(t.file,'tests/machinelab_rotation_practice_entry.test.js');}
const allPassed=[];
for(const [i,row] of manifest.runs.entries()){
  assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);assert.equal(row.sourceAfterSha256,frozen);assert.equal(row.mirrorAfterSha256,frozen);assert.equal(row.expected,[6,6,5,13,10,8,14,5,28,8][i]);
  assert.equal(hash(out+'/'+row.log),row.logSha256);assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);const receipt=read(out+'/'+row.receipt);assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,row.expected);
  const passed=receipt.testResults.flatMap(r=>r.assertionResults.filter(t=>t.status==='passed').map(t=>t.fullName));assert.deepEqual(passed,row.passedNames);assert.equal(new Set(passed).size,row.expected);if(row.pattern)assert(passed.every(n=>new RegExp(row.pattern).test(n)));allPassed.push(...passed);
}
assert.equal(allPassed.length,103);assert.equal(new Set(allPassed).size,103);assert.equal(final.passed,103);assert.equal(final.failed,0);assert.equal(final.processes,10);assert.equal(final.sourceSha256,frozen);assert.equal(final.mirrorSha256,frozen);assert.equal(final.manifestSha256,hash(out+'/processes.json'));assert.equal(observed.observedExitCode,0);assert.equal(observed.observedPassedTests,103);assert.equal(observed.sourceSha256,frozen);

const bd=dir+'/browser',bf=read(bd+'/final.json'),native=read(bd+'/run-02/native-exit.json'),bo=read(bd+'/run-02/observed-wrapper-exit.json'),br=read(bd+'/run-02/results.json');
assert.equal(bf.status,'passed');assert.equal(bf.finalRun,'run-02');assert.equal(bf.sourceSha256,frozen);assert.equal(bf.baselineSha256,scope.baselineSha256);assert.equal(bf.observedWrapperExitCode,0);assert.equal(bf.nativeExitCode,0);assert.equal(hash(bf.harness.file),bf.harness.sha256);for(const a of bf.artifacts)assert.equal(hash(bd+'/'+a.file),a.sha256);
assert.equal(native.exitCode,0);assert.equal(native.signal,null);assert.equal(native.error,null);assert.equal(native.frozenSourceSha256,frozen);assert.equal(native.unchanged,true);assert.equal(native.nodeOptions,'--max-old-space-size=512 --max-semi-space-size=8');assert.equal(native.timeoutMs,300000);assert.equal(bo.observedExitCode,0);assert.equal(bo.sessionId,67141);assert.equal(bo.nativeReceipt,'native-exit.json');assert.deepEqual(read(bd+'/run-02/'+bo.nativeReceipt),native);
for(const group of ['sourceBefore','sourceAfter']){assert.equal(native[group].length,2);for(const a of native[group]){assert.equal(a.sha256,frozen);assert.equal(hash(a.file),frozen);}}
assert.deepEqual(native.runnerBefore,native.runnerAfter);for(const a of native.runnerBefore)assert.equal(hash(a.file),a.sha256);
assert.equal(hash(bd+'/run-02/harness-snapshot.cjs'),bf.harness.sha256);assert.equal(hash(bd+'/run-02/runner-snapshot.cjs'),hash(bd+'/run-native.cjs'));
assert.equal(br.sourceSha256,frozen);assert.equal(br.baselineSha256,scope.baselineSha256);assert.deepEqual(br.errors,[]);assert.deepEqual(bf.errors,[]);assert.deepEqual(bf.preservedFailedRuns,['run-01']);assert.equal(br.checks.length,527);assert.equal(bf.checks,527);assert.equal(br.scenarios,9);assert.equal(bf.scenarios,9);assert.equal(br.shots.length,4);assert.equal(bf.screenshots,4);
assert.deepEqual([...br.routes].sort(),['screw','windlass']);assert.deepEqual([...br.linearRoutes].sort(),['lever','pulley','ramp','wedge']);assert.deepEqual(bf.routes,br.routes);assert.deepEqual(bf.linearRoutes,br.linearRoutes);for(const a of br.dependencies)assert.equal(hash(a.file),a.sha256);

// The first attempt failed before browser launch; only a local identifier was repaired.
const failed=read(bd+'/run-01/native-exit.json'),failedObserved=read(bd+'/run-01/observed-wrapper-exit.json'),repair=read(bd+'/run-01/harness-repair.json');
assert.equal(failed.exitCode,1);assert.equal(failedObserved.observedExitCode,1);assert.equal(failedObserved.nativeReceipt,'native-exit.json');assert.equal(failed.signal,null);assert.equal(failed.error,null);assert.equal(failed.frozenSourceSha256,frozen);assert.equal(failed.unchanged,true);assert.deepEqual(failed.runnerBefore,failed.runnerAfter);assert.equal(failed.runnerBefore[0].sha256,hash(bd+'/run-01/harness-snapshot.cjs'));assert.equal(failed.runnerBefore[1].sha256,hash(bd+'/run-01/runner-snapshot.cjs'));assert.equal(hash(bd+'/run-01/runner-snapshot.cjs'),hash(bd+'/run-native.cjs'));
for(const group of ['sourceBefore','sourceAfter']){assert.equal(failed[group].length,2);for(const a of failed[group])assert.equal(a.sha256,frozen);}
assert(!fs.existsSync(bd+'/run-01/results.json'));assert.equal(fs.readFileSync(bd+'/run-01/stdout.log','utf8').trim(),'');assert(fs.readFileSync(bd+'/run-01/stderr.log','utf8').includes("SyntaxError: Identifier 'units' has already been declared"));
const oldHarness=fs.readFileSync(bd+'/run-01/harness-snapshot.cjs','utf8'),newHarness=fs.readFileSync(bf.harness.file,'utf8');assert.equal(repair.beforeSha256,sha(oldHarness));assert.equal(repair.afterSha256,sha(newHarness));assert.equal(repair.productionUnchanged,true);assert.equal(oldHarness.replace('const units=','const rotaryUnits=').replaceAll('units[','rotaryUnits['),newHarness,'Only the local units binding and indexed uses changed after the pre-launch failure');

const views=br.observations.filter(o=>o.visual);assert.equal(views.length,8);
for(const {label,visual:view} of views){
  assert(view.page&&view.panel);assert.deepEqual(view.clipped,[]);assert(view.caption.font>=24&&view.task.tag==='SECTION'&&view.task.named&&view.task.heading.font>=20);assert.equal(view.metrics.length,8);assert.equal(view.cards.length,2);
  for(const m of view.metrics)assert(m.value.font>=(['rotationalWork','rotationalPower'].includes(m.key)?26:24));
  const metrics=view.metrics.filter(m=>m.task);assert.equal(metrics.length,6);
  if(label.includes('phone'))assert(metrics.every((m,i)=>!i||m.rect.y>=metrics[i-1].rect.bottom&&Math.abs(m.rect.x-metrics[0].rect.x)<1));
  else assert(metrics.every((m,i)=>i%2?Math.abs(m.rect.y-metrics[i-1].rect.y)<1&&m.rect.x>metrics[i-1].rect.right:!i||m.rect.y>=metrics[i-2].rect.bottom));
  for(const c of view.cards)assert(c.heading.font>=18&&c.equation.font>=20&&c.style.border!=='none'&&c.buttonRect.height>=44);
}
assert(views.find(v=>v.label==='forced-colors-phone').visual.forced);
const quantities=br.observations.filter(o=>o.metrics);assert.equal(quantities.length,7);
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
const geometry={windlass:{load:400,radius:.45,advance:2*Math.PI*.1},screw:{load:2000,radius:.15,advance:.005}};
for(const o of quantities){
  const g=geometry[o.kind],eta=o.percent/100,handPerTurn=2*Math.PI*g.radius,turns=.5/g.advance,angularTravel=turns*2*Math.PI,torque=g.load*g.advance/(2*Math.PI*eta),expected={handPerTurn,advance:g.advance,turns,angularTravel,torque,omega:angularTravel/o.seconds,rotationalWork:g.load*.5/eta,rotationalPower:g.load*.5/eta/o.seconds};
  for(const key of Object.keys(expected))assert(near(o.expected[key],expected[key]));assert.equal(o.metrics.length,8);for(const m of o.metrics)assert(m.semantic&&near(m.value,expected[m.key]));
  assert.equal(o.bars.length,2);assert.equal(o.bars[0].pattern,'solid');assert.equal(o.bars[1].pattern,'striped');assert(Math.abs(o.bars[0].trackX-o.bars[1].trackX)<.1&&Math.abs(o.bars[0].trackPixels-o.bars[1].trackPixels)<.1);
  for(const bar of o.bars){const value=bar.key==='hand'?expected.handPerTurn:expected.advance,scale=Math.max(expected.handPerTurn,expected.advance);assert.equal(bar.hidden,'true');assert(Math.abs(bar.width-value/scale*100)<.0001);assert(Math.abs(bar.pixels-(bar.trackPixels-bar.borderLeft-bar.borderRight)*bar.width/100)<.1);assert(Math.abs(bar.x-bar.trackX-bar.borderLeft)<.1);}
  assert.deepEqual(o.cards.map(c=>c.skill),['rotationalWork','rotationalPower']);
  for(const c of o.cards){const work=c.skill==='rotationalWork',m=c.equation.match(/([\d.e+-]+) N·m × ([\d.e+-]+) (rad(?:\/s)?) = ([\d.e+-]+) (J|W)/);assert(m);for(const [index,value] of [[1,expected.torque],[2,expected[work?'angularTravel':'omega']],[4,expected[c.skill]]])assert(Math.abs(Number(m[index])-value)<=Math.max(1e-10,Math.abs(value)*.000005));assert.equal(m[3],work?'rad':'rad/s');assert.equal(m[5],work?'J':'W');assert(c.heading&&c.localHeading&&c.uniqueHeading&&c.legacyEquation);assert.equal(c.tag,'SECTION');assert.equal(c.equationTag,'P');assert.equal(c.equationCount,1);assert.equal(c.button.type,'button');assert.equal(c.button.skill,c.skill);assert.equal(c.button.count,1);assert(c.localHelp&&c.uniqueHelp&&/save|keep|kept/i.test(c.help));}
}
const focused=br.observations.filter(o=>o.focus);assert.equal(focused.length,26);assert(focused.every(o=>o.focus.active&&o.focus.visible&&o.focus.outline!=='none'&&o.focus.width>=3));
const vr=read(bd+'/visual-review.json'),rr=read(bd+'/root-visual-review.json');assert.equal(vr.sourceSha256,frozen);assert.equal(rr.sourceSha256,frozen);assert.equal(vr.images.length,4);assert.equal(rr.screenshots.length,4);assert.equal(rr.verdict,'pass');
for(const shot of br.shots){const file='run-02/'+shot.file;assert.equal(hash(bd+'/'+file),shot.sha256);const a=vr.images.find(s=>s.file===file),b=rr.screenshots.find(s=>s.path.endsWith('/'+file));assert(a&&b);assert.equal(a.sha256,shot.sha256);assert.equal(b.sha256,shot.sha256);assert.equal(a.verdict,'pass');assert.equal(b.visuallyInspected,true);}
const summary={sourceSha256:frozen,newTests:17,selectedExistingTests:86,totalSelectedTests:103,testFiles:5,nativeTestProcesses:10,browserChecks:527,rotaryRoutes:2,linearExclusionsAndForceRegressionRoutes:4,browserScenarios:9,inspectedScreenshots:4,keyboardFocusChecks:26,quantitativeRotaryInspections:7,calculationCardInspections:14,finalBrowserRun:'run-02',preservedFailedBrowserRuns:['run-01'],failedAttemptOnlyLocalIdentifierChanged:true,onlyRotationGuideAndSharedNavigationChanged:true,existingCalculationsRotationBarsAndReferenceUnchanged:true,existingDraftUpdateFocusGradingRecordsAndExportsUnchanged:true,sourceMirrorParity:true};
fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
