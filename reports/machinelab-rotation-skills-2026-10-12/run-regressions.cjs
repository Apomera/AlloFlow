const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const FROZEN='727615aa085a7170b435773189f605414f79e6b866983c2489a610be29c6cdd7';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source;
const out=path.resolve(process.argv[2]||path.join(__dirname,'regressions/run-01'));
if(fs.existsSync(out))throw Error('Use a fresh output directory');
cp.execFileSync(process.execPath,[path.join(__dirname,'verify-scope.cjs')],{stdio:'pipe',windowsHide:true});
const proof=read(path.join(__dirname,'source-scope.json'));assert.equal(proof.sourceSha256,FROZEN);assert.equal(proof.existingTestsOnlyInventoryChanged,true);
const prior='reports/machinelab-power-planning-2026-10-12';
const runs=read(prior+'/regression-processes.json').runs.filter(r=>!r.file.endsWith('machinelab_views.test.js'))
  .concat(read(prior+'/new-tests/run-03/processes.json').runs).map(r=>({file:r.file,pattern:r.pattern,expected:r.passed,baselineTestSha256:r.testSha256}));
for(const run of runs){const changed=proof.existingTests.find(t=>t.file===run.file);
  if(changed){assert.equal(changed.baselineSha256,run.baselineTestSha256);run.testSha256=changed.sha256;}else run.testSha256=run.baselineTestSha256;
  assert.equal(hash(run.file),run.testSha256);}
assert.equal(runs.length,15);assert.equal(runs.reduce((n,r)=>n+r.expected,0),376);
fs.mkdirSync(path.join(out,'test-temp'),{recursive:true});
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const verify=()=>{assert.equal(hash(source),FROZEN);assert.equal(hash(mirror),FROZEN);for(const r of runs)assert.equal(hash(r.file),r.testSha256);};
verify();
const manifest={sourceSha256:FROZEN,runnerSha256:hash(__filename),nodeHeapMiB:512,nodeSemiSpaceMiB:8,workers:1,pool:'forks',isolate:false,testTimeoutMs:30000,runs:[]};
const inventories=new Map();
for(let index=0;index<runs.length;index++){
  verify();const run=runs[index],stem='regression-'+String(index+1).padStart(2,'0'),receipt=stem+'.json',log=stem+'.log';
  const args=['node_modules/vitest/vitest.mjs','run',run.file,'--maxWorkers=1','--pool=forks','--no-isolate','--testTimeout=30000','--reporter=json','--outputFile',path.join(out,receipt)];
  if(run.pattern)args.push('--testNamePattern',run.pattern);
  const native=cp.spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16e6,windowsHide:true,
    env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512 --max-semi-space-size=8',TEMP:path.join(out,'test-temp'),TMP:path.join(out,'test-temp')}});
  fs.writeFileSync(path.join(out,log),((native.stdout||'')+'\n'+(native.stderr||'')+(native.error?'\n'+String(native.error):'')).replace(/\r\n/g,'\n').split('\n').map(l=>l.trimEnd()).join('\n').trimEnd()+'\n');
  const record={...run,receipt,log,sourceSha256:FROZEN,sourceAfterSha256:hash(source),mirrorAfterSha256:hash(mirror),testAfterSha256:hash(run.file),
    exitCode:native.status,signal:native.signal,error:native.error?String(native.error):null,logSha256:hash(path.join(out,log))};
  if(fs.existsSync(path.join(out,receipt)))record.receiptSha256=hash(path.join(out,receipt));
  manifest.runs.push(record);write('processes.json',manifest);
  assert.equal(record.exitCode,0,'Native child failed: '+stem);assert.equal(record.error,null);assert.equal(record.signal,null);verify();
  const report=read(path.join(out,receipt));assert.equal(report.success,true);assert.equal(report.numFailedTests,0);assert.equal(report.numPassedTests,run.expected);assert.equal(report.testResults.length,1);
  const cases=report.testResults[0].assertionResults;
  if(!inventories.has(run.file))inventories.set(run.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});
  const inventory=inventories.get(run.file);assert.deepEqual(cases.map(c=>c.fullName),inventory.names);
  cases.forEach((c,i)=>{if(c.status==='passed')inventory.counts[i]++;else assert(['pending','skipped'].includes(c.status));});
  record.passed=report.numPassedTests;write('processes.json',manifest);console.log(stem+': '+record.passed+' passed; observed native exit0');
}
const coverage=[...inventories].map(([file,inventory])=>{assert(inventory.counts.every(c=>c===1));return {file,sha256:hash(file),passed:inventory.counts.length};});
assert.equal(coverage.length,7);assert.equal(coverage.reduce((n,c)=>n+c.passed,0),376);verify();
write('inventory.json',{files:[...inventories].map(([file,value])=>({file,...value}))});
write('final.json',{sourceSha256:FROZEN,runnerSha256:manifest.runnerSha256,passed:376,failed:0,uncovered:0,files:7,processes:15,coverage,
  processManifest:'processes.json',processManifestSha256:hash(path.join(out,'processes.json')),inventory:'inventory.json',inventorySha256:hash(path.join(out,'inventory.json'))});
console.log(JSON.stringify({passed:376,files:7,processes:15,sourceSha256:FROZEN}));
