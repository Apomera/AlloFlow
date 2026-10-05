'use strict';
// Root-only runner: one serial browser, four fresh views of naturally spawned actors.
// Native keyboard handlers provide the approach and camera controls. No actor,
// visibility, camera transform, or game-state field is written by this runner.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
function arg(name,fallback){return process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;}
const repo=path.resolve(arg('repo','C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated'));
const source=path.resolve(arg('source',path.join(repo,'stem_lab/stem_tool_cephalopodlab.js')));
const out=path.resolve(arg('out',path.join(repo,'reports/cephalopod-hunter-enhancement/pass-thirty-four/current-views')));
const expectedSHA=arg('sha',''),canonical='stem_lab/stem_tool_cephalopodlab.js';
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceSHA=sha(source);if(expectedSHA)assert.equal(sourceSHA,expectedSHA,'Capture source must match the root-approved final source');
const requireRepo=createRequire(path.join(repo,'package.json')),{chromium}=requireRepo('playwright'),esbuild=requireRepo('esbuild');
fs.mkdirSync(out,{recursive:true});process.chdir(repo);
const generated=path.join(out,'natural-harness.generated.cjs');
esbuild.buildSync({entryPoints:[path.join(repo,'tests/e2e/helpers/stem_gl_harness.ts')],bundle:true,platform:'node',format:'cjs',outfile:generated,external:['@playwright/test']});
const {GlHarness,looksBlank}=require(generated);
const profiles=[
  {name:'squid-approach-desktop',species:'humboldtSquid',quality:'balanced',width:1280,height:1000,touch:false,actions:[{frames:20,codes:[]},{frames:16,codes:['KeyW','Space']},{frames:4,codes:[]}]},
  {name:'squid-approach-phone',species:'humboldtSquid',quality:'low',width:390,height:844,touch:true,actions:[{frames:20,codes:[]},{frames:16,codes:['KeyW','Space']},{frames:4,codes:[]}]},
  {name:'squid-narrow-phone',species:'humboldtSquid',quality:'low',width:320,height:568,touch:true,actions:[{frames:20,codes:[]}]},
  {name:'squid-landscape-phone',species:'humboldtSquid',quality:'low',width:844,height:390,touch:true,actions:[{frames:20,codes:[]}]},
];
profiles.splice(2);
async function raf(page,n=3){await page.evaluate(async n=>{for(let i=0;i<n;i++)await new Promise(resolve=>requestAnimationFrame(resolve));},n);}
async function mount(page,harness,profile){
  await page.goto(harness.url+'/__harness');
  await page.waitForFunction(()=>!!window.THREE?.Clock&&typeof window.__mount==='function');
  await page.evaluate(profile=>{
    const w=window,T=w.THREE,meta=document.createElement('meta');meta.name='viewport';meta.content='width=device-width, initial-scale=1';document.head.appendChild(meta);
    document.getElementById('wrap').style.width='100%';
    localStorage.setItem('allo.cephalopodlab.a11y.v1',JSON.stringify({colorPalette:'default',highContrast:false,captionMode:false,reducedMotion:false,largeText:false}));
    w.__captureTicks=0;w.__captureStep=0;w.__capturePaused=false;w.__captureCodes=[];w.__captureDraws={fish:0,kelp:0,grass:0};w.__capturePlantSubmissions={};
    function key(type,code){document.querySelector('canvas[role=application]').dispatchEvent(new KeyboardEvent(type,{code,key:code==='Space'?' ':code.slice(3).toLowerCase(),bubbles:true,cancelable:true}));}
    function pause(){
      const canvas=document.querySelector('canvas[role=application]');
      const veil=[...canvas.parentElement.children].filter(el=>el.children.length===3&&el.children[1].textContent==='Paused'&&el.children[2].textContent==='Press Esc to resume');
      if(veil.length!==1)throw Error('Expected exactly one ordinary native pause veil');
      veil[0].style.visibility='hidden';key('keydown','Escape');w.__capturePaused=!w.__capturePaused;
    }
    T.Clock.prototype.getDelta=function(){
      const dt=w.__captureStep;w.__captureStep=0;
      if((dt>0&&w.__capturePaused)||(dt===0&&!w.__capturePaused))pause();
      if(dt>0){w.__captureCodes.forEach(code=>key('keydown',code));w.__captureTicks++;queueMicrotask(()=>{if(!w.__capturePaused)pause();});}
      return dt;
    };
    const Original=T.WebGLRenderer;
    T.WebGLRenderer=new Proxy(Original,{construct(target,args,newTarget){
      const renderer=Reflect.construct(target,args,newTarget),render=renderer.render;
      renderer.render=function(scene,camera){if(scene?.isScene)w.__captureCamera=camera;return render.apply(this,arguments);};return renderer;
    }});
    w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:profile.species,huntMode:'observe',huntSeed:2741,huntQuality:profile.quality,_threeLoaded:true}});
  },profile);
  await page.waitForFunction(()=>window.__glRecorder.records.some(r=>r.scene?.getObjectByName('cl-player')&&r.canvas.isConnected&&r.draws>0));
  await page.evaluate(()=>{
    const w=window,rec=w.__glRecorder.records.filter(r=>r.scene&&r.canvas.isConnected).at(-1),scene=rec.scene;
    w.__captureScene=scene;w.__capturePlayer=scene.getObjectByName('cl-player');
    w.__captureFish=scene.children.filter(o=>o.name==='cl-prey-fish'&&o.userData.alive);w.__capturePlants=scene.children.filter(o=>['cl-kelp','cl-seagrass'].includes(o.name));
    w.__captureResources=w.__capturePlants.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Object.values(mesh.geometry.attributes).map(a=>({attribute:a,array:a.array,version:a.version})),instance:mesh.instanceMatrix,instanceArray:mesh.instanceMatrix?.array,instanceVersion:mesh.instanceMatrix?.version}));
    for(const mesh of [...w.__captureFish.flatMap(fish=>fish.children.filter(child=>child.isMesh)),...w.__capturePlants]){
      const after=mesh.onAfterRender;mesh.onAfterRender=function(renderer,scene,camera,geometry,material,group){
        after.apply(this,arguments);const kind=mesh.name.startsWith('cl-fish-')?'fish':mesh.name==='cl-kelp'?'kelp':'grass';w.__captureDraws[kind]++;
        if(kind==='fish'||w.__capturePlantSubmissions[kind]?.tick===w.__captureTicks)return;
        const gl=renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM),location=gl.getUniformLocation(program,'clPlantMotion');
        if(location!==null)w.__capturePlantSubmissions[kind]={tick:w.__captureTicks,uniform:Array.from(gl.getUniform(program,location)),programLinked:gl.getProgramParameter(program,gl.LINK_STATUS),programKey:material.customProgramCacheKey(),mesh:mesh.name};
      };
    }
  });
  await page.locator('canvas[role=application]').focus();await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded();await raf(page,3);
}
async function advance(page,action){await page.evaluate(async action=>{
  const w=window;w.__captureCodes=action.codes;
  for(let frame=0;frame<action.frames;frame++){
    const before=w.__captureTicks;w.__captureStep=.05;
    for(let wait=0;wait<180&&w.__captureTicks===before;wait++)await new Promise(resolve=>requestAnimationFrame(resolve));
    if(w.__captureTicks!==before+1)throw Error('Each requested production step must be consumed exactly once');
  }
  w.__captureCodes=[];
},action);await raf(page,3);}
async function state(page){return page.evaluate(async()=>{
  const w=window,rec=w.__glRecorder.records.filter(r=>r.scene&&r.canvas.isConnected).at(-1),scene=rec.scene,camera=w.__captureCamera,canvas=rec.canvas,rect=canvas.getBoundingClientRect();scene.updateMatrixWorld(true);
  const world=[];scene.traverse(o=>{if(o!==camera&&!o.isLight&&!o.isCamera)world.push([o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible]);});
  const worldBytes=new TextEncoder().encode(JSON.stringify(world)),worldSHA256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',worldBytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  function box(el){const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}
  const ui={inputProfile:{maxTouchPoints:navigator.maxTouchPoints,coarse:matchMedia('(pointer: coarse)').matches,anyCoarse:matchMedia('(any-pointer: coarse)').matches,fine:matchMedia('(pointer: fine)').matches,anyFine:matchMedia('(any-pointer: fine)').matches,touchLayout:document.querySelector('.cl-hunt-stage').classList.contains('cl-hunt-touch-enabled'),clientWidth:canvas.clientWidth},stage:box(document.querySelector('.cl-hunt-stage')),hud:box(document.querySelector('.cl-hunt-hud')),mission:box(document.querySelector('.cl-hunt-mission')),dock:box(document.querySelector('.cl-hunt-touch')),prompt:box(document.querySelector('.cl-hunt-action-prompt')),promptText:document.querySelector('.cl-hunt-action-prompt').textContent,buttons:[...document.querySelectorAll('.cl-hunt-stage button')].map(b=>({text:b.textContent,...box(b)})).filter(b=>b.width&&b.height)};
  const fish=w.__captureFish.filter(f=>f.userData.alive),project=o=>{const p=o.position.clone().project(camera);return Number.isFinite(p.x+p.y+p.z)&&Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1;};
  const instances=w.__captureResources.every(r=>r.mesh.geometry===r.geometry&&r.mesh.material===r.material&&r.attributes.every(a=>a.attribute.array===a.array&&a.attribute.version===a.version)&&r.mesh.instanceMatrix===r.instance&&r.mesh.instanceMatrix?.array===r.instanceArray&&r.mesh.instanceMatrix?.version===r.instanceVersion);
  return {worldSHA256,worldNodes:world.length,ui,seed:2741,ticks:w.__captureTicks,seconds:w.__captureTicks*.05,paused:w.__capturePaused,player:w.__capturePlayer.position.toArray(),camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect,projectionFinite:camera.projectionMatrix.elements.every(Number.isFinite)},
    canvas:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,aspect:rect.width/rect.height,fitsViewport:rect.x>=-.5&&rect.y>=-.5&&rect.right<=innerWidth+.5&&rect.bottom<=innerHeight+.5},
    prey:{alive:fish.length,inFrustum:fish.filter(project).length,alert:fish.filter(f=>f.userData.alert).length,intents:Object.fromEntries(['unaware','wary','fleeing','settling'].map(intent=>[intent,fish.filter(f=>f.userData.intent===intent).length])),firstSchool:fish.slice(0,8).map(f=>({position:f.position.toArray(),yaw:f.rotation.y,awareness:f.userData.awareness,intent:f.userData.intent}))},
    plants:{count:w.__capturePlants.length,submitted:w.__capturePlantSubmissions,staticResourcesRetained:instances},
    native:{pageCreated:rec.creator.length>0,lost:rec.ctx.isContextLost(),draws:rec.draws,renders:rec.renders,observedDraws:{...w.__captureDraws}},readouts:{time:document.querySelector('[data-hud=time]')?.textContent,target:document.querySelector('[data-target=action]')?.textContent}};
});}
(async()=>{
  const original=process.env.STEM_GL_SUBSTITUTE;let browser=null,harness=null;const results=[];
  try{
    process.env.STEM_GL_SUBSTITUTE=canonical+'='+source;browser=await chromium.launch({headless:true,args:['--disable-audio-output']});
    harness=new GlHarness({toolFile:canonical,toolId:'cephalopodLab',width:900,height:1000,layout:'document'});await harness.start();
    for(const profile of profiles){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch,isMobile:profile.touch,deviceScaleFactor:1}),page=await context.newPage(),errors=[];page.setDefaultTimeout(90000);
      page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
      try{
        console.log('Capturing '+profile.name);await mount(page,harness,profile);const snapshots=[];
        for(const action of profile.actions){await advance(page,action);snapshots.push(await state(page));}
        const current=snapshots.at(-1),served=await page.evaluate(async canonical=>{const bytes=await(await fetch('/'+canonical)).arrayBuffer();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');},canonical);
        assert.equal(served,sourceSHA);assert.equal(current.paused,true);assert.equal(current.native.pageCreated,true);assert.equal(current.native.lost,false);assert.ok(current.native.draws>0);assert.equal(current.camera.projectionFinite,true);assert.ok(Math.abs(current.camera.aspect-current.canvas.aspect)<.00001);assert.equal(current.plants.staticResourcesRetained,true);
        assert.ok(Object.keys(current.plants.submitted).length>0,'At least one actual native plant program must submit');assert.ok(Object.values(current.plants.submitted).every(p=>p.programLinked&&p.uniform.length===4&&p.uniform.every(Number.isFinite)));
        if(profile.name.includes('approach')){assert.ok(Math.hypot(...current.player.map((v,i)=>v-snapshots[0].player[i]))>4,'Native approach must move the real player');assert.ok(current.prey.alert>0,'Natural jet approach must actually alarm existing prey');}
        const screenshot=profile.name+'.png',glScreenshot=profile.name+'-gl.png';await page.screenshot({path:path.join(out,screenshot)});const pixels=await harness.glPixels(page);assert.ok(pixels&&!looksBlank(pixels));fs.writeFileSync(path.join(out,glScreenshot),pixels.png);
        const frozen=await state(page);await raf(page,5);const held=await state(page);assert.deepEqual(held.prey,frozen.prey,'Paused capture must freeze real prey');assert.deepEqual(held.player,frozen.player);assert.deepEqual(held.plants.submitted,frozen.plants.submitted);
        await harness.unmount(page);const leaks=await harness.leakedAfterUnmount(page);assert.deepEqual(leaks,[]);assert.deepEqual(errors,[]);
        results.push({profile,sha256:served,snapshots,screenshot,glScreenshot,pixels:{width:pixels.width,height:pixels.height,significantColors:pixels.significantColors,distinctColors:pixels.distinctColors,dominantShare:pixels.dominantShare},leaks,errors});
        fs.writeFileSync(path.join(out,'captures.partial.json'),JSON.stringify(results,null,2)+'\n');
      }catch(error){
        const diagnostics=await page.evaluate(()=>({
          records:window.__glRecorder.records.map(r=>({connected:r.canvas?.isConnected,lost:r.ctx?.isContextLost(),draws:r.draws,renders:r.renders})),
          stageText:document.querySelector('.cl-hunt-stage')?.textContent,
          canvasCount:document.querySelectorAll('canvas[role=application]').length,
          ticks:window.__captureTicks,paused:window.__capturePaused
        })).catch(e=>({diagnosticError:e.message}));
        fs.writeFileSync(path.join(out,profile.name+'-failure.json'),JSON.stringify({profile,sourceSHA256:sourceSHA,message:error.message,errors,diagnostics},null,2)+'\n');
        throw error;
      }finally{await harness.destroy(page);await context.close();}
    }
    assert.equal(sha(source),sourceSHA,'Runtime source must remain unchanged throughout captures');
    const manifest={version:1,sourceSHA256:sourceSHA,scope:'Two natural seed2741 squid views at exact requested .05-second ticks. Approach uses ordinary W/Space handlers. Native Escape pause holds all captures; only its veil is hidden. One whole-stage scroll at entry; no actor, actor visibility, camera pose or game-state fields are written. Four PNGs retain DOM and overlay-free native GL views. Served source SHA, world transform SHA, camera pose and canvas projection are recorded for comparison with a separate baseline run. Responsive projection/layout changes are intentional. No hardware FPS claim.',results};
    fs.writeFileSync(path.join(out,'capture-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({sourceSHA256:sourceSHA,views:results.map(r=>({name:r.profile.name,prey:r.snapshots.at(-1).prey.intents,plantPrograms:Object.keys(r.snapshots.at(-1).plants.submitted)})),errors:[]}));
  }catch(error){fs.writeFileSync(path.join(out,'capture-failure.json'),JSON.stringify({message:error.message,stack:error.stack,results},null,2)+'\n');throw error;}
  finally{if(harness)await harness.stop();if(browser)await browser.close();if(original===undefined)delete process.env.STEM_GL_SUBSTITUTE;else process.env.STEM_GL_SUBSTITUTE=original;}
})().catch(error=>{console.error(error);process.exitCode=1;});
