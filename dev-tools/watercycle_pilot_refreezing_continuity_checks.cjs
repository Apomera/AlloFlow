'use strict';
// Source-bound native review: every state and boundary input comes from the
// original kernel route. Imagery uses the production Water camera unchanged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
exports.fixture=function(source){
 const saved=JSON.parse(fs.readFileSync(path.join(process.cwd(),'reports/watercycle-pilot-refreezing-continuity/refreezing-route.json'),'utf8'));
 const route=saved.routes.find(r=>r.scenario==='temperateCoast'&&r.dt===.016);
 const a=source.indexOf('  var WC_PILOT_UNIT_M ='),b=source.indexOf('  window.WaterCyclePilotKernel = {',a),end=source.indexOf('\n  };',b),kernel=source.slice(a,end+'\n  };'.length),host={window:{}};
 assert.equal(crypto.createHash('sha256').update(kernel).digest('hex'),saved.kernelSha256,'Native route uses the exact unchanged source kernel');vm.runInNewContext(kernel,host);const K=host.window.WaterCyclePilotKernel;
 let state=K.practiceState(route.practice,route.scenario),melt=null,rows=[];
 assert.deepEqual(JSON.parse(JSON.stringify(state)),route.initial);
 for(let n=0;n<route.inputs.length;n++){
  const input=route.inputs[n],next=K.step(state,input),row={before:JSON.parse(JSON.stringify(state)),after:JSON.parse(JSON.stringify(next)),input:{...input}};
  if(n===route.melted.step)melt=row;else if(n>route.melted.step)rows.push(row);
  state=next;
 }
 assert(melt&&melt.before.form==='ice'&&melt.after.form==='droplet'&&rows.length===3&&rows.at(-1).before.form==='droplet'&&rows.at(-1).after.form==='ice');
 assert.deepEqual(JSON.parse(JSON.stringify(state)),route.refrozen.state);assert.deepEqual(melt.before,route.preMelt.state);
 assert.deepEqual([melt.input,...rows.map(r=>r.input)],route.boundaryInputs);
 return{sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),kernelSha256:saved.kernelSha256,initial:route.initial,inputCount:route.inputs.length,melt,rows,refreeze:rows.at(-1),recrossSeconds:route.recrossSeconds,scope:saved.scope};
};
exports.run=async function({page,result,assert,pass,maxDelta,restore,driveTransition,resume,pause,settle,capture}){
 const final=fs.readFileSync(path.join(process.cwd(),'reports/watercycle-pilot-refreezing-continuity/final-source.js'),'utf8'),fixture=exports.fixture(final);
 assert.equal(fixture.sourceSha256,result.sourceSha256);
 const stateFields=Object.keys(fixture.melt.before).filter(k=>!['x','z','snowTempC','snowHumidity'].includes(k)),phaseState=s=>Object.fromEntries(stateFields.map(k=>[k,s[k]]));
 const r=result.refreezingContinuity={fixture,stateFields,excludedFields:{x:'Live renderer wind drift changes X after unchanged-kernel stepping.',z:'Live renderer horizontal navigation is presentation-owned.',snowTempC:'The live UI resolves null snowpack controls to their default15C.',snowHumidity:'The live UI resolves null snowpack controls to their default62percent.',additional:'Live scene adds cameraMode,pitch,yaw and diagnostic surface,temperature,humidity,ambient andbuoyancy values; these do not enter this ice/droplet recross.'}};
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addStyleTag({content:'#wcPilotCanvas{height:520px!important;min-height:520px!important;max-height:520px!important}'});
 await page.evaluate(f=>{
  window.refreezeFixture=f;rainCloudDepthTransitions.rapidRefreezeMelt=f.melt;
  rainCloudDepthStates['before-rapidRefreezeMelt']=f.melt.before;rainCloudDepthStates.refreezeRestoredIce=f.refreeze.after;
  window.refreezeHooked=new WeakSet();window.refreezeGPU={};window.refreezeDraws=0;window.refreezeQueue=null;window.refreezeSource=null;window.refreezeArmed=false;
  window.refreezeSnapshot=()=>{
   const scene=pilotReview.scene;scene.updateMatrixWorld(true);const group=scene.getObjectByName('pilot-phase-handoff'),liquid=scene.getObjectByName('pilot-phase-liquid-memory'),ice=scene.getObjectByName('pilot-phase-ice-memory'),dropPreview=scene.getObjectByName('pilot-phase-incoming-droplet'),icePreview=scene.getObjectByName('pilot-phase-incoming-ice'),parcel=scene.getObjectByName('pilot-water-parcel');
   const actualDrop=parcel.children.find(o=>o.geometry===dropPreview.geometry&&o.material===dropPreview.material),actualIce=parcel.children.find(o=>o.geometry===icePreview.geometry&&o.material===icePreview.material);
   const effective=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
   const sample=o=>({uuid:o.uuid,name:o.name,visible:o.visible,effective:effective(o),geometry:o.geometry?.uuid,material:o.material?.uuid,position:o.position.toArray(),scale:o.scale.toArray(),quaternion:o.quaternion.toArray(),world:o.matrixWorld.toArray(),opacity:o.material?.opacity,data:rainCloudDepthClean(o.userData),materialData:o.material?rainCloudDepthClean(o.material.userData):null,gpu:refreezeGPU[o.uuid]||null});
   const geometry=new Set(),materials=new Set(),depth=[];scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry.uuid);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){if(!materials.has(m.uuid))depth.push({uuid:m.uuid,test:m.depthTest,write:m.depthWrite});materials.add(m.uuid);}});
   const shownDrop=dropPreview.visible?dropPreview:actualDrop;
   const melt=actualDrop.material.userData.meltingFront;
   return{form:document.querySelector('#wcPilotCanvas').dataset.parcelForm,camera:document.querySelector('#wcPilotCanvas').dataset.pilotCamera,steps:rainCloudDepthTotalSteps,elapsed:window.refreezeLiveScene===scene.uuid?window.refreezeLiveElapsed:waterReviewData.pilot.snapshot.elapsed,
    group:sample(group),liquid:sample(liquid),ice:sample(ice),edges:sample(ice.children[0]),dropPreview:sample(dropPreview),icePreview:sample(icePreview),actualDrop:sample(actualDrop),actualIce:sample(actualIce),shownDrop:sample(shownDrop),shownIce:sample(icePreview.visible?icePreview:actualIce),
    melt:{active:melt.active.value,progress:melt.progress.value,worldToSource:melt.worldToSource.value.toArray(),liquidToSource:melt.worldToSource.value.clone().multiply(shownDrop.matrixWorld).toArray(),iceToSource:melt.worldToSource.value.clone().multiply(ice.matrixWorld).toArray()},
    carry:rainCloudDepthClean(liquid.userData.carriedMeltingFront),iceCarry:rainCloudDepthClean(ice.userData.carriedFreezingFront),refreezing:rainCloudDepthClean(group.userData.refreezing),draws:refreezeDraws,geometry:[...geometry].sort(),materials:[...materials].sort(),depth:depth.sort((a,b)=>a.uuid.localeCompare(b.uuid))};
  };
  const original=WaterCyclePilotKernel.step;
  WaterCyclePilotKernel.step=function(state,input){
   let queued=null;const canvas=document.querySelector('#wcPilotCanvas');
   if(window.refreezeQueue?.length&&canvas?.isConnected&&!waterReviewData.pilot.paused){queued=window.refreezeQueue.shift();if(Math.abs(state.elapsed-queued.before.elapsed)>1e-8)throw Error('Refreeze queue must consume the next exact original-kernel boundary input');window.rainCloudDepthDriveInput={...queued.input};}
   const next=original(state,input);
   if(queued){window.refreezeActual.push({before:JSON.parse(JSON.stringify(state)),after:JSON.parse(JSON.stringify(next)),input:{...queued.input}});if(!window.refreezeQueue.length)queueMicrotask(()=>{if(!waterReviewData.pilot.paused)document.querySelector('[data-control="pause"]').click();window.refreezeQueueDone=true;});}
   if(canvas?.isConnected&&!waterReviewData.pilot.paused){
    window.refreezeLiveElapsed=next.elapsed;window.refreezeLiveScene=pilotReview.scene.uuid;
    if(window.refreezeArmed&&state.form==='droplet'&&next.form==='ice'){window.refreezeSource={before:JSON.parse(JSON.stringify(state)),after:JSON.parse(JSON.stringify(next)),shown:refreezeSnapshot()};window.refreezeArmed=false;}
   }
   return next;
  };
 },fixture);
 const draw=async()=>{
  await page.evaluate(()=>{
   window.refreezeGPU={};const names=['pilot-phase-liquid-memory','pilot-phase-ice-memory','pilot-phase-incoming-droplet','pilot-phase-incoming-ice'];
   const objects=[];for(const name of names){const root=pilotReview.scene.getObjectByName(name);root.traverse(o=>{if(o.material)objects.push(o);});}
   const parcel=pilotReview.scene.getObjectByName('pilot-water-parcel'),preview=pilotReview.scene.getObjectByName('pilot-phase-incoming-ice');parcel.children.filter(o=>o.geometry===preview.geometry&&o.material===preview.material).forEach(o=>o.traverse(c=>{if(c.material)objects.push(c);}));
   for(const o of objects){if(refreezeHooked.has(o))continue;refreezeHooked.add(o);const previous=o.onAfterRender;o.onAfterRender=function(renderer,scene,camera,geometry,material){
    if(previous)previous.apply(this,arguments);const gl=renderer.getContext(),properties=renderer.properties.get(material),program=properties.currentProgram||properties.program;if(!program?.program)return;
    const uniforms={};for(let n=0,count=gl.getProgramParameter(program.program,gl.ACTIVE_UNIFORMS);n<count;n++){const u=gl.getActiveUniform(program.program,n);if(!/^phase|^opacity$|^modelViewMatrix$/.test(u.name))continue;const value=gl.getUniform(program.program,gl.getUniformLocation(program.program,u.name));uniforms[u.name]=ArrayBuffer.isView(value)?Array.from(value):value;}
    refreezeGPU[this.uuid]={name:this.name,geometry:geometry.uuid,material:material.uuid,uniforms,expectedModelView:new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse,this.matrixWorld).toArray(),fragment:gl.getShaderSource(program.fragmentShader),vertex:gl.getShaderSource(program.vertexShader)};refreezeDraws++;
   };}
  });
  for(let n=0;n<2;n++){const before=await page.evaluate(()=>{window.reviewRenderActive=true;return window.reviewRenderCount||0;});await page.waitForFunction(before=>window.reviewRenderCount>before,before,{timeout:90000});await page.evaluate(()=>{window.reviewRenderActive=false;});}
 };
 const sample=()=>page.evaluate(()=>refreezeSnapshot());
 const click=async name=>{await page.getByRole('button',{name,exact:true}).evaluate(button=>button.click());await settle();};
 const proceed=async()=>{if(await page.getByRole('button',{name:'Continue journey',exact:true}).count())await click('Continue journey');else await resume();};
 const linear=[0,1,2,4,5,6,8,9,10],identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 const visual=s=>{const c=structuredClone(s);delete c.draws;for(const key of ['group','liquid','ice','edges','dropPreview','icePreview','actualDrop','actualIce','shownDrop','shownIce'])delete c[key].gpu;return c;};
 const upload=(o,label)=>{
  const g=o.gpu;assert(o.effective&&g&&g.geometry===o.geometry&&g.material===o.material,label+' is actually drawn from the production material');
  const matrixError=maxDelta(g.uniforms.modelViewMatrix,g.expectedModelView),opacityError=Math.abs(g.uniforms.opacity-o.opacity);assert(matrixError<.00005&&opacityError<1e-6,label+' uploads actual model-view and opacity');return{matrixError,opacityError,uniforms:g.uniforms};
 };
 const validate=(s,source,label,{first=false}={})=>{
  assert(s.form==='ice'&&s.group.data.kind==='freezing'&&s.refreezing.active,label+' is the genuine interrupted melting refreeze');
  const progress=s.refreezing.progress;assert(progress>=0&&progress<=1);
  assert(s.liquid.visible&&s.ice.visible&&s.carry.active.value===1&&s.carry.progress.value===source.melt.progress,label+' keeps both actual partially liquid and remaining solid source');
  const liquidMapError=maxDelta(s.carry.localToSource.value.elements,source.melt.liquidToSource);assert(liquidMapError<1e-8,label+' retains the actual liquid-to-old-melt mapping');
  const held=s.refreezing.uniforms;
  assert(held.active.value===1&&held.meltProgress.value===source.melt.progress&&maxDelta(held.iceToMelt.value.elements,source.melt.iceToSource)<1e-8,label+' holds the actual remaining ice source-to-old-melt matrix');
  assert(held.iceCarryActive.value===source.iceCarry.active.value&&held.iceCarryProgress.value===source.iceCarry.progress.value,label+' retains any original carried freezing mask');
  const liquidGPU=upload(s.liquid,label+' liquid'),iceGPU=upload(s.ice,label+' remaining ice'),edgeGPU=upload(s.edges,label+' remaining ice edges');
  assert(liquidGPU.uniforms.phaseWaterCarryActive===1&&Math.abs(liquidGPU.uniforms.phaseWaterCarryProgress-source.melt.progress)<1e-6&&maxDelta(liquidGPU.uniforms.phaseWaterCarryLocalToSource,source.melt.liquidToSource)<.00005,label+' actually uploads the captured liquid mask');
  assert(iceGPU.uniforms.phaseRefreezeActive===1&&Math.abs(iceGPU.uniforms.phaseRefreezeMeltProgress-source.melt.progress)<1e-6&&maxDelta(iceGPU.uniforms.phaseRefreezeIceToMelt,source.melt.iceToSource)<.00005,label+' actually uploads the held old ice melt mask');
  assert(edgeGPU.uniforms.phaseRefreezeActive===1&&Math.abs(edgeGPU.uniforms.phaseRefreezeMeltProgress-source.melt.progress)<1e-6&&maxDelta(edgeGPU.uniforms.phaseRefreezeIceToMelt,source.melt.iceToSource)<.00005,label+' applies the same held old melt field to the actual ice edges');
  for(const gpu of [iceGPU,edgeGPU])assert(gpu.uniforms.phaseRefreezeIceCarryActive===source.iceCarry.active.value&&Math.abs(gpu.uniforms.phaseRefreezeIceCarryProgress-source.iceCarry.progress.value)<1e-6,label+' uploads the actual retained old freezing mask');
  assert(s.liquid.gpu.fragment.includes('phaseWaterCarryLocalToSource')&&s.ice.gpu.fragment.includes('phaseRefreezeIceToMelt'));
  let firstPoseError=0,firstCenterError=0,sourceWorldTranslation=0;
  if(first){
   assert.equal(progress,0,label+' begins normalized freezing progress at zero');
   for(const [now,old]of [[s.liquid,source.shownDrop],[s.ice,source.ice]])firstPoseError=Math.max(firstPoseError,...linear.map(n=>Math.abs(now.world[n]-old.world[n])));
   for(const [now,old]of [[s.liquid,source.shownDrop],[s.ice,source.ice]]){
    firstCenterError=Math.max(firstCenterError,maxDelta(now.world.slice(12,15).map((v,n)=>v-s.group.world[12+n]),old.world.slice(12,15).map((v,n)=>v-source.group.world[12+n])));
    sourceWorldTranslation=Math.max(sourceWorldTranslation,maxDelta(now.world.slice(12,15),old.world.slice(12,15)));
   }
   assert(firstPoseError<1e-8,label+' preserves both complete actual displayed source linear transforms');
   assert(firstCenterError<1e-7,label+' retains both actual source offsets within the moving production Water lens');
   assert.equal(s.liquid.opacity,source.shownDrop.opacity);assert.equal(s.ice.opacity,source.ice.opacity);assert.equal(s.edges.opacity,source.edges.opacity);
  }
  assert(Math.abs(s.liquid.opacity-source.shownDrop.opacity*(1-progress))<1e-12&&Math.abs(s.ice.opacity-source.ice.opacity*(1-progress))<1e-12&&Math.abs(s.edges.opacity-source.edges.opacity*(1-progress))<1e-12,label+' retires each captured source opacity once');
  let retainedScaleError=0;for(const [now,old,shrink]of [[s.liquid,source.shownDrop,.32],[s.ice,source.ice,.12]])for(const n of linear)retainedScaleError=Math.max(retainedScaleError,Math.abs(now.world[n]-old.world[n]*(1-shrink*progress)));
  assert(retainedScaleError<1e-8,label+' shrinks from both complete captured linear transforms without reorientation');
  let canonicalPositionError=0;if(s.camera==='follow')for(const [object,p]of [[s.liquid,s.liquid.data.sourcePosition],[s.ice,s.refreezing.sourceIcePosition]])canonicalPositionError=Math.max(canonicalPositionError,maxDelta(object.world.slice(12,15),[p.x,p.y,p.z]));
  assert(canonicalPositionError<1e-7,label+' keeps Follow memories at their actual physical source positions');
  assert.deepEqual(s.geometry,source.geometry);assert.deepEqual(s.materials,source.materials);
  const incoming=upload(s.shownIce,label+' incoming ice');assert(Math.abs(incoming.uniforms.phaseFrontProgress-progress)<1e-6,label+' shares the normalized new freezing front');
  assert(incoming.uniforms.phaseRefreezeActive===1&&s.shownIce.gpu.fragment.includes('icePhaseField=clamp(icePhaseField,0.09,0.91)'),label+' limits the incoming field so normalized zero draws no premature new ice');
  return{progress,liquidMapError,firstPoseError,firstCenterError,sourceWorldTranslation,retainedScaleError,canonicalPositionError,liquidGPU,iceGPU,edgeGPU,incomingGPU:incoming};
 };
 const clear=s=>{assert(!s.group.visible&&!s.refreezing.active&&s.refreezing.progress===0&&s.carry.active.value===0&&s.carry.progress.value===0);assert.deepEqual(s.carry.localToSource.value.elements,identity);};
 const start=async(reduced=false)=>{
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await restore('before-rapidRefreezeMelt',{cameraMode:'water'});await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await draw();const before=await sample();await driveTransition('rapidRefreezeMelt');await draw();const melting=await sample();
  assert(melting.form==='droplet'&&melting.group.data.kind==='melting'&&melting.melt.active===1&&melting.shownDrop.effective&&melting.ice.effective);
  await page.evaluate(()=>{window.refreezeSource=null;window.refreezeArmed=true;window.refreezeQueue=refreezeFixture.rows.map(row=>({before:{...row.before},input:{...row.input}}));window.refreezeActual=[];window.refreezeQueueDone=false;});
  return{before,melting};
 };
 const finish=async()=>{
  await proceed();await page.waitForFunction(()=>refreezeQueueDone&&document.querySelector('#wcPilotCanvas').dataset.parcelForm==='ice'&&waterReviewData.pilot.paused);await settle();await draw();
  const sampled=await sample(),source=await page.evaluate(()=>refreezeSource),actual=await page.evaluate(()=>refreezeActual);assert(source,'Connected native refreeze captures the actual last shown melting source');
  assert.equal(actual.length,fixture.rows.length);for(let n=0;n<actual.length;n++){assert.deepEqual(phaseState(actual[n].before),phaseState(fixture.rows[n].before));assert.deepEqual(phaseState(actual[n].after),phaseState(fixture.rows[n].after));assert.deepEqual(actual[n].input,fixture.rows[n].input);}
  return{sampled,source,actual};
 };
 ({before:r.before,melting:r.melting}=await start());await capture('refreezing-continuity-melting-water');
 ({sampled:r.first,source:r.source,actual:r.actual}=await finish());r.firstProof=validate(r.first,r.source.shown,'First Water refreeze',{first:true});await capture('refreezing-continuity-first-water');
 await page.waitForTimeout(180);r.paused=await sample();assert.deepEqual(visual(r.paused),visual(r.first),'Paused native source pair and held masks remain exact');
 await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dt:.016,thrust:1,dropletHit:false,nucleusHit:false};});await proceed();await page.waitForFunction(()=>{const r=pilotReview.scene.getObjectByName('pilot-phase-handoff').userData.refreezing;return r.active&&r.progress>=.43;});await pause();await draw();r.middle=await sample();r.middleProof=validate(r.middle,r.source.shown,'Middle Water refreeze');await capture('refreezing-continuity-middle-water');
 await click('Follow view');await draw();r.follow=await sample();r.followProof=validate(r.follow,r.source.shown,'Follow refreeze');assert.deepEqual(r.follow.depth,r.before.depth,'Follow restores original material depth flags');
 await click('Water view');await draw();r.waterAgain=await sample();r.waterProof=validate(r.waterAgain,r.source.shown,'Returned Water refreeze');assert(maxDelta(r.waterAgain.liquid.world,r.middle.liquid.world)<1e-7&&maxDelta(r.waterAgain.ice.world,r.middle.ice.world)<1e-7);assert.deepEqual(r.waterAgain.carry,r.middle.carry);
 pass('Genuine original-kernel melt and three-input recross preserve actual partial liquid and remaining ice source shapes, opacities and held masks at the first learning pause');
 pass('Native production draws upload the liquid carry mask, old ice and edge melt masks, normalized new freezing front and actual model-view transforms');
 await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.phaseHandoff==='hidden');await pause();await draw();r.expired=await sample();clear(r.expired);assert.equal(r.expired.form,'ice');assert.deepEqual(r.expired.depth,r.before.depth);
 await start(true);({sampled:r.reduced,source:r.reducedSource,actual:r.reducedActual}=await finish());r.reducedProof=validate(r.reduced,r.reducedSource.shown,'Reduced first refreeze',{first:true});
 await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dt:.016,thrust:1,dropletHit:false,nucleusHit:false};});await proceed();await page.waitForFunction(steps=>rainCloudDepthTotalSteps>steps+5,r.reduced.steps);await pause();await draw();r.reducedLater=await sample();r.reducedLaterProof=validate(r.reducedLater,r.reducedSource.shown,'Held reduced refreeze',{first:true});assert(r.reducedLater.steps>r.reduced.steps);assert.deepEqual(r.reducedLater.liquid.scale,r.reduced.liquid.scale);assert.deepEqual(r.reducedLater.ice.scale,r.reduced.ice.scale);assert.deepEqual(r.reducedLater.carry,r.reduced.carry);
 await click('Reset this run and start again as liquid water');await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');await pause();r.reset=await sample();clear(r.reset);
 await restore('refreezeRestoredIce',{cameraMode:'water',pauseAtChanges:false});await draw();r.restored=await sample();clear(r.restored);assert.equal(r.restored.form,'ice');
 await page.emulateMedia({reducedMotion:'no-preference'});await restore('before-freezing',{cameraMode:'water'});await driveTransition('freezing');await draw();r.ordinaryFreezing=await sample();assert(r.ordinaryFreezing.form==='ice'&&r.ordinaryFreezing.group.data.kind==='freezing'&&!r.ordinaryFreezing.refreezing.active&&r.ordinaryFreezing.carry.active.value===0);
 await restore('before-melting',{cameraMode:'water'});await driveTransition('melting');await draw();r.ordinaryMelting=await sample();assert(r.ordinaryMelting.form==='droplet'&&r.ordinaryMelting.group.data.kind==='melting'&&!r.ordinaryMelting.refreezing.active&&r.ordinaryMelting.melt.active===1);
 pass('Pause, official Water and Follow views, normal expiry, held reduced motion, active reset and restored ice retain or clear the appropriate bounded source memory');
 pass('Ordinary first freezing and melting retain their original genuine transition presentation without a manufactured refreezing source');
 r.evidence={recrossSeconds:fixture.recrossSeconds,originalKernelInputs:fixture.inputCount,nativeBoundaryInputs:1+r.actual.length,sourceFront:r.source.shown.melt.progress,first:r.firstProof,middle:r.middleProof,follow:r.followProof,waterAgain:r.waterProof,reduced:r.reducedProof,reducedLater:r.reducedLaterProof,
  nativeScope:'The genuine pre-melt checkpoint is replayed with its saved original melting input and all three original recross inputs, without intervening restore. Every kernel phase-owned field is exact. Later continuation uses distinct accepted deterministic .016-second thrust1 no-pickup model inputs; visual progress remains the observed actual production RAF phase clock. Live renderer X/Z, default snow-control values and added camera/weather diagnostics are explicitly excluded; native poses are compared against the actual displayed preboundary source. Rendered geometric mote collision acceptance is outside this no-pickup route.',
  framing:'Three native PNGs use the actual production Water camera at a declared520px canvas height. No phase, altitude, mass, material opacity, camera orbit or source transform is substituted for imagery. Water retains the actual source linear transforms and their offsets inside the production bounded lens; the lens itself follows real camera movement across the recross. Follow retains the captured physical source world positions.',reducedScope:'Native reduced-motion samples hold the captured partial-liquid and remaining-ice pair at normalized refreeze progress zero while six genuine model steps advance. Native normal-motion expiry and the separate source-bound CPU proof cover cleanup at the cue duration.',resourcePoolStable:true,resetClear:true,restoreClear:true};
};
exports.analyze=function({d,checks,ok,root,out,reportRoot,fs,path,assert}){
 const r=d.refreezingContinuity,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);ok(!!r,'Requested isolated refreezing continuity native section executed');
 ok(d.browsersClosed&&d.browserTempCleaned,'Native browser closed and only its verified owned temporary profile was removed');
 ok(r.fixture.inputCount===6977&&r.fixture.rows.length===3&&Math.abs(r.fixture.recrossSeconds-.048)<1e-10&&r.fixture.melt.before.form==='ice'&&r.fixture.refreeze.after.form==='ice','Complete unchanged-kernel no-pickup route produces a genuine .048-second refreeze');
 const receipt=d.receipts.find(i=>i.name==='rapidRefreezeMelt');ok(receipt&&receipt.receipt.elapsed===r.fixture.melt.after.elapsed&&receipt.actual.some(a=>a.from==='ice'&&a.to==='droplet'&&Object.entries(r.fixture.melt.input).every(([k,v])=>a.input[k]===v)),'Native melting consumes the exact original saved boundary input');
 const phaseState=s=>Object.fromEntries(r.stateFields.map(k=>[k,s[k]]));
 ok(r.actual.length===3&&r.actual.every((row,n)=>same(phaseState(row.before),phaseState(r.fixture.rows[n].before))&&same(phaseState(row.after),phaseState(r.fixture.rows[n].after))&&same(row.input,r.fixture.rows[n].input)),'Native rendering replays every exact kernel phase-owned recross field and saved input without restoring between melting and refreezing');
 const proofs=[r.firstProof,r.middleProof,r.followProof,r.waterProof,r.reducedProof,r.reducedLaterProof];ok(proofs.every(p=>p.liquidMapError<1e-8&&[p.liquidGPU,p.iceGPU,p.edgeGPU,p.incomingGPU].every(g=>g.matrixError<.00005&&g.opacityError<1e-6)),'Actual native production materials upload their captured source masks and model-view matrices');
 ok(r.firstProof.progress===0&&r.firstProof.firstPoseError<1e-8&&r.first.liquid.opacity===r.source.shown.shownDrop.opacity&&r.first.ice.opacity===r.source.shown.ice.opacity&&r.first.edges.opacity===r.source.shown.edges.opacity,'First paused refreeze retains both complete actual source linear transforms and all three captured opacity values');
 ok(r.middleProof.progress>0&&r.middle.liquid.opacity<r.first.liquid.opacity&&r.middle.ice.opacity<r.first.ice.opacity&&same(r.first.geometry,r.middle.geometry)&&same(r.first.materials,r.middle.materials),'New freezing progresses while both source memories retire from their captured opacity and stable geometry/material pools');
 const visual=s=>{const c=structuredClone(s);delete c.draws;for(const key of ['group','liquid','ice','edges','dropPreview','icePreview','actualDrop','actualIce','shownDrop','shownIce'])delete c[key].gpu;return c;};ok(same(visual(r.first),visual(r.paused)),'Paused native visual source pair and held masks are exact apart from append-only draw telemetry');
 ok(same(r.middle.carry,r.follow.carry)&&same(r.follow.carry,r.waterAgain.carry)&&same(r.follow.depth,r.before.depth)&&same(r.expired.depth,r.before.depth),'Official camera controls retain the held liquid mask and restore original material depth state');
 ok(r.reducedLater.steps>r.reduced.steps&&r.reducedLaterProof.progress===0&&same(r.reduced.liquid.scale,r.reducedLater.liquid.scale)&&same(r.reduced.ice.scale,r.reducedLater.ice.scale),'Reduced motion holds both retained source sizes while original model inputs advance');
 ok(!r.ordinaryFreezing.refreezing.active&&r.ordinaryFreezing.form==='ice'&&r.ordinaryFreezing.carry.active.value===0&&!r.ordinaryMelting.refreezing.active&&r.ordinaryMelting.form==='droplet'&&r.ordinaryMelting.melt.active===1,'Ordinary genuine freezing and melting remain free of retained refreezing state');
 const clear=s=>!s.group.visible&&!s.refreezing.active&&s.refreezing.progress===0&&s.carry.active.value===0&&s.carry.progress.value===0;ok(clear(r.expired)&&clear(r.reset)&&clear(r.restored),'Expiry, active reset and restored ice clear the captured refreezing source and carried-liquid mask');
 const captures=d.captures.map(name=>{const file=path.join(out,name+'.png'),b=fs.readFileSync(file);assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));return{name,path:path.relative(root,file),sourceSha256:d.sourceSha256,width:b.readUInt32BE(16),height:b.readUInt32BE(20)};});
 ok(captures.length===3&&captures.every(c=>c.name.startsWith('refreezing-continuity-')&&c.height===520),'Three source-bound actual Water-camera PNGs retain the declared520px canvas height');
 const rawAttempts=['final','final-confirmed'].filter(name=>name!==path.basename(out)&&fs.existsSync(path.join(reportRoot,name,'results.json'))).map(name=>{const old=JSON.parse(fs.readFileSync(path.join(reportRoot,name,'results.json'),'utf8'));return{report:path.relative(root,path.join(reportRoot,name,'results.json')),sourceSha256:old.sourceSha256,success:old.success,captures:old.captures,browsersClosed:old.browsersClosed,browserTempCleaned:old.browserTempCleaned,harnessError:old.harnessError,scope:name==='final'?'Initial native boundary control omitted explicit false for a saved absent-false droplet pickup, allowing an incidental live pickup. Its whole-state comparison also included live wind X and renderer camera/weather metadata. Corrected controls explicitly prevent pickups and compare every kernel phase-owned field.':'The next attempt passed exact no-pickup phase/input replay and actual source linear transforms, but incorrectly required a production camera-bound teaching lens to retain its prior world center despite live camera movement. The corrected check verifies exact source offsets inside the real moving lens and separately verifies captured physical source world positions in Follow. Production source did not change.'};});
 const summary={success:true,sourceSha256:d.sourceSha256,browsersClosed:true,browserTempCleaned:true,cleanupRecovery:d.cleanupRecovery||null,checks,captures,report:path.relative(root,path.join(out,'results.json')),numericalEvidence:r.evidence,validationScope:{native:r.evidence.nativeScope,framing:r.evidence.framing,reduced:r.evidence.reducedScope,stateFields:r.stateFields,excludedStateFields:r.excludedFields},rawAttempts,errors:[]};
 fs.writeFileSync(path.join(reportRoot,'qa-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({success:true,checks:checks.length,captures:captures.length,numericalEvidence:summary.numericalEvidence},null,2));
};
