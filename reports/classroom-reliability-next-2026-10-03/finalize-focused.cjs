'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=file=>fs.readFileSync(path.join(root,file));
const focused=[
 ['pending-resource-removal','validation-forks/0-attempt-1.json',11,'current source'],
 ['word-sounds-recovery','word-sounds-candidate.json',17,'guarded candidate'],
 ['studio-submission-readiness','studio-candidate.json',24,'guarded candidate'],
];
const receipts=focused.map(([suite,file,cases,stage])=>{
 const result=JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));
 assert.equal(result.success,true);assert.equal(result.numFailedTests,0);assert.equal(result.numPendingTests,0);
 assert.equal(result.testResults.length,1);assert.equal(result.numPassedTests,cases);
 return {suite,report:file,cases,stage};
});
const applied=JSON.parse(fs.readFileSync(path.join(__dirname,'applied.json'),'utf8'));
applied.files.forEach(row=>assert.equal(hash(read(row.file)),row.afterSha256,'Applied file remains current'));
applied.context.forEach(row=>assert.equal(hash(read(row.file)),row.sha256,'Selective builder context remains current'));
// Tested candidate handler bytes are the exact applied bytes. The only host
// candidate refresh was the independently owned Maine loader URL.
for(const file of ['host_handlers_source.jsx','host_handlers_module.js']) {
 assert.equal(hash(read(file)),hash(fs.readFileSync(path.join(__dirname,'initial-candidate/candidate',file))),'Candidate handler bytes applied exactly');
}
for(const file of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx']) {
 const initial=fs.readFileSync(path.join(__dirname,'initial-candidate/candidate',file),'utf8').replace(/\r\n/g,'\n').split('\n');
 const current=read(file).toString().replace(/\r\n/g,'\n').split('\n');assert.equal(current.length,initial.length);
 current.forEach((line,index)=>assert(line===initial[index]||line.includes('window.__alloLazyMaineSldPractice')&&initial[index].includes('window.__alloLazyMaineSldPractice'),'Only independent Maine pin differs from tested candidate'));
}
const guard=JSON.parse(fs.readFileSync(path.join(__dirname,'vault-write-failure.json'),'utf8'));assert.equal(guard.passed,true);
const browser=JSON.parse(fs.readFileSync(path.join(__dirname,'accessibility/report.json'),'utf8'));assert.equal(browser.passed,true);
if(browser.pageErrors)assert.deepEqual(browser.pageErrors,[]);
for(const [file,value] of Object.entries(browser.inputs||{})) assert.equal(hash(read(file)),value,'Native browser input remains current: '+file);
const consistency=JSON.parse(fs.readFileSync(path.join(__dirname,'consistency.json'),'utf8'));assert.equal(consistency.passed,true);
const summary={status:'focused-validation-passed',completedAt:new Date().toISOString(),focusedVitestCases:52,currentHandlerFailureChecks:1,
 totalDistinctFocusedChecks:53,focusedReceipts:receipts,failedFocusedAssertions:0,skippedFocusedCases:0,
 currentSourceMatchesTestedCandidateExceptIndependentMainePin:true,sourceGeneratedParity:true,mirrorsAndPins:true,hostHandlersPin:applied.pin,
 nativeStudioAcceptance:true,browserReport:'accessibility/report.json',
 broaderUnitMatrix:{complete:false,reason:'Vitest thread and process workers repeatedly timed out before test collection',
 retained:['validation-manifest.json','validation-unsandboxed-manifest.json','validation-forks-manifest.json','word-sounds-current.json'],countedInFocusedTotal:false},
 limitations:['Actual full App and hosted Canvas not exercised','Builder/storage and download/mailbox boundaries controlled in failure checks','No manual assistive technology or physical speaker verification','No commit, broad build, push or deployment']};
fs.writeFileSync(path.join(__dirname,'validation-summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(summary));
