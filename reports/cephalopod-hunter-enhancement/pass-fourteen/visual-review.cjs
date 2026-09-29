const fs=require('fs'),path=require('path'),assert=require('assert'),{chromium}=require('playwright');
const generated=path.join(__dirname,'capture-harness.generated.cjs');
require('esbuild').buildSync({entryPoints:[path.resolve(__dirname,'../../../tests/e2e/helpers/stem_gl_harness.ts')],bundle:true,platform:'node',format:'cjs',outfile:generated,external:['@playwright/test']});
const {GlHarness}=require(generated),initial=process.argv.includes('--initial'),prefix=initial?'initial-':'';
async function captureRockPattern(page,initial,prefix,captures,harnessUrl){
  await page.setViewportSize({width:1280,height:1100});
  // Load the existing harness URL, then install the clock before __mount.
  // Its HTML loads vendored Three before registering the tool. Starting here
  // avoids an uncontrolled first second changing the initial tint or pose.
  await page.goto(harnessUrl);
  await page.waitForFunction(()=>!!window.THREE?.Clock&&!!window.StemLab?._registry?.cephalopodLab&&typeof window.__mount==='function');
  await page.evaluate(()=>{
    const w=window;w.__rockCaptureDelta=0;w.__rockCaptureTicks=0;w.__rockCaptureElapsed=0;
    w.THREE.Clock.prototype.getDelta=function(){const dt=w.__rockCaptureDelta;w.__rockCaptureDelta=0;if(dt>0){w.__rockCaptureTicks++;w.__rockCaptureElapsed+=dt;}return dt;};
    w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'cuttlefish',huntMode:'observe',huntSeed:2741,huntQuality:'balanced',_threeLoaded:true}});
  });
  const canvas=page.locator('canvas[role=application]');await canvas.waitFor({state:'visible'});
  await page.waitForFunction(()=>{const w=window,record=w.__glRecorder?.records.filter(row=>row.scene&&row.canvas.isConnected).at(-1);return !!record?.scene.getObjectByName('cl-player')&&!!w.__glCanvas?.()&&!w.__glCanvas().gl.isContextLost();});
  const route=await page.evaluate(async()=>{
    const w=window,T=w.THREE;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const scene=w.__glRecorder.records.filter(row=>row.scene&&row.canvas.isConnected).at(-1).scene,root=scene.getObjectByName('cl-player');
    const rocks=scene.children.filter(o=>o.isMesh&&o.userData.substrate==='rock');
    const corals=scene.children.filter(o=>o.isMesh&&o.userData.substrate==='coral'&&o.userData.reefPlacementValid!==false);
    const grass=scene.children.filter(o=>o.isInstancedMesh&&o.userData.substrate==='grass');
    const start={x:root.position.x,z:root.position.z},candidates=[];
    function segmentDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length)):0;return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
    rocks.forEach((rock,index)=>{
      const r=rock.userData.substrateRadius||1,collision=r*.62+.22,distance=(collision+r)/2;
      if(distance-collision<.08||r-distance<.08)return;
      const toward=Math.atan2(start.x-rock.position.x,start.z-rock.position.z);
      for(let angleIndex=0;angleIndex<16;angleIndex++){
        const angle=toward+angleIndex*Math.PI/8,target={x:rock.position.x+Math.sin(angle)*distance,z:rock.position.z+Math.cos(angle)*distance};
        const routeLength=Math.hypot(target.x-start.x,target.z-start.z);if(routeLength>12||routeLength<.25)continue;
        // Mirror the actual XZ detection precedence at the intended endpoint.
        const nearest=rocks.concat(corals).filter(o=>Math.hypot(o.position.x-target.x,o.position.z-target.z)<(o.userData.substrateRadius||1)).sort((a,b)=>Math.hypot(a.position.x-target.x,a.position.z-target.z)-Math.hypot(b.position.x-target.x,b.position.z-target.z))[0];
        if(nearest!==rock)continue;
        const grassCount=grass.filter(o=>Math.hypot(o.position.x-target.x,o.position.z-target.z)<1.5).length;
        if(grassCount>=3&&distance>1)continue;
        // A direct route must clear every actual rock collider; preserve all
        // geometry and let ordinary movement perform its own collision checks.
        if(rocks.some(o=>segmentDistance(o.position.x,o.position.z,start,target)<(o.userData.substrateRadius||1)*.62+.22+.025))continue;
        if(corals.some(o=>Math.hypot(o.position.x-target.x,o.position.z-target.z)<(o.userData.substrateRadius||1)+.35))continue;
        candidates.push({rockIndex:index,rockPosition:rock.position.toArray(),radius:r,collisionRadius:collision,angleIndex,target,routeLength,start:[start.x,start.z]});
      }
    });
    candidates.sort((a,b)=>a.routeLength-b.routeLength||a.rockIndex-b.rockIndex||a.angleIndex-b.angleIndex);
    if(!candidates.length)throw Error('Rock-pattern fixture: no clear reachable rock annulus at seed 2741');
    w.__rockCaptureScene=scene;w.__rockCaptureRoot=root;w.__rockCaptureRoute=candidates[0];
    const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}};
    root.getObjectByName('cl-mantle').material.onBeforeCompile(shader);w.__rockCaptureUniforms=shader.uniforms;
    if(!shader.uniforms.clPattern||!shader.uniforms.clPhase)throw Error('Rock-pattern fixture: missing live skin uniform references');
    return candidates[0];
  });
  async function step(dt,count){
    await page.evaluate(async({dt,count})=>{const w=window;
      for(let i=0;i<count;i++){const previous=w.__rockCaptureTicks;w.__rockCaptureDelta=dt;
        for(let frame=0;frame<120&&w.__rockCaptureTicks===previous;frame++)await new Promise(resolve=>requestAnimationFrame(resolve));
        if(w.__rockCaptureTicks!==previous+1||w.__rockCaptureDelta!==0)throw Error('Rock-pattern fixture: counted clock step was not consumed exactly once');
      }
    },{dt,count});
  }
  async function position(){return page.evaluate(()=>{const r=window.__rockCaptureRoot;return{x:r.position.x,z:r.position.z,yaw:r.rotation.y};});}
  const navigation=[];let arrived=false;
  await canvas.focus();
  for(let command=0;command<100;command++){
    const current=await position(),dx=route.target.x-current.x,dz=route.target.z-current.z,distance=Math.hypot(dx,dz);
    if(distance<.06){arrived=true;break;}
    const error=Math.atan2(Math.sin(Math.atan2(dx,dz)-current.yaw),Math.cos(Math.atan2(dx,dz)-current.yaw));
    // Live controls: A adds yaw, D subtracts yaw, both at 2 rad/s.
    // W advances along (sin(yaw), cos(yaw)); no strafing or transform edits.
    const turning=Math.abs(error)>.028,key=turning?(error>0?'KeyA':'KeyD'):'KeyW';
    const dt=turning||distance<.20?.025:.05;
    const count=turning?Math.max(1,Math.min(12,Math.round(Math.abs(error)/.05))):Math.max(1,Math.min(6,Math.floor(distance/.15)));
    await page.keyboard.down(key);try{await step(dt,count);}finally{await page.keyboard.up(key);}
    navigation.push({key,dt,count});
  }
  assert(arrived,'Rock-pattern fixture could not reach its real-input waypoint within 100 commands');
  await step(.05,60); // Three seconds stationary lets the ordinary color lerp settle.
  const detail=await page.evaluate(()=>{
    const w=window,root=w.__rockCaptureRoot,route=w.__rockCaptureRoute;
    const rocks=w.__rockCaptureScene.children.filter(o=>o.isMesh&&o.userData.substrate==='rock'),rock=rocks[route.rockIndex];
    const distance=Math.hypot(root.position.x-rock.position.x,root.position.z-rock.position.z);
    if(distance>=route.radius||distance<=route.collisionRadius)throw Error('Rock-pattern fixture ended outside its valid collision/detection annulus');
    if(w.__rockCaptureUniforms.clPattern.value!==.9)throw Error('Rock-pattern fixture failed live clPattern=0.9 assertion: '+w.__rockCaptureUniforms.clPattern.value);
    return{route,rootPosition:root.position.toArray(),rootQuaternion:root.quaternion.toArray(),tint:root.getObjectByName('cl-mantle').material.color.toArray(),pattern:w.__rockCaptureUniforms.clPattern.value,phase:w.__rockCaptureUniforms.clPhase.value,ticks:w.__rockCaptureTicks,elapsed:w.__rockCaptureElapsed};
  });
  detail.navigation=navigation;
  const fixturePath=path.join(__dirname,'cuttle-rock-fixture.json');
  if(initial)fs.writeFileSync(fixturePath,JSON.stringify(detail,null,2)+'\n');
  else assert.deepEqual(detail,JSON.parse(fs.readFileSync(fixturePath,'utf8')),'Rock route, counted pose, substrate, or simulation tint changed');
  await page.keyboard.press('KeyF');
  await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();
  await page.getByRole('button',{name:'Orbit right',exact:true}).click();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Higher',exact:true}).click();
  await page.waitForTimeout(250);
  const filename=prefix+'cuttlefish-rock-dorsal.png';await canvas.screenshot({path:path.join(__dirname,filename)});captures.push(filename);
  return detail;
}
(async()=>{
  const harness=new GlHarness({toolFile:initial?'reports/cephalopod-hunter-enhancement/pass-fourteen/baseline.generated.cjs':'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document'});await harness.start();
  const browser=await chromium.launch({headless:true}),errors=[],warnings=[],captures=[],details=[];let page;
  try{
    page=await browser.newPage({viewport:{width:1280,height:1100}});page.setDefaultTimeout(90000);
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('console',message=>{if(message.type()==='warning'&&/WebGL|context|shader|THREE/i.test(message.text()))warnings.push(message.text());});
    if(process.argv.includes('--rock-only')){
      const rockDetail=await captureRockPattern(page,initial,prefix,captures,harness.base+'/__harness');
      const result={errors,captures,rockDetail,fixture:'Cuttlefish navigates with ordinary A/D/W keys using counted clock steps from mount, settles on actual rock substrate, asserts clPattern=0.9, and enters ordinary dorsal inspection. Existing sand and coral captures are skipped.'};
      fs.writeFileSync(path.join(__dirname,prefix+'rock-capture-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({errors,captures}));if(errors.length)process.exitCode=1;
      return;
    }
    for(const species of ['cuttlefish','humboldtSquid']){
      await page.setViewportSize({width:1280,height:1100});
      await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:species,huntMode:'observe',huntSeed:2741,huntQuality:'balanced',_threeLoaded:true}});
      const canvas=page.locator('canvas[role=application]');await canvas.waitFor();await page.waitForFunction(()=>parseInt(document.querySelector('[data-hud=time]')?.textContent||'0')>=1);
      await canvas.focus();await page.keyboard.press('KeyF');
      await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Higher',exact:true}).click();await page.waitForTimeout(250);
      let file=prefix+species+'-surface.png';await canvas.screenshot({path:path.join(__dirname,file)});captures.push(file);
      if(species==='cuttlefish'){
        await page.getByRole('button',{name:'Closer',exact:true}).click();await page.getByRole('button',{name:'Closer',exact:true}).click();await page.waitForTimeout(250);
        file=prefix+'cuttlefish-surface-detail.png';await canvas.screenshot({path:path.join(__dirname,file)});captures.push(file);
        await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(250);
        file=prefix+'cuttlefish-phone.png';await canvas.screenshot({path:path.join(__dirname,file)});captures.push(file);
      }
    }
    const rockDetail=await captureRockPattern(page,initial,prefix,captures,harness.base+'/__harness');
    await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'commonOcto',huntMode:'observe',huntSeed:2741,huntQuality:'balanced',_threeLoaded:true}});
    await page.waitForFunction(()=>parseInt(document.querySelector('[data-hud=time]')?.textContent||'0')>=1);
    await page.evaluate(()=>{THREE.Clock.prototype.getDelta=function(){return 0;};});
    for(const form of ['finger','antler','corymbose']){
      const fixture=await page.evaluate(kind=>{
        const w=window,T=w.THREE,record=w.__glRecorder.records.filter(row=>row.scene&&row.canvas.isConnected).at(-1),scene=record.scene;
        scene.updateMatrixWorld(true);
        const colonies=scene.children.filter(mesh=>mesh.name==='cl-coral-colony'&&mesh.geometry.userData.growthForm===kind).sort((a,b)=>a.position.lengthSq()-b.position.lengthSq());
        if(!colonies.length)throw new Error('No coral form '+kind);
        const coral=colonies[0],box=new T.Box3().setFromObject(coral),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),distance=Math.max(1,size.y);
        const obstacles=[];scene.traverse(mesh=>{if(mesh.isMesh&&mesh!==coral&&mesh.visible&&mesh.material?.opacity!==0)obstacles.push(mesh);});
        const probes=[center,center.clone().add(new T.Vector3(0,size.y*.25,0)),center.clone().add(new T.Vector3(0,-size.y*.25,0))];
        const ray=new T.Raycaster();let cameraPosition=null,leastBlocked=Infinity;
        for(let step=0;step<16;step++){
          const angle=Math.atan2(1.15,1.75)+step*Math.PI/8,candidate=center.clone().add(new T.Vector3(Math.sin(angle)*2.09,.35,Math.cos(angle)*2.09).multiplyScalar(distance));
          let blocked=0;for(const target of probes){const direction=target.clone().sub(candidate);ray.set(candidate,direction.clone().normalize());ray.far=direction.length()*.98;blocked+=ray.intersectObjects(obstacles,false).length?1:0;}
          if(blocked<leastBlocked){leastBlocked=blocked;cameraPosition=candidate;}if(!blocked)break;
        }
        if(leastBlocked)throw new Error('No clear coral camera for '+kind);
        scene.onBeforeRender=function(renderer,renderedScene,camera){camera.position.copy(cameraPosition);camera.lookAt(center);camera.updateMatrixWorld(true);};
        return{form:kind,position:coral.position.toArray(),quaternion:coral.quaternion.toArray(),scale:coral.scale.toArray(),bounds:[box.min.toArray(),box.max.toArray()],camera:cameraPosition.toArray(),target:center.toArray()};
      },form);
      details.push(fixture);await page.waitForTimeout(250);
      const file=prefix+'coral-'+form+'-detail.png';await page.locator('canvas[role=application]').screenshot({path:path.join(__dirname,file)});captures.push(file);
    }
    const fixturePath=path.join(__dirname,'surface-detail-fixture.json');
    if(initial)fs.writeFileSync(fixturePath,JSON.stringify(details,null,2)+'\n');else assert.deepEqual(details,JSON.parse(fs.readFileSync(fixturePath,'utf8')),'Coral identity/geometry or diagnostic camera changed');
    const result={errors,captures,details,rockDetail,rockFixture:'Separate cuttlefish rock view uses ordinary A/D/W navigation with counted 0.025/0.05 second steps from mount, three seconds stationary, live clPattern=0.9, then normal F/Orbit right/Higher×3 inspection. No model/light/material/visibility/transform overrides.',fixture:'Cuttlefish/Humboldt ordinary paused inspection using standard labels/orbit/higher/closer controls; phone viewport390×844. Coral detail uses camera-only unobstructed views of the closest seeded colony of each existing growth form, with original lights/fog/materials/visibility.'};
    fs.writeFileSync(path.join(__dirname,prefix+'capture-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({errors,captures}));if(errors.length)process.exitCode=1;
  }catch(error){let diagnostic;try{diagnostic=await page?.evaluate(()=>({toolState:window.__toolData?.cephalopodLab,contexts:window.__glRecorder?.records.map(row=>({connected:row.canvas.isConnected,lost:row.gl?.isContextLost?.()})),visibleText:document.body.innerText.slice(0,2000)}));}catch{}fs.writeFileSync(path.join(__dirname,prefix+'capture-failure.json'),JSON.stringify({message:error.message,errors,warnings,captures,diagnostic},null,2)+'\n');throw error;}finally{await browser.close();await harness.stop();}
})().catch(error=>{console.error(error);process.exitCode=1;});
