const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert');
const out='reports/machinelab-power-visual-2026-10-12',source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source;
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const write=(file,data)=>fs.writeFileSync(out+'/'+file,JSON.stringify(data,null,2)+'\n');
const sha=hash(source);assert.equal(sha,'5580dd78b69dae7a50a6bcac6586262a42de935be58706a64825df8511e71579');assert.equal(hash(mirror),sha);
const aggregate=read(out+'/regression-final.json'),manifest=read(out+'/regression-processes.json'),inventories=new Map();
assert.equal(aggregate.sourceSha256,sha);assert.equal(manifest.sourceSha256,sha);assert.equal(aggregate.passed,457);assert.equal(aggregate.failed,0);assert.equal(aggregate.uncovered,0);
assert.equal(aggregate.files,7);assert.equal(aggregate.nativeReceipts,18);assert.equal(manifest.runs.length,18);
for(const run of manifest.runs){
  assert.equal(run.exitCode,0);assert.equal(run.signal,null);
  for(const field of ['sourceSha256','sourceAfterSha256','mirrorAfterSha256'])assert.equal(run[field],sha);
  assert.equal(hash(run.file),run.testSha256);assert.equal(run.testAfterSha256,run.testSha256);
  assert.equal(hash(out+'/'+run.receipt),run.receiptSha256);assert.equal(hash(out+'/'+run.log),run.logSha256);
  const native=read(out+'/'+run.receipt);assert(native.success);assert.equal(native.numFailedTests,0);assert.equal(native.numPassedTests,run.passed);assert.equal(native.testResults.length,1);
  const tests=native.testResults[0].assertionResults;
  if(!inventories.has(run.file))inventories.set(run.file,{names:tests.map(t=>t.fullName),counts:tests.map(()=>0)});
  const inventory=inventories.get(run.file);assert.deepEqual(tests.map(t=>t.fullName),inventory.names);
  tests.forEach((t,i)=>{if(t.status==='passed')inventory.counts[i]++;else assert(['pending','skipped'].includes(t.status));});
  assert.equal(tests.filter(t=>t.status==='passed').length,run.passed);
}
const coverage=[...inventories].map(([file,inventory])=>{assert(inventory.counts.every(n=>n===1));return{file,sha256:hash(file),passed:inventory.counts.length};});
assert.equal(coverage.length,7);assert.equal(coverage.reduce((n,c)=>n+c.passed,0),457);assert.deepEqual(coverage,aggregate.coverage);
const pointer=read(out+'/browser/final.json');assert.equal(hash(pointer.path),pointer.sha256);
const browser=read(pointer.path),results=read(browser.results.path);
assert.equal(browser.observedExitCode,0);assert.equal(browser.signal,null);assert.equal(browser.error,null);
for(const key of ['sourceSha256','sourceSha256After','publicMirrorSha256','publicMirrorSha256After'])assert.equal(browser[key],sha);
assert(browser.sourceExactInNativePage);assert.equal(browser.errors.length,0);assert.equal(results.errors.length,0);assert.equal(results.sourceSha256,sha);
assert.equal(browser.checks,results.checks.length);assert.equal(browser.scenarios,results.scenarios);assert(results.checks.length>40);assert(browser.screenshots.length>=4);assert(browser.screenshots.every(s=>s.visuallyInspected));
function artifacts(value){if(!value||typeof value!=='object')return;if(typeof value.path==='string'&&typeof value.sha256==='string'){
  if(value.path===browser.nativePage.path&&!fs.existsSync(value.path))return;
  assert.equal(hash(value.path),value.sha256);if(value.bytes!==undefined)assert.equal(fs.statSync(value.path).size,value.bytes);
}Object.values(value).forEach(artifacts);}
artifacts(browser);if(fs.existsSync(browser.nativePage.path))assert(fs.readFileSync(browser.nativePage.path,'utf8').includes(fs.readFileSync(source,'utf8')));
const scope=read(out+'/source-scope.json');assert.equal(scope.sourceSha256,sha);assert(scope.outsidePowerLabByteIdentical&&scope.changeAndSaveCallbacksByteIdentical&&scope.originalPaceTableByteIdentical);
const syntaxFiles=[source,mirror,...coverage.map(c=>c.file),browser.harness.path,out+'/browser/run-native.cjs',out+'/run-regressions.cjs',out+'/verify-source-scope.cjs',out+'/verify-evidence.cjs'];
for(const file of syntaxFiles){const r=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,file+': '+r.stderr);}
write('validation-summary.json',{
  date:'2026-10-12',scope:'Power and motion pace comparison figure, responsive metric cards, setup and practice hierarchy.',
  source:{canonical:source,publicMirror:mirror,sha256:sha,byteParity:true,scopeProof:'source-scope.json',scopeProofSha256:hash(out+'/source-scope.json')},
  tests:{passed:457,failed:0,uncovered:0,files:7,successfulNativeProcesses:18,allObservedChildExits:0,inventoryExactlyOnce:true,existingTestsUnchanged:true,
    coverage,aggregate:'regression-final.json',aggregateSha256:hash(out+'/regression-final.json'),processManifest:'regression-processes.json',processManifestSha256:hash(out+'/regression-processes.json')},
  browser:{checks:browser.checks,scenarios:browser.scenarios,errors:0,observedExitCode:0,process:pointer,screenshots:browser.screenshots,sourceExactInNativePage:true},
  review:{agent:'pace_review',result:'No remaining code-review blockers',evidenceReview:'Read-only reviewer verified native exit, final browser pointer and all 14 referenced artifacts, exact embedded source, and exactly-once regression verifier structure.',sourceSha256:sha,corrections:'Equal two-pixel row borders keep tracks the same width. Browser-found skill label clipping resolved with compact selector-only labels; full questions and records unchanged.',markerVisibility:'Added a contrasting outline behind the dashed marker; forced colors uses system Canvas/CanvasText.'},
  staticChecks:{syntaxFiles,observedExitCodes:0},
  limitations:['Constant-efficiency steady-motion conceptual model; no simulation playback, strength or acceleration change.','Subpixel bars are not given misleading minimum widths; numeric labels remain available.','Scoped tests and local Chromium host, not a full application build, physical assistive-device session, performance benchmark or deployment.'],
  excludedGeneratedArtifacts:['ml-shots.html','browser-temp/','test-temp/','downloads/']
});
console.log(JSON.stringify({passed:457,files:7,processes:18,browserChecks:browser.checks,screenshots:browser.screenshots.length,sourceSha256:sha}));
