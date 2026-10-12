// Bind passing native evidence to the source, test inventories and inspected images.
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert');
const out='reports/machinelab-efficiency-skills-2026-10-12',source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source;
const frozen='79a2cab5b82d57f53173ce472663167ee00a335642c28c52c0295e32e6e7c5b5';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const write=(file,data)=>fs.writeFileSync(out+'/'+file,JSON.stringify(data,null,2)+'\n');
assert.equal(hash(source),frozen);assert.equal(hash(mirror),frozen);
const aggregate=read(out+'/regression-final.json'),manifest=read(out+'/regression-processes.json');
assert.equal(aggregate.sourceSha256,frozen);assert.equal(manifest.sourceSha256,frozen);
assert.equal(aggregate.passed,396);assert.equal(aggregate.failed,0);assert.equal(aggregate.uncovered,0);
assert.equal(aggregate.files,7);assert.equal(aggregate.nativeReceipts,17);assert.equal(manifest.runs.length,17);
function nativeRuns(runs,dir){
  const inventories=new Map();
  for(const run of runs){
    assert.equal(run.exitCode,0);assert.equal(run.signal,null);assert(!run.error);
    for(const field of ['sourceSha256','sourceAfterSha256','mirrorAfterSha256'])assert.equal(run[field],frozen);
    assert.equal(hash(run.file),run.testSha256);assert.equal(run.testAfterSha256,run.testSha256);
    assert.equal(hash(dir+'/'+run.receipt),run.receiptSha256);assert.equal(hash(dir+'/'+run.log),run.logSha256);
    const native=read(dir+'/'+run.receipt);assert(native.success);assert.equal(native.numFailedTests,0);assert.equal(native.numPassedTests,run.passed);assert.equal(native.testResults.length,1);
    const tests=native.testResults[0].assertionResults;
    if(!inventories.has(run.file))inventories.set(run.file,{names:tests.map(t=>t.fullName),counts:tests.map(()=>0)});
    const inventory=inventories.get(run.file);assert.deepEqual(tests.map(t=>t.fullName),inventory.names);
    tests.forEach((t,i)=>{if(t.status==='passed')inventory.counts[i]++;else assert(['pending','skipped'].includes(t.status));});
    assert.equal(tests.filter(t=>t.status==='passed').length,run.passed);
  }
  return [...inventories].map(([file,inventory])=>{assert(inventory.counts.every(n=>n===1));return{file,sha256:hash(file),passed:inventory.counts.length};});
}
const coverage=nativeRuns(manifest.runs,out);assert.equal(coverage.length,7);assert.equal(coverage.reduce((n,c)=>n+c.passed,0),396);assert.deepEqual(coverage,aggregate.coverage);
const freshDir=out+'/new-tests/run-01',fresh=read(freshDir+'/final.json'),freshManifest=read(freshDir+'/processes.json');
assert.equal(fresh.sourceSha256,frozen);assert.equal(fresh.publicMirrorSha256,frozen);assert.equal(freshManifest.sourceSha256,frozen);
assert.equal(fresh.passed,77);assert.equal(fresh.failed,0);assert.equal(fresh.uncovered,0);assert.equal(fresh.nativeProcesses,4);assert.equal(freshManifest.runs.length,4);
assert.equal(hash(out+'/run-new-tests.cjs'),freshManifest.runnerSha256);assert.equal(hash(fresh.file),fresh.testSha256);assert.equal(freshManifest.testSha256,fresh.testSha256);
for(const item of [fresh.inventory,fresh.processManifest,...fresh.receipts])assert.equal(hash(freshDir+'/'+item.path),item.sha256);
const freshCoverage=nativeRuns(freshManifest.runs,freshDir);assert.equal(freshCoverage.length,1);assert.equal(freshCoverage[0].passed,77);
const inventory=read(freshDir+'/inventory.json');assert.equal(inventory.assertions.length,77);assert(inventory.assertions.every((a,i)=>a.index===i&&a.executedPassCount===1));
assert.deepEqual(inventory.assertions.map(a=>a.fullName),read(freshDir+'/'+freshManifest.runs[0].receipt).testResults[0].assertionResults.map(a=>a.fullName));
const pointer=read(out+'/browser/final.json');assert.equal(hash(pointer.path),pointer.sha256);
const browser=read(pointer.path),results=read(browser.results.path);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(browser[key],frozen);
assert(browser.sourceExactInNativePage);assert.equal(browser.errors.length,0);assert.equal(results.errors.length,0);assert.equal(results.sourceSha256,frozen);
assert.equal(browser.checks,results.checks.length);assert.equal(browser.scenarios,results.scenarios);assert(results.checks.length>40);assert(browser.screenshots.length>=5);assert(browser.screenshots.every(s=>s.visuallyInspected));
function artifacts(value){if(!value||typeof value!=='object')return;if(typeof value.path==='string'&&typeof value.sha256==='string'){
  if(value.path===browser.nativePage.path&&!fs.existsSync(value.path))return;
  assert.equal(hash(value.path),value.sha256);if(value.bytes!==undefined)assert.equal(fs.statSync(value.path).size,value.bytes);
}Object.values(value).forEach(artifacts);}
assert(browser.downloadedRecord);artifacts(browser);if(fs.existsSync(browser.nativePage.path))assert(fs.readFileSync(browser.nativePage.path,'utf8').includes(fs.readFileSync(source,'utf8')));
const scope=read(out+'/source-scope.json');assert.equal(scope.sourceSha256,frozen);
for(const field of ['byteParity','outsideEfficiencyRegionByteIdentical','physicalMathHelpersByteIdentical','changeCallbackByteIdentical','saveCallbackOnlyVersionSelectionChanged'])assert(scope[field]);
const allCoverage=coverage.concat(freshCoverage),syntaxFiles=[source,mirror,...allCoverage.map(c=>c.file),browser.harness.path,out+'/browser/run-native.cjs',out+'/run-regressions.cjs',out+'/run-new-tests.cjs',out+'/verify-source-scope.cjs',out+'/verify-evidence.cjs'];
for(const file of syntaxFiles){const r=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,file+': '+r.stderr);}
write('validation-summary.json',{
  date:'2026-10-12',scope:'Four efficiency inverse/related skills, guarded Next skill, precise problem operands, energy-share visualization and responsive practice hierarchy.',
  source:{canonical:source,publicMirror:mirror,sha256:frozen,byteParity:true,scopeProof:'source-scope.json',scopeProofSha256:hash(out+'/source-scope.json')},
  tests:{passed:473,newCases:77,existingCases:396,failed:0,uncovered:0,files:8,successfulNativeProcesses:21,allObservedChildExits:0,inventoryExactlyOnce:true,existingTestsUnchanged:true,
    coverage:allCoverage,regressions:{aggregate:'regression-final.json',aggregateSha256:hash(out+'/regression-final.json'),processManifest:'regression-processes.json',processManifestSha256:hash(out+'/regression-processes.json')},
    added:{aggregate:'new-tests/run-01/final.json',aggregateSha256:hash(freshDir+'/final.json'),processManifest:'new-tests/run-01/processes.json',processManifestSha256:hash(freshDir+'/processes.json')}},
  browser:{checks:browser.checks,scenarios:browser.scenarios,errors:0,observedExitCode:0,process:pointer,screenshots:browser.screenshots,sourceExactInNativePage:true},
  review:{agent:'efficiency_next_review',result:'No remaining implementation blockers',evidenceReview:'Independent read-only review rehashed all new native receipts, logs, tests and runner; reconstructed 77 exactly-once cases and reviewed regression/final-verifier invariants.',sourceSha256:frozen,correctionsBeforeFreeze:['Near-100% problem assumptions and decimal fractions retain precision.','Small actual-MA metric values use significant figures.','Compact selectors accompanied by full question titles.'],recordCompatibility:'Legacy kinds retain v1 and prior grading; new kinds use v2 and tighter absolute floor. Viewed solutions honestly retain any offered unit, while checked records require the correct unit.'},
  staticChecks:{syntaxFiles,observedExitCodes:0},
  limitations:['Constant-efficiency conceptual model; original physical math unchanged.','One latest efficiency calculation per station; saving replaces that station record.','Subpixel energy shares retain exact proportions; text labels remain available.','Scoped units and local Chromium host, not a full application build, physical assistive-device session, performance benchmark or deployment.'],
  excludedGeneratedArtifacts:['ml-shots.html','browser-temp/','test-temp/','downloads/']
});
console.log(JSON.stringify({passed:473,files:8,processes:21,browserChecks:browser.checks,screenshots:browser.screenshots.length,sourceSha256:frozen}));
