const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname;
const run=process.argv[2] || 'native';if(!/^[a-z0-9-]+$/.test(run))throw Error('Unsafe run name');
const availableViews=['adult-wide','child-narrow','infant-narrow-contrast'],selection=process.argv[3] || 'all';
const selectedViews=selection==='all'?availableViews:selection.split(',');
if(!selectedViews.length || new Set(selectedViews).size!==selectedViews.length || selectedViews.some(id=>!availableViews.includes(id)))throw Error('Invalid view selection');
const expectedWorkflows=selectedViews.length,expectedEvidence=expectedWorkflows*2;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const candidatePath=path.join(work,'candidate.js'),source=fs.readFileSync(candidatePath),baseline=fs.readFileSync(path.join(work,'before.js'));
const baselineSHA='dfe3e01f38a419187e468c749cc37827f486a47401b9916afaa9ec6f98a3f86a',finalSHA=sha(source);
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
  for(const id of selectedViews){const pair=metrics.evidence.filter(e=>e.id===id);if(pair.length!==2 || pair.filter(e=>e.variant==='baseline').length!==1 || pair.filter(e=>e.variant==='candidate').length!==1)throw Error('Missing matched pair '+id);if(JSON.stringify(pair[0].detail.clip)!==JSON.stringify(pair[1].detail.clip))throw Error('Finger comparison framing changed '+id);if(JSON.stringify(pair[0].captureInfo.stageClip)!==JSON.stringify(pair[1].captureInfo.stageClip)||JSON.stringify(pair[0].captureInfo.observedCanvas)!==JSON.stringify(pair[1].captureInfo.observedCanvas))throw Error('Target projection capture framing changed '+id);}
  if(images.filter(p=>p.endsWith('-fingers.png')).length!==expectedEvidence)throw Error('Missing finger crops');for(const e of metrics.evidence){if(!e.detail.proof.sameCapturedFrame||e.detail.proof.sourceSHA256!==sha(fs.readFileSync(path.join(report,e.capture))))throw Error('Finger crop is not same captured frame');}
  if(metrics.evidence.some(e=>!selectedViews.includes(e.id)))throw Error('Unexpected evidence view');
  const {PNG}=require(path.join(root,'node_modules/playwright-core/lib/utilsBundle.js'));const pixelComparisons=[];
  for(const id of selectedViews){const pair=metrics.evidence.filter(e=>e.id===id),a=PNG.sync.read(fs.readFileSync(path.join(report,id+'-baseline-stage.png'))),b=PNG.sync.read(fs.readFileSync(path.join(report,id+'-candidate-stage.png')));if(a.width!==b.width||a.height!==b.height)throw Error('Image size changed '+id);let changedPixels=0;for(let i=0;i<a.data.length;i+=4)if(!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))changedPixels++;if(changedPixels===0)throw Error('Finger shading had no visible effect '+id);
    const fingerA=PNG.sync.read(fs.readFileSync(path.join(report,id+'-baseline-fingers.png'))),fingerB=PNG.sync.read(fs.readFileSync(path.join(report,id+'-candidate-fingers.png')));if(fingerA.width!==fingerB.width||fingerA.height!==fingerB.height)throw Error('Finger crop size changed '+id);let fingerChangedPixels=0;for(let i=0;i<fingerA.data.length;i+=4)if(!fingerA.data.subarray(i,i+4).equals(fingerB.data.subarray(i,i+4)))fingerChangedPixels++;if(fingerChangedPixels===0)throw Error('Finger detail had no visible effect '+id);
    const clip=pair[0].detail.clip,stageClip=pair[0].captureInfo.stageClip,crop={x:clip.x-stageClip.x,y:clip.y-stageClip.y,width:clip.width,height:clip.height};
    if(!Number.isInteger(crop.x)||!Number.isInteger(crop.y)||crop.x<0||crop.y<0||crop.x+crop.width>a.width||crop.y+crop.height>a.height)throw Error('Invalid stage-relative finger crop '+id);
    let outsideCropChangedPixels=0;for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){if(x>=crop.x&&x<crop.x+crop.width&&y>=crop.y&&y<crop.y+crop.height)continue;const i=(y*a.width+x)*4;if(!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))outsideCropChangedPixels++;}
    const canvas=pair[0].captureInfo.observedCanvas;
    if(JSON.stringify(pair[0].fingerScopeProjections)!==JSON.stringify(pair[1].fingerScopeProjections))throw Error('Target finger projections changed '+id);
    const targetClips=['left','right'].map(side=>{const p=pair[0].fingerScopeProjections[side];
      const x0=Math.max(0,Math.min(a.width,Math.floor(canvas.x+(p.min[0]+1)*canvas.width/2)-18-stageClip.x)),x1=Math.max(0,Math.min(a.width,Math.ceil(canvas.x+(p.max[0]+1)*canvas.width/2)+18-stageClip.x));
      const y0=Math.max(0,Math.min(a.height,Math.floor(canvas.y+(1-p.max[1])*canvas.height/2)-18-stageClip.y)),y1=Math.max(0,Math.min(a.height,Math.ceil(canvas.y+(1-p.min[1])*canvas.height/2)+18-stageClip.y));
      const clip={side,x:x0,y:y0,width:Math.max(0,x1-x0),height:Math.max(0,y1-y0)};if(!Object.values(clip).slice(1).every(Number.isInteger)||clip.x<0||clip.y<0||clip.x+clip.width>a.width||clip.y+clip.height>a.height)throw Error('Invalid per-hand target clip '+id+' '+side);return clip;});
    let outsideTargetChangedPixels=0;for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){if(targetClips.some(c=>x>=c.x&&x<c.x+c.width&&y>=c.y&&y<c.y+c.height))continue;const i=(y*a.width+x)*4;if(!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))outsideTargetChangedPixels++;}
    if(outsideTargetChangedPixels!==0)throw Error('Changed pixels outside eight finger target clips '+id+': '+outsideTargetChangedPixels);
    pixelComparisons.push({id,contrast:pair[0].contrast,changedPixels,totalPixels:a.width*a.height,fingerChangedPixels,fingerTotalPixels:fingerA.width*fingerA.height,outsideCropChangedPixels,crop,outsideTargetChangedPixels,targetClips});}
  const summary={pixelComparisons,baselineSHA,finalSHA,workflows:expectedWorkflows,matchingViewPairs:expectedWorkflows,selectedViews,evidenceCount:metrics.evidence.length,workers:1,retries:0,perWorkflowTimeoutMs:450000,runnerTimeoutMs:900000,images,stats:r.stats,inputsUnchanged:true,privateCandidate:true};
  fs.writeFileSync(path.join(report,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}catch(error){fs.writeFileSync(path.join(report,'failure.json'),JSON.stringify({error:error.message,exitCode:code},null,2));console.error(error);process.exitCode=1;}});
