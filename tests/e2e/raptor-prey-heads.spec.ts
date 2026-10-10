import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_HEAD_SCREENSHOTS||resolve('scratch/raptor-prey-head-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const builders=['preyKindFor','mergeGroundPreyParts','buildGroundPreyParts','buildMammalPreyParts','buildRainforestPreyParts','buildPreyVisual','advanceGroundPreyHead','applyGroundPreyHeadPose','createPreyContactGeometry','preyContactProfile','writePreyContactPatch','finishPreyContactPatches','softenPreyContactMaterial'].map(body).join('\n');
const probes=`window.AlloPostFXEnabled=false;${builders};window.headReview={build:buildPreyVisual,advance:advanceGroundPreyHead,apply:applyGroundPreyHeadPose,create:createPreyContactGeometry,profile:preyContactProfile,write:writePreyContactPatch,finish:finishPreyContactPatches,soften:softenPreyContactMaterial};(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.headRenderer=r;r.render=function(scene,camera){window.headScene=scene;window.headCamera=camera;if(!window.skipHeadRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor prey head movement',()=>{
  test.describe.configure({timeout:180000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
  test.afterAll(async()=>{await harness.stop();});
  test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:1140,height:1100});
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).stepHeads=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,species='redTail',quality='balanced')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:'open',flightSession:{speciesId:species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");

  test('renders neutral and smoothly posed rabbit, fox, sloth and capuchin faces',async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const study=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,api=w.headReview;
      const panel=document.createElement('section');panel.id='head-study';panel.style.cssText='position:fixed;left:16px;top:16px;width:1080px;height:1040px;z-index:99999;border:1px solid #537080;border-radius:12px;overflow:hidden;background:#16252f';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1080,1040);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const rows=[{id:'rabbit',label:'Cottontail · ears and face follow the hunter',color:0xa78b6f,alerted:true,bearing:.8,elevation:.09,seed:1.4,meshes:5},{id:'fox',label:'Red fox · restrained alert glance',color:0xc2410c,alerted:true,bearing:-.8,elevation:.18,seed:2.1,meshes:7},{id:'sloth',label:'Three-toed sloth · slow idle look',color:0x44403c,alerted:false,bearing:0,elevation:0,seed:2.7,meshes:7},{id:'capuchin',label:'Capuchin · pale face turns toward the hunter',color:0x57534e,alerted:true,bearing:.7,elevation:.12,seed:3.2,meshes:7}];
      const scenes:any[]=[],evidence:any[]=[];
      rows.forEach((row,r)=>{
        const neutral=api.build({id:row.id,color:row.color},2),posed=api.build({id:row.id,color:row.color},2);
        for(let i=0;i<180;i++)api.advance(posed.look,0,row.bearing,row.elevation,row.alerted,1/60,false,row.seed);api.apply(posed);
        neutral.root.position.y=posed.root.position.y=.84;neutral.root.updateMatrixWorld(true);
        const box=new T.Box3().setFromObject(neutral.root),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
        const camera=new T.PerspectiveCamera(32,540/260,.1,100),radius=Math.max(size.y,size.x/(540/260),size.z*.6)*.55,distance=Math.max(3.3,radius/Math.tan(32*Math.PI/360)*1.45);
        camera.position.copy(center).add(new T.Vector3(.65,.38,.75).normalize().multiplyScalar(distance));camera.lookAt(center);
        [neutral,posed].forEach((model,col)=>{
          const scene=new T.Scene();scene.background=new T.Color(0x16252f);scene.add(new T.HemisphereLight(0xe0edff,0x6b6652,.85));const key=new T.DirectionalLight(0xffebce,1.2);key.position.set(3,7,5);scene.add(key);
          const floor=new T.PlaneGeometry(8,8);floor.rotateX(-Math.PI/2);scene.add(new T.Mesh(floor,new T.MeshStandardMaterial({color:new T.Color(0x8a9b74).convertSRGBToLinear(),roughness:1})));scene.add(model.root);
          const geometry=api.create(1),material=new T.MeshBasicMaterial({color:new T.Color(0x263448).convertSRGBToLinear(),transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});api.soften(material,{value:1});api.write(geometry,0,0,0,0,api.profile({},2,0,model.kind,0),()=>0);api.finish(geometry,1);const shadow=new T.Mesh(geometry,material);shadow.frustumCulled=false;scene.add(shadow);
          scenes.push(scene);renderer.setViewport(col*540,(3-r)*260,540,260);renderer.setScissor(col*540,(3-r)*260,540,260);renderer.render(scene,camera);
          const meshIds:any[]=[];model.root.traverse((o:any)=>{if(o.isMesh)meshIds.push([o.geometry.uuid,o.material.uuid]);});
          evidence.push({id:row.id,posed:col===1,alerted:row.alerted,yaw:model.head.rotation.y,pitch:model.head.rotation.x,roll:model.head.rotation.z,yawLimit:model.look.yawLimit,rate:model.look.rate,activity:model.look.activity,meshes:meshIds.length,materials:new Set(meshIds.map(v=>v[1])).size,calls:renderer.info.render.calls});
          const label=document.createElement('div');label.textContent=(col?(row.alerted?'ALERT GLANCE':'IDLE LOOK'):'NEUTRAL')+' · '+row.label;label.style.cssText=`position:absolute;left:${col*540+18}px;top:${r*260+225}px;width:504px;padding:7px 0;border-radius:6px;background:rgba(9,24,34,.88);text-align:center;color:#e5ece8;font:600 11px system-ui;letter-spacing:.02em`;panel.appendChild(label);
        });
      });
      w.closeHeadStudy=()=>{const resources=new Set<any>();scenes.forEach(scene=>scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);}));resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};
      return {evidence,textures:renderer.info.memory.textures};
    });
    expect(study.textures).toBe(0);for(const sample of study.evidence){expect(sample.meshes).toBe(sample.id==='rabbit'?5:7);expect(sample.materials).toBe(1);expect(sample.calls).toBe(sample.meshes+2);expect(Math.abs(sample.yaw)).toBeLessThanOrEqual(sample.yawLimit);if(sample.posed){expect(Math.abs(sample.yaw)+Math.abs(sample.pitch)+Math.abs(sample.roll)).toBeGreaterThan(.001);expect(sample.rate).toBeGreaterThan(0);if(sample.alerted)expect(sample.activity).toBeGreaterThan(.99);else expect(sample.activity).toBe(0);}else expect([sample.yaw,sample.pitch,sample.roll].map(Math.abs)).toEqual([0,0,0]);}
    await page.locator('#head-study').screenshot({path:resolve(output,'prey-heads-neutral-and-looking.png'),timeout:90000});await testInfo.attach('head-study',{body:JSON.stringify(study),contentType:'application/json'});await page.evaluate(()=>(window as any).closeHeadStudy());expect(errors).toEqual([]);
  });

  for(const model of [{label:'rodent-night-mobile',id:'rodent',kind:'rodent',headName:'prey-ground-face',name:'Field Mouse',species:'redTail',width:320,quality:'low',phase:.93,meshes:5,alerted:false},{label:'fox-day-desktop',id:'fox',kind:'mammal',headName:'prey-mammal-head',name:'Red Fox',species:'goldenEagle',width:880,quality:'high',phase:.44,meshes:7,alerted:true},{label:'sloth-day-desktop',id:'sloth',kind:'mammal',headName:'prey-rainforest-head',name:'Three-toed Sloth',species:'harpyEagle',width:880,quality:'balanced',phase:.44,meshes:7,alerted:false}])
  test(`keeps ${model.label} head movement smooth through pause, reduced motion and catch`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    if(model.width===320)await page.setViewportSize({width:360,height:1100});
    try{await mount(page,model.species,model.quality);}catch(error){await testInfo.attach('mount-diagnostics',{body:JSON.stringify({errors,events:await page.evaluate(()=>(window as any).__events?.errors||[]).catch(()=>['Page unavailable'])}),contentType:'application/json'});throw error;}
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.headRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    const review=await canvas.evaluate((c:any,setup)=>{
      const w=window as any,T=w.THREE;c._rhCommand('environment',{windSpeed:0,dayPhase:setup.phase,cloudCover:.18});w.skipHeadRender=true;w.stepHeads(25);
      const scene=w.headScene,roots=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))),chosen=roots.find((o:any)=>o.getObjectByName('prey-'+setup.kind+'-'+setup.id));
      if(!chosen)throw Error('Seeded '+setup.species+' session has no '+setup.id);
      const visual=chosen.children.find((o:any)=>o.name.startsWith('prey-')),head=visual.getObjectByName(setup.headName);w.headChosen=chosen;w.headRoots=roots;w.headVisual=visual;w.chosenHead=head;w.headDisposed=[];
      w.headIdentity=()=>{const ids:any[]=[];visual.traverse((o:any)=>{if(o.isMesh)ids.push([o.geometry.uuid,o.material.uuid]);});return ids;};
      w.headAngle=()=>[head.rotation.x,head.rotation.y,head.rotation.z];
      w.headBuffers=[];visual.traverse((o:any)=>{if(o.geometry){o.geometry.addEventListener('dispose',()=>w.headDisposed.push(o.geometry.uuid));Object.values(o.geometry.attributes).forEach((a:any)=>w.headBuffers.push({attribute:a,array:a.array,version:a.version}));}});
      w.headBufferIdentity=()=>{const now:any[]=[];visual.traverse((o:any)=>{if(o.geometry)Object.values(o.geometry.attributes).forEach((a:any)=>now.push(a));});return now.length===w.headBuffers.length&&now.every((a:any,i:number)=>a===w.headBuffers[i].attribute&&a.array===w.headBuffers[i].array&&a.version===w.headBuffers[i].version);};
      const first=c._rhSnapshot(),position=chosen.position.clone(),angle=w.headAngle();
      for(let i=0;i<40;i++)w.stepHeads(25);
      const after=c._rhSnapshot(),movement={rootDistance:chosen.position.distanceTo(position),firstHead:first.groundPreyHeads.find((p:any)=>p.id===setup.id),afterHead:after.groundPreyHeads.find((p:any)=>p.id===setup.id),firstGait:first.groundPreyGaits.find((p:any)=>p.id===setup.id),afterGait:after.groundPreyGaits.find((p:any)=>p.id===setup.id),angleDelta:Math.hypot(...w.headAngle().map((v:number,i:number)=>v-angle[i])),motionDelta:after.motionTimeMs-first.motionTimeMs};
      w.flightHeadCamera=w.headCamera.clone();const box=new T.Box3().setFromObject(visual),v=box.getSize(new T.Vector3()),radius=Math.max(v.x,v.y,v.z)*.5,fit=Math.tan(w.headCamera.fov*Math.PI/360),distance=Math.max(3,radius/Math.min(fit,fit*w.headCamera.aspect)*1.5),h=visual.rotation.y;
      const center=box.getCenter(new T.Vector3()),offset=new T.Vector3(Math.cos(h)*.7+Math.sin(h)*.8,.5,-Math.sin(h)*.7+Math.cos(h)*.8).normalize().multiplyScalar(distance);w.headCamera.position.copy(center).add(offset);w.headCamera.lookAt(center);c._rhCommand('scenic',true);w.skipHeadRender=false;w.headRenderer.render(scene,w.headCamera);
      return {movement,identity:w.headIdentity(),sameBuffers:w.headBufferIdentity(),angles:w.headAngle()};
    },model);
    expect(review.identity).toHaveLength(model.meshes);expect(new Set(review.identity.map((v:any)=>v[1])).size).toBe(1);expect(review.sameBuffers).toBe(true);expect(review.movement.motionDelta).toBeGreaterThan(0);expect(review.movement.afterHead.phase).toBeGreaterThan(review.movement.firstHead.phase);expect(review.movement.angleDelta).toBeGreaterThan(0);expect(review.angles).toEqual([review.movement.afterHead.pitch,review.movement.afterHead.yaw,review.movement.afterHead.roll]);
    if(model.id==='sloth'){expect(review.movement.rootDistance).toBeLessThan(.000001);expect(review.movement.afterGait.phase).toBe(review.movement.firstGait.phase);expect(review.movement.afterGait.effort).toBe(0);expect(review.movement.afterHead.alerted).toBe(false);expect(review.movement.afterHead.activity).toBe(0);}
    if(model.id==='rodent'){expect(review.movement.afterHead.alerted).toBe(false);expect(review.movement.afterHead.activity).toBe(0);}
    await stage.screenshot({path:resolve(output,model.label+'-head-idle.png'),timeout:90000});

    const detected=await canvas.evaluate((c:any,setup)=>{
      const w=window as any;w.skipHeadRender=true;const first=c._rhSnapshot(),p=first.raptorPosition,h=first.headingRadians;w.headChosen.position.set(p.x+Math.sin(h)*20,p.y,p.z-Math.cos(h)*20);
      const before=c._rhSnapshot().groundPreyHeads.find((v:any)=>v.id===setup.id);w.stepHeads(25);const after=c._rhSnapshot().groundPreyHeads.find((v:any)=>v.id===setup.id);
      for(let i=0;i<16;i++)w.stepHeads(25);const settled=c._rhSnapshot().groundPreyHeads.find((v:any)=>v.id===setup.id);
      const snapshot=c._rhSnapshot(),T=w.THREE;w.headVisual.updateWorldMatrix(true,false);const anchor=w.chosenHead.position.clone().applyMatrix4(w.headVisual.matrixWorld),direction=new T.Vector3(snapshot.raptorPosition.x,snapshot.raptorPosition.y,snapshot.raptorPosition.z).sub(anchor).transformDirection(new T.Matrix4().copy(w.headVisual.matrixWorld).invert());
      return {before,after,settled,angles:w.headAngle(),bearing:Math.atan2(direction.x,direction.z),identity:w.headIdentity(),sameBuffers:w.headBufferIdentity()};
    },model);
    expect(detected.after.alerted).toBe(model.alerted);expect(detected.settled.alerted).toBe(model.alerted);expect(detected.sameBuffers).toBe(true);expect(detected.identity).toEqual(review.identity);expect(detected.angles).toEqual([detected.settled.pitch,detected.settled.yaw,detected.settled.roll]);
    if(model.alerted){expect(detected.after.activity).toBeGreaterThan(0);expect(detected.settled.activity).toBeGreaterThan(detected.after.activity);expect(Math.abs(detected.settled.yaw)).toBeGreaterThan(.001);expect(Math.sign(detected.settled.yaw)).toBe(detected.settled.lookSide);expect(Math.abs(detected.after.yaw-detected.before.yaw)).toBeLessThan(.12);}
    else{expect(detected.settled.activity).toBe(0);}

    const paused=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');const before=c._rhSnapshot(),angle=w.headAngle();w.stepHeads(60000);const after=c._rhSnapshot();return {before:before.groundPreyHeads,after:after.groundPreyHeads,beforeTime:before.motionTimeMs,afterTime:after.motionTimeMs,angle,samePose:JSON.stringify(angle)===JSON.stringify(w.headAngle())};});
    expect(typeof paused.beforeTime).toBe('number');expect(Number.isFinite(paused.beforeTime)).toBe(true);expect(paused.afterTime).toBe(paused.beforeTime);expect(paused.after).toEqual(paused.before);expect(paused.samePose).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const quiet=await canvas.evaluate((c:any)=>{const w=window as any,rest=c._rhSnapshot(),angle=w.headAngle();w.stepHeads(25);const whilePaused=c._rhSnapshot();c._rhCommand('pause');for(let i=0;i<20;i++)w.stepHeads(25);return {rest:rest.groundPreyHeads,restTime:rest.motionTimeMs,pausedTime:whilePaused.motionTimeMs,whilePaused:whilePaused.groundPreyHeads,after:c._rhSnapshot().groundPreyHeads,angle,afterAngle:w.headAngle(),sameBuffers:w.headBufferIdentity(),identity:w.headIdentity()};});
    expect(quiet.rest.map((p:any)=>p.phase)).toEqual(paused.before.map((p:any)=>p.phase));expect(quiet.whilePaused).toEqual(quiet.rest);expect(quiet.pausedTime).toBe(quiet.restTime);expect(quiet.after.map((p:any)=>p.phase)).toEqual(quiet.rest.map((p:any)=>p.phase));
    for(const pose of quiet.rest.concat(quiet.after))expect([pose.yaw,pose.pitch,pose.roll,pose.rate,pose.activity].map(Math.abs)).toEqual([0,0,0,0,0]);expect(quiet.angle.map(Math.abs)).toEqual([0,0,0]);expect(quiet.afterAngle.map(Math.abs)).toEqual([0,0,0]);expect(quiet.sameBuffers).toBe(true);expect(quiet.identity).toEqual(review.identity);
    await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
    const resumed=await canvas.evaluate((c:any,setup)=>{const w=window as any,before=c._rhSnapshot().groundPreyHeads.find((p:any)=>p.id===setup.id);w.stepHeads(25);return {before,after:c._rhSnapshot().groundPreyHeads.find((p:any)=>p.id===setup.id),angle:w.headAngle(),sameBuffers:w.headBufferIdentity()};},model);
    expect(resumed.after.phase).toBeGreaterThan(resumed.before.phase);expect(resumed.after.phase-resumed.before.phase).toBeLessThan(.035);expect(resumed.after.rate).toBeGreaterThan(0);expect(resumed.after.rate).toBeLessThan(.15);expect(resumed.angle.every((v:number)=>Math.abs(v)<.07)).toBe(true);expect(resumed.sameBuffers).toBe(true);

    const caught=await canvas.evaluate((c:any)=>{
      const w=window as any,before=c._rhSnapshot(),identity=w.headIdentity();w.headCamera.copy(w.flightHeadCamera);c._rhCommand('scenic',false);const p=before.raptorPosition,h=before.headingRadians,pitch=before.pitchRadians;
      w.headRoots.forEach((o:any,i:number)=>o.position.set(o===w.headChosen?p.x+Math.sin(h)*Math.cos(pitch)*3:2000+i*20,o===w.headChosen?p.y+Math.sin(pitch)*3:2000,o===w.headChosen?p.z-Math.cos(h)*Math.cos(pitch)*3:2000));c._rhCommand('strike');w.stepHeads(25);const after=c._rhSnapshot();
      return {catchDelta:after.missionCatches-before.missionCatches,carried:after.carriedPreyMs,label:after.carriedPreyLabel,angle:w.headAngle(),sameIdentity:JSON.stringify(identity)===JSON.stringify(w.headIdentity()),sameBuffers:w.headBufferIdentity()};
    });
    expect(caught.catchDelta).toBe(1);expect(caught.carried).toBeGreaterThan(0);expect(caught.label).toBe(model.name);expect(caught.angle.map(Math.abs)).toEqual([0,0,0]);expect(caught.sameIdentity).toBe(true);expect(caught.sameBuffers).toBe(true);
    await canvas.evaluate(()=>{const w=window as any;w.skipHeadRender=false;w.headRenderer.render(w.headScene,w.headCamera);});await stage.screenshot({path:resolve(output,model.label+'-head-catch.png'),timeout:90000});
    const expired=await canvas.evaluate((c:any)=>{const w=window as any;w.skipHeadRender=true;for(let i=0;i<28;i++)w.stepHeads(50);return {remaining:c._rhSnapshot().carriedPreyMs,disposed:w.headDisposed};});expect(expired.remaining).toBe(0);expect(expired.disposed).toHaveLength(model.meshes);expect(new Set(expired.disposed).size).toBe(model.meshes);
    await testInfo.attach('head-lifecycle',{body:JSON.stringify({id:model.id,meshCount:model.meshes,movement:review.movement,detection:detected,pausedMotionTimeMs:paused.beforeTime,pauseFreezesHead:true,reducedMotionImmediateWhilePaused:true,reducedMotionFreezesPhase:true,resumed:resumed.after,neutralCarry:true,reusedBuffers:caught.sameBuffers,catchDelta:caught.catchDelta,disposed:expired.disposed.length}),contentType:'application/json'});
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
