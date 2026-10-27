'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const folder='reports/organism-views-wcag',read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const digest=value=>crypto.createHash('sha256').update(value).digest('hex'),hash=file=>digest(fs.readFileSync(file));
const runtime='stem_lab/stem_tool_organismid.js',runtimeSha=hash(runtime);
for(const file of ['desktop/web-app/public/stem_lab/stem_tool_organismid.js',folder+'/final-source.js',folder+'/final-mirror-source.js'])assert.equal(hash(file),runtimeSha);
new vm.Script(fs.readFileSync(runtime,'utf8'),{filename:runtime});
const units=read(folder+'/unit-tests.json');assert(units.success);assert.equal(units.numTotalTests,104);assert.equal(units.numPassedTests,104);assert.equal(units.numFailedTests,0);
for(const input of read(folder+'/unit-source.json'))assert.equal(hash(input.path),input.sha256,'Unit input changed: '+input.path);
const catalogs=read(folder+'/unit-catalog-scope.json');
for(const input of catalogs){assert.equal(digest(JSON.stringify(input.namespace)),input.namespaceSha256);assert.equal(digest(JSON.stringify(read(input.path).stem.organismid)),input.namespaceSha256);}
assert.equal(catalogs[0].namespaceSha256,catalogs[1].namespaceSha256);
assert(catalogs[0].namespace.tree_keyboard_help.includes('Enter or Space'));
const native=read(folder+'/final-native/results.json');assert.equal(native.sourceSha256,runtimeSha);assert(native.success&&native.browserClosed&&native.profileCleaned);
assert.equal(native.checks.length,59);assert(native.checks.every(row=>row.ok));assert.equal(native.cases.length,20);assert.equal(native.audits.length,20);assert.equal(native.focus.length,8);
assert(native.audits.every(row=>row.violations.length===0));
assert(native.focus.every(row=>row.failures.length===0&&row.unreached.length===0&&row.traversed===row.candidates));
assert.equal(native.errors.length,0);assert.equal(native.networkFailures.length,0);
for(const input of native.inputs)assert.equal(hash(input.path),input.sha256,'Native input changed: '+input.path);
for(const capture of native.captures)assert.equal(hash(capture.path),capture.sha256);
const visual=read(folder+'/visual-review.json');assert.equal(visual.sourceSha256,runtimeSha);assert(visual.captures.length>=4);
for(const capture of visual.captures){assert(capture.passed);assert.equal(hash(capture.path),capture.sha256);}
const preview=read(folder+'/preview-check.json');assert.equal(preview.sourceSha256,runtimeSha);assert(preview.sourceMatchesFinal);
const incomplete=read(folder+'/incomplete-review.json');assert.equal(incomplete.sourceSha256,runtimeSha);assert(incomplete.sourceSnapshotMatchesReport);
assert.equal(hash(incomplete.nativeReport.path),incomplete.nativeReport.sha256);
assert.equal(incomplete.categories.reduce((n,row)=>n+row.nodes,0),incomplete.rawAxeIncompleteNodes);
assert.equal(incomplete.rawAxeIncompleteNodes,native.audits.reduce((n,row)=>n+row.incomplete.reduce((m,item)=>m+item.nodes.length,0),0));
const baseline=read(folder+'/baseline/results.json');assert.equal(baseline.sourceSha256,hash(folder+'/baseline-source.js'));assert.equal(hash(folder+'/baseline-source.js'),hash(folder+'/baseline-mirror-source.js'));assert.equal(baseline.success,false);
const summary={success:true,runtimeSha256:runtimeSha,translationNamespaceSha256:catalogs[0].namespaceSha256,unitTests:104,newMountedTests:18,
 nativeChecks:native.checks.length,reflowCases:native.cases.length,focusCases:native.focus.length,
 sequentialControlsTraversed:native.focus.reduce((n,row)=>n+row.traversed,0),themeAudits:native.audits.length,confirmedAxeViolations:0,
 axeIncompleteNodes:native.audits.reduce((n,row)=>n+row.incomplete.reduce((m,item)=>m+item.nodes.length,0),0),
 visuallyReviewedCaptures:visual.captures.length,preview:preview.url,limits:native.scope};
fs.writeFileSync(folder+'/validation-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
