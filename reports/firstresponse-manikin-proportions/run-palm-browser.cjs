const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname;
const run=process.argv[2] || 'native';if(!/^[a-z0-9-]+$/.test(run))throw Error('Unsafe run name');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const shared=fs.readFileSync(path.join(root,'stem_lab/stem_tool_firstresponse.js'));
const candidatePath=path.join(work,'candidate.js');
const source=fs.readFileSync(candidatePath);
const baseline=fs.readFileSync(path.join(work,'before.js'));
const baselineSHA='476c1562ef879cb20ac65efdbf290edff9b98fafde9dbd7866f3e612c5750935';
const finalSHA=sha(source);
if(sha(baseline)!==baselineSHA)throw Error('Baseline drift');
if(finalSHA===baselineSHA)throw Error('Private candidate is unchanged');
if(sha(shared)!==baselineSHA)throw Error('Shared source changed before private review');
if(!shared.equals(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js'))))throw Error('Mirror drift');
const report=path.join(work,run);fs.mkdirSync(report,{recursive:true});
const result=path.join(report,'browser-run.json'),log=path.join(report,'browser-run.log');
if(fs.existsSync(result)||fs.existsSync(log))throw Error('Evidence already exists; choose a fresh run name');
const guard=[path.join(work,'before.js'),candidatePath,path.join(work,'firstresponse-combined-visual.spec.ts'),path.join(work,'playwright-palm.config.cjs'),
 path.join(root,'stem_lab/stem_tool_firstresponse.js'),path.join(root,'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js'),
 path.join(root,'tests/e2e/helpers/stem_gl_harness.ts'),path.join(root,'vendor/three-r128/three.min.js'),path.join(root,'stem_lab/stem_lab_module.js')];
const inputs=Object.fromEntries(guard.map(p=>[p,sha(fs.readFileSync(p))]));
const startedAt=new Date().toISOString();
fs.writeFileSync(path.join(report,'inputs.json'),JSON.stringify({baselineSHA,finalSHA,inputs,workers:1,retries:0,startedAt},null,2));
const config=path.join(work,'playwright-palm.config.cjs');
const args=[path.join(root,'node_modules/@playwright/test/cli.js'),'test','firstresponse-combined-visual.spec.ts','--config='+config,'--workers=1','--retries=0','--reporter=list,json'];
const stream=fs.createWriteStream(log),child=spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,
 PLAYWRIGHT_BROWSERS_PATH:'C:/Users/cabba/AppData/Local/ms-playwright',PLAYWRIGHT_JSON_OUTPUT_NAME:result,
 FIRST_RESPONSE_PALM_WORK:work,FIRST_RESPONSE_PALM_REPORT:report,FIRST_RESPONSE_PALM_SOURCE_SHA:finalSHA,FIRST_RESPONSE_PALM_CANDIDATE:candidatePath}});
fs.writeFileSync(path.join(report,'runner.json'),JSON.stringify({pid:child.pid,args,startedAt},null,2));
console.log('START palm browser pid='+child.pid+' source='+finalSHA);
child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('close',code=>{
 stream.end();
 try{
  for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)throw Error('Input drift '+p);
  if(!fs.existsSync(result))throw Error('Missing browser result, exit='+code);
  const r=JSON.parse(fs.readFileSync(result,'utf8'));
  if(code!==0 || r.stats.expected!==3 || r.stats.unexpected || r.stats.skipped || r.stats.flaky)throw Error('Browser failed '+JSON.stringify(r.stats));
  const metrics=JSON.parse(fs.readFileSync(path.join(report,'palm-surface-metrics.json'),'utf8'));
  const images=fs.readdirSync(report).filter(p=>p.endsWith('.png')).sort();
  if(images.length!==14 || metrics.evidence.length!==14)throw Error('Incomplete seven-view paired captures');
  const summary={baselineSHA,finalSHA,workflows:r.stats.expected,matchingViewPairs:7,workers:1,retries:0,images,stats:r.stats,inputsUnchanged:true,privateCandidate:true};
  fs.writeFileSync(path.join(report,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
 }catch(error){fs.writeFileSync(path.join(report,'failure.json'),JSON.stringify({error:error.message,exitCode:code},null,2));console.error(error);process.exitCode=1;}
});
