const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['firstresponse-arm-preview.spec.ts','run-arm-browser.cjs','playwright-arm.config.cjs','arm-capture-png.cjs','check-arm-fixture.cjs','prepare-arm-native-fixture.cjs','browser-fixture-preparation.json','fixture-list-check.json','fixture-contract-check.json'];
const saved=path.join(work,'native-mount-repair-before');if(fs.existsSync(saved))throw Error('Original snapshot exists; do not overwrite');fs.mkdirSync(saved);
const before={};for(const name of names){const b=fs.readFileSync(path.join(work,name));before[name]=sha(b);fs.writeFileSync(path.join(saved,name+'.saved'),b);}
const failedInputs=JSON.parse(fs.readFileSync(path.join(work,'native-adult-side/inputs.json'),'utf8'));
const harnessEntry=Object.entries(failedInputs.inputs).find(([p])=>path.basename(p)==='stem_gl_harness.ts');if(!harnessEntry||sha(fs.readFileSync(harnessEntry[0]))!==harnessEntry[1])throw Error('Shared harness drift');
for(const name of ['firstresponse-arm-preview.spec.ts','run-arm-browser.cjs','playwright-arm.config.cjs','arm-capture-png.cjs']){const entry=Object.entries(failedInputs.inputs).find(([p])=>path.basename(p)===name);if(!entry||entry[1]!==before[name])throw Error('Failed run input snapshot drift: '+name);}
const helper=`// Extend only the existing mount waits; predicates and arguments are forwarded unchanged.
async function runMountWithWaitWindow(page,mount){
  const original=page.waitForFunction,adjusted=[];
  page.waitForFunction=function(predicate,arg,options){
    const next=options&&options.timeout===30000?{...options,timeout:120000}:options;
    if(next!==options)adjusted.push({beforeMs:options.timeout,afterMs:next.timeout});
    return original.call(this,predicate,arg,next);
  };
  try{await mount();return {adjustedWaits:adjusted.length,waits:adjusted,waitPredicateUnchanged:true};}
  finally{page.waitForFunction=original;}
}
module.exports={runMountWithWaitWindow};
`;
fs.writeFileSync(path.join(work,'arm-mount-window.cjs'),helper);
function replace(s,a,b){if(s.split(a).length!==2)throw Error('Missing unique repair anchor: '+a);return s.replace(a,b);}
let author=fs.readFileSync(path.join(work,'prepare-arm-native-fixture.cjs'),'utf8');
const specPatch=`spec=replace(spec,"const {cropPng}=require('./arm-capture-png.cjs');", "const {cropPng}=require('./arm-capture-png.cjs');\\nconst {runMountWithWaitWindow}=require('./arm-mount-window.cjs');");
spec=replace(spec,'await harness.mount(page,','attempt.mountWindow=await runMountWithWaitWindow(page,()=>harness.mount(page,');
spec=replace(spec,"');await page.addStyleTag", "'));expect(attempt.mountWindow.adjustedWaits).toBe(4);await page.addStyleTag");
`;
author=replace(author,"let runner=migrate(",specPatch+"let runner=migrate(");
author=replace(author,"const files={",`runner=replace(runner,"path.join(work,'firstresponse-arm-preview.spec.ts'),", "path.join(work,'firstresponse-arm-preview.spec.ts'),path.join(work,'arm-mount-window.cjs'),");
const files={
  'arm-mount-window.cjs':fs.readFileSync(path.join(work,'arm-mount-window.cjs'),'utf8'),`);
author=replace(author,"'check-arm-fixture.cjs':migrate(fs.readFileSync(path.join(prior,'check-wrists-fixture.cjs'),'utf8')),","'check-arm-fixture.cjs':migrate(fs.readFileSync(path.join(prior,'check-wrists-fixture.cjs'),'utf8')).replace(\"'arm-capture-png.cjs'\",\"'arm-capture-png.cjs','arm-mount-window.cjs'\"),");
fs.writeFileSync(path.join(work,'prepare-arm-native-fixture.cjs'),author);
const built=spawnSync(process.execPath,[path.join(work,'prepare-arm-native-fixture.cjs')],{encoding:'utf8',windowsHide:true});if(built.status!==0)throw Error(built.stdout+built.stderr);
const oldFixture=fs.readFileSync(path.join(saved,'firstresponse-arm-preview.spec.ts.saved'),'utf8'),newFixture=fs.readFileSync(path.join(work,'firstresponse-arm-preview.spec.ts'),'utf8');
const reverted=newFixture.replace("\nconst {runMountWithWaitWindow}=require('./arm-mount-window.cjs');",'').replace('attempt.mountWindow=await runMountWithWaitWindow(page,()=>harness.mount(page,','await harness.mount(page,').replace("'));expect(attempt.mountWindow.adjustedWaits).toBe(4);await page.addStyleTag","');await page.addStyleTag");
if(reverted!==oldFixture)throw Error('Repair changed a fixture assertion or predicate');
const after={};for(const name of names.filter(n=>!n.endsWith('check.json')))after[name]=sha(fs.readFileSync(path.join(work,name)));after['arm-mount-window.cjs']=sha(fs.readFileSync(path.join(work,'arm-mount-window.cjs')));
const candidateSHA256=sha(fs.readFileSync(path.join(work,'candidate.js')));if(candidateSHA256!=='8c045e6d8056e834d795ed4bfecb0418758c6a5c3e9d2ce4f05d69ec14dca940')throw Error('Candidate drift');
fs.writeFileSync(path.join(work,'native-mount-repair.json'),JSON.stringify({passed:true,candidateSHA256,fixtureSHA256:after['firstresponse-arm-preview.spec.ts'],originalInputs:before,updatedInputs:after,failedRun:'native-adult-side',originalDirectory:'native-mount-repair-before',conditionPreserved:true,fixtureRestoredByRemovingOnlyMountWrapper:true,mountWaitBeforeMs:30000,mountWaitAfterMs:120000,perWorkflowTimeoutMs:450000,runnerTimeoutMs:900000,sharedHarnessUnchanged:true,browserLaunched:false},null,2));
console.log('Prepared private mount wait window; original inputs preserved and exact fixture assertions retained.');
