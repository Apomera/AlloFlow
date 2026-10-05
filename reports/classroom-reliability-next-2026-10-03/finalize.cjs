'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'validation-forks-manifest.json'),'utf8'));
assert.equal(manifest.passed,true,'Complete current-source unit validation');
assert.deepEqual(manifest.before,manifest.after,'Stable selected unit inputs');
const passed=manifest.files.filter(row=>row.passed),unique=new Set(passed.map(row=>row.file));
assert.equal(passed.length,18);assert.equal(unique.size,18);
let cases=0;
for(const row of passed) {
 const result=JSON.parse(fs.readFileSync(path.join(__dirname,row.report),'utf8'));
 assert.equal(row.exitCode,0);assert.equal(result.success,true);assert.equal(result.numFailedTests,0);assert.equal(result.numPendingTests,0);
 assert.equal(result.testResults.length,1);assert.equal(result.numPassedTests,row.cases);cases+=row.cases;
}
const browser=JSON.parse(fs.readFileSync(path.join(__dirname,'accessibility/report.json'),'utf8'));
assert.equal(browser.passed,true,'Native Studio browser acceptance');
if(browser.pageErrors)assert.deepEqual(browser.pageErrors,[]);
const drift=Object.entries(manifest.after).filter(([file,value])=>hash(fs.readFileSync(path.join(root,file)))!==value).map(([file])=>file);
assert.deepEqual(drift,[],'Unit inputs stayed current through browser acceptance');
const consistency=JSON.parse(fs.readFileSync(path.join(__dirname,'consistency.json'),'utf8'));assert.equal(consistency.passed,true);
const applied=JSON.parse(fs.readFileSync(path.join(__dirname,'applied.json'),'utf8'));
applied.files.forEach(row=>assert.equal(hash(fs.readFileSync(path.join(root,row.file))),row.afterSha256,'Applied file still current'));
const summary={passed:true,completedAt:new Date().toISOString(),unitFiles:18,passedUnitCases:cases,failedUnitCases:0,skippedUnitCases:0,
  selectedInputs:Object.keys(manifest.after).length,selectedInputBytesStable:true,sourceGeneratedParity:true,mirrorsAndPins:true,
  hostHandlersPin:applied.pin,nativeStudioAcceptance:true,browserReport:'accessibility/report.json',
  unitManifest:'validation-forks-manifest.json',excludedAttempts:['validation-manifest.json: worker-start failures before collection','validation-unsandboxed-manifest.json: incomplete thread-pool run; not counted'],
  limitations:['Actual full App and hosted Canvas not exercised','Download/mailbox boundaries controlled in unit readiness cases','No manual assistive technology or physical speaker verification','No commit, broad build, push or deployment']};
fs.writeFileSync(path.join(__dirname,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summary));
