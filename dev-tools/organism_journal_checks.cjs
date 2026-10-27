'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const folder='reports/organism-journal-wcag',read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const digest=value=>crypto.createHash('sha256').update(value).digest('hex'),hash=file=>digest(fs.readFileSync(file));
const runtime='stem_lab/stem_tool_organismid.js',runtimeSha=hash(runtime);
for(const file of ['desktop/web-app/public/stem_lab/stem_tool_organismid.js',folder+'/final-source.js',folder+'/final-mirror-source.js'])assert.equal(hash(file),runtimeSha);
new vm.Script(fs.readFileSync(runtime,'utf8'),{filename:runtime});
const units=read(folder+'/unit-tests.json');assert(units.success);assert.equal(units.numTotalTests,86);assert.equal(units.numPassedTests,86);assert.equal(units.numFailedTests,0);
for(const input of read(folder+'/unit-source.json'))assert.equal(hash(input.path),input.sha256,'Unit input changed: '+input.path);
const catalogScope=read(folder+'/unit-catalog-scope.json');
for(const input of catalogScope){assert.equal(digest(JSON.stringify(input.namespace)),input.namespaceSha256);assert.equal(digest(JSON.stringify(read(input.path).stem.organismid)),input.namespaceSha256);}
assert.equal(catalogScope[0].namespaceSha256,catalogScope[1].namespaceSha256);
assert.equal(catalogScope[0].namespace.observation_required,'(required)');
assert.equal(catalogScope[0].namespace.observation_note_error,'Write an observation before saving.');
assert.equal(catalogScope[0].namespace.observation_reason_error,'Describe what changed before saving a revision.');
const native=read(folder+'/final-native/results.json');
const regression=read('reports/organism-observe-wcag/journal-regression/results.json');
for(const result of [native,regression]){
 assert.equal(result.sourceSha256,runtimeSha);assert(result.success&&result.browserClosed&&result.profileCleaned);
 assert(result.checks.every(row=>row.ok));assert(result.audits.every(row=>row.violations.length===0));
 assert(result.focus.every(row=>row.failures.length===0&&row.unreached.length===0&&row.traversed===row.candidates));
 assert.equal(result.errors.length,0);assert.equal(result.networkFailures.length,0);
 for(const input of result.inputs)assert.equal(hash(input.path),input.sha256,'Native input changed: '+input.path);
 for(const capture of result.captures)assert.equal(hash(capture.path),capture.sha256);
}
assert.equal(native.checks.length,49);assert.equal(native.cases.length,6);assert.equal(native.audits.length,8);assert.equal(native.focus.length,4);
assert.equal(regression.checks.length,38);assert.equal(regression.cases.length,12);assert.equal(regression.audits.length,12);assert.equal(regression.focus.length,4);
assert.equal(native.boundaries.length,4);
for(const group of native.boundaries.filter(row=>row.theme!=='forced-colors'))assert(group.controls.every(row=>row.againstFill>=3&&row.againstPanel>=3));
const visual=read(folder+'/visual-review.json');assert.equal(visual.sourceSha256,runtimeSha);assert(visual.captures.length>=4);
for(const capture of visual.captures){assert(capture.passed);assert.equal(hash(capture.path),capture.sha256);}
const preview=read(folder+'/preview-check.json');assert.equal(preview.sourceSha256,runtimeSha);assert(preview.sourceMatchesFinal);
const baseline=read(folder+'/baseline/results.json');assert.equal(baseline.sourceSha256,hash(folder+'/baseline-source.js'));assert.equal(hash(folder+'/baseline-source.js'),hash(folder+'/baseline-mirror-source.js'));assert.equal(baseline.success,false);
const audits=native.audits.concat(regression.audits),focus=native.focus.concat(regression.focus);
const summary={success:true,runtimeSha256:runtimeSha,translationNamespaceSha256:catalogScope[0].namespaceSha256,unitTests:86,newMountedTests:40,
 nativeChecks:native.checks.length,observeRegressionChecks:regression.checks.length,reflowCases:native.cases.length+regression.cases.length,
 focusCases:focus.length,sequentialControlsTraversed:focus.reduce((n,row)=>n+row.traversed,0),themeAudits:audits.length,confirmedAxeViolations:0,
 axeIncompleteNodes:audits.reduce((n,row)=>n+row.incomplete.reduce((m,item)=>m+item.nodes.length,0),0),
 formBoundaryContrast:native.boundaries.filter(row=>row.theme!=='forced-colors').map(row=>({theme:row.theme,minimum:Math.min(...row.controls.flatMap(control=>[control.againstFill,control.againstPanel]))})),
 visuallyReviewedCaptures:visual.captures.length,preview:preview.url,
 limits:'Bounded Taxonomy journal validation, recovery focus, navigation and Observe regression checks. Not full WCAG certification, literal browser zoom, or spoken screen-reader testing.'};
fs.writeFileSync(folder+'/validation-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
