'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const folder='reports/decomposer-comfort-wcag';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const runtime='stem_lab/stem_tool_decomposer.js',mirror='desktop/web-app/public/stem_lab/stem_tool_decomposer.js';
const runtimeSha=hash(runtime);assert.equal(hash(mirror),runtimeSha);
for(const file of [runtime,mirror])new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
for(const file of ['final-source.js','final-mirror-source.js'])assert.equal(hash(path.join(folder,file)),runtimeSha);
assert.equal(hash('ui_strings.js'),hash('desktop/web-app/public/ui_strings.js'));
const strings=read('ui_strings.js').stem.decomposer;
assert.equal(strings.concept_studied,'Term studied.');
assert.equal(strings.concept_study_hint,'Study this term to add it to your vocabulary.');
assert.equal(strings.fullscreen_scene,'{scene} fullscreen decomposition scene');
const unitInputs=read(path.join(folder,'unit-source.json'));
for(const input of unitInputs)assert.equal(hash(input.path),input.sha256,'Unit input changed: '+input.path);
const units=read(path.join(folder,'unit-tests.json'));
assert.equal(units.success,true);assert.equal(units.numFailedTests,0);assert.equal(units.numPassedTests,units.numTotalTests);
assert.equal(units.numTotalTests,177);
const native=read(path.join(folder,'final-native/results.json'));
assert.equal(native.sourceSha256,runtimeSha);assert.equal(native.sharedFullscreenSha256,hash('stem_lab/stem_lab_module.js'));
assert.equal(native.success,true);assert.equal(native.failed,0);assert(native.checks.length>=37);
assert(native.checks.every(row=>row.ok));assert.equal(native.cases.length,9);assert.equal(native.audits.length,9);
assert(native.audits.every(row=>row.violations.length===0));assert.equal(native.errors.length,0);assert.equal(native.networkFailures.length,0);
assert(native.browsersClosed&&native.browserTempCleaned);
for(const input of native.inputs)assert.equal(hash(input.path),input.sha256,'Native input changed: '+input.path);
for(const capture of native.captures)assert.equal(hash(capture.path),capture.sha256);
const visual=read(path.join(folder,'visual-review.json'));
assert.equal(visual.sourceSha256,runtimeSha);assert(visual.captures.length>=4);
for(const row of visual.captures){assert.equal(hash(row.path),row.sha256);assert.equal(row.passed,true);}
const newTests=units.testResults.filter(row=>/decomposer_(study_comfort|fullscreen)_accessibility/.test(row.name)).reduce((count,row)=>count+row.assertionResults.length,0);
const summary={success:true,runtimeSha256:runtimeSha,catalogSha256:hash('ui_strings.js'),
 unitTests:units.numTotalTests,newMountedTests:newTests,nativeChecks:native.checks.length,layoutCases:native.cases.length,
 themeAudits:native.audits.length,confirmedAxeViolations:0,axeIncompleteItems:native.audits.reduce((count,row)=>count+row.incomplete.reduce((n,item)=>n+item.nodes.length,0),0),
 visuallyReviewedCaptures:visual.captures.length,limits:native.scope,
 evidence:{units:folder+'/unit-tests.json',native:folder+'/final-native/results.json',visual:folder+'/visual-review.json'}};
fs.writeFileSync(path.join(folder,'validation-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
