'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawnSync}=require('child_process');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',task='C:/Users/cabba/Documents/Codex/2026-10-02/please';
const out=path.join(task,'work/aquaculture/backup-union-native');
const runtime='d4b93c29f80afc823c4b32732847baac3a4aa20abef5f9a6d23139721ac18522';
const batches={1:['aquaculture_saved_investigations','aquaculture_saved_comparison','aquaculture_guided_questions'],2:['aquaculture_evidence_recovery','aquaculture_learning_runtime','aquaculture_measurement_notebook','aquaculture_evidence_save_readiness'],3:['aquaculture_measurement_recovery'],4:['aquaculture_archive_integrity'],5:['aquaculture_backup_union'],6:['aquaculture_guided_questions']};
const batch=process.argv[2],name=process.argv[3]||'batch-'+batch+'-tests',files=batches[batch];
if(!files||!/^[a-z0-9-]+$/.test(name))throw Error('Invalid batch');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const file of ['stem_lab/stem_tool_aquaculture.js','desktop/web-app/public/stem_lab/stem_tool_aquaculture.js'])if(hash(fs.readFileSync(path.join(repo,file)))!==runtime)throw Error('Runtime changed');
fs.mkdirSync(out,{recursive:true});for(const ext of ['json','log'])if(fs.existsSync(path.join(out,name+'.'+ext)))throw Error('Preserve existing attempt');
const snapshots=files.map(f=>({file:'tests/'+f+'.test.js',sha256:hash(fs.readFileSync(path.join(repo,'tests',f+'.test.js')))}));
const args=['--max-old-space-size=768','--max-semi-space-size=8','node_modules/vitest/vitest.mjs','run',...snapshots.map(f=>f.file),'--pool=forks','--maxWorkers=1','--no-file-parallelism','--testTimeout=30000',...(batch==='6'?['--reporter=default']:[]),'--reporter=json','--outputFile='+path.join(out,name+'.json')];
const started=new Date().toISOString();
const run=spawnSync(process.execPath,args,{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=768 --max-semi-space-size=8'}});
fs.writeFileSync(path.join(out,name+'.log'),'Started '+started+'\nRuntime '+runtime+'\nTest snapshots '+JSON.stringify(snapshots)+'\n'+JSON.stringify(args)+'\n'+(run.stdout||'')+'\n'+(run.stderr||'')+'\nExit '+run.status+'\n');
if(run.error)throw run.error;if(!fs.existsSync(path.join(out,name+'.json'))){console.log(JSON.stringify({batch,name,exit:run.status,startupFailure:true}));process.exit(run.status||1);}
const r=JSON.parse(fs.readFileSync(path.join(out,name+'.json'),'utf8'));
console.log(JSON.stringify({batch,name,exit:run.status,total:r.numTotalTests,passed:r.numPassedTests,failed:r.numFailedTests,files:r.testResults.length,failures:r.testResults.flatMap(f=>f.assertionResults.filter(a=>a.status==='failed').map(a=>({file:path.basename(f.name),name:a.fullName,messages:a.failureMessages})))}));process.exitCode=run.status;
