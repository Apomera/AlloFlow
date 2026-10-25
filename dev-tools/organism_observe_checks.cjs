'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const folder='reports/organism-observe-wcag',read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const digest=value=>crypto.createHash('sha256').update(value).digest('hex'),hash=file=>digest(fs.readFileSync(file));
const runtime='stem_lab/stem_tool_organismid.js',runtimeSha=hash(runtime);
for(const file of ['desktop/web-app/public/stem_lab/stem_tool_organismid.js',folder+'/final-source.js',folder+'/final-mirror-source.js'])assert.equal(hash(file),runtimeSha);
new vm.Script(fs.readFileSync(runtime,'utf8'),{filename:runtime});
const units=read(folder+'/unit-tests.json');assert(units.success);assert.equal(units.numTotalTests,46);assert.equal(units.numPassedTests,46);assert.equal(units.numFailedTests,0);
for(const input of read(folder+'/unit-source.json'))assert.equal(hash(input.path),input.sha256,'Unit input changed: '+input.path);
const catalogScope=read(folder+'/unit-catalog-scope.json');
for(const input of catalogScope){assert.equal(digest(JSON.stringify(input.namespace)),input.namespaceSha256);assert.equal(digest(JSON.stringify(read(input.path).stem.organismid)),input.namespaceSha256);}
assert.equal(catalogScope[0].namespaceSha256,catalogScope[1].namespaceSha256);
assert.equal(catalogScope[0].namespace.observation_answer_help,'Choose an answer using the teaching example description.');
assert.equal(catalogScope[0].namespace.observation_example_changed,'{example} selected. {prompt}');
const native=read(folder+'/final-native/results.json');assert.equal(native.sourceSha256,runtimeSha);assert(native.success&&native.browserClosed&&native.profileCleaned);
assert.equal(native.checks.length,38);assert(native.checks.every(row=>row.ok));assert.equal(native.cases.length,12);assert.equal(native.audits.length,12);assert.equal(native.focus.length,4);
assert(native.audits.every(row=>row.violations.length===0));assert(native.focus.every(row=>row.failures.length===0&&row.unreached.length===0&&row.traversed===row.candidates));assert.equal(native.errors.length,0);assert.equal(native.networkFailures.length,0);
for(const input of native.inputs)assert.equal(hash(input.path),input.sha256,'Native input changed: '+input.path);
for(const capture of native.captures)assert.equal(hash(capture.path),capture.sha256);
const visual=read(folder+'/visual-review.json');assert.equal(visual.sourceSha256,runtimeSha);assert.equal(visual.captures.length,3);for(const capture of visual.captures){assert(capture.passed);assert.equal(hash(capture.path),capture.sha256);}
const preview=read(folder+'/preview-check.json');assert.equal(preview.sourceSha256,runtimeSha);assert(preview.sourceMatchesFinal);
const baseline=read(folder+'/baseline/results.json');assert.equal(baseline.sourceSha256,hash(folder+'/baseline-source.js'));assert.equal(hash(folder+'/baseline-source.js'),hash(folder+'/baseline-mirror-source.js'));assert.equal(baseline.success,false);
const summary={success:true,runtimeSha256:runtimeSha,translationNamespaceSha256:catalogScope[0].namespaceSha256,unitTests:46,newMountedTests:22,
 nativeChecks:38,reflowCases:12,focusCases:4,sequentialControlsTraversed:native.focus.reduce((n,row)=>n+row.traversed,0),themeAudits:12,confirmedAxeViolations:0,
 axeIncompleteNodes:native.audits.reduce((n,row)=>n+row.incomplete.reduce((m,item)=>m+item.nodes.length,0),0),visuallyReviewedCaptures:3,preview:preview.url,
 limits:native.scope};
fs.writeFileSync(folder+'/validation-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
