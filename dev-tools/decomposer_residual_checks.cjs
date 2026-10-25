'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const folder='reports/decomposer-residual-wcag',read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const runtime='stem_lab/stem_tool_decomposer.js',runtimeSha=hash(runtime);
for(const file of ['desktop/web-app/public/stem_lab/stem_tool_decomposer.js',folder+'/final-source.js',folder+'/final-mirror-source.js'])assert.equal(hash(file),runtimeSha);
new vm.Script(fs.readFileSync(runtime,'utf8'),{filename:runtime});
assert.equal(hash('ui_strings.js'),hash('desktop/web-app/public/ui_strings.js'));
assert.equal(read('ui_strings.js').stem.decomposer.comparison_summary,'Comparing {material} with {comparison}.');
const units=read(folder+'/unit-tests.json');assert.equal(units.success,true);assert.equal(units.numTotalTests,197);assert.equal(units.numPassedTests,197);assert.equal(units.numFailedTests,0);
const catalogScope=read(folder+'/unit-catalog-scope.json');
for(const input of read(folder+'/unit-source.json'))if(!catalogScope.some(row=>row.path===input.path))assert.equal(hash(input.path),input.sha256,'Unit source changed: '+input.path);
for(const input of catalogScope){
 const namespace=read(input.path).stem.decomposer;
 const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
 assert.equal(digest(input.namespace),input.namespaceSha256);assert.equal(digest(namespace),input.namespaceSha256,'Decomposer translations changed: '+input.path);
}
const native=read(folder+'/final-native/native-residual-results.json'),messages=read(folder+'/message-final/results.json'),keyboard=read(folder+'/comparison-keyboard/results.json');
for(const report of [native,messages,keyboard]){
 assert.equal(report.sourceSha256,runtimeSha);assert.equal(report.success,true);assert.equal(report.errors.length,0);assert(report.browserClosed&&report.profileCleaned);
 for(const input of report.inputs)assert.equal(hash(input.path),input.sha256,'Native input changed: '+input.path);
}
assert.equal(native.palettes.length,8);const palettes=native.palettes.flatMap(row=>row.targets);assert.equal(palettes.length,52);
for(const target of palettes)assert(target.contrast.known&&target.contrast.minimumSampledContrast>=(target.name==='send-arrow'?3:4.5));
assert.equal(native.focus.length,16);for(const row of native.focus){assert.equal(row.failures.length,0);assert.equal(row.unreached.length,0);assert.equal(row.traversed,row.candidates);}
assert.equal(native.comparison.length,2);for(const row of native.comparison){assert.notEqual(row.selected,row.selectValue);assert.deepEqual(row.cardNames,[row.selected,row.selectValue]);assert.equal(row.storedCompareTo,row.selectValue);}
assert.equal(keyboard.checks.length,6);assert(keyboard.checks.every(row=>row.ok));
assert.equal(messages.cases.length,9);assert(messages.cases.every(row=>row.passed));
for(const capture of [...native.captures,messages.capture])assert.equal(hash(capture.path),capture.sha256);
const visual=read(folder+'/visual-review.json');assert.equal(visual.sourceSha256,runtimeSha);assert.equal(visual.captures.length,2);
for(const capture of visual.captures){assert.equal(hash(capture.path),capture.sha256);assert(capture.passed);}
const preview=read(folder+'/preview-check.json');assert.equal(preview.sourceSha256,runtimeSha);assert(preview.sourceMatchesFinal);
for(const input of preview.inputs)assert.equal(hash(input.path),input.sha256);
const summary={success:true,runtimeSha256:runtimeSha,catalogSha256:hash('ui_strings.js'),unitTests:197,newComparisonTests:20,
 contrastPalettes:52,minimumSampledContrast:Math.min(...palettes.map(target=>target.contrast.minimumSampledContrast)),focusCases:16,
 sequentialControlsTraversed:native.focus.reduce((count,row)=>count+row.traversed,0),nativeComparisonChecks:6,comparisonMismatchCases:2,
 tutorReflowCases:9,visuallyReviewedCaptures:2,preview:preview.url,
 limits:'Targeted comparison semantics, plaintext Tutor reflow, computed gradient palettes and native focus checks. No complete WCAG certification, literal browser zoom, or spoken screen-reader testing.'};
fs.writeFileSync(folder+'/validation-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
