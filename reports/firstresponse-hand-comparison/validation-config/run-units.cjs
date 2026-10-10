const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), {spawn}=require('node:child_process');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const work=__dirname;
const mode=process.argv[2]||'comparison';
const run=process.argv[3]||'final';
if(!/^[a-z0-9-]+$/.test(run))throw Error('Unsafe run name');
const jobs={comparison:{file:'tests/firstresponse_hand_comparison.test.js',count:22},study:{file:'tests/firstresponse_hand_study.test.js',count:46},finish:{file:'tests/firstresponse_patient_finish.test.js',count:22},hooks:{file:'tests/stem_firstresponse_hook_order.test.js'}};
const job=jobs[mode];if(!job)throw Error('Unknown job');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const name of ['vitest-deferred-jsdom.config.mjs','setup-deferred-jsdom.mjs']){
 const dest=path.join(work,name), bytes=fs.readFileSync(path.join(root,'reports/firstresponse-hand-study/deferred-jsdom-config',name));
 if(fs.existsSync(dest)&&!fs.readFileSync(dest).equals(bytes))throw Error('Private config drift');
 if(!fs.existsSync(dest))fs.writeFileSync(dest,bytes);
}
const out=path.join(root,'reports/firstresponse-hand-comparison/units',run+'-'+mode);fs.mkdirSync(out,{recursive:true});
const report=path.join(out,'result.json'),log=path.join(out,'run.log'),envlog=path.join(out,'environment.jsonl');
for(const p of [report,log,envlog])if(fs.existsSync(p))throw Error('Evidence exists '+p);
const files=['stem_lab/stem_tool_firstresponse.js','desktop/web-app/public/stem_lab/stem_tool_firstresponse.js',job.file,'tests/setup.js','vitest.config.js','package.json','package-lock.json','tests/helpers/firstresponse_hand_study_delta.cjs','tests/helpers/firstresponse_hand_study_delta.json','tests/helpers/firstresponse_hand_comparison_delta.cjs','tests/helpers/firstresponse_hand_comparison_delta.json'];
const before=Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
if(before[files[0]]!==before[files[1]])throw Error('Mirror mismatch');
const start=Date.now();fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify({files:before,startedAt:new Date().toISOString(),job},null,2));
const args=[path.join(root,'node_modules/vitest/vitest.mjs'),'run',job.file,'--config='+path.join(work,'vitest-deferred-jsdom.config.mjs'),'--configLoader=native','--pool=forks','--experimental.viteModuleRunner=false','--maxWorkers=1','--isolate=false','--retry=0','--testTimeout=240000','--hookTimeout=120000','--reporter=default','--reporter=json','--outputFile='+report];
const stream=fs.createWriteStream(log);
const child=spawn(process.execPath,args,{cwd:root,env:{...process.env,FIRSTRESPONSE_DEFERRED_JSDOM_LOG:envlog},stdio:['ignore','pipe','pipe'],windowsHide:true});
console.log('START '+mode+' pid='+child.pid+' source='+before[files[0]]);
child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
child.on('error',e=>{console.error(e);process.exitCode=1;});
child.on('close',code=>{
 stream.end();
 try{
  for(const [p,h]of Object.entries(before))if(sha(fs.readFileSync(path.join(root,p)))!==h)throw Error('Drift '+p);
  if(!fs.existsSync(report))throw Error('No assertion report, exit='+code);
  const r=JSON.parse(fs.readFileSync(report,'utf8')),checks=r.testResults.flatMap(t=>t.assertionResults||[]),passed=checks.filter(t=>t.status==='passed');
  if(code!==0||r.numFailedTests||r.numFailedTestSuites||!passed.length||(job.count&&passed.length!==job.count))throw Error('Test failure '+passed.length+' passed; exit='+code);
  const events=fs.readFileSync(envlog,'utf8').trim().split(/\r?\n/).map(s=>JSON.parse(s));
  if(events.filter(e=>e.event==='setup-finish').length!==1||events.filter(e=>e.event==='teardown').length!==1)throw Error('Missing jsdom lifecycle');
  const summary={sourceSHA256:before[files[0]],checks:passed.length,exitCode:code,elapsedMs:Date.now()-start,filesUnchanged:true};
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
 }catch(e){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.message,exitCode:code,elapsedMs:Date.now()-start},null,2));console.error(e);process.exitCode=1;}
});
