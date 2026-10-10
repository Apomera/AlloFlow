const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname;
const run=process.argv[2] || 'native';if(!/^[a-z0-9-]+$/.test(run))throw Error('Unsafe run name');
const availableViews=['adult-wide','child-narrow','infant-narrow-contrast'],selection=process.argv[3] || 'all';
const selectedViews=selection==='all'?availableViews:selection.split(',');
if(!selectedViews.length || new Set(selectedViews).size!==selectedViews.length || selectedViews.some(id=>!availableViews.includes(id)))throw Error('Invalid view selection');
const expectedWorkflows=selectedViews.length,expectedEvidence=expectedWorkflows*2;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const candidatePath=path.join(work,'candidate.js'),source=fs.readFileSync(candidatePath),baseline=fs.readFileSync(path.join(work,'before.js'));
const baselineSHA='147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891',finalSHA=sha(source);
if(sha(baseline)!==baselineSHA)throw Error('Baseline drift');
if(finalSHA===baselineSHA)throw Error('Candidate is unchanged');
const delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json'),'utf8'));if(delta.afterSHA256!==finalSHA)throw Error('Candidate/delta pin mismatch');
const canonical=path.join(root,'stem_lab/stem_tool_firstresponse.js'),mirror=path.join(root,'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js');
if(sha(fs.readFileSync(canonical))!==baselineSHA || !fs.readFileSync(canonical).equals(fs.readFileSync(mirror)))throw Error('Shared source drift');
const report=path.join(work,run);fs.mkdirSync(report,{recursive:true});
const result=path.join(report,'browser-run.json'),log=path.join(report,'browser-run.log');
if(fs.existsSync(result)||fs.existsSync(log))throw Error('Evidence exists; choose a fresh run name');
const otherCopies=['desktop/app-build/stem_lab/stem_tool_firstresponse.js','desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'].map(p=>path.join(root,p));for(const p of otherCopies)if(sha(fs.readFileSync(p))!==baselineSHA)throw Error('Shared source drift '+p);
const guard=[path.join(work,'patient-wrist-contract.cjs'),...otherCopies,path.join(work,'delta.json'),path.join(work,'face-capture-png.cjs'),path.join(work,'face-mount-window.cjs'),path.join(root,'node_modules/playwright-core/lib/utilsBundle.js'),__filename,path.join(work,'before.js'),candidatePath,path.join(work,'firstresponse-face-preview.spec.ts'),path.join(work,'playwright-face.config.cjs'),canonical,mirror,
  path.join(root,'tests/e2e/helpers/stem_gl_harness.ts'),path.join(root,'vendor/three-r128/three.min.js'),path.join(root,'stem_lab/stem_lab_module.js')];
const inputs=Object.fromEntries(guard.map(p=>[p,sha(fs.readFileSync(p))])),startedAt=new Date().toISOString();
fs.writeFileSync(path.join(report,'inputs.json'),JSON.stringify({baselineSHA,finalSHA,inputs,selectedViews,expectedWorkflows,expectedEvidence,workers:1,retries:0,startedAt},null,2));
const args=[path.join(root,'node_modules/@playwright/test/cli.js'),'test','firstresponse-face-preview.spec.ts','--config='+path.join(work,'playwright-face.config.cjs'),'--workers=1','--retries=0','--reporter=list,json'];
const stream=fs.createWriteStream(log),child=spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,
  PLAYWRIGHT_BROWSERS_PATH:'C:/Users/cabba/AppData/Local/ms-playwright',PLAYWRIGHT_JSON_OUTPUT_NAME:result,
  FIRST_RESPONSE_FACE_WORK:work,FIRST_RESPONSE_FACE_REPORT:report,FIRST_RESPONSE_FACE_VIEWS:selectedViews.join(','),FIRST_RESPONSE_FACE_SOURCE_SHA:finalSHA,FIRST_RESPONSE_FACE_CANDIDATE:candidatePath}});
let timedOut=false;const limit=setTimeout(()=>{timedOut=true;spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});},900000);
fs.writeFileSync(path.join(report,'runner.json'),JSON.stringify({pid:child.pid,args,startedAt},null,2));
console.log('START face browser pid='+child.pid+' source='+finalSHA);child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('close',code=>{clearTimeout(limit);stream.end();try{if(timedOut)throw Error('Native runner exceeded 900000ms bound');
  for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)throw Error('Input drift '+p);
  if(!fs.existsSync(result))throw Error('Missing browser result, exit='+code);
  const r=JSON.parse(fs.readFileSync(result,'utf8'));
  if(code!==0 || r.stats.expected!==expectedWorkflows || r.stats.unexpected || r.stats.skipped || r.stats.flaky)throw Error('Browser failed '+JSON.stringify(r.stats));
  const metrics=JSON.parse(fs.readFileSync(path.join(report,'face-preview-metrics.json'),'utf8')),images=fs.readdirSync(report).filter(p=>p.endsWith('.png')).sort();
  if(metrics.evidence.length!==expectedEvidence || images.filter(p=>p.endsWith('-stage.png')).length!==expectedEvidence)throw Error('Incomplete selected paired views');
  for(const id of selectedViews){const pair=metrics.evidence.filter(e=>e.id===id);if(pair.length!==2 || pair.filter(e=>e.variant==='baseline').length!==1 || pair.filter(e=>e.variant==='candidate').length!==1)throw Error('Missing matched pair '+id);if(JSON.stringify(pair[0].detail.clip)!==JSON.stringify(pair[1].detail.clip))throw Error('Palm comparison framing changed '+id);}
  if(images.filter(p=>p.endsWith('-palm.png')).length!==expectedEvidence)throw Error('Missing palm crops');for(const e of metrics.evidence){if(!e.detail.proof.sameCapturedFrame||e.detail.proof.sourceSHA256!==sha(fs.readFileSync(path.join(report,e.capture))))throw Error('Palm crop is not same captured frame');}
  if(metrics.evidence.some(e=>!selectedViews.includes(e.id)))throw Error('Unexpected evidence view');
  const {PNG}=require(path.join(root,'node_modules/playwright-core/lib/utilsBundle.js'));const pixelComparisons=[];
  for(const id of selectedViews){const pair=metrics.evidence.filter(e=>e.id===id),a=PNG.sync.read(fs.readFileSync(path.join(report,id+'-baseline-stage.png'))),b=PNG.sync.read(fs.readFileSync(path.join(report,id+'-candidate-stage.png')));if(a.width!==b.width||a.height!==b.height)throw Error('Image size changed '+id);let changedPixels=0;for(let i=0;i<a.data.length;i+=4)if(!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))changedPixels++;if(!pair[0].contrast&&changedPixels===0)throw Error('Palm shading had no visible effect '+id);
    const palmA=PNG.sync.read(fs.readFileSync(path.join(report,id+'-baseline-palm.png'))),palmB=PNG.sync.read(fs.readFileSync(path.join(report,id+'-candidate-palm.png')));if(palmA.width!==palmB.width||palmA.height!==palmB.height)throw Error('Palm crop size changed '+id);let palmChangedPixels=0;for(let i=0;i<palmA.data.length;i+=4)if(!palmA.data.subarray(i,i+4).equals(palmB.data.subarray(i,i+4)))palmChangedPixels++;if(!pair[0].contrast&&palmChangedPixels===0)throw Error('Palm detail had no visible effect '+id);
    pixelComparisons.push({id,contrast:pair[0].contrast,changedPixels,totalPixels:a.width*a.height,palmChangedPixels,palmTotalPixels:palmA.width*palmA.height});}
  const summary={pixelComparisons,baselineSHA,finalSHA,workflows:expectedWorkflows,matchingViewPairs:expectedWorkflows,selectedViews,evidenceCount:metrics.evidence.length,workers:1,retries:0,perWorkflowTimeoutMs:450000,runnerTimeoutMs:900000,images,stats:r.stats,inputsUnchanged:true,privateCandidate:true};
  fs.writeFileSync(path.join(report,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}catch(error){fs.writeFileSync(path.join(report,'failure.json'),JSON.stringify({error:error.message,exitCode:code},null,2));console.error(error);process.exitCode=1;}});
