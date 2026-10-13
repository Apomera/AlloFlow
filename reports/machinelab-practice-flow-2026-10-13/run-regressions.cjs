const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const frozen='fb53d0759f9a101822a0475af19706991fa48a40c23c439d8f7773600944746c';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,prior='reports/machinelab-force-speed-2026-10-13';
cp.execFileSync(process.execPath,[path.join(__dirname,'verify-scope.cjs')],{stdio:'pipe',windowsHide:true});
const runs=read(prior+'/regressions/run-01/processes.json').runs.concat(read(prior+'/new-tests/run-01/processes.json').runs)
  .map(r=>({file:r.file,pattern:r.pattern,expected:r.passed,testSha256:r.testSha256}));
assert.equal(runs.reduce((n,r)=>n+r.expected,0),329);assert.equal(runs.length,20);
const out=path.resolve(process.argv[2]||path.join(__dirname,'regressions/run-01'));if(fs.existsSync(out))throw Error('Use a fresh output directory');
const resumeDir=process.argv[3]&&path.resolve(process.argv[3]);
const resumed=resumeDir?read(path.join(resumeDir,'processes.json')):null;
if(resumed){assert.equal(resumed.sourceSha256,frozen);assert.equal(resumed.runnerSha256,hash(path.join(resumeDir,'runner-snapshot.cjs')));}
fs.mkdirSync(path.join(out,'test-temp'),{recursive:true});
const write=(name,x)=>fs.writeFileSync(path.join(out,name),JSON.stringify(x,null,2)+'\n');
const verify=()=>{assert.equal(hash(source),frozen);assert.equal(hash(mirror),frozen);for(const r of runs)assert.equal(hash(r.file),r.testSha256);};verify();
const manifest={sourceSha256:frozen,runnerSha256:hash(__filename),selection:'Work records, read aloud, i18n, grade bands, accessibility, power/planning practice and state/record regressions, all rotary and skill-map cases.',runs:[]};
if(resumed)manifest.resumedFrom={path:path.relative(process.cwd(),path.join(resumeDir,'processes.json')).replaceAll('\\','/'),sha256:hash(path.join(resumeDir,'processes.json')),runnerSnapshot:path.relative(process.cwd(),path.join(resumeDir,'runner-snapshot.cjs')).replaceAll('\\','/'),runnerSha256:resumed.runnerSha256};
const inventory=new Map();
for(let i=0;i<runs.length;i++){
  verify();const r=runs[i],stem='group-'+String(i+1).padStart(2,'0'),receipt=stem+'.json',log=stem+'.log';
  const args=['node_modules/vitest/vitest.mjs','run',r.file,'--maxWorkers=1','--pool=forks','--no-isolate','--testTimeout=30000','--reporter=json','--outputFile',path.join(out,receipt)];if(r.pattern)args.push('--testNamePattern',r.pattern);
  const previous=resumed&&resumed.runs[i];let native;
  if(previous){
    for(const key of ['file','pattern','expected','testSha256'])assert.equal(previous[key],r[key]);
    for(const key of ['sourceSha256','sourceAfterSha256','mirrorAfterSha256'])assert.equal(previous[key],frozen);
    assert.equal(previous.testAfterSha256,r.testSha256);assert.equal(previous.exitCode,0);assert.equal(previous.signal,null);assert.equal(previous.error,null);assert.equal(previous.passed,r.expected);
    assert.equal(hash(path.join(resumeDir,previous.receipt)),previous.receiptSha256);assert.equal(hash(path.join(resumeDir,previous.log)),previous.logSha256);
    fs.copyFileSync(path.join(resumeDir,previous.receipt),path.join(out,receipt));fs.copyFileSync(path.join(resumeDir,previous.log),path.join(out,log));
    native={status:previous.exitCode,signal:previous.signal,error:previous.error};
  }else{
    native=cp.spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16e6,windowsHide:true,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512 --max-semi-space-size=8',TEMP:path.join(out,'test-temp'),TMP:path.join(out,'test-temp')}});
    fs.writeFileSync(path.join(out,log),((native.stdout||'')+'\n'+(native.stderr||'')+(native.error?'\n'+String(native.error):'')).replace(/\r\n/g,'\n').split('\n').map(l=>l.trimEnd()).join('\n').trimEnd()+'\n');
  }
  const record={...r,receipt,log,sourceSha256:frozen,sourceAfterSha256:hash(source),mirrorAfterSha256:hash(mirror),testAfterSha256:hash(r.file),exitCode:native.status,signal:native.signal,error:native.error?String(native.error):null,logSha256:hash(path.join(out,log))};
  if(previous)record.resumedFrom={manifest:manifest.resumedFrom.path,index:i};
  if(fs.existsSync(path.join(out,receipt)))record.receiptSha256=hash(path.join(out,receipt));manifest.runs.push(record);write('processes.json',manifest);
  assert.equal(native.status,0);assert.equal(native.signal,null);assert(!native.error);verify();
  const report=read(path.join(out,receipt));assert.equal(report.success,true);assert.equal(report.numFailedTests,0);assert.equal(report.numPassedTests,r.expected);assert.equal(report.testResults.length,1);
  const cases=report.testResults[0].assertionResults;if(!inventory.has(r.file))inventory.set(r.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});
  const item=inventory.get(r.file);assert.deepEqual(cases.map(c=>c.fullName),item.names);cases.forEach((c,j)=>{if(c.status==='passed')item.counts[j]++;else assert(['pending','skipped'].includes(c.status));});
  record.passed=report.numPassedTests;write('processes.json',manifest);console.log(stem+': '+record.passed+' passed; '+(previous?'verified prior native exit0':'observed native exit0'));
}
let count=0;for(const item of inventory.values()){assert(item.counts.every(n=>n<=1));count+=item.counts.reduce((a,b)=>a+b,0);}assert.equal(count,329);verify();
write('inventory.json',{files:[...inventory].map(([file,value])=>({file,...value}))});
write('final.json',{sourceSha256:frozen,runnerSha256:manifest.runnerSha256,passed:count,failed:0,files:inventory.size,processes:runs.length,processManifestSha256:hash(path.join(out,'processes.json')),inventorySha256:hash(path.join(out,'inventory.json'))});
console.log(JSON.stringify({passed:count,files:inventory.size,processes:runs.length}));
