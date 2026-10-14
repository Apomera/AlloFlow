const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const dir=__dirname,root=path.resolve(dir,'../..');process.chdir(root);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(p));
const frozen='30be14963a64009b84a5c4c4aff01c3ff5a73aacdd58e0b6515559fe5c85ee6c',baseline='a94ee728a';
cp.execFileSync(process.execPath,[dir+'/verify-scope.cjs'],{stdio:'pipe',windowsHide:true});const scope=read(dir+'/source-scope.json');
assert.equal(scope.sourceSha256,frozen);assert.equal(scope.mirrorSha256,frozen);assert.equal(scope.baselineCommit,baseline);
for(const k of ['onlyForceSpeedGuideChanged','calculationsScalesRowsBarsAndTranslationsUnchanged','existingHandlersPracticeRecordsAndExportsUnchanged','sourceMirrorParity','syntax'])assert.equal(scope[k],true);
const review=read(dir+'/source-review.json');assert.equal(review.sourceSha256,frozen);assert.equal(review.verdict,'pass');assert.deepEqual(review.findings,[]);
const out=dir+'/tests/run-01',manifest=read(out+'/processes.json'),final=read(out+'/final.json'),observed=read(out+'/observed-wrapper.json');
assert.equal(manifest.sourceSha256,frozen);assert.equal(manifest.baselineCommit,baseline);assert.equal(manifest.runnerSha256,hash(dir+'/run-tests.cjs'));assert.equal(manifest.runnerSha256,hash(out+'/runner-snapshot.cjs'));assert.equal(hash(manifest.helper.path),manifest.helper.sha256);
const files=['tests/machinelab_force_speed.test.js','tests/machinelab_force_speed.test.js','tests/machinelab_a11y.test.js','tests/machinelab_i18n_hygiene.test.js'];
assert.deepEqual(manifest.tests.map(t=>t.file),files);assert.deepEqual(manifest.runs.map(r=>r.file),files);
for(const t of manifest.tests){assert.equal(t.sha256,hash(t.file));assert.equal(t.sha256,t.baselineSha256);assert.equal(t.sha256,sha(cp.execFileSync('git',['show',baseline+':'+t.file],{maxBuffer:5e6})));}
const allPassed=[];
for(const [i,row] of manifest.runs.entries()){
  assert.equal(row.exitCode,0);assert.equal(row.signal,null);assert.equal(row.error,null);assert.equal(row.timedOut,false);assert.equal(row.sourceAfterSha256,frozen);assert.equal(row.mirrorAfterSha256,frozen);assert.equal(row.expected,[6,8,28,8][i]);
  assert.equal(hash(out+'/'+row.log),row.logSha256);assert.equal(hash(out+'/'+row.receipt),row.receiptSha256);const receipt=read(out+'/'+row.receipt);assert.equal(receipt.success,true);assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numPassedTests,row.expected);
  const passed=receipt.testResults.flatMap(r=>r.assertionResults.filter(t=>t.status==='passed').map(t=>t.fullName));assert.deepEqual(passed,row.passedNames);assert.equal(new Set(passed).size,row.expected);if(row.pattern)assert(passed.every(n=>new RegExp(row.pattern).test(n)));allPassed.push(...passed);
}
assert.equal(allPassed.length,50);assert.equal(new Set(allPassed).size,50);assert.equal(final.passed,50);assert.equal(final.failed,0);assert.equal(final.processes,4);assert.equal(final.sourceSha256,frozen);assert.equal(final.mirrorSha256,frozen);assert.equal(final.manifestSha256,hash(out+'/processes.json'));assert.equal(observed.observedExitCode,0);assert.equal(observed.observedPassedTests,50);assert.equal(observed.sourceSha256,frozen);

const bd=dir+'/browser',bf=read(bd+'/final.json'),native=read(bd+'/run-01/native-exit.json'),bo=read(bd+'/run-01/observed-wrapper-exit.json'),br=read(bd+'/run-01/results.json');
assert.equal(bf.status,'passed');assert.equal(bf.finalRun,'run-01');assert.equal(bf.sourceSha256,frozen);assert.equal(bf.baselineSha256,scope.baselineSha256);assert.equal(bf.observedWrapperExitCode,0);assert.equal(bf.nativeExitCode,0);assert.equal(hash(bf.harness.file),bf.harness.sha256);for(const a of bf.artifacts)assert.equal(hash(bd+'/'+a.file),a.sha256);
assert.equal(native.exitCode,0);assert.equal(native.signal,null);assert.equal(native.error,null);assert.equal(native.frozenSourceSha256,frozen);assert.equal(native.unchanged,true);assert.equal(native.nodeOptions,'--max-old-space-size=512 --max-semi-space-size=8');assert.equal(native.timeoutMs,300000);assert.equal(bo.observedExitCode,0);assert.equal(bo.sessionId,88036);assert.equal(bo.nativeReceipt,'native-exit.json');assert.deepEqual(read(bd+'/run-01/'+bo.nativeReceipt),native);
for(const group of ['sourceBefore','sourceAfter']){assert.equal(native[group].length,2);for(const a of native[group]){assert.equal(a.sha256,frozen);assert.equal(hash(a.file),frozen);}}
assert.deepEqual(native.runnerBefore,native.runnerAfter);for(const a of native.runnerBefore)assert.equal(hash(a.file),a.sha256);
assert.equal(hash(bd+'/run-01/harness-snapshot.cjs'),bf.harness.sha256);assert.equal(hash(bd+'/run-01/runner-snapshot.cjs'),hash(bd+'/run-native.cjs'));
assert.equal(br.sourceSha256,frozen);assert.equal(br.baselineSha256,scope.baselineSha256);assert.deepEqual(br.errors,[]);assert.deepEqual(bf.errors,[]);assert.deepEqual(bf.preservedFailedRuns,[]);assert.equal(br.checks.length,1258);assert.equal(bf.checks,1258);assert.equal(br.scenarios,11);assert.equal(bf.scenarios,11);assert.equal(br.shots.length,6);assert.equal(bf.screenshots,6);
assert.deepEqual([...br.routes].sort(),['lever','pulley','ramp','screw','wedge','windlass']);assert.deepEqual(bf.routes,br.routes);for(const a of br.dependencies)assert.equal(hash(a.file),a.sha256);
const views=br.observations.filter(o=>o.visual);assert.equal(views.length,11);
for(const {visual:view} of views){
  assert(view.page&&view.panel&&view.caption.font>=24);assert.deepEqual(view.clipped,[]);assert.deepEqual(view.rows.map(r=>r.row),['input','output']);
  for(const row of view.rows){
    assert(row.uniqueHeading&&row.heading.font>=18&&row.rowStyle.border!=='none');assert(row.equation.font>=18&&row.equation.variant.includes('tabular-nums'));assert.equal(row.swatch.tag,'SPAN');assert.equal(row.swatch.hidden,'true');assert.equal(row.swatch.key,row.row);assert(row.swatch.rect.width>=18&&row.swatch.rect.height>=10);assert.equal(row.metrics.length,3);
    for(const metric of row.metrics){assert(metric.value.font>=(metric.key.includes('Power')?26:24));assert(metric.value.variant.includes('tabular-nums'));assert.equal(metric.bar.fill,row.swatch.style.fill);assert.equal(metric.bar.image,row.swatch.style.image);assert.equal(metric.bar.color,row.swatch.style.color);}
  }
}
for(const label of ['600px breakpoint','Dark320phone','Forcedcolors320phone','200percenttext320phone']){
  const view=views.find(v=>v.label===label).visual;
  for(const row of view.rows)assert(row.metrics.every((m,i)=>!i||m.rect.y>=row.metrics[i-1].rect.bottom&&Math.abs(m.rect.x-row.metrics[0].rect.x)<1));
}
const forced=views.find(v=>v.label==='Forcedcolors320phone').visual;assert(forced.forced);assert.equal(forced.rows[0].swatch.style.image,'none');assert(forced.rows[1].swatch.style.image.includes('gradient'));
const quantitative=br.observations.filter(o=>o.metrics);assert.equal(quantitative.length,24);
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
for(const observation of quantitative){
  const p=observation.expected;assert.equal(observation.metrics.length,6);assert.equal(observation.bars.length,6);
  for(const metric of observation.metrics)assert(metric.semantic&&near(metric.value,p[metric.key]));
  for(const pair of [['inputForce','loadForce'],['handSpeed','loadSpeed'],['inputPower','usefulPower']]){
    const scale=Math.max(p[pair[0]],p[pair[1]]),bars=pair.map(key=>observation.bars.find(b=>b.key===key));
    assert.equal(bars[0].pattern,'solid');assert.equal(bars[1].pattern,'striped');assert(Math.abs(bars[0].trackPixels-bars[1].trackPixels)<.1&&Math.abs(bars[0].trackX-bars[1].trackX)<.1);
    for(const bar of bars){assert.equal(bar.hidden,'true');assert(Math.abs(bar.width-p[bar.key]/scale*100)<.0001);assert(Math.abs(bar.pixels-(bar.trackPixels-bar.borderLeft-bar.borderRight)*bar.width/100)<.1);assert(Math.abs(bar.x-bar.trackX-bar.borderLeft)<.1);}
  }
  assert(near(p.inputForce*p.handSpeed,p.inputPower)&&near(p.loadForce*p.loadSpeed,p.usefulPower));
}
const reversed=quantitative.find(o=>o.label==='Lever below one mechanical advantage').expected;assert(reversed.inputForce>reversed.loadForce&&reversed.handSpeed<reversed.loadSpeed);
const focused=br.observations.filter(o=>o.focus);assert.equal(focused.length,17);assert(focused.every(o=>o.focus.active&&o.focus.visible&&o.focus.outline!=='none'&&o.focus.width>=3));
const vr=read(bd+'/visual-review.json'),rr=read(bd+'/root-visual-review.json');assert.equal(vr.sourceSha256,frozen);assert.equal(rr.sourceSha256,frozen);assert.equal(vr.images.length,6);assert.equal(rr.screenshots.length,6);assert.equal(rr.verdict,'pass');
for(const shot of br.shots){const file='run-01/'+shot.file;assert.equal(hash(bd+'/'+file),shot.sha256);const a=vr.images.find(s=>s.file===file),b=rr.screenshots.find(s=>s.path.endsWith('/'+file));assert(a&&b);assert.equal(a.sha256,shot.sha256);assert.equal(b.sha256,shot.sha256);assert.equal(a.verdict,'pass');assert.equal(b.visuallyInspected,true);}
const summary={sourceSha256:frozen,selectedExistingTests:50,testFiles:3,nativeTestProcesses:4,browserChecks:1258,benchRoutes:6,browserScenarios:11,inspectedScreenshots:6,keyboardFocusChecks:17,quantitativeGuideInspections:24,onlyForceSpeedGuideChanged:true,calculationsScalesRowsBarsAndTranslationsUnchanged:true,existingHandlersPracticeRecordsAndExportsUnchanged:true,sourceMirrorParity:true};
fs.writeFileSync(dir+'/validation-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
