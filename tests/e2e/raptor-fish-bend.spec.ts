import {test,expect} from '@playwright/test';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_FISH_SCREENSHOTS||resolve('scratch/raptor-fish-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const baselinePath=process.env.RAPTOR_FISH_BASELINE||resolve('../round21/baseline/stem_lab/stem_tool_raptorhunt.js');
const baseline=existsSync(baselinePath)?readFileSync(baselinePath,'utf8'):null;
function body(text:string,name:string){const start=text.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=text.indexOf('{',start),depth=1;while(depth){end++;if(text[end]==='{')depth++;if(text[end]==='}')depth--;}return text.slice(start,end+1);}
const currentFactory=`(()=>{${['preyKindFor','bendFishPreyGeometry','createFishBodyGeometry','createFishFinGeometry','advanceFishSwim','applyFishSwim','buildPreyVisual'].map(name=>body(source,name)).join('\n')}return {build:buildPreyVisual,advance:advanceFishSwim,apply:applyFishSwim};})()`;
const baselineFactory=baseline?`(()=>{${['preyKindFor','createFishBodyGeometry','createFishFinGeometry','buildPreyVisual'].map(name=>body(baseline,name)).join('\n')}return {build:buildPreyVisual};})()`:'null';
const probes=`window.AlloPostFXEnabled=false;window.fishReview=${currentFactory};window.fishBaseline=${baselineFactory};(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.fishRenderer=r;r.render=function(scene,camera){window.fishScene=scene;window.fishCamera=camera;if(!window.skipFishRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor continuous fish body bend',()=>{
  test.describe.configure({timeout:180000,retries:0});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
  test.afterAll(async()=>{await harness.stop();});
  test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:1320,height:1100});
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).stepFish=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,quality='balanced')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'baldEagle',activeMission:'open',flightSession:{speciesId:'baldEagle',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  function recordErrors(page:any){const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});return errors;}

  test('shows the previous fish beside refined neutral and opposite body flexes',async({page},testInfo)=>{
    test.skip(!baseline,'Set RAPTOR_FISH_BASELINE to the previous tool source for the historical visual comparison.');
    const errors=recordErrors(page);await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const study=await page.evaluate(()=>{
      const w=window as any,T=w.THREE;
      const panel=document.createElement('section');panel.id='fish-study';panel.style.cssText='position:fixed;left:16px;top:16px;width:1280px;height:440px;z-index:99999;border:1px solid #537080;border-radius:12px;overflow:hidden;background:#15323a';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1280,440);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const models=[w.fishBaseline.build({id:'fish',color:0x60a5fa},2),...Array.from({length:3},()=>w.fishReview.build({id:'fish',color:0x60a5fa},2))];
      const bounds=new T.Box3();models.forEach((model:any,col:number)=>{if(col>0){model.swim.tailYaw=col===2?.305*.8:col===3?-.305*.8:0;w.fishReview.apply(model);}model.root.updateMatrixWorld(true);bounds.union(new T.Box3().setFromObject(model.root));});
      const center=bounds.getCenter(new T.Vector3()),radius=bounds.getSize(new T.Vector3()).length()*.5,camera=new T.PerspectiveCamera(30,320/440,.05,100),verticalHalf=30*Math.PI/360,horizontalHalf=Math.atan(Math.tan(verticalHalf)*camera.aspect),distance=radius/Math.sin(Math.min(verticalHalf,horizontalHalf))*1.18;
      camera.position.copy(center).add(new T.Vector3(4.7,1.5,2.8).normalize().multiplyScalar(distance));camera.lookAt(center);camera.updateMatrixWorld(true);
      const projectedCorners:any[]=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projectedCorners.push(new T.Vector3(x,y,z).project(camera).toArray());
      const evidence:any[]=[],scenes:any[]=[];
      models.forEach((model:any,col:number)=>{
        const scene=new T.Scene();scene.background=new T.Color(0x15323a);scene.add(new T.HemisphereLight(0xe3f8ff,0x405853,.85));
        const key=new T.DirectionalLight(0xffe5c6,1.4);key.position.set(4,5,4);scene.add(key);const rim=new T.DirectionalLight(0x9bddff,.65);rim.position.set(-4,2,-3);scene.add(rim);scene.add(model.root);
        renderer.setViewport(col*320,0,320,440);renderer.setScissor(col*320,0,320,440);renderer.render(scene,camera);scenes.push(scene);
        const ids:any[]=[];model.root.traverse((o:any)=>{if(o.isMesh)ids.push([o.geometry.uuid,o.material.uuid]);});
        evidence.push({label:['previous','refined-neutral','left-flex','right-flex'][col],meshes:ids.length,materials:new Set(ids.map(v=>v[1])).size,calls:renderer.info.render.calls,textures:renderer.info.memory.textures,bodyMorphs:model.body.morphTargetInfluences||[],dorsalMorphs:model.fins?.[0]?.morphTargetInfluences||[],tailPosition:model.tail.position.toArray(),tailYaw:model.tail.rotation.y,bend:model.swim.bend||0});
        const label=document.createElement('div');label.textContent=['PREVIOUS FISH','REFINED · AT REST','REFINED · LEFT FLEX','REFINED · RIGHT FLEX'][col];label.style.cssText=`position:absolute;left:${col*320+12}px;bottom:18px;width:296px;padding:10px 0;border-radius:6px;background:rgba(9,24,34,.88);text-align:center;color:#e5ece8;font:600 11px system-ui;letter-spacing:.035em`;panel.appendChild(label);
      });
      w.closeFishStudy=()=>{const resources=new Set<any>();scenes.forEach(scene=>scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);}));resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};return {evidence,projectedCorners};
    });
    for(const corner of study.projectedCorners){expect(Math.abs(corner[0])).toBeLessThan(.9);expect(Math.abs(corner[1])).toBeLessThan(.9);}
    for(const model of study.evidence){expect(model.meshes).toBe(3);expect(model.materials).toBe(2);expect(model.calls).toBe(3);expect(model.textures).toBe(0);}
    expect(study.evidence[0].bodyMorphs).toEqual([]);expect(study.evidence[1].bodyMorphs).toEqual([0,0]);expect(study.evidence[1].dorsalMorphs).toEqual([0,0]);
    for(const flex of study.evidence.slice(2)){expect(flex.bodyMorphs).toEqual(flex.dorsalMorphs);expect(flex.bodyMorphs.reduce((a:number,b:number)=>a+b,0)).toBeCloseTo(.8,6);expect(Math.abs(flex.tailPosition[0])).toBeGreaterThan(.01);expect(Math.abs(flex.tailYaw)).toBeGreaterThan(.1);}
    expect(study.evidence[2].tailPosition[0]).toBeCloseTo(-study.evidence[3].tailPosition[0],6);expect(study.evidence[2].tailPosition[2]).toBeCloseTo(study.evidence[3].tailPosition[2],6);
    await page.locator('#fish-study').screenshot({path:resolve(output,'fish-before-after-and-flex.png'),timeout:90000});await testInfo.attach('fish-study',{body:JSON.stringify(study),contentType:'application/json'});await page.evaluate(()=>(window as any).closeFishStudy());expect(errors).toEqual([]);
  });

  for(const model of [{label:'fish-day-desktop',width:880,quality:'high',phase:.44},{label:'fish-night-mobile',width:320,quality:'low',phase:.93}])
  test(`keeps ${model.label} flex continuous through pause, reduced motion and native catch`,async({page},testInfo)=>{
    const errors=recordErrors(page);if(model.width===320)await page.setViewportSize({width:360,height:1100});
    try{await mount(page,model.quality);}catch(error){await testInfo.attach('mount-diagnostics',{body:JSON.stringify({errors,events:await page.evaluate(()=>(window as any).__events?.errors||[]).catch(()=>['Page unavailable'])}),contentType:'application/json'});throw error;}
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.fishRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    const review=await canvas.evaluate((c:any,setup)=>{
      const w=window as any,T=w.THREE;c._rhCommand('environment',{windSpeed:0,dayPhase:setup.phase,cloudCover:.18});w.skipFishRender=true;w.stepFish(25);
      const scene=w.fishScene,roots=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))),chosen=roots.find((o:any)=>o.getObjectByName('prey-fish-fish'));
      if(!chosen)throw Error('Seeded bald eagle session has no fish');
      const visual=chosen.getObjectByName('prey-fish-fish'),body=visual.getObjectByName('prey-fish-body'),dorsal=visual.getObjectByName('prey-fish-dorsal'),tail=visual.getObjectByName('prey-forked-tail');
      if(!body||!dorsal||!tail)throw Error('Fish detail meshes missing');w.fishChosen=chosen;w.fishRoots=roots;w.fishVisual=visual;w.fishBody=body;w.fishDorsal=dorsal;w.fishTail=tail;w.fishDisposed=[];
      w.fishIdentity=()=>{const ids:any[]=[];visual.traverse((o:any)=>{if(o.isMesh)ids.push([o.geometry.uuid,o.material.uuid]);});return ids;};
      w.fishActual=()=>({bodyMorphs:body.morphTargetInfluences.slice(),dorsalMorphs:dorsal.morphTargetInfluences.slice(),bodyRotation:[body.rotation.x,body.rotation.y,body.rotation.z],dorsalRotation:[dorsal.rotation.x,dorsal.rotation.y,dorsal.rotation.z],tailRotation:[tail.rotation.x,tail.rotation.y,tail.rotation.z],tailX:tail.position.x,tailZ:tail.position.z,tailYaw:tail.rotation.y});
      // r128 temporarily aliases sorted targets into geometry.attributes.morphTargetN / morphNormalN.
      // Check owned base buffers, index and all precomputed morph buffers instead of those shader bindings.
      w.fishAttributes=()=>{const attrs:any[]=[];visual.traverse((o:any)=>{if(o.geometry){const g=o.geometry;['position','normal','color','uv'].forEach(name=>{if(g.attributes[name])attrs.push({name:g.uuid+'/'+name,attribute:g.attributes[name]});});if(g.index)attrs.push({name:g.uuid+'/index',attribute:g.index});Object.keys(g.morphAttributes).sort().forEach(name=>g.morphAttributes[name].forEach((a:any,i:number)=>attrs.push({name:g.uuid+'/morph/'+name+'/'+i,attribute:a})));}});return attrs;};
      w.fishBuffers=w.fishAttributes().map((entry:any)=>({...entry,array:entry.attribute.array,version:entry.attribute.version}));w.fishMorphLists=[];visual.traverse((o:any)=>{if(o.geometry){o.geometry.addEventListener('dispose',()=>w.fishDisposed.push(o.geometry.uuid));Object.keys(o.geometry.morphAttributes).forEach(name=>w.fishMorphLists.push({geometry:o.geometry,name,list:o.geometry.morphAttributes[name]}));}});
      w.fishBufferChanges=()=>{const now=w.fishAttributes(),changes:any[]=[];if(now.length!==w.fishBuffers.length)changes.push({bufferCount:[w.fishBuffers.length,now.length]});now.forEach((entry:any,i:number)=>{const prior=w.fishBuffers[i],a=entry.attribute;if(!prior||entry.name!==prior.name||a!==prior.attribute||a.array!==prior.array||a.version!==prior.version)changes.push({name:entry.name,priorName:prior?.name,sameAttribute:a===prior?.attribute,sameArray:a.array===prior?.array,versions:[prior?.version,a.version]});});w.fishMorphLists.forEach((entry:any)=>{if(entry.geometry.morphAttributes[entry.name]!==entry.list)changes.push({morphList:entry.geometry.uuid+'/'+entry.name});});return changes;};
      w.fishBufferIdentity=()=>w.fishBufferChanges().length===0;
      const first=c._rhSnapshot(),actual=w.fishActual();for(let i=0;i<40;i++)w.stepFish(25);const after=c._rhSnapshot();
      const movement={first:first.fishSwimPoses[0],after:after.fishSwimPoses[0],motionDelta:after.motionTimeMs-first.motionTimeMs,firstActual:actual,afterActual:w.fishActual()};
      w.flightFishCamera=w.fishCamera.clone();const box=new T.Box3().setFromObject(visual),size=box.getSize(new T.Vector3()),radius=Math.max(size.x,size.y,size.z)*.5,fit=Math.tan(w.fishCamera.fov*Math.PI/360),distance=Math.max(3,radius/Math.min(fit,fit*w.fishCamera.aspect)*1.4),center=box.getCenter(new T.Vector3()),h=visual.rotation.y;
      const offset=new T.Vector3(Math.cos(h)*.8+Math.sin(h)*.45,.75,-Math.sin(h)*.8+Math.cos(h)*.45).normalize().multiplyScalar(distance);w.fishCamera.position.copy(center).add(offset);w.fishCamera.lookAt(center);c._rhCommand('scenic',true);w.skipFishRender=false;w.fishRenderer.render(scene,w.fishCamera);
      return {movement,identity:w.fishIdentity(),sameBuffers:w.fishBufferIdentity(),bufferChanges:w.fishBufferChanges(),bufferCount:w.fishBuffers.length,actual:w.fishActual(),bodyMorphEnabled:body.material.morphTargets&&body.material.morphNormals,dorsalMorphEnabled:dorsal.material.morphTargets&&dorsal.material.morphNormals};
    },model);
    expect(review.bufferChanges).toEqual([]);
    expect(review.identity).toHaveLength(3);expect(new Set(review.identity.map((v:any)=>v[1])).size).toBe(2);expect(new Set(review.identity.map((v:any)=>v[0])).size).toBe(3);expect(review.sameBuffers).toBe(true);expect(review.bufferCount).toBeGreaterThan(12);expect(review.bodyMorphEnabled).toBe(true);expect(review.dorsalMorphEnabled).toBe(true);expect(review.movement.motionDelta).toBeGreaterThan(0);expect(review.movement.after.phase).not.toBe(review.movement.first.phase);expect(review.actual).not.toEqual(review.movement.firstActual);expect(review.actual.bodyMorphs).toEqual(review.actual.dorsalMorphs);expect(review.movement.after.morphs).toEqual(review.actual.bodyMorphs);expect(review.movement.after.finMorphs).toEqual(review.actual.dorsalMorphs);expect(Math.abs(review.movement.after.bend)).toBeLessThanOrEqual(1);expect(review.movement.after.visualY).toBe(0);
    await stage.screenshot({path:resolve(output,model.label+'-lake-flex.png'),timeout:90000});
    const paused=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');const before=c._rhSnapshot(),actual=w.fishActual();w.skipFishRender=true;w.stepFish(60000);const after=c._rhSnapshot();return {before:before.fishSwimPoses,after:after.fishSwimPoses,beforeTime:before.motionTimeMs,afterTime:after.motionTimeMs,actual,afterActual:w.fishActual(),sameBuffers:w.fishBufferIdentity()};});
    expect(typeof paused.beforeTime).toBe('number');expect(Number.isFinite(paused.beforeTime)).toBe(true);expect(paused.afterTime).toBe(paused.beforeTime);expect(paused.after).toEqual(paused.before);expect(paused.afterActual).toEqual(paused.actual);expect(paused.sameBuffers).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const quiet=await canvas.evaluate((c:any)=>{const w=window as any,rest=c._rhSnapshot(),actual=w.fishActual();w.stepFish(25);const whilePaused=c._rhSnapshot();c._rhCommand('pause');for(let i=0;i<20;i++)w.stepFish(25);return {rest:rest.fishSwimPoses,restTime:rest.motionTimeMs,pausedTime:whilePaused.motionTimeMs,whilePaused:whilePaused.fishSwimPoses,after:c._rhSnapshot().fishSwimPoses,actual,afterActual:w.fishActual(),sameBuffers:w.fishBufferIdentity(),identity:w.fishIdentity()};});
    expect(quiet.rest.map((p:any)=>p.phase)).toEqual(paused.before.map((p:any)=>p.phase));expect(quiet.whilePaused).toEqual(quiet.rest);expect(quiet.pausedTime).toBe(quiet.restTime);expect(quiet.after.map((p:any)=>p.phase)).toEqual(quiet.rest.map((p:any)=>p.phase));
    for(const pose of quiet.rest.concat(quiet.after)){expect([pose.amplitude,pose.tailYaw,pose.bodyYaw,pose.roll,pose.bend,pose.tailX].map(Math.abs)).toEqual([0,0,0,0,0,0]);expect(pose.morphs).toEqual([0,0]);expect(pose.finMorphs).toEqual([0,0]);}
    for(const actual of [quiet.actual,quiet.afterActual]){expect(actual.bodyMorphs).toEqual([0,0]);expect(actual.dorsalMorphs).toEqual([0,0]);expect(Math.abs(actual.tailYaw)).toBe(0);expect(Math.abs(actual.tailX)).toBe(0);}
    expect(quiet.sameBuffers).toBe(true);expect(quiet.identity).toEqual(review.identity);
    await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
    const resumed=await canvas.evaluate((c:any)=>{const w=window as any,before=c._rhSnapshot().fishSwimPoses[0];w.stepFish(25);return {before,after:c._rhSnapshot().fishSwimPoses[0],actual:w.fishActual(),sameBuffers:w.fishBufferIdentity()};});
    expect(resumed.after.phase).not.toBe(resumed.before.phase);expect(resumed.after.amplitude).toBeGreaterThan(0);expect(resumed.after.amplitude).toBeLessThan(.05);expect(Math.abs(resumed.after.bend)).toBeLessThan(.17);expect(resumed.actual.bodyMorphs).toEqual(resumed.actual.dorsalMorphs);expect(resumed.sameBuffers).toBe(true);
    const caught=await canvas.evaluate((c:any)=>{
      const w=window as any;for(let i=0;i<20;i++)w.stepFish(25);const before=c._rhSnapshot(),identity=w.fishIdentity(),preCatch=w.fishActual();w.fishCamera.copy(w.flightFishCamera);c._rhCommand('scenic',false);const p=before.raptorPosition,h=before.headingRadians,pitch=before.pitchRadians;
      w.fishRoots.forEach((o:any,i:number)=>o.position.set(o===w.fishChosen?p.x+Math.sin(h)*Math.cos(pitch)*3:2000+i*20,o===w.fishChosen?p.y+Math.sin(pitch)*3:2000,o===w.fishChosen?p.z-Math.cos(h)*Math.cos(pitch)*3:2000));c._rhCommand('strike');const firstFrame=c._rhSnapshot(),actual=w.fishActual();w.stepFish(25);const after=c._rhSnapshot();
      return {catchDelta:firstFrame.missionCatches-before.missionCatches,carried:firstFrame.carriedPreyMs,label:firstFrame.carriedPreyLabel,preCatch,actual,afterActual:w.fishActual(),sameIdentity:JSON.stringify(identity)===JSON.stringify(w.fishIdentity()),sameBuffers:w.fishBufferIdentity(),carriedAfterFrame:after.carriedPreyMs};
    });
    expect(caught.catchDelta).toBe(1);expect(caught.carried).toBeGreaterThan(0);expect(caught.carriedAfterFrame).toBeGreaterThan(0);expect(caught.label).toBe('Fish (surface)');expect(caught.preCatch.bodyMorphs.some((v:number)=>v>0)).toBe(true);
    for(const actual of [caught.actual,caught.afterActual]){expect(actual.bodyMorphs).toEqual([0,0]);expect(actual.dorsalMorphs).toEqual([0,0]);expect(actual.bodyRotation.map(Math.abs)).toEqual([0,0,0]);expect(actual.dorsalRotation.map(Math.abs)).toEqual([0,0,0]);expect(actual.tailRotation.map(Math.abs)).toEqual([0,0,0]);expect(Math.abs(actual.tailYaw)).toBe(0);expect(Math.abs(actual.tailX)).toBe(0);expect(actual.tailZ).toBe(quiet.actual.tailZ);}
    expect(caught.sameIdentity).toBe(true);expect(caught.sameBuffers).toBe(true);await canvas.evaluate(()=>{const w=window as any;w.skipFishRender=false;w.fishRenderer.render(w.fishScene,w.fishCamera);});await stage.screenshot({path:resolve(output,model.label+'-native-catch.png'),timeout:90000});
    const expired=await canvas.evaluate((c:any)=>{const w=window as any;w.skipFishRender=true;for(let i=0;i<28;i++)w.stepFish(50);return {remaining:c._rhSnapshot().carriedPreyMs,disposed:w.fishDisposed};});expect(expired.remaining).toBe(0);expect(expired.disposed).toHaveLength(3);expect(new Set(expired.disposed).size).toBe(3);
    await testInfo.attach('fish-lifecycle',{body:JSON.stringify({id:'fish',meshCount:3,materialCount:2,bufferCount:review.bufferCount,movement:review.movement,pausedMotionTimeMs:paused.beforeTime,pauseFreezesFlex:true,reducedMotionImmediateWhilePaused:true,reducedMotionFreezesPhase:true,resumed:resumed.after,preCatch:caught.preCatch,neutralFirstFrameCarry:caught.actual,resourceIdentity:caught.sameIdentity,reusedBaseAndMorphBuffers:caught.sameBuffers,catchDelta:caught.catchDelta,disposed:expired.disposed.length}),contentType:'application/json'});
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
