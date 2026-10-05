'use strict';
// Fresh CLI process for each file: preserves isolation and avoids the observed
// Vitest worker-start/teardown failures between files. No assertion is changed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),config='reports/classroom-reliability-followup-2026-10-03/followup.vitest.config.js';
const files=[...fs.readFileSync(path.join(root,config),'utf8').matchAll(/'([^']+\.test\.js)'/g)].map(m=>m[1]);
const out=path.join(__dirname,'isolated');fs.mkdirSync(out,{recursive:true});
const manifest={startedAt:new Date().toISOString(),runnerSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),files:[],passed:false};
for(const [index,file]of files.entries()) {
 let passed=false;
 for(let attempt=1;attempt<=2;attempt++) {
  const name=index+'-attempt-'+attempt+'.json',target=path.join(out,name);assert(!fs.existsSync(target),'Retain attempt: '+target);
  const result=spawnSync(process.execPath,[path.join(root,'node_modules/vitest/vitest.mjs'),'run',file,'--config',config,'--maxWorkers=1','--reporter=default','--reporter=json','--outputFile='+target],{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,RECEIVER_LIFECYCLE_SOURCE:'AlloFlowANTI.txt',RECEIVER_TRANSPORT_SOURCE:'session_transport_module.js'}});
  const log=(result.stdout||'')+'\n'+(result.stderr||'');fs.writeFileSync(path.join(out,index+'-attempt-'+attempt+'.log'),log,{flag:'wx'});
  const report=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):null;
  const ok=result.status===0&&report?.success===true&&report.numFailedTests===0&&report.numPendingTests===0&&report.testResults.length===1&&report.testResults[0].name.replaceAll('\\','/').endsWith(file);
  manifest.files.push({file,attempt,exitCode:result.status,report:'isolated/'+name,passed:ok});
  fs.writeFileSync(path.join(__dirname,'isolated-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({file,attempt,exitCode:result.status,passed:ok,cases:report?.numPassedTests||0}));
  if(ok){passed=true;break;}
  if(!/vitest-pool.*(?:Failed to start|Timeout terminating)|Timeout waiting for worker to respond/s.test(log)||report?.numFailedTests>0)throw Error('Fixture/assertion failure: '+file+'; see retained log');
 }
 assert(passed,'Worker still unavailable for '+file);
}
manifest.passed=true;manifest.completedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'isolated-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
