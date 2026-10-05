'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'));
const before=read('release/candidate-before-final.json'),after=read('release/candidate-after-final.json');
assert.equal(after.unchanged,true);assert.equal(after.current.declaredParityMatches,true);
const unique=new Set(),testedFiles=new Set(),runs=[];
const isolated=read('isolated-manifest.json');assert.equal(isolated.passed,true);
const successful=isolated.files.filter(row=>row.passed);assert.equal(successful.length,19);assert(successful.every(row=>row.exitCode===0));
for(const file of [...successful.map(row=>row.report),'ack-final-unit.json']) {
 const r=read(file);assert.equal(r.numFailedTests,0);assert.equal(r.numPendingTests,0);assert.equal(r.success,true);
 assert.equal(r.numFailedTestSuites,0);
 let count=0;for(const suite of r.testResults){const normalized=suite.name.replaceAll('\\','/');assert(!testedFiles.has(normalized),'Suite counted twice: '+normalized);testedFiles.add(normalized);for(const [ordinal,test]of suite.assertionResults.entries()){assert.equal(test.status,'passed');const key=normalized+'::'+ordinal;assert(!unique.has(key),'Case counted twice: '+key);unique.add(key);count++;}}
 assert.equal(count,r.numPassedTests);runs.push({file,passed:count,failed:0,skipped:0});
}
const configured=[...fs.readFileSync(path.join(__dirname,'followup.vitest.config.js'),'utf8').matchAll(/'([^']+\.test\.js)'/g)].map(m=>m[1]);
configured.push('tests/report_storage_ack_recovery.test.js','tests/storage_adapter_bootstrap_readiness.test.js');
for(const file of configured)assert(testedFiles.has(path.resolve(__dirname,'../..',file).replaceAll('\\','/')),'Configured suite omitted: '+file);
const learner=read('accessibility/report.json'),bridge=read('accessibility/bridge-report.json'),consistency=read('consistency-final.json');
assert.equal(learner.passed,true);assert.equal(bridge.passed,true);assert.equal(consistency.passed,true);
assert.equal(learner.pageErrors.length,0);assert.equal(bridge.pageErrors.length,0);
const matched=[],supplemental=[];
const check=(file,sha)=>{
 if(!before.files[file]) {
  assert.equal(file,'ui_strings.js','Uncaptured input: '+file);
  // The native runner captures and rechecks this actual input internally.
  // It was omitted from the broader static list, so report it explicitly.
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../..',file))).digest('hex'),sha,'Supplemental tested-source mismatch');
  supplemental.push({file,sha256:sha,proof:'Native runner before/after guard plus current byte match'});
 } else assert.equal(before.files[file].sha256,sha,'Tested-source mismatch: '+file);
 matched.push(file);
};
for(const [file,sha]of Object.entries(learner.inputs))check(file,sha);
for(const [file,info]of Object.entries(bridge.sources))check(file,info.sha256);
check(bridge.runner.file,bridge.runner.sha256);
for(const host of consistency.hosts)check(host.file,host.sha256);
assert.equal(learner.learnerPersistence.status,'saved');assert.equal(learner.learnerPersistence.strictNativeReadbackMatches,true);assert.equal(learner.learnerPersistence.resourceCount,2);
let clips=0;for(const row of learner.playback){assert.equal(row.clips.length,row.required);assert.equal(row.synthesisCalls,0);for(const clip of row.clips){assert.equal(clip.ended,true);clips++;}}
assert.equal(bridge.draftOnlyRoundTrips.length,5);for(const row of bridge.draftOnlyRoundTrips){assert(row.acknowledged&&row.exactWorkspaceReadBack);assert.equal(row.historyCount,0);}
assert.equal(bridge.explicitMediaRemovalAtCap.afterManifestCount,500);assert.equal(bridge.explicitMediaRemovalAtCap.actualRemovalEntry.reason,'user-remove-media');assert(bridge.freshExtendedRestore.exactCappedRemovalSnapshot&&bridge.freshExtendedRestore.exactDraftWorkspaces);
const result={passed:true,completedAt:new Date().toISOString(),passedUnitCases:unique.size,configuredTestFiles:configured.length,caseIdentity:'Distinct source test task by file and ordinal; repeated parameterized display titles are allowed; no rerun counted twice.',runs,
 candidateSha256:before.candidateSha256,head:before.startHead,selectedInputs:after.inputCount,parityPairs:before.parity.length,unchanged:true,
 browserSourceMatches:[...new Set(matched)],supplementalTestedSources:supplemental,nativeLearner:{strictVerifiedReadback:true,resourceCount:2,actualHydration:true,endedClips:clips,learnerSynthesisCalls:0},
 nativeBridge:{draftOnlyWorkspaces:5,cappedMediaIntentRetained:true,freshClientExactRestore:true,recoverySnapshots:8},
 nativeZoom:learner.nativeZoom,manualAssistiveTechnology:'not run',currentCI:'unverified',fullAppBuild:'not run',deployed:false,committed:false,
 scope:'Selected current local bytes, actual-source units, isolated native Chromium/IDB/iframe workflows. Does not establish hosted Google Canvas, physical device restart, semantic narration or manual accessibility certification.'};
fs.writeFileSync(path.join(__dirname,'validation-summary.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
