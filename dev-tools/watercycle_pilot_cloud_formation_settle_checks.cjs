'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fixture=require('./watercycle_pilot_cloud_assembly_flow_checks.cjs').fixture;
exports.run=async function({page,result,assert,pass,maxDelta,restore,driveTransition,resume,pause,settle,capture}){
 const source=fs.readFileSync(path.join(process.cwd(),'reports/watercycle-pilot-cloud-formation-settle/final-source.js'),'utf8'),journey=fixture(source);
 assert.equal(journey.sourceSha256,result.sourceSha256,'Genuine formation fixture uses exact frozen renderer source');
 result.cloudFormationSettle={journey};const r=result.cloudFormationSettle;
 await page.evaluate(journey=>{
  window.formationJourney=journey;rainCloudDepthTransitions.formationThaw=journey.thaw;rainCloudDepthTransitions.formationWarmCloud=journey.formation;
  rainCloudDepthStates['before-formationThaw']=journey.thaw.before;rainCloudDepthStates['before-formationWarmCloud']=journey.formation.before;rainCloudDepthStates.formationRestoredCloud=journey.formation.after;
  window.formationHooked=new WeakSet();window.formationGPU={};window.formationDrawCount=0;
  window.addEventListener('error',event=>{window.nativeQAPageError=event.error?.stack||event.message;});
  window.formationSnapshot=()=>{
   const s=pilotReview.scene;s.updateMatrixWorld(true);const group=s.getObjectByName('pilot-phase-handoff'),live=s.getObjectByName('pilot-self-cloud'),memory=s.getObjectByName('pilot-phase-cloud-memory');
   const effective=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
   const sample=o=>({uuid:o.uuid,visible:o.visible,effective:effective(o),position:o.position.toArray(),scale:o.scale.toArray(),quaternion:o.quaternion.toArray(),world:o.matrixWorld.toArray()});
   const cloud=o=>({...sample(o),lobes:o.children.map((l,n)=>{const m=l.material,c=m.userData.cloudLighting;return{index:n,tier:l.userData.cloudTier,...sample(l),geometry:l.geometry.uuid,material:m.uuid,map:m.map.uuid,normal:m.pilotBillowNormalMap.uuid,opacity:m.opacity,density:c.density.value,shelter:c.shelter.value,cacheKey:m.customProgramCacheKey(),gpu:formationGPU[l.uuid]||null};})});
   const geometry=new Set(),materials=new Set(),maps=new Set(),normals=new Set(),depth=[];
   s.traverse(o=>{if(o.geometry)geometry.add(o.geometry.uuid);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){if(!materials.has(m.uuid))depth.push({uuid:m.uuid,test:m.depthTest,write:m.depthWrite});materials.add(m.uuid);if(m.map)maps.add(m.map.uuid);if(m.pilotBillowNormalMap)normals.add(m.pilotBillowNormalMap.uuid);}});
   const cv=document.querySelector('#wcPilotCanvas');return{form:cv.dataset.parcelForm,camera:cv.dataset.pilotCamera,steps:rainCloudDepthTotalSteps,elapsed:window.formationLiveScene===s.uuid?window.formationLiveElapsed:waterReviewData.pilot.snapshot.elapsed,paused:waterReviewData.pilot.paused,
    group:{...sample(group),data:rainCloudDepthClean(group.userData)},live:cloud(live),memory:{...cloud(memory),lens:rainCloudDepthClean(memory.userData.assemblyLens),placement:memory.userData.placement},draws:formationDrawCount,
    pool:{geometry:[...geometry].sort(),materials:[...materials].sort(),maps:[...maps].sort(),normals:[...normals].sort()},depth:depth.sort((a,b)=>a.uuid.localeCompare(b.uuid))};
  };
  const original=WaterCyclePilotKernel.step;WaterCyclePilotKernel.step=function(state,input){
   const canvas=document.querySelector('#wcPilotCanvas');let waited=null;
   if(window.formationWaitQueue?.length&&canvas?.isConnected&&canvas.dataset.parcelForm==='droplet'&&!waterReviewData.pilot.paused&&state.form==='droplet'){
    waited=window.formationWaitQueue.shift();if(Math.abs(state.elapsed-waited.before.elapsed)>1e-8)throw Error('Native thaw wait consumes exact next genuine checkpoint input');window.rainCloudDepthDriveInput={...waited.input};
   }
   const next=original(state,input);
   if(waited){window.formationWaitActual.push({before:JSON.parse(JSON.stringify(state)),after:JSON.parse(JSON.stringify(next)),input:{...waited.input}});if(!window.formationWaitQueue.length)queueMicrotask(()=>{if(!waterReviewData.pilot.paused)document.querySelector('[data-control="pause"]').click();window.formationWaitDone=true;});}
   if(canvas?.isConnected&&!waterReviewData.pilot.paused){window.formationLiveElapsed=next.elapsed;window.formationLiveScene=pilotReview.scene.uuid;}
   return next;
  };
 },journey);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.addStyleTag({content:'#wcPilotCanvas{height:520px!important;min-height:520px!important;max-height:520px!important}'});
 const draw=async()=>{
  await page.evaluate(()=>{
   window.formationGPU={};
   for(const name of ['pilot-self-cloud','pilot-phase-cloud-memory'])for(const o of pilotReview.scene.getObjectByName(name).children){
    if(formationHooked.has(o))continue;formationHooked.add(o);const previous=o.onAfterRender;
    o.onAfterRender=function(renderer,scene,camera,geometry,material){if(previous)previous.apply(this,arguments);const gl=renderer.getContext(),p=renderer.properties.get(material),program=p.currentProgram||p.program;
     const read=name=>{const at=gl.getUniformLocation(program.program,name);if(at===null)return null;const value=gl.getUniform(program.program,at);return ArrayBuffer.isView(value)?Array.from(value):value;};
     window.formationGPU[this.uuid]={geometry:geometry.uuid,material:material.uuid,density:read('pilotCloudDensity'),shelter:read('pilotCloudShelter'),solar:read('pilotCloudSolar'),sun:read('pilotCloudSun'),view:read('pilotCloudViewMatrix'),expectedView:camera.matrixWorldInverse.toArray(),modelView:read('modelViewMatrix'),expectedModelView:new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse,this.matrixWorld).toArray(),fragment:gl.getShaderSource(program.fragmentShader),vertex:gl.getShaderSource(program.vertexShader)};window.formationDrawCount++;
    };
   }
  });
  for(let n=0;n<2;n++){const before=await page.evaluate(()=>{window.reviewRenderActive=true;return window.reviewRenderCount||0;});await page.waitForFunction(before=>window.reviewRenderCount>before,before,{timeout:90000});await page.evaluate(()=>{window.reviewRenderActive=false;});}
 };
 const sample=()=>page.evaluate(()=>formationSnapshot());
 const click=async name=>{await page.getByRole('button',{name,exact:true}).evaluate(button=>button.click());await settle();};
 const proceed=async()=>{if(await page.getByRole('button',{name:'Continue journey',exact:true}).count())await click('Continue journey');else await resume();};
 const wait=async()=>{
  await page.evaluate(()=>{window.formationWaitQueue=formationJourney.waitInputs.map(row=>({before:{...row.before},input:{...row.input}}));window.formationWaitActual=[];window.formationWaitDone=false;});
  await proceed();await page.waitForFunction(()=>formationWaitDone&&waterReviewData.pilot.paused);await settle();return page.evaluate(()=>formationWaitActual);
 };
 const start=async()=>{await restore('before-formationThaw',{cameraMode:'water'});await driveTransition('formationThaw');const actual=await wait();assert(actual.length===40&&actual.every((a,n)=>a.after.elapsed===journey.waitInputs[n].after.elapsed&&a.after.mass===journey.waitInputs[n].after.mass&&a.after.altitudeM===journey.waitInputs[n].after.altitudeM&&['dt','thrust','sunlit','surface','nucleusHit','dropletHit'].every(k=>a.input[k]===journey.waitInputs[n].input[k])),'Native renderer replays all40genuine no-hit thaw steps');await driveTransition('formationWarmCloud');await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await draw();return actual;};
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const validate=(s,label)=>{
  assert(s.form==='cloud'&&s.group.data.kind==='cloud-assembly'&&s.group.visible,label+' remains genuine live cloud assembly');const e=smooth(s.group.data.progress),coverage=1-smooth((e-.58)/.42);assert(Math.abs(s.memory.lens.coverage-coverage)<1e-12&&s.memory.lens.retireStart===.58,label+' uses eased optical lens retirement');
  let densityError=0,memoryError=0;for(const l of s.live.lobes){const delay=.08*((l.index*7)%11)/10,expected=smooth((e-l.tier*.17-delay)/(.62-delay*.75));densityError=Math.max(densityError,Math.abs(l.density-expected));const m=s.memory.lobes[l.index];if(s.camera==='water'){memoryError=Math.max(memoryError,Math.abs(m.density-l.density*coverage));assert.equal(m.opacity,l.opacity,label+' retires optical density while retaining source opacity');}}
  assert(densityError<1e-12&&memoryError<1e-12,label+' follows deterministic per-billow delays and density retirement');
  const drawn=s.camera==='water'?s.memory.lobes:s.live.lobes;assert(drawn.length===26&&drawn.every(l=>l.gpu&&l.effective),label+' actually draws all26production billows');let uploadError=0,viewError=0;
  for(const l of drawn){const g=l.gpu;uploadError=Math.max(uploadError,Math.abs(g.density-l.density),Math.abs(g.shelter-l.shelter));viewError=Math.max(viewError,maxDelta(g.view,g.expectedView),maxDelta(g.modelView,g.expectedModelView));assert(g.geometry===l.geometry&&g.material===l.material&&g.fragment.includes('pilotCloudDensity')&&g.fragment.includes('cloudDensityCoverage')&&g.vertex.includes('vPilotCloudSun'),label+' retains linked production cloud shader');}
  assert(uploadError<1e-6&&viewError<.00005,label+' uploads actual density, shelter and camera transforms');
  return{densityError,memoryError,uploadError,viewError,coverage,progress:s.group.data.progress,ease:e,drawn:drawn.length};
 };
 const visual=s=>{const c=structuredClone(s);delete c.draws;for(const group of [c.live,c.memory])for(const l of group.lobes)delete l.gpu;return c;};
 const clear=s=>{assert(!s.group.visible&&s.memory.lens.coverage===0&&!s.memory.effective&&s.live.lobes.every(l=>l.density===1)&&s.memory.lobes.every(l=>l.density===1),'Expired/reset transition clears retirement and restores full density baselines');};
 r.waitActual=await start();r.first=await sample();r.firstProof=validate(r.first,'First Water');
 await proceed();await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-phase-handoff').userData.progress>=.48);await pause();await draw();r.middle=await sample();await capture('cloud-formation-settle-middle-water');r.middleProof=validate(r.middle,'Middle Water');
 assert([[r.first,0],[r.middle,1]].every(([s,t])=>{const values=s.live.lobes.filter(l=>l.tier===t).map(l=>l.density);return Math.max(...values)-Math.min(...values)>.005;}),'First shelf and middle body billows thicken independently within each tier');
 await page.waitForTimeout(180);r.paused=await sample();assert.deepEqual(visual(r.paused),visual(r.middle),'Paused cloud densities, retirement and transforms remain exact');
 await click('Follow view');await draw();r.follow=await sample();r.followProof=validate(r.follow,'Middle Follow');assert.deepEqual(r.follow.pool,r.middle.pool,'View switches preserve all existing cloud and scene resources');
 assert.deepEqual(r.follow.live.lobes.map(l=>l.density),r.middle.live.lobes.map(l=>l.density),'Follow view retains actual per-billow formation density');
 await click('Water view');await draw();r.waterAgain=await sample();r.waterProof=validate(r.waterAgain,'Returned Water');assert.deepEqual(visual(r.waterAgain),visual(r.middle),'Returned Water restores exact paused cloud appearance');
 await resume();await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-phase-handoff').userData.progress>=.945);await pause();await draw();r.late=await sample();await capture('cloud-formation-settle-late-water');r.lateProof=validate(r.late,'Late Water');
 assert(r.late.memory.lens.coverage<.004&&r.late.live.lobes.every(l=>l.density===1)&&Math.max(...r.late.memory.lobes.map(l=>l.density))<.004,'Late Water lens is optically near-clear while actual cloud stays fully formed');assert.deepEqual(r.late.pool,r.middle.pool);
 await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.phaseHandoff==='hidden');await pause();await draw();r.expired=await sample();clear(r.expired);
 await click('Follow view');await draw();r.mature=await sample();await capture('cloud-formation-settle-mature-follow');clear(r.mature);assert(r.mature.live.lobes.every(l=>l.gpu&&Math.abs(l.gpu.density-1)<1e-6),'Mature Follow actually draws all26fully formed billows');assert.deepEqual(r.mature.pool,r.middle.pool);assert.deepEqual(r.mature.depth,r.follow.depth);
 pass('Original-kernel6-hit thaw,40saved no-hit steps and warm collection produce stable genuine cloud formation');
 pass('Actual26Water memory and26Follow billows upload deterministic independent density, captured shelter and production camera transforms');
 pass('Water lens thins optically before expiry while the real cloud and all existing scene resources remain intact');
 await page.emulateMedia({reducedMotion:'reduce'});r.reducedWaitActual=await start();r.reduced=await sample();r.reducedProof=validate(r.reduced,'Reduced Water');
 await proceed();await page.waitForFunction(steps=>rainCloudDepthTotalSteps>steps+5,r.reduced.steps);await pause();await draw();r.reducedLater=await sample();r.reducedLaterProof=validate(r.reducedLater,'Held reduced Water');
 assert(r.reducedLater.steps>r.reduced.steps&&r.reduced.group.data.progress===.5&&r.reducedLater.group.data.progress===.5,'Reduced representative cue holds while genuine model advances');
 assert.deepEqual(r.reduced.live.lobes.map(l=>l.density),r.reducedLater.live.lobes.map(l=>l.density));assert.deepEqual(r.reduced.memory.lobes.map(l=>l.density),r.reducedLater.memory.lobes.map(l=>l.density));assert.equal(r.reduced.memory.lens.coverage,r.reducedLater.memory.lens.coverage);
 await click('Reset this run and start again as liquid water');await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');await pause();r.reset=await sample();clear(r.reset);
 await restore('formationRestoredCloud',{cameraMode:'follow',pauseAtChanges:false});await draw();r.restored=await sample();clear(r.restored);
 r.evidence={first:r.firstProof,middle:r.middleProof,follow:r.followProof,waterAgain:r.waterProof,late:r.lateProof,reduced:r.reducedProof,reducedLater:r.reducedLaterProof,
  scope:'Native rendering resumes the genuine6-hit pre-thaw checkpoint, replays its original thaw input,40saved no-hit assist inputs and warm-hit receipt with no intervening restore, then advances cloud through genuine model time. Upstream rendered-mote collision acceptance and native precipitation interruption are not claimed.',
  framing:'Three production-camera PNGs use a declared520px canvas height; no orbit, phase, mass, altitude, opacity, density or transform is substituted for imagery.',reducedSteps:[r.reduced.steps,r.reducedLater.steps],resourcePoolStable:true};
 pass('Exact pause, official Water/Follow controls, held reduced motion, natural expiry, active reset and restored cloud preserve or clear the appropriate appearance');
};
exports.analyze=function({d,checks,ok,root,out,reportRoot,fs,path,assert}){
 const r=d.cloudFormationSettle,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);ok(!!r,'Requested isolated cloud formation settle native section executed');ok(d.browsersClosed&&d.browserTempCleaned,'Native browser closed and only its verified owned temporary profile was removed');
 ok(r.journey.iceHits===6&&r.journey.warmHits===1&&r.journey.waitInputs.length===40&&r.journey.minimumHitGap>=.6,'Unchanged kernel fixture respects actual collection cooldowns and40step liquid wait');
 ok(['formationThaw','formationWarmCloud'].every(name=>{const saved=name==='formationThaw'?r.journey.thaw:r.journey.formation;return d.receipts.some(row=>row.name===name&&row.receipt.from===saved.before.form&&row.receipt.to===saved.after.form&&row.receipt.elapsed===saved.after.elapsed&&row.actual.some(a=>a.from===saved.before.form&&a.to===saved.after.form&&['dt','thrust','sunlit','surface','nucleusHit','dropletHit'].every(k=>a.input[k]===saved.input[k])));}), 'Both native routes replay genuine thaw and warm-hit receipts');
 ok([r.waitActual,r.reducedWaitActual].every(a=>a.length===40&&a.every((v,n)=>v.after.elapsed===r.journey.waitInputs[n].after.elapsed&&v.after.mass===r.journey.waitInputs[n].after.mass&&v.after.altitudeM===r.journey.waitInputs[n].after.altitudeM&&['dt','thrust','sunlit','surface','nucleusHit','dropletHit'].every(k=>v.input[k]===r.journey.waitInputs[n].input[k]))),'Normal and reduced routes consume all40original no-hit thaw inputs');
 const proofs=[r.firstProof,r.middleProof,r.followProof,r.waterProof,r.lateProof,r.reducedProof,r.reducedLaterProof];ok(proofs.every(p=>p.drawn===26&&p.densityError<1e-12&&p.memoryError<1e-12&&p.uploadError<1e-6&&p.viewError<.00005),'Each actual26billow draw uploads the expected independent density, captured shelter and camera transform');
 ok([[r.first,0],[r.middle,1]].every(([s,t])=>{const a=s.live.lobes.filter(l=>l.tier===t).map(l=>l.density);return Math.max(...a)-Math.min(...a)>.005;}),'First native shelf and middle body lobes thicken independently within their own tiers');
 const visual=s=>{const c=structuredClone(s);delete c.draws;for(const g of[c.live,c.memory])for(const l of g.lobes)delete l.gpu;return c;};ok(same(visual(r.paused),visual(r.middle)),'Paused density, retirement and transforms remain exact');
 ok(same(r.middle.live.lobes.map(l=>l.density),r.follow.live.lobes.map(l=>l.density))&&same(visual(r.waterAgain),visual(r.middle)),'Official Water/Follow/Water controls preserve true cloud density and restore its exact paused illustration');
 ok(r.late.memory.lens.coverage<.004&&r.late.live.lobes.every(l=>l.density===1)&&r.late.memory.lobes.every(l=>l.density<.004&&l.opacity===r.late.live.lobes[l.index].opacity),'Late Water density retires near zero while real cloud retains full density and source opacity');
 ok(r.mature.live.lobes.length===26&&r.mature.live.lobes.every(l=>l.gpu&&Math.abs(l.gpu.density-1)<1e-6),'Mature Follow draws all26fully formed cloud billows after natural cue expiry');
 ok([r.follow,r.waterAgain,r.late,r.expired,r.mature].every(s=>same(s.pool,r.middle.pool))&&same(r.mature.depth,r.follow.depth),'View changes and natural expiry preserve geometry, material, albedo and normal pools and restore depth flags');
 ok(r.reducedLater.steps>r.reduced.steps&&r.reduced.group.data.progress===.5&&r.reducedLater.group.data.progress===.5&&same(r.reduced.live.lobes.map(l=>l.density),r.reducedLater.live.lobes.map(l=>l.density))&&same(r.reduced.memory.lobes.map(l=>l.density),r.reducedLater.memory.lobes.map(l=>l.density))&&r.reduced.memory.lens.coverage===r.reducedLater.memory.lens.coverage,'Reduced motion holds its representative cloud appearance while genuine model time advances');
 const clear=s=>!s.group.visible&&s.memory.lens.coverage===0&&!s.memory.effective&&s.live.lobes.every(l=>l.density===1)&&s.memory.lobes.every(l=>l.density===1);ok([r.expired,r.mature,r.reset,r.restored].every(clear),'Expiry, active reset and restored cloud clear lens retirement and restore full density baselines');
 const captures=d.captures.map(name=>{const file=path.join(out,name+'.png'),b=fs.readFileSync(file);assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));return{name,path:path.relative(root,file),sourceSha256:d.sourceSha256,width:b.readUInt32BE(16),height:b.readUInt32BE(20)};});ok(captures.length===3&&captures.every(c=>c.name.startsWith('cloud-formation-settle-')&&c.height===520),'Three source-bound native PNGs show middle Water, late Water and mature Follow at declared520px height');
 const rawAttempts=[];const initialFile=path.join(reportRoot,'final/results.json');if(path.resolve(initialFile)!==path.resolve(out,'results.json')&&fs.existsSync(initialFile)){const old=JSON.parse(fs.readFileSync(initialFile,'utf8'));rawAttempts.push({report:path.relative(root,initialFile),sourceSha256:old.sourceSha256,success:old.success,browsersClosed:old.browsersClosed,browserTempCleaned:old.browserTempCleaned,captures:old.captures,harnessError:old.harnessError,scope:'The first native attempt compared asynchronously persisted UI snapshot elapsed rather than the live model clock across official view changes. Geometry, density, transforms and step count were exact; telemetry now records the actual unchanged kernel result clock at connected native steps. Production source was unchanged.'});}
 const summary={rawAttempts,success:true,sourceSha256:d.sourceSha256,browsersClosed:true,browserTempCleaned:true,checks,captures,report:path.relative(root,path.join(out,'results.json')),numericalEvidence:r.evidence,validationScope:{native:r.evidence.scope,framing:r.evidence.framing},errors:[]};fs.writeFileSync(path.join(reportRoot,'qa-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({success:true,checks:checks.length,captures:captures.length,sourceSha256:d.sourceSha256},null,2));
};
