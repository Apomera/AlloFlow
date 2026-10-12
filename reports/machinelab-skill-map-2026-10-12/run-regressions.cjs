const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const frozen='0b7b3109ec57ce4aa27407c041336bd66b99ca3ccb7d29bb91e6765f1ffa5441';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,prior='reports/machinelab-rotation-skills-2026-10-12';
const old=read(prior+'/regressions/run-01/processes.json').runs;
const runs=[0,1,2,3,4,8,9,13,14].map(i=>old[i]).concat(read(prior+'/new-tests/run-02/processes.json').runs)
  .map(r=>({file:r.file,pattern:r.pattern,expected:r.passed,testSha256:r.testSha256}));
assert.equal(runs.reduce((n,r)=>n+r.expected,0),257);assert.equal(runs.length,13);
const out=path.resolve(process.argv[2]||path.join(__dirname,'regressions/run-01'));if(fs.existsSync(out))throw Error('Use a fresh output directory');
fs.mkdirSync(path.join(out,'test-temp'),{recursive:true});
const write=(name,x)=>fs.writeFileSync(path.join(out,name),JSON.stringify(x,null,2)+'\n');
const verify=()=>{assert.equal(hash(source),frozen);assert.equal(hash(mirror),frozen);for(const r of runs)assert.equal(hash(r.file),r.testSha256);};verify();
const manifest={sourceSha256:frozen,runnerSha256:hash(__filename),selection:'Work records, read aloud, i18n, grade bands, accessibility, power/planning practice and state/record regressions, and all rotary cases. Unchanged physics-only branches excluded.',runs:[]};
const inventory=new Map();
for(let i=0;i<runs.length;i++){
  verify();const r=runs[i],stem='group-'+String(i+1).padStart(2,'0'),receipt=stem+'.json',log=stem+'.log';
  const args=['node_modules/vitest/vitest.mjs','run',r.file,'--maxWorkers=1','--pool=forks','--no-isolate','--testTimeout=30000','--reporter=json','--outputFile',path.join(out,receipt)];if(r.pattern)args.push('--testNamePattern',r.pattern);
  const native=cp.spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16e6,windowsHide:true,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512 --max-semi-space-size=8',TEMP:path.join(out,'test-temp'),TMP:path.join(out,'test-temp')}});
  fs.writeFileSync(path.join(out,log),((native.stdout||'')+'\n'+(native.stderr||'')+(native.error?'\n'+String(native.error):'')).replace(/\r\n/g,'\n').split('\n').map(l=>l.trimEnd()).join('\n').trimEnd()+'\n');
  const record={...r,receipt,log,sourceSha256:frozen,sourceAfterSha256:hash(source),mirrorAfterSha256:hash(mirror),testAfterSha256:hash(r.file),exitCode:native.status,signal:native.signal,error:native.error?String(native.error):null,logSha256:hash(path.join(out,log))};
  if(fs.existsSync(path.join(out,receipt)))record.receiptSha256=hash(path.join(out,receipt));manifest.runs.push(record);write('processes.json',manifest);
  assert.equal(native.status,0);assert.equal(native.signal,null);assert(!native.error);verify();
  const report=read(path.join(out,receipt));assert.equal(report.success,true);assert.equal(report.numFailedTests,0);assert.equal(report.numPassedTests,r.expected);assert.equal(report.testResults.length,1);
  const cases=report.testResults[0].assertionResults;if(!inventory.has(r.file))inventory.set(r.file,{names:cases.map(c=>c.fullName),counts:cases.map(()=>0)});
  const item=inventory.get(r.file);assert.deepEqual(cases.map(c=>c.fullName),item.names);cases.forEach((c,j)=>{if(c.status==='passed')item.counts[j]++;else assert(['pending','skipped'].includes(c.status));});
  record.passed=report.numPassedTests;write('processes.json',manifest);console.log(stem+': '+record.passed+' passed; observed native exit0');
}
let count=0;for(const item of inventory.values()){assert(item.counts.every(n=>n<=1));count+=item.counts.reduce((a,b)=>a+b,0);}assert.equal(count,257);verify();
write('inventory.json',{files:[...inventory].map(([file,value])=>({file,...value}))});
write('final.json',{sourceSha256:frozen,runnerSha256:manifest.runnerSha256,passed:count,failed:0,files:inventory.size,processes:runs.length,processManifestSha256:hash(path.join(out,'processes.json')),inventorySha256:hash(path.join(out,'inventory.json'))});
console.log(JSON.stringify({passed:count,files:inventory.size,processes:runs.length}));
