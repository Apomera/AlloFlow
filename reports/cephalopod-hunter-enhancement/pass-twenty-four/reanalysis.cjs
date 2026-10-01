// Recompute an audit from saved measurements. No browser, GPU, or source execution.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const acceptedBaseline='22314e02f0487b3ac626f26450392da440b2ea04ed0e1118b1326d4898d51c7e';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function staticStorage(memory){
  const {sceneTextureNames,rendererMemory,shadowMapSize,...storage}=memory;return {...storage,shadowMapSize};
}
function stats(samples,field){
  const sorted=samples.map(sample=>sample[field]).sort((a,b)=>a-b),n=sorted.length;
  return {median:n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2,p95:sorted[Math.ceil(n*.95)-1],min:sorted[0],max:sorted.at(-1),sampleCount:n};
}
function sourceProvenance(result){
  const response=result.sourceResponse,request=response?.requests?.[0];
  if(response?.interceptedRequestCount!==1||response?.requests?.length!==1||request?.responseSha256!==result.sourceSha256||!/^[a-f0-9]{64}$/.test(result.sourceSha256))return false;
  let url;try{url=new URL(request.url);}catch{return false;}
  const expected=result.label==='baseline'?0:response.hasHabitatHelper?105:0;
  return url.protocol==='http:'&&url.hostname==='127.0.0.1'&&url.pathname==='/stem_lab/stem_tool_cephalopodlab.js'&&
    (result.label!=='baseline'||result.sourceSha256===acceptedBaseline&&!response.hasHabitatHelper)&&
    response.naturalHabitatMetadataActors===expected&&result.warmed.visibility.habitatMetadataActors===expected&&result.final.visibility.habitatMetadataActors===expected;
}
function memoryFacts(result,baselineProgramMaximum){
  const snapshots=[result.initial.memory,result.warmed.memory,result.final.memory];
  const renderer=[...snapshots.map(memory=>memory.rendererMemory),...result.final.warmup.map(frame=>frame.rendererMemory),...result.final.samples.map(frame=>frame.rendererMemory)];
  const scene=result.final.memory,cacheMaxima={geometries:Math.max(...renderer.map(memory=>memory.geometries)),textures:Math.max(...renderer.map(memory=>memory.textures)),programs:Math.max(...renderer.map(memory=>memory.programs))};
  const shadowTargets=scene.shadowMapSize.length,limits={geometries:scene.sceneGeometryCount,textures:scene.sceneTextureCount+shadowTargets,programs:baselineProgramMaximum};
  const countsFinite=renderer.every(memory=>['geometries','textures','programs'].every(key=>Number.isInteger(memory[key])&&memory[key]>=0));
  const sceneCountsFinite=['sceneGeometryCount','sceneMaterialCount','sceneTextureCount','sceneArrayBufferCount','sceneArrayBufferBytes','instanceAttributeBytes','textureTexelStorageEstimateBytes'].every(key=>Number.isInteger(scene[key])&&scene[key]>=0);
  return {label:result.label,cacheMaxima,limits,finalRendererCache:scene.rendererMemory,sceneOwnership:staticStorage(scene),sceneOwnershipStable:snapshots.every(memory=>same(staticStorage(memory),staticStorage(scene))),cacheWithinOwnedResourceBounds:countsFinite&&sceneCountsFinite&&cacheMaxima.geometries<=limits.geometries&&cacheMaxima.textures<=limits.textures&&cacheMaxima.programs<=limits.programs&&cacheMaxima.programs<=scene.sceneMaterialCount,noRendererCacheGrowthDuringMeasurement:result.final.samples.every(frame=>same(frame.rendererMemory,result.warmed.memory.rendererMemory))&&same(result.final.memory.rendererMemory,result.warmed.memory.rendererMemory)};
}
function protocol(result){
  const samples=result.final.samples,warmup=result.final.warmup;
  return samples.length===60&&warmup.length===10&&result.final.ticks===70&&result.final.paused===true&&result.initial.forceFX===false&&result.final.forceFX===false&&
    result.initial.viewport.width===390&&result.initial.viewport.height===844&&result.initial.viewport.dpr===1&&/SwiftShader|llvmpipe|Software/i.test(result.initial.rendererName)&&
    samples.every((frame,index)=>frame.kind==='samples'&&frame.index===index)&&warmup.every((frame,index)=>frame.kind==='warmup'&&frame.index===index)&&
    [...samples,...warmup].every(frame=>Number.isFinite(frame.durationMs)&&frame.durationMs>=0&&Number.isFinite(frame.frameDurationMs)&&frame.frameDurationMs>=frame.durationMs&&Number.isInteger(frame.actualGLDrawCalls)&&frame.actualGLDrawCalls>0&&Number.isInteger(frame.submittedPlantActorCount)&&frame.submittedPlantActorCount>=0&&frame.submittedPlantActorCount<=105)&&
    result.errors.length===0;
}
function auditBenchmark(report){
  assert.equal(report.results.length,2,'Audit requires both completed benchmark measurements');
  const baseline=report.results.find(result=>result.label==='baseline'),candidate=report.results.find(result=>result.label==='candidate');assert(baseline&&candidate,'Missing unique baseline/candidate labels');
  const baselineProgramMaximum=Math.max(baseline.initial.memory.rendererMemory.programs,baseline.warmed.memory.rendererMemory.programs,baseline.final.memory.rendererMemory.programs,...baseline.final.warmup.map(frame=>frame.rendererMemory.programs),...baseline.final.samples.map(frame=>frame.rendererMemory.programs));
  const ownership=[memoryFacts(baseline,baselineProgramMaximum),memoryFacts(candidate,baselineProgramMaximum)];
  const timings=[baseline,candidate].map(result=>{
    const renderCPUMs=stats(result.final.samples,'durationMs'),productionFrameCPUMs=stats(result.final.samples,'frameDurationMs');
    const draws=result.final.samples.map(frame=>frame.actualGLDrawCalls),plants=result.final.samples.map(frame=>frame.submittedPlantActorCount);
    return {label:result.label,sourceSha256:result.sourceSha256,renderCPUMs,productionFrameCPUMs,recordedStatisticsExact:same(renderCPUMs,result.renderCPUMs)&&same(productionFrameCPUMs,result.productionFrameCPUMs),actualGLDrawCalls:{min:Math.min(...draws),max:Math.max(...draws)},submittedPlantActors:{min:Math.min(...plants),max:Math.max(...plants)},frustumOverlapPlantActors:result.final.visibility.frustumOverlapActors,sceneArrayBufferBytes:result.final.memory.sceneArrayBufferBytes,textureTexelStorageEstimateBytes:result.final.memory.textureTexelStorageEstimateBytes};
  });
  const parity={sameSeedAndNaturalCamera:report.configuration.seed===2741&&report.configuration.species==='commonOcto'&&report.configuration.mode==='observe'&&report.configuration.quality==='balanced'&&report.configuration.fixedDt===.05&&report.configuration.warmup===10&&report.configuration.samples===60,
    initialNonplantConstructionExact:same(baseline.initial.actorConstruction,candidate.initial.actorConstruction),cameraTrajectoryExact:same(baseline.final.samples.map(frame=>frame.camera),candidate.final.samples.map(frame=>frame.camera)),
    staticStorageBaselineStable:ownership[0].sceneOwnershipStable,staticStorageCandidateStable:ownership[1].sceneOwnershipStable,staticStorageBetweenSourcesExact:same(staticStorage(baseline.final.memory),staticStorage(candidate.final.memory)),
    singleServedResponseAndNaturalSourceContract:report.results.every(sourceProvenance),controlledSoftwareSampleProtocol:report.results.every(protocol),recordedStatisticsExact:timings.every(result=>result.recordedStatisticsExact),
    rendererCachesWithinSceneOwnership:ownership.every(result=>result.cacheWithinOwnedResourceBounds),rendererCachesStableDuringMeasurement:ownership.every(result=>result.noRendererCacheGrowthDuringMeasurement),rendererTextureAndProgramMaximaExact:ownership[0].cacheMaxima.textures===ownership[1].cacheMaxima.textures&&ownership[0].cacheMaxima.programs===ownership[1].cacheMaxima.programs};
  const before=timings[0],after=timings[1],change={medianRenderCPUPercent:(after.renderCPUMs.median/before.renderCPUMs.median-1)*100,p95RenderCPUPercent:(after.renderCPUMs.p95/before.renderCPUMs.p95-1)*100,medianProductionFrameCPUPercent:(after.productionFrameCPUMs.median/before.productionFrameCPUMs.median-1)*100,p95ProductionFrameCPUPercent:(after.productionFrameCPUMs.p95/before.productionFrameCPUMs.p95-1)*100,drawMinimumDelta:after.actualGLDrawCalls.min-before.actualGLDrawCalls.min,drawMaximumDelta:after.actualGLDrawCalls.max-before.actualGLDrawCalls.max,submittedPlantMinimumDelta:after.submittedPlantActors.min-before.submittedPlantActors.min,frustumOverlapPlantDelta:after.frustumOverlapPlantActors-before.frustumOverlapPlantActors,uploadedGeometryMaximumDelta:ownership[1].cacheMaxima.geometries-ownership[0].cacheMaxima.geometries,sceneArrayBufferBytesDelta:after.sceneArrayBufferBytes-before.sceneArrayBufferBytes};
  return {status:Object.values(parity).every(Boolean)?'passed':'failed',parity,ownership,timings,change,interpretation:'Renderer memory.geometries counts resources uploaded when submitted; it does not count all480 owned scene geometries. Changed plant placement intentionally changes frustum overlap and submissions. Uploaded geometry equality is replaced with a bound against the unchanged scene pool and stable renderer caches throughout measurement. Texture and program maxima must still match the accepted baseline. This saved run is consistent with changed visibility, and does not prove the identity of each uploaded geometry or driver VRAM bytes. Software JavaScript CPU samples do not establish GPU completion, hardware FPS, physical-phone performance, or a statistically reliable speed improvement.'};
}
module.exports={auditBenchmark,staticStorage};
if(require.main===module){
  const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){assert(['--input','--output'].includes(args[i])&&args[i+1],'Usage: node reanalysis.cjs [--input report] [--output separate-audit]');assert(!options[args[i]],'Duplicate '+args[i]);options[args[i]]=args[i+1];}
  const input=path.resolve(options['--input']||path.join(__dirname,'benchmark-results.json')),output=path.resolve(options['--output']||path.join(__dirname,'benchmark-audit-amended.json'));
  assert(output.startsWith(__dirname+path.sep),'Amended audit must remain in pass-twenty-four');assert.notEqual(output,input,'The original measured report must never be overwritten');
  const originalBytes=fs.readFileSync(input),originalSha256=hash(originalBytes),report=JSON.parse(originalBytes.toString('utf8')),audit=auditBenchmark(report);
  const amended={originalReport:{path:input,sha256:originalSha256,byteLength:originalBytes.byteLength,originalFailure:report.failure||null,originalParity:report.parity||null},...audit,measuredSamplesChanged:false,newBrowserOrGPUExecution:false};
  assert.equal(hash(fs.readFileSync(input)),originalSha256,'Original benchmark report changed while auditing');fs.writeFileSync(output,JSON.stringify(amended,null,2)+'\n');assert.equal(hash(fs.readFileSync(input)),originalSha256,'Original benchmark report changed after saving separate audit');
  console.log(JSON.stringify({output,originalSha256,status:audit.status,parity:audit.parity,timings:audit.timings,ownership:audit.ownership.map(result=>({label:result.label,cacheMaxima:result.cacheMaxima,limits:result.limits})),change:audit.change},null,2));
  assert.equal(audit.status,'passed','Amended ownership/provenance audit failed; inspect the separate saved audit');
}
