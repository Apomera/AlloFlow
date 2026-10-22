'use strict';
// Isolated source-bound native checks. No geometry, model state or material
// parameter is changed for the three production-camera images.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
function fixture(source){
  const begin=source.indexOf('  var WC_PILOT_UNIT_M ='),at=source.indexOf('  window.WaterCyclePilotKernel = {'),end=source.indexOf('\n  };',at);
  if(begin<0||end<at)throw Error('Original pure kernel is required');
  const route=function(K){
    const env=K.environment('temperateCoast'),dt=.016,initial=K.practiceState('cloud','temperateCoast');
    let state=initial,cooldown=0,iceHits=0,warmHits=0,nucleusHits=0;
    const hits=[],receipts=[],forms=[state.form];let thaw,formation;
    for(let n=0;n<20000;n++){
      cooldown=Math.max(0,cooldown-dt);const targetAltitude=iceHits>=13?env.freezingM-80:env.freezingM+160;
      const thrust=K.assistControls(state,env,{x:state.x,z:state.z,altitudeM:state.altitudeM},
        {x:state.x,z:state.z,altitudeM:targetAltitude},0,{enabled:true,paused:false,manual:false}).thrust;
      const iceHit=state.form==='ice'&&iceHits<13&&cooldown===0,warmHit=state.form==='droplet'&&iceHits===13&&warmHits===0&&cooldown===0;
      const input={dt,thrust,sunlit:true,surface:'water',nucleusHit:state.form==='vapor'&&state.altitudeM>=env.lclM,dropletHit:iceHit||warmHit};
      if(input.dropletHit){hits.push({form:state.form,elapsed:state.elapsed,cooldown,input:{...input}});cooldown=.6;if(iceHit)iceHits++;else warmHits++;}
      if(input.nucleusHit)nucleusHits++;
      const next=K.step(state,input);
      if(next.form!==state.form){
        const r={step:n+1,from:state.form,to:next.form,before:state,after:next,input:{...input}};receipts.push(r);forms.push(next.form);
        if(state.form==='ice'&&next.form==='droplet')thaw=r;
        if(state.form==='droplet'&&next.form==='cloud'){formation=r;break;}
      }
      state=next;
    }
    if(!thaw||!formation||iceHits!==13||warmHits!==1||nucleusHits!==1||Math.abs(thaw.after.mass-2.2)>1e-12||Math.abs(formation.after.mass-2.31)>1e-12)throw Error('Genuine13-hit route did not reach the expected natural warm cloud');
    const nucleus=receipts.find(r=>r.input.nucleusHit),band={minimumM:env.lclM+(-12*.42-1.4)*12,maximumM:env.lclM+(27*.42+1.4)*12};
    if(nucleus.before.altitudeM<band.minimumM||nucleus.before.altitudeM>band.maximumM)throw Error('Initial nucleus must lie in the actual rendered altitude band');
    const gaps=hits.slice(1).map((h,n)=>h.elapsed-hits[n].elapsed);if(Math.min(...gaps)<.6)throw Error('Every collection respects the actual cooldown');
    return{success:true,scenario:'temperateCoast',initial,dt,cooldownSeconds:.6,steps:formation.step,iceHits,warmHits,nucleusHits,hits,receipts,forms,thaw,formation,nucleusBand:band,minimumHitGap:Math.min(...gaps),
      scope:'Original practice coordinates and altitude; near-LCL nucleus, no-hit climb,13 real-cooldown cold hits, assist-controlled thaw and one warm hit. Only original kernel and original assist controls generate states. Spatial rendered-mote collision acceptance is not claimed.'};
  };
  const j=vm.runInNewContext(source.slice(begin,end+'\n  };'.length)+'\n('+route.toString()+')(window.WaterCyclePilotKernel);',{window:{}});
  j.sourceSha256=crypto.createHash('sha256').update(source).digest('hex');return j;
}
exports.fixture=fixture;
exports.run=async function({page,result,assert,pass,maxDelta,restore,trigger,driveTransition,resume,pause,settle,capture}){
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addStyleTag({content:'#wcPilotCanvas{height:520px!important;min-height:520px!important;max-height:520px!important}'});
  await page.evaluate(()=>{
    window.assemblyHooked=new WeakSet();window.assemblyGPU=null;window.assemblyDraws=0;
    window.addEventListener('error',event=>{window.nativeQAPageError=event.error?.stack||event.message;});
    window.assemblySnapshot=()=>{
      const s=pilotReview.scene;s.updateMatrixWorld(true);const group=s.getObjectByName('pilot-phase-handoff'),ghost=s.getObjectByName('pilot-phase-liquid-memory'),preview=s.getObjectByName('pilot-phase-incoming-droplet'),parcel=s.getObjectByName('pilot-water-parcel');
      const actual=parcel.children.find(o=>o.geometry===preview.geometry&&o.material===preview.material),source=preview.visible?preview:actual,front=actual.material.userData.meltingFront,carry=ghost.userData.carriedMeltingFront;
      const effective=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
      const sample=o=>({name:o.name,visible:o.visible,effective:effective(o),geometry:o.geometry?.uuid,material:o.material?.uuid,position:o.position.toArray(),scale:o.scale.toArray(),quaternion:o.quaternion.toArray(),world:o.matrixWorld.toArray(),opacity:o.material?.opacity});
      const geometry=new Set(),materials=new Set(),depth=[];s.traverse(o=>{if(o.geometry)geometry.add(o.geometry.uuid);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){if(!materials.has(m.uuid))depth.push({uuid:m.uuid,test:m.depthTest,write:m.depthWrite});materials.add(m.uuid);}});
      return{form:document.querySelector('#wcPilotCanvas').dataset.parcelForm,camera:document.querySelector('#wcPilotCanvas').dataset.pilotCamera,steps:rainCloudDepthTotalSteps,elapsed:waterReviewData.pilot.snapshot.elapsed,mass:waterReviewData.pilot.snapshot.mass,
        group:{...sample(group),data:rainCloudDepthClean(group.userData)},ghost:{...sample(ghost),data:rainCloudDepthClean(ghost.userData)},source:sample(source),actual:sample(actual),preview:sample(preview),
        melt:{active:front.active.value,progress:front.progress.value,worldToSource:front.worldToSource.value.toArray(),localToSource:front.worldToSource.value.clone().multiply(source.matrixWorld).toArray()},
        carry:{active:carry.active.value,progress:carry.progress.value,localToSource:carry.localToSource.value.toArray()},gpu:window.assemblyGPU,draws:window.assemblyDraws,
        geometry:[...geometry].sort(),materials:[...materials].sort(),depth:depth.sort((a,b)=>a.uuid.localeCompare(b.uuid))};
    };
    const original=WaterCyclePilotKernel.step;WaterCyclePilotKernel.step=function(state,input){
      const next=original(state,input),canvas=document.querySelector('#wcPilotCanvas');
      // Kernel helpers also replay checkpoints while React replaces the live
      // canvas. Capture only the explicitly armed, connected native boundary.
      if(window.assemblyCaptureArmed&&canvas?.isConnected&&canvas.dataset.parcelForm==='droplet'&&!waterReviewData.pilot.paused&&state.form==='droplet'&&next.form==='cloud'){
        window.assemblySourceProof=assemblySnapshot();window.assemblyCaptureArmed=false;
      }
      return next;
    };
  });
  const draw=async()=>{
    await page.evaluate(()=>{const o=pilotReview.scene.getObjectByName('pilot-phase-liquid-memory');if(assemblyHooked.has(o))return;assemblyHooked.add(o);const previous=o.onAfterRender;
      o.onAfterRender=function(renderer,scene,camera,geometry,material){
        if(previous)previous.apply(this,arguments);const gl=renderer.getContext(),p=renderer.properties.get(material),program=p.currentProgram||p.program;
        const read=name=>{const location=gl.getUniformLocation(program.program,name);if(location===null)return null;const v=gl.getUniform(program.program,location);return ArrayBuffer.isView(v)?Array.from(v):v;};
        window.assemblyGPU={geometry:geometry.uuid,material:material.uuid,modelView:read('modelViewMatrix'),expectedModelView:new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse,this.matrixWorld).toArray(),
          active:read('phaseWaterCarryActive'),progress:read('phaseWaterCarryProgress'),mapping:read('phaseWaterCarryLocalToSource'),vertex:gl.getShaderSource(program.vertexShader),fragment:gl.getShaderSource(program.fragmentShader)};window.assemblyDraws++;
      };
    });
    for(let n=0;n<2;n++){const before=await page.evaluate(()=>{window.reviewRenderActive=true;return window.reviewRenderCount||0;});await page.waitForFunction(before=>window.reviewRenderCount>before,before,{timeout:90000});await page.evaluate(()=>{window.reviewRenderActive=false;});}
  };
  const sample=()=>page.evaluate(()=>assemblySnapshot());
  const click=async name=>{await page.getByRole('button',{name,exact:true}).evaluate(button=>button.click());await settle();};
  const proceed=async()=>{if(await page.getByRole('button',{name:'Continue journey',exact:true}).count())await click('Continue journey');else await resume();};
  const linear=[0,1,2,4,5,6,8,9,10],identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],visual=s=>{const c=structuredClone(s);delete c.gpu;delete c.draws;return c;};
  const validate=(s,source,label,{first=false}={})=>{
    assert(s.form==='cloud'&&s.group.data.kind==='cloud-assembly'&&s.ghost.visible&&s.ghost.effective,label+' keeps the source within actual cloud assembly');
    assert(s.ghost.data.sourceSnapshot&&s.carry.active===1&&s.carry.progress===source.melt.progress,label+' carries the actual interrupted liquid front');
    const mapError=maxDelta(s.carry.localToSource,source.melt.localToSource);assert(mapError<1e-8,label+' retains the actual displayed source-to-melt mapping');
    assert(s.gpu&&s.draws>0&&s.gpu.geometry===s.ghost.geometry&&s.gpu.material===s.ghost.material,label+' actually draws the pooled ghost');
    const uploadError=maxDelta(s.gpu.mapping,s.carry.localToSource),viewError=maxDelta(s.gpu.modelView,s.gpu.expectedModelView);
    assert(s.gpu.active===1&&Math.abs(s.gpu.progress-s.carry.progress)<1e-6&&uploadError<.00005&&viewError<.00005,label+' uploads its actual mask and model-view transform');
    assert(s.gpu.fragment.includes('phaseWaterCarryLocalToSource')&&s.gpu.vertex.includes('vPhaseLocal'));
    const normalized=s.ghost.data.assemblySourceProgress.value;assert(normalized>=0&&normalized<=1);
    const sourceError=Math.max(...linear.map(n=>Math.abs(s.ghost.world[n]-source.source.world[n])));
    if(first){assert(normalized===0,label+' starts normalized source progress at zero');assert(sourceError<1e-8,label+' retains the complete displayed source linear transform on its first frame');assert.equal(s.ghost.opacity,.48);}
    assert.deepEqual(s.geometry,source.geometry);assert.deepEqual(s.materials,source.materials);
    return{mapError,uploadError,viewError,sourceError,normalizedSourceProgress:normalized,progress:s.group.data.progress,ghostOpacity:s.ghost.opacity,draws:s.draws};
  };
  const clear=s=>{assert(!s.group.visible&&!s.ghost.data.sourceSnapshot&&s.carry.active===0&&s.carry.progress===0);assert.deepEqual(s.carry.localToSource,identity);assert.equal(s.ghost.data.assemblySourceProgress.value,0);};
  result.cloudAssemblySource={journey:await page.evaluate(()=>cloudAssemblyJourney)};const r=result.cloudAssemblySource;
  await restore('before-assemblyThaw',{cameraMode:'water'});r.before=await sample();await driveTransition('assemblyThaw');r.thaw=await sample();assert(r.thaw.preview.effective&&r.thaw.melt.active===1);
  await page.evaluate(()=>{window.assemblySourceProof=null;window.assemblyCaptureArmed=true;});await driveTransition('assemblyWarmCloud');await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await draw();r.first=await sample();r.source=await page.evaluate(()=>assemblySourceProof);assert(r.source,'The armed connected native warm-cloud boundary must supply its displayed source');
  await capture('cloud-assembly-source-first-water');r.firstProof=validate(r.first,r.source,'First Water assembly',{first:true});
  assert(r.source.source.name==='pilot-phase-incoming-droplet'&&r.source.source.effective&&r.source.form==='droplet'&&r.source.melt.active===1);
  await page.waitForTimeout(180);r.paused=await sample();assert.deepEqual(visual(r.paused),visual(r.first),'Paused native source, cloud, mask and transforms stay exact');
  await proceed();await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-phase-handoff').userData.progress>=.48);await pause();await draw();r.middle=await sample();await capture('cloud-assembly-source-middle-water');r.middleProof=validate(r.middle,r.source,'Middle Water assembly');
  assert(r.middleProof.normalizedSourceProgress>0&&r.middle.ghost.opacity<r.first.ghost.opacity);
  await click('Follow view');await draw();r.follow=await sample();await capture('cloud-assembly-source-middle-follow');r.followProof=validate(r.follow,r.source,'Follow assembly');
  assert.deepEqual(r.follow.depth,r.before.depth,'Follow restores the exact original scene material depth flags');
  const positionError=maxDelta(r.follow.ghost.world.slice(12,15),[r.follow.ghost.data.sourcePosition.x,r.follow.ghost.data.sourcePosition.y,r.follow.ghost.data.sourcePosition.z]);assert(positionError<1e-7);
  await click('Water view');await draw();r.waterAgain=await sample();r.waterProof=validate(r.waterAgain,r.source,'Returned Water assembly');assert(maxDelta(r.waterAgain.ghost.world,r.middle.ghost.world)<1e-7);assert.deepEqual(r.waterAgain.carry,r.middle.carry);
  pass('Original-kernel13-hit thaw and warm-cloud replay retain the actually displayed Water droplet shape, normalized first-frame size and interrupted melting mask');
  pass('Actual native drawn mask/model-view uniforms, exact pause and Water/Follow/Water controls preserve source descriptors and pooled resources');
  await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.phaseHandoff==='hidden');await pause();await draw();r.expired=await sample();clear(r.expired);assert(r.expired.form==='cloud');assert.deepEqual(r.expired.depth,r.follow.depth);
  await page.emulateMedia({reducedMotion:'reduce'});await trigger('assemblyThaw',{cameraMode:'water'});await page.evaluate(()=>{window.assemblySourceProof=null;window.assemblyCaptureArmed=true;});await driveTransition('assemblyWarmCloud');await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await draw();r.reducedSource=await page.evaluate(()=>assemblySourceProof);assert(r.reducedSource,'The reduced native boundary must supply its displayed source');r.reduced=await sample();r.reducedProof=validate(r.reduced,r.reducedSource,'Reduced first assembly',{first:true});
  await proceed();await page.waitForFunction(steps=>rainCloudDepthTotalSteps>steps+5,r.reduced.steps);await pause();await draw();r.reducedLater=await sample();r.reducedLaterProof=validate(r.reducedLater,r.reducedSource,'Held reduced assembly');
  assert(r.reducedLater.steps>r.reduced.steps&&r.reducedLater.group.data.progress===.5);assert.deepEqual(r.reducedLater.ghost.scale,r.reduced.ghost.scale);assert.deepEqual(r.reducedLater.carry,r.reduced.carry);
  await click('Reset this run and start again as liquid water');await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');await pause();r.reset=await sample();clear(r.reset);
  await restore('assemblyRestoredCloud',{cameraMode:'water',pauseAtChanges:false});await draw();r.restored=await sample();clear(r.restored);assert.equal(r.restored.form,'cloud');
  r.evidence={first:r.firstProof,middle:r.middleProof,follow:r.followProof,waterAgain:r.waterProof,reduced:r.reducedProof,reducedLater:r.reducedLaterProof,sourceSelection:r.source.source.name,followPositionError:positionError,
    originalKernelRoute:r.journey.scope,nativeScope:'Native rendering resumes the genuine pre-thaw checkpoint, replays its original thaw and warm-hit input receipts with no intervening restore, and advances cloud assembly through actual model time. Upstream rendered-mote collision acceptance is not native-tested.',
    framing:'Three production-camera native PNGs use a declared520px canvas height; no camera orbit, phase, mass, altitude, material opacity or source matrix is substituted for imagery.',reducedSteps:[r.reduced.steps,r.reducedLater.steps],resourcePoolStable:true,activeReset:true,restoredCloudClear:true};
  pass('Normal expiry, held reduced motion with advancing genuine model steps, active reset and restored cloud clear or retain exactly the appropriate source memory');
};
exports.analyze=function({d,checks,ok,root,out,reportRoot,fs,path,assert}){
  const r=d.cloudAssemblySource,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);ok(!!r,'The requested isolated assembly-source native section executed');
  ok(d.browsersClosed&&d.browserTempCleaned,'Native browser closed and only its verified owned temporary profile was removed');
  const gaps=r.journey.hits.slice(1).map((h,n)=>h.elapsed-r.journey.hits[n].elapsed);
  ok(r.journey.iceHits===13&&r.journey.warmHits===1&&r.journey.formation.after.mass<2.4&&Math.min(...gaps)>=.6&&r.journey.hits.every(h=>h.cooldown===0),'Original-kernel fixture reaches natural thaw and stable warm-cloud assembly through13 cooldown-respecting ice hits');
  ok(['assemblyThaw','assemblyWarmCloud'].every(name=>{const row=d.receipts.find(i=>i.name===name),saved=name==='assemblyThaw'?r.journey.thaw:r.journey.formation;return row&&row.receipt.from===saved.before.form&&row.receipt.to===saved.after.form&&row.receipt.elapsed===saved.after.elapsed&&row.actual.some(a=>a.from===saved.before.form&&a.to===saved.after.form&&['dt','thrust','sunlit','surface','nucleusHit','dropletHit'].every(k=>a.input[k]===saved.input[k]));}),'Native rendering replays genuine thaw and warm-hit input receipts without restoring away the live melting cue');
  ok(r.source.source.name==='pilot-phase-incoming-droplet'&&r.source.source.effective&&r.source.melt.active===1&&r.firstProof.sourceError<1e-8&&r.firstProof.normalizedSourceProgress===0&&r.first.ghost.opacity===.48,'The actual displayed partially melted Water source retains its complete first-frame world linear transform and normalized size');
  const proofs=[r.firstProof,r.middleProof,r.followProof,r.waterProof,r.reducedProof,r.reducedLaterProof];ok(proofs.every(p=>p.mapError<1e-8&&p.uploadError<.00005&&p.viewError<.00005&&p.draws>0),'Actual drawn native model-view and carried-melt matrix uniform uploads match their source-bound CPU values');
  const visual=s=>{const c=structuredClone(s);delete c.gpu;delete c.draws;return c;};ok(same(visual(r.paused),visual(r.first)),'Paused native source state is exact except append-only GPU telemetry');
  ok(r.middleProof.normalizedSourceProgress>0&&r.middle.ghost.opacity<r.first.ghost.opacity&&same(r.middle.carry,r.follow.carry)&&same(r.follow.carry,r.waterAgain.carry)&&same(r.first.geometry,r.follow.geometry)&&same(r.first.materials,r.follow.materials)&&r.evidence.followPositionError<1e-7,'Cloud assembly thins its actual source while official Water and Follow controls preserve the carried front, physical source position and existing resource pools');
  ok(r.reducedLater.steps>r.reduced.steps&&same(r.reduced.ghost.scale,r.reducedLater.ghost.scale)&&same(r.reduced.carry,r.reducedLater.carry),'Reduced motion holds the captured source size and melt mapping while genuine model steps advance');
  const clear=s=>!s.group.visible&&!s.ghost.data.sourceSnapshot&&s.carry.active===0&&s.carry.progress===0&&s.ghost.data.assemblySourceProgress.value===0;ok(clear(r.expired)&&clear(r.reset)&&clear(r.restored),'Expiry, active reset and restored cloud clear the source descriptor and carried-front memory');
  const captures=d.captures.map(name=>{const file=path.join(out,name+'.png'),b=fs.readFileSync(file);assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));return{name,path:path.relative(root,file),sourceSha256:d.sourceSha256,width:b.readUInt32BE(16),height:b.readUInt32BE(20)};});
  ok(captures.length===3&&captures.every(c=>c.name.startsWith('cloud-assembly-source-')&&c.height===520),'Three source-bound production-camera native PNGs retain the declared520px canvas height');
  const earlier=path.join(reportRoot,'hook-preflight','results.json'),rawAttempts=fs.existsSync(earlier)?[(()=>{const old=JSON.parse(fs.readFileSync(earlier,'utf8'));return{report:path.relative(root,earlier),sourceSha256:old.sourceSha256,success:old.success,captures:old.captures,browsersClosed:old.browsersClosed,browserTempCleaned:old.browserTempCleaned,harnessError:old.harnessError,scope:'The initial harness hook sampled during checkpoint replay while React replaced its canvas. It was restricted to an explicitly armed, connected native warm-cloud boundary before this successful rerun; production source stayed unchanged.'};})()]:[];
  const summary={success:true,sourceSha256:d.sourceSha256,browsersClosed:true,browserTempCleaned:true,checks,captures,report:path.relative(root,path.join(out,'results.json')),numericalEvidence:{...r.evidence,minimumHitGap:Math.min(...gaps)},validationScope:{native:r.evidence.nativeScope,framing:r.evidence.framing},rawAttempts,errors:[]};
  fs.writeFileSync(path.join(reportRoot,'qa-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({success:true,checks:checks.length,captures:captures.length,numericalEvidence:summary.numericalEvidence},null,2));
};
if(require.main===module&&process.argv.includes('--fixture')){
  const root=process.cwd(),source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js'),'utf8'),j=fixture(source),folder=path.join(root,'reports/watercycle-pilot-cloud-assembly-source');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'fixtures.json'),JSON.stringify(j,null,2)+'\n');console.log(JSON.stringify({success:j.success,sourceSha256:j.sourceSha256,steps:j.steps,mass:j.formation.after.mass,minimumHitGap:j.minimumHitGap}));
}
