// Run from repository root; provide a fresh output directory to preserve receipts.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const out=path.resolve(process.argv.slice(2).find(arg=>arg!=='--resume')||'reports/machinelab-compound-power-2026-10-11');
fs.mkdirSync(path.join(out,'test-temp'),{recursive:true});
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const write=(file,data)=>fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2)+'\n');
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,sourceSha256=hash(source);
const old='reports/machinelab-compound-lab-2026-10-11';
const baseline=read(old+'/regression-processes.json');
const selected=new Set(['machinelab_work_record.test.js','machinelab_read_aloud.test.js','machinelab_i18n_hygiene.test.js','machinelab_grade_bands.test.js','machinelab_a11y.test.js','machinelab_views.test.js','machinelab_efficiency_lab.test.js','machinelab_power_lab.test.js']);
const runs=baseline.runs.filter(r=>selected.has(path.basename(r.file))).map(r=>({file:r.file,pattern:r.pattern,testSha256:r.testSha256}));
for(const run of runs)if(hash(run.file)!==run.testSha256)throw Error('Baseline suite changed: '+run.file);
const manifest={sourceSha256,nodeHeapMiB:512,nodeSemiSpaceMiB:8,workers:1,pool:'forks',isolate:false,testTimeoutMs:30000,runs:[]};
const prior=process.argv.includes('--resume')?read(path.join(out,'regression-processes.json')):null;
if(prior&&prior.sourceSha256!==sourceSha256)throw Error('Cannot resume receipts from different source');
const inventories=new Map();
for(let index=0;index<runs.length;index++){
  if(hash(source)!==sourceSha256||hash(mirror)!==sourceSha256)throw Error('Source or mirror changed during regression run');
  const run=runs[index],receipt='regression-'+String(index+1).padStart(2,'0')+'.json';
  const previous=prior&&prior.runs[index];
  let processRecord;
  if(previous&&previous.exitCode===0&&previous.passed>0){
    if(previous.file!==run.file||previous.pattern!==run.pattern||previous.testSha256!==run.testSha256||previous.receipt!==receipt||
      previous.sourceSha256!==sourceSha256||previous.sourceAfterSha256!==sourceSha256||hash(path.join(out,receipt))!==previous.receiptSha256)
      throw Error('Previously passed receipt no longer matches frozen inputs: '+receipt);
    processRecord={...previous};
  }else{
    const args=['node_modules/vitest/vitest.mjs','run',run.file,'--maxWorkers=1','--pool=forks','--no-isolate','--testTimeout=30000','--reporter=json','--outputFile',path.join(out,receipt)];
    if(run.pattern)args.push('--testNamePattern',run.pattern);
    const result=cp.spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:16*1024*1024,windowsHide:true,
      env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512 --max-semi-space-size=8',TEMP:path.join(out,'test-temp'),TMP:path.join(out,'test-temp')}});
    processRecord={...run,receipt,exitCode:result.status,signal:result.signal,sourceSha256,sourceAfterSha256:hash(source)};
    if(result.status!==0||result.error){
      manifest.runs.push(processRecord);write('regression-processes.json',manifest);
      fs.writeFileSync(path.join(out,receipt.replace('.json','.failure.log')),(result.stdout||'')+'\n'+(result.stderr||'')+'\n'+String(result.error||''));
      throw Error('Regression child failed: '+receipt+' '+run.file+' exit '+result.status);
    }
  }
  manifest.runs.push(processRecord);write('regression-processes.json',manifest);
  if(hash(run.file)!==run.testSha256||hash(source)!==sourceSha256||hash(mirror)!==sourceSha256)throw Error('Inputs changed during regression child');
  const report=read(path.join(out,receipt));
  if(!report.success||report.numFailedTests||report.numPassedTests===0)throw Error('Incomplete regression receipt '+receipt);
  processRecord.passed=report.numPassedTests;processRecord.receiptSha256=hash(path.join(out,receipt));
  write('regression-processes.json',manifest);
  const tests=report.testResults[0].assertionResults;
  if(!inventories.has(run.file))inventories.set(run.file,{names:tests.map(a=>a.fullName),counts:tests.map(()=>0)});
  const inventory=inventories.get(run.file);
  if(tests.length!==inventory.names.length||tests.some((a,i)=>a.fullName!==inventory.names[i]))throw Error('Inventory changed '+run.file);
  tests.forEach((test,i)=>{if(test.status==='passed')inventory.counts[i]++;else if(!['pending','skipped'].includes(test.status))throw Error('Unresolved assertion in '+receipt);});
  console.log(receipt+': '+report.numPassedTests+' passed ('+path.basename(run.file)+')'+(previous&&previous.exitCode===0?' [verified prior receipt]':''));
}
if(hash(source)!==sourceSha256||hash(mirror)!==sourceSha256)throw Error('Final source changed');
const coverage=[...inventories].map(([file,inventory])=>{
  if(inventory.counts.some(count=>count!==1))throw Error('Missing or duplicated executed cases: '+file);
  return {file,sha256:hash(file),passed:inventory.counts.length};
});
const passed=coverage.reduce((sum,file)=>sum+file.passed,0);
if(passed!==569||coverage.length!==8||manifest.runs.length!==22)throw Error('Unexpected regression coverage: '+passed);
write('regression-final.json',{format:'machine-lab-independent-run-coverage-v1',sourceSha256,passed,failed:0,uncovered:0,files:coverage.length,
  nativeReceipts:manifest.runs.length,description:'Fresh serial processes; filtered cases counted only where executed. Duplicate display names distinguished by stable inventory position.',
  coverage,receipts:manifest.runs.map(run=>({receipt:run.receipt,sha256:run.receiptSha256,passed:run.passed})),processManifest:'regression-processes.json'});
console.log(JSON.stringify({passed,files:coverage.length,processes:manifest.runs.length,sourceSha256}));
