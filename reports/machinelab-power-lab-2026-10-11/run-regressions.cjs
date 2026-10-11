// Run from the repository root. Each child is isolated; no broad repository checks.
// Optional output directory preserves these original receipts during a later rerun.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const out=path.resolve(process.argv[2]||'reports/machinelab-power-lab-2026-10-11');
fs.mkdirSync(path.join(out,'test-temp'),{recursive:true});
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const write=(file,data)=>fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2)+'\n');
const source='stem_lab/stem_tool_machinelab.js',sourceSha256=hash(source);
const old='reports/machinelab-efficiency-lab-2026-10-10';
const baseline=read(old+'/regression-final.json'),eff=read(old+'/tests-efficiency-manifest.json');
const runs=[];
for(const suite of baseline.coverage){
  if(hash(suite.file)!==suite.sha256)throw Error('Baseline suite changed; review its inventory: '+suite.file);
  if(suite.file.endsWith('/machinelab_views.test.js')){
    const inventory=read(old+'/'+suite.receipts[0]).testResults[0].assertionResults;
    const names=[...new Set(inventory.map(a=>a.fullName))];
    const escape=s=>s.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
    for(let i=0;i<names.length;i+=24)runs.push({file:suite.file,pattern:'^(?:'+names.slice(i,i+24).map(escape).join('|')+')$'});
  }else runs.push({file:suite.file,pattern:null});
}
for(const group of eff.groups)runs.push({file:eff.testFile,pattern:group.testNamePattern});
const manifest={sourceSha256,nodeHeapMiB:512,nodeSemiSpaceMiB:8,workers:1,pool:'forks',isolate:false,testTimeoutMs:30000,runs:[]};
const inventories=new Map();
for(let index=0;index<runs.length;index++){
  if(hash(source)!==sourceSha256)throw Error('Source changed during regression run');
  const run=runs[index],receipt='regression-'+String(index+1).padStart(2,'0')+'.json';
  const args=['node_modules/vitest/vitest.mjs','run',run.file,'--maxWorkers=1','--pool=forks','--no-isolate','--testTimeout=30000','--reporter=json','--outputFile',path.join(out,receipt)];
  if(run.pattern)args.push('--testNamePattern',run.pattern);
  const result=cp.spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true,
    env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512 --max-semi-space-size=8',TEMP:path.join(out,'test-temp'),TMP:path.join(out,'test-temp')}});
  const processRecord={...run,receipt,exitCode:result.status,signal:result.signal,sourceSha256,testSha256:hash(run.file)};
  manifest.runs.push(processRecord);write('regression-processes.json',manifest);
  if(result.status!==0||result.error){
    fs.writeFileSync(path.join(out,receipt.replace('.json','.failure.log')),(result.stdout||'')+'\n'+(result.stderr||'')+'\n'+String(result.error||''));
    throw Error('Regression child failed: '+receipt+' '+run.file+' exit '+result.status);
  }
  const report=read(path.join(out,receipt));
  if(!report.success||report.numFailedTests||report.numPassedTests===0)throw Error('Incomplete regression receipt '+receipt);
  processRecord.passed=report.numPassedTests;processRecord.receiptSha256=hash(path.join(out,receipt));
  write('regression-processes.json',manifest);
  const tests=report.testResults[0].assertionResults;
  if(!inventories.has(run.file))inventories.set(run.file,{names:tests.map(a=>a.fullName),counts:tests.map(()=>0)});
  const inventory=inventories.get(run.file);
  if(tests.length!==inventory.names.length||tests.some((a,i)=>a.fullName!==inventory.names[i]))throw Error('Inventory changed '+run.file);
  tests.forEach((test,i)=>{if(test.status==='passed')inventory.counts[i]++;else if(!['pending','skipped'].includes(test.status))throw Error('Unresolved assertion in '+receipt);});
  console.log(receipt+': '+report.numPassedTests+' passed ('+path.basename(run.file)+')');
}
if(hash(source)!==sourceSha256)throw Error('Final source changed');
const coverage=[...inventories].map(([file,inventory])=>{
  if(inventory.counts.some(count=>count!==1))throw Error('Missing or duplicated executed cases: '+file);
  return {file,sha256:hash(file),passed:inventory.counts.length};
});
const passed=coverage.reduce((sum,file)=>sum+file.passed,0);
if(passed!==996||coverage.length!==19)throw Error('Unexpected regression coverage: '+passed);
write('regression-final.json',{format:'machine-lab-independent-run-coverage-v1',sourceSha256,passed,failed:0,uncovered:0,files:coverage.length,
  nativeReceipts:manifest.runs.length,description:'Fresh serial processes; filtered cases counted only where executed. Duplicate display names distinguished by stable inventory position.',
  coverage,receipts:manifest.runs.map(run=>({receipt:run.receipt,sha256:run.receiptSha256,passed:run.passed})),processManifest:'regression-processes.json'});
console.log(JSON.stringify({passed,files:coverage.length,processes:manifest.runs.length,sourceSha256}));
