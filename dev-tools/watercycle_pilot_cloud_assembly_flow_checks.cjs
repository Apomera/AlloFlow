'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
exports.fixture=function(source){
  const begin=source.indexOf('  var WC_PILOT_UNIT_M ='),at=source.indexOf('  window.WaterCyclePilotKernel = {'),end=source.indexOf('\n  };',at);
  const route=function(K){
    const env=K.environment('temperateCoast'),dt=.016,initial=K.practiceState('cloud','temperateCoast');
    let state=initial,cooldown=0,iceHits=0,warmHits=0,nucleusHits=0,thaw=null,formation=null;
    const hits=[],receipts=[],waitInputs=[],forms=[state.form];
    for(let n=0;n<20000;n++){
      cooldown=Math.max(0,cooldown-dt);const targetAltitude=iceHits>=6?env.freezingM-80:env.freezingM+160;
      const thrust=K.assistControls(state,env,{x:state.x,z:state.z,altitudeM:state.altitudeM},{x:state.x,z:state.z,altitudeM:targetAltitude},0,{enabled:true,paused:false,manual:false}).thrust;
      const iceHit=state.form==='ice'&&iceHits<6&&cooldown===0,warmHit=state.form==='droplet'&&iceHits===6&&waitInputs.length>=40&&warmHits===0&&cooldown===0;
      const waiting=state.form==='droplet'&&iceHits===6&&!warmHit&&warmHits===0;
      const input={dt,thrust,sunlit:true,surface:'water',nucleusHit:state.form==='vapor'&&state.altitudeM>=env.lclM,dropletHit:iceHit||warmHit};
      if(input.dropletHit){hits.push({form:state.form,elapsed:state.elapsed,cooldown,input:{...input}});cooldown=.6;if(iceHit)iceHits++;else warmHits++;}
      if(input.nucleusHit)nucleusHits++;
      const next=K.step(state,input);
      if(waiting){if(next.form!=='droplet')throw Error('Genuine below-threshold no-hit thaw wait remains liquid');waitInputs.push({before:state,after:next,input:{...input}});}
      if(next.form!==state.form){const receipt={step:n+1,from:state.form,to:next.form,before:state,after:next,input:{...input}};receipts.push(receipt);forms.push(next.form);if(state.form==='ice'&&next.form==='droplet')thaw=receipt;if(state.form==='droplet'&&next.form==='cloud'){formation=receipt;break;}}
      state=next;
    }
    if(!thaw||!formation||iceHits!==6||warmHits!==1||nucleusHits!==1||waitInputs.length!==40||thaw.after.droplets!==7||formation.after.droplets!==8||Math.abs(formation.after.mass-1.19)>1e-12)throw Error('Genuine6-hit waited route did not reach expected stable warm cloud');
    const gaps=hits.slice(1).map((h,n)=>h.elapsed-hits[n].elapsed);if(Math.min(...gaps)<.6)throw Error('Every collection respects actual cooldown');
    return{success:true,scenario:'temperateCoast',initial,dt,cooldownSeconds:.6,steps:formation.step,iceHits,warmHits,nucleusHits,hits,receipts,forms,thaw,formation,waitInputs,waitSteps:40,waitSeconds:40*dt,minimumHitGap:Math.min(...gaps),
      scope:'Original cloud practice, one near-LCL nucleus, no-hit loft,6cooldown-respecting cold hits and original assist-controlled descent reach7droplets at thaw.40saved no-hit steps (.64modelseconds) keep the liquid below the8droplet cloud threshold, then one genuine warm hit creates cloud. Every state comes from unchanged kernel integration; upstream rendered-mote collision acceptance is not claimed.'};
  };
  const result=vm.runInNewContext(source.slice(begin,end+'\n  };'.length)+'\n('+route.toString()+')(window.WaterCyclePilotKernel);',{window:{}});
  result.sourceSha256=require('node:crypto').createHash('sha256').update(source).digest('hex');return result;
};
exports.run=async function({page,result,assert,pass,maxDelta,restore,trigger,driveTransition,resume,pause,settle,capture}){
  const journey=exports.fixture(fs.readFileSync(path.join(process.cwd(),'reports/watercycle-pilot-cloud-assembly-flow/final-source.js'),'utf8'));
  assert.equal(journey.sourceSha256,result.sourceSha256,'Delayed native fixture uses the exact frozen renderer source');
  await page.evaluate(journey=>{
    // These are genuine saved boundary fixtures, not live model substitutions.
    window.cloudAssemblyJourney=journey;
    rainCloudDepthTransitions.assemblyThaw=journey.thaw;rainCloudDepthTransitions.assemblyWarmCloud=journey.formation;
    rainCloudDepthStates['before-assemblyThaw']=journey.thaw.before;rainCloudDepthStates['before-assemblyWarmCloud']=journey.formation.before;rainCloudDepthStates.assemblyRestoredCloud=journey.formation.after;
  },journey);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addStyleTag({content:'#wcPilotCanvas{height:520px!important;min-height:520px!important;max-height:520px!important}'});
  await page.evaluate(()=>{
    window.assemblyHooked=new WeakSet();window.assemblyGPU=null;window.assemblyDraws=0;
    window.flowHooked=new WeakSet();window.flowGPU=null;window.flowDraws=0;window.flowPools=new WeakMap();
    window.addEventListener('error',event=>{window.nativeQAPageError=event.error?.stack||event.message;});
    window.assemblySnapshot=()=>{
      const s=pilotReview.scene;s.updateMatrixWorld(true);const group=s.getObjectByName('pilot-phase-handoff'),ghost=s.getObjectByName('pilot-phase-liquid-memory'),preview=s.getObjectByName('pilot-phase-incoming-droplet'),parcel=s.getObjectByName('pilot-water-parcel');
      const actual=parcel.children.find(o=>o.geometry===preview.geometry&&o.material===preview.material),source=preview.visible?preview:actual,front=actual.material.userData.meltingFront,carry=ghost.userData.carriedMeltingFront;
      const beads=s.getObjectByName('pilot-phase-condensation-beads'),flow=beads.userData.assemblyFlow;
      if(!flowPools.has(beads))flowPools.set(beads,{geometry:beads.geometry,material:beads.material,instances:beads.instanceMatrix.array,seeds:flow.sourceSeeds,coverage:flow.sourceCoverage,progress:flow.progress});
      const pool=flowPools.get(beads);
      const effective=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
      const sample=o=>({name:o.name,visible:o.visible,effective:effective(o),geometry:o.geometry?.uuid,material:o.material?.uuid,position:o.position.toArray(),scale:o.scale.toArray(),quaternion:o.quaternion.toArray(),world:o.matrixWorld.toArray(),opacity:o.material?.opacity});
      const mapping=front.worldToSource.value.clone().multiply(source.matrixWorld),fieldPoint=new THREE.Vector3(),vertices=source.geometry.attributes.position;let minimumLiquid=1,maximumLiquid=0;
      for(let n=0;n<vertices.count;n++){fieldPoint.fromBufferAttribute(vertices,n).applyMatrix4(mapping).divideScalar(3.4);let field=Math.hypot(fieldPoint.x-.62,fieldPoint.y-.22,fieldPoint.z)/1.9;field+=Math.sin(fieldPoint.x*13+fieldPoint.z*7)*Math.sin(fieldPoint.y*11-fieldPoint.z*9)*.025;field=Math.min(.9,field);const edge=Math.max(0,Math.min(1,(field-front.progress.value+.09)/.18)),liquid=1-edge*edge*(3-2*edge);minimumLiquid=Math.min(minimumLiquid,liquid);maximumLiquid=Math.max(maximumLiquid,liquid);}
      const geometry=new Set(),materials=new Set(),depth=[];s.traverse(o=>{if(o.geometry)geometry.add(o.geometry.uuid);for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[]){if(!materials.has(m.uuid))depth.push({uuid:m.uuid,test:m.depthTest,write:m.depthWrite});materials.add(m.uuid);}});
      return{form:document.querySelector('#wcPilotCanvas').dataset.parcelForm,camera:document.querySelector('#wcPilotCanvas').dataset.pilotCamera,steps:rainCloudDepthTotalSteps,elapsed:waterReviewData.pilot.snapshot.elapsed,mass:waterReviewData.pilot.snapshot.mass,
        group:{...sample(group),data:rainCloudDepthClean(group.userData)},ghost:{...sample(ghost),data:rainCloudDepthClean(ghost.userData)},source:sample(source),actual:sample(actual),preview:sample(preview),
        melt:{active:front.active.value,progress:front.progress.value,worldToSource:front.worldToSource.value.toArray(),localToSource:mapping.toArray(),coverageRange:[minimumLiquid,maximumLiquid]},
        carry:{active:carry.active.value,progress:carry.progress.value,localToSource:carry.localToSource.value.toArray()},gpu:window.assemblyGPU,draws:window.assemblyDraws,
        beads:{...sample(beads),count:beads.count,instances:Array.from(beads.instanceMatrix.array),flow:{active:flow.active,seeds:Array.from(flow.sourceSeeds),coverage:Array.from(flow.sourceCoverage),progress:Array.from(flow.progress)},gpu:window.flowGPU,draws:window.flowDraws,
          pooled:pool.geometry===beads.geometry&&pool.material===beads.material&&pool.instances===beads.instanceMatrix.array&&pool.seeds===flow.sourceSeeds&&pool.coverage===flow.sourceCoverage&&pool.progress===flow.progress},
        geometry:[...geometry].sort(),materials:[...materials].sort(),depth:depth.sort((a,b)=>a.uuid.localeCompare(b.uuid))};
    };
    const original=WaterCyclePilotKernel.step;WaterCyclePilotKernel.step=function(state,input){
      const canvas=document.querySelector('#wcPilotCanvas');let waited=null;
      if(window.flowDelayQueue?.length&&canvas?.isConnected&&canvas.dataset.parcelForm==='droplet'&&!waterReviewData.pilot.paused&&state.form==='droplet'){
        waited=window.flowDelayQueue.shift();
        if(Math.abs(state.elapsed-waited.before.elapsed)>1e-8)throw Error('Native no-hit queue must consume the exact next genuine checkpoint input');
        window.rainCloudDepthDriveInput={...waited.input};
      }
      const next=original(state,input);
      if(waited){
        window.flowDelayActual.push({before:JSON.parse(JSON.stringify(state)),after:JSON.parse(JSON.stringify(next)),input:{...waited.input}});
        if(!window.flowDelayQueue.length)queueMicrotask(()=>{if(!waterReviewData.pilot.paused)document.querySelector('[data-control="pause"]').click();window.flowDelayDone=true;});
      }
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
    await page.evaluate(()=>{const o=pilotReview.scene.getObjectByName('pilot-phase-condensation-beads');if(flowHooked.has(o))return;flowHooked.add(o);const previous=o.onAfterRender;
      o.onAfterRender=function(renderer,scene,camera,geometry,material){
        if(previous)previous.apply(this,arguments);const gl=renderer.getContext(),p=renderer.properties.get(material),program=p.currentProgram||p.program;
        const location=gl.getAttribLocation(program.program,'instanceMatrix'),old=gl.getParameter(gl.ARRAY_BUFFER_BINDING),buffer=location>=0?gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING):null;
        if(!buffer||!gl.getBufferSubData)throw Error('Native flow matrices must be read from their actual WebGL2 instanced attribute buffer');
        const offset=gl.getVertexAttribOffset(location,gl.VERTEX_ATTRIB_ARRAY_POINTER),stride=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_STRIDE),size=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_SIZE);
        if(offset!==0||stride!==64||size!==4)throw Error('Expected the production mat4 instance attribute with64byte stride');
        const matrices=new Float32Array(this.count*16);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);try{gl.getBufferSubData(gl.ARRAY_BUFFER,offset,matrices);}finally{gl.bindBuffer(gl.ARRAY_BUFFER,old);}
        const read=name=>{const at=gl.getUniformLocation(program.program,name);if(at===null)return null;const v=gl.getUniform(program.program,at);return ArrayBuffer.isView(v)?Array.from(v):v;};
        window.flowGPU={geometry:geometry.uuid,material:material.uuid,location,offset,stride,size,matrices:Array.from(matrices),modelView:read('modelViewMatrix'),expectedModelView:new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse,this.matrixWorld).toArray(),opacity:read('opacity'),expectedOpacity:material.opacity};window.flowDraws++;
      };
    });
    for(let n=0;n<2;n++){const before=await page.evaluate(()=>{window.reviewRenderActive=true;return window.reviewRenderCount||0;});await page.waitForFunction(before=>window.reviewRenderCount>before,before,{timeout:90000});await page.evaluate(()=>{window.reviewRenderActive=false;});}
  };
  const sample=()=>page.evaluate(()=>assemblySnapshot());
  const click=async name=>{await page.getByRole('button',{name,exact:true}).evaluate(button=>button.click());await settle();};
  const proceed=async()=>{if(await page.getByRole('button',{name:'Continue journey',exact:true}).count())await click('Continue journey');else await resume();};
  const waitForSurface=async()=>{
    await page.evaluate(()=>{window.flowDelayQueue=cloudAssemblyJourney.waitInputs.map(row=>({before:{...row.before},input:{...row.input}}));window.flowDelayActual=[];window.flowDelayDone=false;});
    await proceed();await page.waitForFunction(()=>window.flowDelayDone&&waterReviewData.pilot.paused);await settle();
    const actual=await page.evaluate(()=>flowDelayActual),saved=journey.waitInputs;
    assert(actual.length===40&&actual.every((row,n)=>row.after.form==='droplet'&&row.after.elapsed===saved[n].after.elapsed&&row.after.mass===saved[n].after.mass&&row.after.altitudeM===saved[n].after.altitudeM&&['dt','thrust','sunlit','surface','nucleusHit','dropletHit'].every(k=>row.input[k]===saved[n].input[k])),'Native no-hit thaw advances through all40saved original-kernel inputs without state or cue restore');
    return actual;
  };
  const linear=[0,1,2,4,5,6,8,9,10],identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],visual=s=>{const c=structuredClone(s);delete c.gpu;delete c.draws;delete c.beads.gpu;delete c.beads.draws;return c;};
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
    const b=s.beads;assert(b.visible&&b.effective&&b.count===12&&b.flow.active&&b.pooled,label+' retains the12pooled active transport droplets');
    assert(b.instances.length===192&&b.instances.every(Number.isFinite)&&b.flow.seeds.length===36&&b.flow.coverage.length===12&&b.flow.progress.length===12,label+' exposes finite complete source seeds and instance matrices');
    assert(b.flow.coverage.every(v=>v>=0&&v<=1)&&b.flow.progress.every(v=>v>=0&&v<=1),label+' keeps coverage and staged progress bounded');
    assert(b.gpu&&b.draws>0&&b.gpu.geometry===b.geometry&&b.gpu.material===b.material,label+' actually draws the existing instanced droplets');
    const instanceUploadError=maxDelta(b.gpu.matrices,b.instances),beadViewError=maxDelta(b.gpu.modelView,b.gpu.expectedModelView);
    assert(instanceUploadError===0&&beadViewError<.00005&&Math.abs(b.gpu.opacity-b.gpu.expectedOpacity)<1e-6,label+' uploads all192actual instance coefficients and correct parent/model-view');
    return{mapError,uploadError,viewError,sourceError,normalizedSourceProgress:normalized,progress:s.group.data.progress,ghostOpacity:s.ghost.opacity,draws:s.draws,instanceUploadError,beadViewError,beadDraws:b.draws,progressRange:[Math.min(...b.flow.progress),Math.max(...b.flow.progress)]};
  };
  const clear=s=>{assert(!s.group.visible&&!s.ghost.data.sourceSnapshot&&s.carry.active===0&&s.carry.progress===0);assert.deepEqual(s.carry.localToSource,identity);assert.equal(s.ghost.data.assemblySourceProgress.value,0);assert(!s.beads.visible&&!s.beads.flow.active&&[...s.beads.flow.seeds,...s.beads.flow.coverage,...s.beads.flow.progress].every(v=>v===0));};
  result.cloudAssemblyFlow={journey:await page.evaluate(()=>cloudAssemblyJourney)};const r=result.cloudAssemblyFlow;
  await restore('before-assemblyThaw',{cameraMode:'water'});r.before=await sample();await driveTransition('assemblyThaw');r.thaw=await sample();assert(r.thaw.preview.effective&&r.thaw.melt.active===1);r.waitActual=await waitForSurface();r.waitedSource=await sample();assert(r.waitedSource.preview.effective&&r.waitedSource.melt.active===1&&r.waitedSource.melt.progress>0&&r.waitedSource.melt.progress<.9,'Saved no-hit thaw wait reaches an active partial liquid surface');
  await page.evaluate(()=>{window.assemblySourceProof=null;window.assemblyCaptureArmed=true;});await driveTransition('assemblyWarmCloud');await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await draw();r.first=await sample();r.source=await page.evaluate(()=>assemblySourceProof);assert(r.source,'The armed connected native warm-cloud boundary must supply its displayed source');
  await capture('cloud-assembly-flow-first-water');r.firstProof=validate(r.first,r.source,'First Water assembly',{first:true});
  assert(r.source.source.name==='pilot-phase-incoming-droplet'&&r.source.source.effective&&r.source.form==='droplet'&&r.source.melt.active===1);
  assert(r.source.melt.coverageRange[0]<.99&&r.source.melt.coverageRange[1]>.01,'The actual native source surface is partly liquid and partly masked at cloud assembly');
  assert(r.first.beads.flow.coverage.some(v=>v>.01)&&r.first.beads.instances.some((v,n)=>n%16===0&&v>0),'The actual waited partial liquid source emits visible nonzero transport droplets');
  await page.waitForTimeout(180);r.paused=await sample();assert.deepEqual(visual(r.paused),visual(r.first),'Paused native source, cloud, mask and transforms stay exact');
  await proceed();await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-phase-handoff').userData.progress>=.48);await pause();await draw();r.middle=await sample();await capture('cloud-assembly-flow-middle-water');r.middleProof=validate(r.middle,r.source,'Middle Water assembly');
  assert(r.middleProof.normalizedSourceProgress>0&&r.middle.ghost.opacity<r.first.ghost.opacity);
  await click('Follow view');await draw();r.follow=await sample();await capture('cloud-assembly-flow-middle-follow');r.followProof=validate(r.follow,r.source,'Follow assembly');
  assert.deepEqual(r.follow.depth,r.before.depth,'Follow restores the exact original scene material depth flags');
  const positionError=maxDelta(r.follow.ghost.world.slice(12,15),[r.follow.ghost.data.sourcePosition.x,r.follow.ghost.data.sourcePosition.y,r.follow.ghost.data.sourcePosition.z]);assert(positionError<1e-7);
  await click('Water view');await draw();r.waterAgain=await sample();r.waterProof=validate(r.waterAgain,r.source,'Returned Water assembly');assert(maxDelta(r.waterAgain.ghost.world,r.middle.ghost.world)<1e-7);assert.deepEqual(r.waterAgain.carry,r.middle.carry);
  assert.deepEqual(r.waterAgain.beads.instances,r.middle.beads.instances,'Returned Water view restores every paused transport instance coefficient');
  assert.deepEqual(r.follow.beads.flow,r.middle.beads.flow,'View changes preserve captured liquid seeds, coverage and progress');
  assert.deepEqual(r.waterAgain.beads.flow,r.middle.beads.flow);
  await resume();await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-phase-handoff').userData.progress>=.84);await pause();await draw();r.late=await sample();r.lateProof=validate(r.late,r.source,'Late Water assembly');
  assert(r.late.beads.flow.progress.every((v,n)=>v>=r.middle.beads.flow.progress[n])&&r.lateProof.progressRange[1]>r.middleProof.progressRange[1],'Genuine late cloud time advances staged droplet transport monotonically');
  const instanceScale=(values,n)=>Math.hypot(values[n*16],values[n*16+1],values[n*16+2]);
  assert(r.late.beads.flow.progress.some((q,n)=>q>.9&&r.late.beads.flow.coverage[n]>.01&&instanceScale(r.late.beads.instances,n)<instanceScale(r.middle.beads.instances,n)),'Droplets approaching cloud arrival taper below their earlier visible size');
  pass('Original-kernel6-hit thaw and warm-cloud replay retain the actually displayed Water droplet shape, normalized first-frame size and interrupted melting mask');
  pass('Actual native drawn mask,192instance coefficients and model-view uniforms, exact pause and Water/Follow/Water controls preserve source descriptors and pooled resources');
  pass('Genuine advancing cloud time stages liquid transport monotonically and tapers arriving droplets');
  await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.phaseHandoff==='hidden');await pause();await draw();r.expired=await sample();clear(r.expired);assert(r.expired.form==='cloud');assert.deepEqual(r.expired.depth,r.follow.depth);
  await page.emulateMedia({reducedMotion:'reduce'});await trigger('assemblyThaw',{cameraMode:'water'});r.reducedWaitActual=await waitForSurface();await page.evaluate(()=>{window.assemblySourceProof=null;window.assemblyCaptureArmed=true;});await driveTransition('assemblyWarmCloud');await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await draw();r.reducedSource=await page.evaluate(()=>assemblySourceProof);assert(r.reducedSource,'The reduced native boundary must supply its displayed source');r.reduced=await sample();r.reducedProof=validate(r.reduced,r.reducedSource,'Reduced first assembly',{first:true});
  await proceed();await page.waitForFunction(steps=>rainCloudDepthTotalSteps>steps+5,r.reduced.steps);await pause();await draw();r.reducedLater=await sample();r.reducedLaterProof=validate(r.reducedLater,r.reducedSource,'Held reduced assembly');
  assert(r.reducedLater.steps>r.reduced.steps&&r.reducedLater.group.data.progress===.5);assert.deepEqual(r.reducedLater.ghost.scale,r.reduced.ghost.scale);assert.deepEqual(r.reducedLater.carry,r.reduced.carry);assert.deepEqual(r.reducedLater.beads.instances,r.reduced.beads.instances);assert.deepEqual(r.reducedLater.beads.flow,r.reduced.beads.flow);
  await click('Reset this run and start again as liquid water');await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');await pause();r.reset=await sample();clear(r.reset);
  await restore('assemblyRestoredCloud',{cameraMode:'water',pauseAtChanges:false});await draw();r.restored=await sample();clear(r.restored);assert.equal(r.restored.form,'cloud');
  r.evidence={first:r.firstProof,middle:r.middleProof,follow:r.followProof,waterAgain:r.waterProof,late:r.lateProof,reduced:r.reducedProof,reducedLater:r.reducedLaterProof,sourceSelection:r.source.source.name,followPositionError:positionError,
    originalKernelRoute:r.journey.scope,nativeScope:'Native rendering resumes the genuine6-hit pre-thaw checkpoint, replays its original thaw receipt,40exact saved no-hit assist inputs and warm-hit receipt with no intervening restore, then advances cloud assembly through actual model time. Upstream rendered-mote collision acceptance is not native-tested.',
    framing:'Three production-camera native PNGs use a declared520px canvas height; no camera orbit, phase, mass, altitude, material opacity or source matrix is substituted for imagery.',reducedSteps:[r.reduced.steps,r.reducedLater.steps],resourcePoolStable:true,activeReset:true,restoredCloudClear:true};
  pass('Normal expiry, held reduced motion with advancing genuine model steps, active reset and restored cloud clear or retain exactly the appropriate source memory');
};
exports.analyze=function({d,checks,ok,root,out,reportRoot,fs,path,assert}){
  const r=d.cloudAssemblyFlow,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);ok(!!r,'The requested isolated assembly-source native section executed');
  ok(d.browsersClosed&&d.browserTempCleaned,'Native browser closed and only its verified owned temporary profile was removed');
  const gaps=r.journey.hits.slice(1).map((h,n)=>h.elapsed-r.journey.hits[n].elapsed);
  ok(r.journey.iceHits===6&&r.journey.warmHits===1&&r.journey.formation.after.mass<2.4&&Math.min(...gaps)>=.6&&r.journey.hits.every(h=>h.cooldown===0),'Original-kernel fixture reaches natural thaw and stable warm-cloud assembly through6 cooldown-respecting ice hits');
  ok(['assemblyThaw','assemblyWarmCloud'].every(name=>{const row=d.receipts.find(i=>i.name===name),saved=name==='assemblyThaw'?r.journey.thaw:r.journey.formation;return row&&row.receipt.from===saved.before.form&&row.receipt.to===saved.after.form&&row.receipt.elapsed===saved.after.elapsed&&row.actual.some(a=>a.from===saved.before.form&&a.to===saved.after.form&&['dt','thrust','sunlit','surface','nucleusHit','dropletHit'].every(k=>a.input[k]===saved.input[k]));}),'Native rendering replays genuine thaw and warm-hit input receipts without restoring away the live melting cue');
  ok(r.journey.waitInputs.length===40&&[r.waitActual,r.reducedWaitActual].every(actual=>actual.length===40&&actual.every((row,n)=>row.after.form==='droplet'&&row.after.elapsed===r.journey.waitInputs[n].after.elapsed&&row.after.mass===r.journey.waitInputs[n].after.mass&&row.after.altitudeM===r.journey.waitInputs[n].after.altitudeM&&['dt','thrust','sunlit','surface','nucleusHit','dropletHit'].every(k=>row.input[k]===r.journey.waitInputs[n].input[k]))),'Both native routes consume all40saved genuine no-hit thaw inputs below the cloud threshold');
  ok(r.source.melt.coverageRange[0]<.99&&r.source.melt.coverageRange[1]>.01&&r.first.beads.flow.coverage.some(x=>x>.01)&&r.first.beads.instances.some((x,n)=>n%16===0&&x>0),'The genuine native thaw surface is partially liquid and emits visible nonzero transport droplets');
  ok(r.source.source.name==='pilot-phase-incoming-droplet'&&r.source.source.effective&&r.source.melt.active===1&&r.firstProof.sourceError<1e-8&&r.firstProof.normalizedSourceProgress===0&&r.first.ghost.opacity===.48,'The actual displayed partially melted Water source retains its complete first-frame world linear transform and normalized size');
  const proofs=[r.firstProof,r.middleProof,r.followProof,r.waterProof,r.lateProof,r.reducedProof,r.reducedLaterProof];ok(proofs.every(p=>p.mapError<1e-8&&p.uploadError<.00005&&p.viewError<.00005&&p.draws>0),'Actual drawn native model-view and carried-melt matrix uniform uploads match their source-bound CPU values');
  ok(proofs.every(p=>p.instanceUploadError===0&&p.beadViewError<.00005&&p.beadDraws>0),'Every sampled native droplet draw uploads all192production instance coefficients exactly and the correct parent/model-view transform');
  const visual=s=>{const c=structuredClone(s);delete c.gpu;delete c.draws;delete c.beads.gpu;delete c.beads.draws;return c;};ok(same(visual(r.paused),visual(r.first)),'Paused native source state is exact except append-only GPU telemetry');
  ok(r.middleProof.normalizedSourceProgress>0&&r.middle.ghost.opacity<r.first.ghost.opacity&&same(r.middle.carry,r.follow.carry)&&same(r.follow.carry,r.waterAgain.carry)&&same(r.first.geometry,r.follow.geometry)&&same(r.first.materials,r.follow.materials)&&r.evidence.followPositionError<1e-7,'Cloud assembly thins its actual source while official Water and Follow controls preserve the carried front, physical source position and existing resource pools');
  ok(same(r.middle.beads.instances,r.waterAgain.beads.instances)&&same(r.middle.beads.flow,r.follow.beads.flow)&&same(r.follow.beads.flow,r.waterAgain.beads.flow),'Official Water/Follow/Water view controls preserve captured source seeds and restore every paused Water instance coefficient');
  const flowStates=[r.first,r.middle,r.follow,r.waterAgain,r.late,r.reduced,r.reducedLater];ok(flowStates.every(s=>s.beads.pooled&&s.beads.count===12&&s.beads.instances.length===192&&s.beads.instances.every(Number.isFinite)&&s.beads.flow.seeds.length===36&&s.beads.flow.coverage.length===12&&s.beads.flow.progress.length===12),'All sampled12droplet draws retain finite pooled instance matrices, source seeds, coverage and progress arrays');
  ok(flowStates.every(s=>s.beads.flow.coverage.every(x=>x>=0&&x<=1)&&s.beads.flow.progress.every(x=>x>=0&&x<=1))&&same(r.first.beads.flow.seeds,r.late.beads.flow.seeds)&&same(r.first.beads.flow.coverage,r.late.beads.flow.coverage),'Source liquid coverage stays bounded and immutable through genuine advancing transport');
  const scale=(values,n)=>Math.hypot(values[n*16],values[n*16+1],values[n*16+2]);ok(r.late.beads.flow.progress.every((q,n)=>q>=r.middle.beads.flow.progress[n])&&r.lateProof.progressRange[1]>r.middleProof.progressRange[1]&&r.late.beads.flow.progress.some((q,n)=>q>.9&&r.late.beads.flow.coverage[n]>.01&&scale(r.late.beads.instances,n)<scale(r.middle.beads.instances,n)),'Genuine late cloud time advances each staggered droplet monotonically and visibly tapers arriving liquid');
  ok(r.reducedLater.steps>r.reduced.steps&&same(r.reduced.ghost.scale,r.reducedLater.ghost.scale)&&same(r.reduced.carry,r.reducedLater.carry)&&same(r.reduced.beads.instances,r.reducedLater.beads.instances)&&same(r.reduced.beads.flow,r.reducedLater.beads.flow),'Reduced motion holds captured source, mask and all droplet transport instances while genuine model steps advance');
  const clear=s=>!s.group.visible&&!s.ghost.data.sourceSnapshot&&s.carry.active===0&&s.carry.progress===0&&s.ghost.data.assemblySourceProgress.value===0&&!s.beads.visible&&!s.beads.flow.active&&[...s.beads.flow.seeds,...s.beads.flow.coverage,...s.beads.flow.progress].every(x=>x===0);ok(clear(r.expired)&&clear(r.reset)&&clear(r.restored),'Expiry, active reset and restored cloud clear the source descriptor, carried-front memory and pooled transport arrays');
  const captures=d.captures.map(name=>{const file=path.join(out,name+'.png'),b=fs.readFileSync(file);assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));return{name,path:path.relative(root,file),sourceSha256:d.sourceSha256,width:b.readUInt32BE(16),height:b.readUInt32BE(20)};});
  ok(captures.length===3&&captures.every(c=>c.name.startsWith('cloud-assembly-flow-')&&c.height===520),'Three source-bound production-camera native PNGs retain the declared520px canvas height');
  const earlier=path.join(reportRoot,'hook-preflight','results.json'),rawAttempts=fs.existsSync(earlier)?[(()=>{const old=JSON.parse(fs.readFileSync(earlier,'utf8'));return{report:path.relative(root,earlier),sourceSha256:old.sourceSha256,success:old.success,captures:old.captures,browsersClosed:old.browsersClosed,browserTempCleaned:old.browserTempCleaned,harnessError:old.harnessError,scope:'The initial harness hook sampled during checkpoint replay while React replaced its canvas. It was restricted to an explicitly armed, connected native warm-cloud boundary before this successful rerun; production source stayed unchanged.'};})()]:[];
  const heavyPath=path.join(reportRoot,'heavy-immediate-preflight.json');if(fs.existsSync(heavyPath)){const heavy=JSON.parse(fs.readFileSync(heavyPath,'utf8'));rawAttempts.push({report:path.relative(root,heavyPath),sourceSha256:heavy.sourceSha256,browserLaunched:false,waitSupported:heavy.waitSupported,from:heavy.before.form,to:heavy.after.form,input:heavy.input,scope:heavy.scope});}
  const summary={success:true,sourceSha256:d.sourceSha256,browsersClosed:true,browserTempCleaned:true,checks,captures,report:path.relative(root,path.join(out,'results.json')),numericalEvidence:{...r.evidence,minimumHitGap:Math.min(...gaps)},validationScope:{native:r.evidence.nativeScope,framing:r.evidence.framing},rawAttempts,errors:[]};
  fs.writeFileSync(path.join(reportRoot,'qa-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({success:true,checks:checks.length,captures:captures.length,numericalEvidence:summary.numericalEvidence},null,2));
};
if(require.main===module&&process.argv.includes('--fixture')){
  const root=process.cwd(),source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js'),'utf8'),journey=exports.fixture(source),folder=path.join(root,'reports/watercycle-pilot-cloud-assembly-flow');
  fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'fixtures.json'),JSON.stringify(journey,null,2)+'\n');
  const heavy=require('./watercycle_pilot_cloud_assembly_source_checks.cjs').fixture(source),begin=source.indexOf('  var WC_PILOT_UNIT_M ='),at=source.indexOf('  window.WaterCyclePilotKernel = {'),end=source.indexOf('\n  };',at);
  const probe=function(K,heavy){const env=K.environment('temperateCoast'),before=heavy.thaw.after,input={dt:.016,thrust:K.assistControls(before,env,{x:before.x,z:before.z,altitudeM:before.altitudeM},{x:before.x,z:before.z,altitudeM:env.freezingM-80},0,{enabled:true,paused:false,manual:false}).thrust,sunlit:true,surface:'water',nucleusHit:false,dropletHit:false};return{before,input,after:K.step(before,input)};};
  const failedWait=vm.runInNewContext(source.slice(begin,end+'\n  };'.length)+'\n('+probe.toString()+')(window.WaterCyclePilotKernel,heavy);',{window:{},heavy});
  fs.writeFileSync(path.join(folder,'heavy-immediate-preflight.json'),JSON.stringify({sourceSha256:journey.sourceSha256,attempt:'13cold-hit thaw with a saved no-hit wait',waitSupported:false,...failedWait,scope:'Pure preflight only, no browser/GPU launched. The unchanged kernel automatically assembles14droplets into cloud on the first no-hit step after thaw, so this route cannot expose a partially melted surface before assembly. The successful native fixture uses6cold hits, waits below the8droplet threshold, then collects once.'},null,2)+'\n');
  console.log(JSON.stringify({success:journey.success,sourceSha256:journey.sourceSha256,steps:journey.steps,mass:journey.formation.after.mass,minimumHitGap:journey.minimumHitGap}));
}
