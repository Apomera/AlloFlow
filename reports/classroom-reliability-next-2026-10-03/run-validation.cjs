'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),config='reports/classroom-reliability-next-2026-10-03/current.vitest.config.js';
const files=[...fs.readFileSync(path.join(root,config),'utf8').matchAll(/'([^']+\.test\.js)'/g)].map(m=>m[1]);
const label=process.argv[2]||'validation';assert(/^[a-z-]+$/.test(label),'Report label');
const pool=process.argv[3]||'threads';assert(['threads','forks'].includes(pool),'Worker pool');
const out=path.join(__dirname,label);fs.mkdirSync(out,{recursive:true});
const manifestPath=path.join(__dirname,label+'-manifest.json');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const applied=JSON.parse(fs.readFileSync(path.join(__dirname,'applied.json'),'utf8'));
const inputs=[...new Set([...applied.files.map(row=>row.file),...applied.context.map(row=>row.file),...files,
  config,'reports/classroom-reliability-next-2026-10-03/run-validation.cjs','tests/setup.js','tests/helpers/host_source.js','tests/helpers/anchored_slice.js',
  'reader_support_drafts.js','session_transport_module.js','studio_response_module.js','utils_pure_module.js','pure_helpers_module.js',
  'package.json','package-lock.json','ui_strings.js','desktop/web-app/public/ui_strings.js',
  'storage_recovery_manager_module.js','storage_recovery_vault_module.js','class_mailbox_module.js',
  'mailbox_session_bridge.js','dev-tools/studio_delivery_e2e.cjs','reports/classroom-reliability-next-2026-10-03/accessibility/acceptance.cjs',
  'view_studio_module.js','studio_serialization_module.js','resource_pack_codec.js','studio_delivery_protocol.js',
].filter(file=>fs.existsSync(path.join(root,file))))].sort();
const hashes=()=>Object.fromEntries(inputs.map(file=>[file,hash(fs.readFileSync(path.join(root,file)))]));
const manifest={startedAt:new Date().toISOString(),pool,before:hashes(),files:[],passed:false};
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
for(const [index,file]of files.entries()) {
 let passed=false;
 for(let attempt=1;attempt<=2;attempt++) {
  const name=index+'-attempt-'+attempt+'.json',target=path.join(out,name);assert(!fs.existsSync(target),'Retain attempt');
  const result=spawnSync(process.execPath,[path.join(root,'node_modules/vitest/vitest.mjs'),'run',file,'--config',config,'--pool='+pool,'--reporter=default','--reporter=json','--outputFile='+target],
    {cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,RECEIVER_LIFECYCLE_SOURCE:'AlloFlowANTI.txt',RECEIVER_TRANSPORT_SOURCE:'session_transport_module.js'}});
  const log=(result.stdout||'')+'\n'+(result.stderr||'');fs.writeFileSync(path.join(out,index+'-attempt-'+attempt+'.log'),log,{flag:'wx'});
  const report=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):null;
  const ok=result.status===0&&report?.success===true&&report.numFailedTests===0&&report.numPendingTests===0&&report.testResults.length===1&&report.testResults[0].name.replaceAll('\\','/').endsWith(file);
  manifest.files.push({file,attempt,exitCode:result.status,report:label+'/'+name,passed:ok,cases:report?.numPassedTests||0});
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({file,attempt,exitCode:result.status,passed:ok,cases:report?.numPassedTests||0}));
  if(ok){passed=true;break;}
  if(!/vitest-pool.*(?:Failed to start|Timeout terminating)|Timeout waiting for worker to respond/s.test(log)||report?.numFailedTests>0)throw Error('Fixture/assertion failure: '+file+'; retained log '+index);
 }
 assert(passed,'Worker still unavailable for '+file);
}
manifest.after=hashes();assert.deepEqual(manifest.after,manifest.before,'Selected inputs changed during validation');
manifest.passed=true;manifest.completedAt=new Date().toISOString();manifest.passedCases=manifest.files.filter(row=>row.passed).reduce((sum,row)=>sum+row.cases,0);
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({passed:true,files:files.length,cases:manifest.passedCases,stableInputs:inputs.length}));
