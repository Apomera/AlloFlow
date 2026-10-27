'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const folder='reports/organism-contrast-wcag',read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const digest=value=>crypto.createHash('sha256').update(value).digest('hex'),hash=file=>digest(fs.readFileSync(file));
const runtime='stem_lab/stem_tool_organismid.js',runtimeSha=hash(runtime);
for(const file of ['desktop/web-app/public/stem_lab/stem_tool_organismid.js',folder+'/final-source.js',folder+'/final-mirror-source.js'])assert.equal(hash(file),runtimeSha);
new vm.Script(fs.readFileSync(runtime,'utf8'),{filename:runtime});
const units=read(folder+'/unit-tests.json');assert(units.success);assert.equal(units.numTotalTests,114);assert.equal(units.numPassedTests,114);assert.equal(units.numFailedTests,0);
for(const input of read(folder+'/unit-source.json'))assert.equal(hash(input.path),input.sha256,'Unit input changed: '+input.path);
const catalogs=read(folder+'/unit-catalog-scope.json');
for(const input of catalogs){assert.equal(digest(JSON.stringify(input.namespace)),input.namespaceSha256);assert.equal(digest(JSON.stringify(read(input.path).stem.organismid)),input.namespaceSha256);}
assert.equal(catalogs[0].namespaceSha256,catalogs[1].namespaceSha256);assert.equal(catalogs[0].namespace.show_in_tree,'Go to this branch');
const contrast=read(folder+'/final-native/results.json'),flows=read(folder+'/return-final/results.json'),regression=read('reports/organism-views-wcag/contrast-regression/results.json');
for(const result of [contrast,flows,regression]){
 assert.equal(result.sourceSha256,runtimeSha);assert(result.success&&result.browserClosed&&result.profileCleaned);assert(result.checks.every(row=>row.ok));
 assert.equal(result.errors.length,0);assert.equal(result.networkFailures.length,0);
 for(const input of result.inputs)assert.equal(hash(input.path),input.sha256,'Browser input changed: '+input.path);
 for(const capture of result.captures)assert.equal(hash(capture.path),capture.sha256);
}
assert.equal(contrast.checks.length,85);assert.equal(contrast.hero.length,24);assert.equal(contrast.glyphs.length,204);assert.equal(contrast.controls.length,12);
assert(contrast.hero.every(row=>row.supported&&row.contrastLowerBound>=4.5));assert(contrast.glyphs.every(row=>row.supported&&row.contrast>=3));
assert(contrast.controls.every(row=>row.borderInside>=3&&row.borderOutside>=3&&row.focusOutside>=3));
assert.equal(flows.checks.length,15);assert.equal(flows.cases.length,2);assert.equal(flows.focus.length,4);
assert.equal(regression.checks.length,59);assert.equal(regression.cases.length,20);assert.equal(regression.audits.length,20);assert.equal(regression.focus.length,8);
assert(regression.audits.every(row=>row.violations.length===0));assert(regression.focus.every(row=>row.failures.length===0&&row.unreached.length===0&&row.traversed===row.candidates));
let visualCount=0;
for(const file of ['contrast-visual-review.json','return-visual-review.json']){
 const review=read(folder+'/'+file);assert.equal(review.sourceSha256,runtimeSha);
 for(const capture of review.captures){assert(capture.passed);assert.equal(hash(capture.path),capture.sha256);visualCount++;}
}
assert.equal(visualCount,7);
const bounds=read(folder+'/contrast-summary.json');assert.equal(bounds.sourceSha256,runtimeSha);assert.equal(hash(bounds.nativeReport.path),bounds.nativeReport.sha256);assert.equal(bounds.coverage.length,24);
for(const row of bounds.coverage){assert(row.textBoxWithinRaster);assert.equal(hash(row.image.path),row.image.sha256);assert(row.box.left>=0&&row.box.top>=0&&row.box.right<=row.image.width&&row.box.bottom<=row.image.height);}
const preview=read(folder+'/preview-check.json');assert.equal(preview.sourceSha256,runtimeSha);assert(preview.sourceMatchesFinal);
const baseline=read(folder+'/baseline/results.json');assert(baseline.success);assert.equal(baseline.sourceSha256,hash(folder+'/baseline-source.js'));assert.equal(hash(folder+'/baseline-source.js'),hash(folder+'/baseline-mirror-source.js'));
const summary={success:true,runtimeSha256:runtimeSha,translationNamespaceSha256:catalogs[0].namespaceSha256,unitTests:114,newMountedTests:10,
 contrastChecks:85,newInteractionChecks:15,referenceViewRegressionChecks:59,totalBrowserChecks:159,
 reflowCases:flows.cases.length+regression.cases.length,sequentialFocusCases:regression.focus.length,returnFocusCases:flows.focus.length,
 sequentialControlsTraversed:regression.focus.reduce((n,row)=>n+row.traversed,0),themeAudits:regression.audits.length,confirmedAxeViolations:0,
 rawAxeIncompleteNodes:regression.audits.reduce((n,row)=>n+row.incomplete.reduce((m,item)=>m+item.nodes.length,0),0),
 minimumHeroContrastLowerBound:Math.min(...contrast.hero.map(row=>row.contrastLowerBound)),minimumGlyphContrast:Math.min(...contrast.glyphs.map(row=>row.contrast)),
 minimumBoundaryContrast:Math.min(...contrast.controls.flatMap(row=>[row.borderInside,row.borderOutside])),minimumFocusContrast:Math.min(...contrast.controls.map(row=>row.focusOutside)),
 visuallyReviewedCaptures:visualCount,preview:preview.url,
 limits:'Bounded rendered contrast verification and Taxonomy navigation/lesson enhancements. Raw axe incompletes are retained; spoken screen-reader support and complete WCAG conformance are not established.'};
fs.writeFileSync(folder+'/validation-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
