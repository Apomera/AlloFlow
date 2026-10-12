// Bind passing native evidence to the source, test inventories and inspected images.
const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert');
const out='reports/machinelab-power-planning-2026-10-12',source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source;
const frozen='19b5d0f85931b68081c2e64cee39d26cbfc63d0b721704cecb2f747f18c7131c';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const write=(file,data)=>fs.writeFileSync(out+'/'+file,JSON.stringify(data,null,2)+'\n');
assert.equal(hash(source),frozen);assert.equal(hash(mirror),frozen);
const aggregate=read(out+'/regression-final.json'),manifest=read(out+'/regression-processes.json');
assert.equal(aggregate.sourceSha256,frozen);assert.equal(manifest.sourceSha256,frozen);
assert.equal(aggregate.passed,457);assert.equal(aggregate.failed,0);assert.equal(aggregate.uncovered,0);
assert.equal(aggregate.files,7);assert.equal(aggregate.nativeReceipts,18);assert.equal(manifest.runs.length,18);
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
const coverage=nativeRuns(manifest.runs,out);assert.equal(coverage.length,7);assert.equal(coverage.reduce((n,c)=>n+c.passed,0),457);assert.deepEqual(coverage,aggregate.coverage);
const freshDir=out+'/new-tests/run-03',fresh=read(freshDir+'/final.json'),freshManifest=read(freshDir+'/processes.json');
assert.equal(fresh.sourceSha256,frozen);assert.equal(fresh.publicMirrorSha256,frozen);assert.equal(freshManifest.sourceSha256,frozen);
assert.equal(fresh.passed,111);assert.equal(fresh.failed,0);assert.equal(fresh.uncovered,0);assert.equal(fresh.nativeProcesses,5);assert.equal(freshManifest.runs.length,5);
assert.equal(hash(out+'/run-new-tests.cjs'),freshManifest.runnerSha256);assert.equal(hash(fresh.file),fresh.testSha256);assert.equal(freshManifest.testSha256,fresh.testSha256);
for(const item of [fresh.inventory,fresh.processManifest,...fresh.receipts])assert.equal(hash(freshDir+'/'+item.path),item.sha256);
const freshCoverage=nativeRuns(freshManifest.runs,freshDir);assert.equal(freshCoverage.length,1);assert.equal(freshCoverage[0].passed,111);
const inventory=read(freshDir+'/inventory.json');assert.equal(inventory.assertions.length,111);assert(inventory.assertions.every((a,i)=>a.index===i&&a.executedPassCount===1));
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
assert(browser.downloadedRecord);assert(browser.downloadedBoundaryRecord);artifacts(browser);if(fs.existsSync(browser.nativePage.path))assert(fs.readFileSync(browser.nativePage.path,'utf8').includes(fs.readFileSync(source,'utf8')));
const scope=read(out+'/source-scope.json');assert.equal(scope.sourceSha256,frozen);
for(const field of ['byteParity','outsidePowerRegionAndNewHelperByteIdentical','existingPhysicalMathHelpersByteIdentical','changeCallbackByteIdentical','saveCallbackOnlyVersionSelectionChanged','existingTestOnlySelectorExpectationChanged'])assert(scope[field]);
const allCoverage=coverage.concat(freshCoverage),syntaxFiles=[source,mirror,...allCoverage.map(c=>c.file),browser.harness.path,out+'/browser/run-native.cjs',out+'/run-regressions.cjs',out+'/run-new-tests.cjs',out+'/verify-source-scope.cjs',out+'/verify-evidence.cjs'];
for(const file of syntaxFiles){const r=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,file+': '+r.stderr);}
write('validation-summary.json',{
  date:'2026-10-12',scope:'Four single-stage power-budget planning skills, required-versus-available energy visualization and full practice question headings.',
  source:{canonical:source,publicMirror:mirror,sha256:frozen,byteParity:true,scopeProof:'source-scope.json',scopeProofSha256:hash(out+'/source-scope.json')},
  tests:{passed:568,newCases:111,existingCases:457,failed:0,uncovered:0,files:8,successfulNativeProcesses:23,allObservedChildExits:0,inventoryExactlyOnce:true,existingTestsPreservedWithOneSelectorExpectationUpdate:true,
    coverage:allCoverage,regressions:{aggregate:'regression-final.json',aggregateSha256:hash(out+'/regression-final.json'),processManifest:'regression-processes.json',processManifestSha256:hash(out+'/regression-processes.json')},
    added:{aggregate:'new-tests/run-03/final.json',aggregateSha256:hash(freshDir+'/final.json'),processManifest:'new-tests/run-03/processes.json',processManifestSha256:hash(freshDir+'/processes.json')}},
  browser:{checks:browser.checks,scenarios:browser.scenarios,errors:0,observedExitCode:0,process:pointer,screenshots:browser.screenshots,sourceExactInNativePage:true},
  review:{agent:'single_budget_review',result:'No remaining implementation or evidence-wiring blockers',sourceSha256:frozen,correction:'Required-efficiency final answers and exported records retain full precision so values above 100% do not display as 100%.',recordCompatibility:'Original kinds retain v1; new planning kinds use v2. Checked records require the correct numerical answer and unit; viewed-solution records preserve provenance.'},
  earlierAttempts:{excludedFromFinalPassCount:true,notes:'new-tests/README.md',attempts:[{path:'new-tests/run-01',outcome:'One failed overflow test fixture: MAX_VALUE times 0.5 was finite. Corrected fixture uses distance 2.'},{path:'new-tests/run-02',outcome:'110 cases passed on the earlier source, superseded after review found required-efficiency display precision issue.'}]},
  staticChecks:{syntaxFiles,observedExitCodes:0},
  limitations:['Constant-efficiency model at sustained full mechanical input power.','Load and movement limits are alternatives; force, travel, strength and acceleration are not constrained.','One latest power record per station and skill; no points or mastery claim.','Subpixel bars retain exact proportions; text labels remain available.','Scoped unit suites and local Chromium host, not a full application build, physical assistive-device session or deployment.'],
  excludedGeneratedArtifacts:['ml-shots.html','browser-temp/','test-temp/','downloads/']
});
console.log(JSON.stringify({passed:568,files:8,processes:23,browserChecks:browser.checks,screenshots:browser.screenshots.length,sourceSha256:frozen}));
