const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname;
const run=process.argv[2] || 'native';if(!/^[a-z0-9-]+$/.test(run))throw Error('Unsafe run name');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const candidatePath=path.join(work,'candidate.js'),source=fs.readFileSync(candidatePath),baseline=fs.readFileSync(path.join(work,'before.js'));
const baselineSHA='24dbe22375df2c8c3e7739d00d4621f4cc2c1e4db68d2bb05dfd15cca56c8a8a',finalSHA=sha(source);
if(sha(baseline)!==baselineSHA)throw Error('Baseline drift');
if(finalSHA===baselineSHA)throw Error('Candidate is unchanged');
const canonical=path.join(root,'stem_lab/stem_tool_firstresponse.js'),mirror=path.join(root,'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js');
if(sha(fs.readFileSync(canonical))!==baselineSHA || !fs.readFileSync(canonical).equals(fs.readFileSync(mirror)))throw Error('Shared source drift');
const report=path.join(work,run);fs.mkdirSync(report,{recursive:true});
const result=path.join(report,'browser-run.json'),log=path.join(report,'browser-run.log');
if(fs.existsSync(result)||fs.existsSync(log))throw Error('Evidence exists; choose a fresh run name');
const guard=[path.join(work,'before.js'),candidatePath,path.join(work,'firstresponse-neck-preview.spec.ts'),path.join(work,'playwright-neck.config.cjs'),canonical,mirror,
  path.join(root,'tests/e2e/helpers/stem_gl_harness.ts'),path.join(root,'vendor/three-r128/three.min.js'),path.join(root,'stem_lab/stem_lab_module.js')];
const inputs=Object.fromEntries(guard.map(p=>[p,sha(fs.readFileSync(p))])),startedAt=new Date().toISOString();
fs.writeFileSync(path.join(report,'inputs.json'),JSON.stringify({baselineSHA,finalSHA,inputs,workers:1,retries:0,startedAt},null,2));
const args=[path.join(root,'node_modules/@playwright/test/cli.js'),'test','firstresponse-neck-preview.spec.ts','--config='+path.join(work,'playwright-neck.config.cjs'),'--workers=1','--retries=0','--reporter=list,json'];
const stream=fs.createWriteStream(log),child=spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,
  PLAYWRIGHT_BROWSERS_PATH:'C:/Users/cabba/AppData/Local/ms-playwright',PLAYWRIGHT_JSON_OUTPUT_NAME:result,
  FIRST_RESPONSE_NECK_WORK:work,FIRST_RESPONSE_NECK_REPORT:report,FIRST_RESPONSE_NECK_SOURCE_SHA:finalSHA,FIRST_RESPONSE_NECK_CANDIDATE:candidatePath}});
fs.writeFileSync(path.join(report,'runner.json'),JSON.stringify({pid:child.pid,args,startedAt},null,2));
console.log('START neck browser pid='+child.pid+' source='+finalSHA);child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('close',code=>{stream.end();try{
  for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)throw Error('Input drift '+p);
  if(!fs.existsSync(result))throw Error('Missing browser result, exit='+code);
  const r=JSON.parse(fs.readFileSync(result,'utf8'));
  if(code!==0 || r.stats.expected!==3 || r.stats.unexpected || r.stats.skipped || r.stats.flaky)throw Error('Browser failed '+JSON.stringify(r.stats));
  const metrics=JSON.parse(fs.readFileSync(path.join(report,'neck-preview-metrics.json'),'utf8')),images=fs.readdirSync(report).filter(p=>p.endsWith('.png')).sort();
  if(metrics.evidence.length!==6 || images.filter(p=>p.endsWith('-stage.png')).length!==6)throw Error('Incomplete three paired views');
  const summary={baselineSHA,finalSHA,workflows:3,matchingViewPairs:3,workers:1,retries:0,perWorkflowTimeoutMs:180000,images,stats:r.stats,inputsUnchanged:true,privateCandidate:true};
  fs.writeFileSync(path.join(report,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}catch(error){fs.writeFileSync(path.join(report,'failure.json'),JSON.stringify({error:error.message,exitCode:code},null,2));console.error(error);process.exitCode=1;}});
