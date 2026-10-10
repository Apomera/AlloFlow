import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_MAMMAL_SCREENSHOTS||resolve('scratch/raptor-mammal-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const builders=['preyKindFor','mergeGroundPreyParts','buildMammalPreyParts','advanceGroundPreyGait','setGroundPreyLegPose','buildPreyVisual','createPreyContactGeometry','preyContactProfile','writePreyContactPatch','finishPreyContactPatches','softenPreyContactMaterial'].map(body).join('\n');
const probes=`window.AlloPostFXEnabled=false;${builders};window.mammalReview={build:buildPreyVisual,advance:advanceGroundPreyGait,leg:setGroundPreyLegPose,create:createPreyContactGeometry,profile:preyContactProfile,write:writePreyContactPatch,finish:finishPreyContactPatches,soften:softenPreyContactMaterial};(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.mammalRenderer=r;r.render=function(scene,camera){window.mammalScene=scene;window.mammalCamera=camera;if(!window.skipMammalRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor mammal prey',()=>{
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
      (window as any).stepMammal=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,quality='balanced')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'goldenEagle',activeMission:'open',flightSession:{speciesId:'goldenEagle',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");

  test('renders distinct fawn, pronghorn calf and fox coats and four leg poses',async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const study=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,api=w.mammalReview;
      const panel=document.createElement('section');panel.id='mammal-study';panel.style.cssText='position:fixed;left:16px;top:16px;width:1080px;height:780px;z-index:99999;border:1px solid #537080;border-radius:12px;overflow:hidden;background:#16252f';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1080,780);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const camera=new T.PerspectiveCamera(35,540/260,.1,100);camera.position.set(3.8,3.1,5.2);camera.lookAt(0,1.35,0);
      const rows=[{id:'fawnDeer',label:'Fawn · spotted coat · standing',color:0xa16207,speed:0,phase:1.2},{id:'pronghornCalf',label:'Pronghorn calf · pale rump · walk',color:0xb45309,speed:3,phase:2.1},{id:'fox',label:'Red fox · brush tail · run',color:0xc2410c,speed:11,phase:4.3}];
      const scenes:any[]=[],evidence:any[]=[];
      rows.forEach((row,r)=>{for(let col=0;col<2;col++){
        const scene=new T.Scene();scene.background=new T.Color(0x16252f);scene.add(new T.HemisphereLight(0xe0edff,0x6b6652,.85));const key=new T.DirectionalLight(0xffebce,1.2);key.position.set(3,7,5);scene.add(key);
        const floorGeometry=new T.PlaneGeometry(6,6,40,40);floorGeometry.rotateX(-Math.PI/2);scene.add(new T.Mesh(floorGeometry,new T.MeshStandardMaterial({color:new T.Color(0x8a9b74).convertSRGBToLinear(),roughness:1})));
        const size=2,root=new T.Group();root.position.y=size*.42;scene.add(root);let gait=null;
        if(col===0){
          const material=new T.MeshStandardMaterial({color:row.color,roughness:.82}),dark=new T.MeshStandardMaterial({color:0x292524,roughness:.82});
          const torso=new T.Mesh(new T.SphereGeometry(size*.38,10,7),material);torso.scale.set(.8,.66,1.55);root.add(torso);
          const head=new T.Mesh(new T.SphereGeometry(size*.24,8,6),material);head.position.set(0,size*.12,size*.48);root.add(head);
          const tail=new T.Mesh(new T.ConeGeometry(size*.11,size*.65,6),material);tail.position.set(0,size*.10,-size*.58);tail.rotation.x=-Math.PI/2;root.add(tail);
          [-1,1].forEach(side=>{const leg=new T.Mesh(new T.CylinderGeometry(size*.045,size*.055,size*.30,5),dark);leg.position.set(side*size*.20,-size*.27,size*.12);root.add(leg);});
        }else{
          const model=api.build({id:row.id,color:row.color},size);gait=model.gait;
          for(let i=0;i<90;i++)api.advance(gait,row.speed,row.id==='pronghornCalf'?12:row.id==='fox'?11:8,size,'mammal',1/60,false,row.phase);
          model.legs.forEach((leg:any,i:number)=>api.leg(leg,gait.strides[i]));model.tail.rotation.z=gait.tail;model.root.position.y=gait.bob;root.add(model.root);
        }
        const geometry=api.create(1),material=new T.MeshBasicMaterial({color:new T.Color(0x263448).convertSRGBToLinear(),transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});api.soften(material,{value:1});api.write(geometry,0,0,0,0,api.profile({},size,0,'mammal',0),()=>0);api.finish(geometry,1);const shadow=new T.Mesh(geometry,material);shadow.frustumCulled=false;scene.add(shadow);
        scenes.push(scene);renderer.setViewport(col*540,(2-r)*260,540,260);renderer.setScissor(col*540,(2-r)*260,540,260);renderer.render(scene,camera);
        root.updateMatrixWorld(true);let clearance=Infinity;const point=new T.Vector3();root.traverse((o:any)=>{if(!o.geometry)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);clearance=Math.min(clearance,point.y);}});
        evidence.push({label:row.label,updated:col===1,minimumClearance:clearance,calls:renderer.info.render.calls,strides:gait?.strides});
        const label=document.createElement('div');label.textContent=(col?'UPDATED':'PREVIOUS')+' · '+row.label;label.style.cssText=`position:absolute;left:${col*540+18}px;top:${r*260+225}px;width:504px;padding:7px 0;border-radius:6px;background:rgba(9,24,34,.88);text-align:center;color:#e5ece8;font:600 11px system-ui;letter-spacing:.05em`;panel.appendChild(label);
      }});
      w.closeMammalStudy=()=>{const resources=new Set<any>();scenes.forEach(scene=>scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);}));resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};
      return {evidence,textures:renderer.info.memory.textures};
    });
    expect(study.textures).toBe(0);for(const sample of study.evidence){expect(sample.calls).toBe(sample.updated?9:7);expect(sample.minimumClearance).toBeGreaterThanOrEqual(-.00001);if(sample.updated)expect(sample.strides).toHaveLength(4);}
    await page.locator('#mammal-study').screenshot({path:resolve(output,'mammal-before-after.png'),timeout:90000});await testInfo.attach('mammal-study',{body:JSON.stringify(study),contentType:'application/json'});await page.evaluate(()=>(window as any).closeMammalStudy());expect(errors).toEqual([]);
  });

  for(const model of [{label:'fawn-day-desktop',id:'fawnDeer',name:'Fawn',width:880,quality:'high',phase:.44},{label:'pronghorn-day-desktop',id:'pronghornCalf',name:'Pronghorn Calf',width:880,quality:'balanced',phase:.44},{label:'fox-night-mobile',id:'fox',name:'Red Fox',width:320,quality:'low',phase:.93}])
  test(`keeps ${model.label} mammal gait and identity through pause, reduced motion and catch`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    if(model.width===320)await page.setViewportSize({width:360,height:1100});
    try{await mount(page,model.quality);}catch(error){await testInfo.attach('mount-diagnostics',{body:JSON.stringify({errors,events:await page.evaluate(()=>(window as any).__events?.errors||[]).catch(()=>['Page unavailable'])}),contentType:'application/json'});throw error;}
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.mammalRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    const review=await canvas.evaluate((c:any,setup)=>{
      const w=window as any,T=w.THREE;c._rhCommand('environment',{windSpeed:0,dayPhase:setup.phase,cloudCover:.18});w.skipMammalRender=true;for(let i=0;i<36;i++)w.stepMammal(25);w.skipMammalRender=false;
      const scene=w.mammalScene,roots=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))),chosen=roots.find((o:any)=>o.getObjectByName('prey-mammal-'+setup.id));
      if(!chosen)throw Error('Seeded Golden Eagle session has no '+setup.id);
      const visual=chosen.children.find((o:any)=>o.name.startsWith('prey-'));w.mammalChosen=chosen;w.mammalRoots=roots;w.mammalVisual=visual;w.mammalDisposed=[];
      visual.traverse((o:any)=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>w.mammalDisposed.push(o.geometry.uuid));});w.mammalIdentity=()=>{const ids:any[]=[];visual.traverse((o:any)=>{if(o.isMesh)ids.push([o.geometry.uuid,o.material.uuid]);});return ids;};
      w.mammalBuffers=[];visual.traverse((o:any)=>{if(o.geometry)w.mammalBuffers.push(o.geometry.attributes.position);});w.mammalLegs=visual.children.filter((o:any)=>/^prey-mammal-(front|hind)-/.test(o.name));w.mammalAngles=()=>w.mammalLegs.map((o:any)=>[o.rotation.x,o.position.y]);
      w.flightCamera=w.mammalCamera.clone();const box=new T.Box3().setFromObject(visual),v=box.getSize(new T.Vector3()),radius=Math.max(v.x,v.y,v.z)*.5,angle=Math.tan(w.mammalCamera.fov*Math.PI/360),distance=Math.max(3,radius/Math.min(angle,angle*w.mammalCamera.aspect)*1.50);
      const h=visual.rotation.y,offset=new T.Vector3(Math.cos(h)*.7+Math.sin(h)*.8,.55,-Math.sin(h)*.7+Math.cos(h)*.8).normalize().multiplyScalar(distance),center=box.getCenter(new T.Vector3());
      w.mammalCamera.position.copy(center).add(offset);w.mammalCamera.lookAt(center);c._rhCommand('scenic',true);w.mammalRenderer.render(scene,w.mammalCamera);
      return {poses:c._rhSnapshot().groundPreyGaits,identity:w.mammalIdentity(),calls:w.mammalRenderer.info.render.calls,textures:w.mammalRenderer.info.memory.textures,legAngles:w.mammalAngles(),position:chosen.position.toArray()};
    },{phase:model.phase,id:model.id});
    expect(review.identity).toHaveLength(7);expect(new Set(review.identity.map((entry:any)=>entry[1])).size).toBe(1);expect(review.poses.some((s:any)=>s.id===model.id&&s.phase>0&&s.strides?.length===4)).toBe(true);expect(review.legAngles).toHaveLength(4);
    await stage.screenshot({path:resolve(output,model.label+'-mammal.png'),timeout:90000});
    const paused=await canvas.evaluate((c:any)=>{const w=window as any;w.skipMammalRender=true;c._rhCommand('pause');const before=c._rhSnapshot().groundPreyGaits,angles=w.mammalAngles();w.stepMammal(60000);return {before,after:c._rhSnapshot().groundPreyGaits,samePose:JSON.stringify(angles)===JSON.stringify(w.mammalAngles())};});expect(paused.after).toEqual(paused.before);expect(paused.samePose).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const quiet=await canvas.evaluate((c:any)=>{const w=window as any,rest=c._rhSnapshot().groundPreyGaits,angles=w.mammalAngles();w.stepMammal(25);const whilePaused=c._rhSnapshot().groundPreyGaits;c._rhCommand('pause');for(let i=0;i<20;i++)w.stepMammal(25);const buffers:any[]=[];w.mammalVisual.traverse((o:any)=>{if(o.geometry)buffers.push(o.geometry.attributes.position);});return {rest,whilePaused,after:c._rhSnapshot().groundPreyGaits,angles,samePositions:buffers.every((b:any,i:number)=>b===w.mammalBuffers[i]),identity:w.mammalIdentity()};});
    expect(quiet.whilePaused).toEqual(quiet.rest);for(const p of quiet.after){expect(p.front).toBe(0);expect(p.hind).toBe(0);expect(p.bob).toBe(0);if(p.strides)expect(p.strides).toEqual([0,0,0,0]);}expect(quiet.angles.every((v:any)=>v[0]===0)).toBe(true);expect(quiet.after.map((p:any)=>p.phase)).toEqual(quiet.rest.map((p:any)=>p.phase));expect(quiet.samePositions).toBe(true);expect(quiet.identity).toEqual(review.identity);
    await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
    const resumed=await canvas.evaluate((c:any)=>{const w=window as any,before=c._rhSnapshot().groundPreyGaits;w.stepMammal(25);return {before,after:c._rhSnapshot().groundPreyGaits};});
    expect(resumed.after.some((p:any,i:number)=>Math.abs(p.phase-resumed.before[i].phase)>.001)).toBe(true);
    for(let i=0;i<resumed.after.length;i++){const d=resumed.after[i].phase-resumed.before[i].phase;expect(Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))).toBeLessThan(.41);}
    if(model.width===320){await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);}
    const caught=await canvas.evaluate((c:any)=>{
      const w=window as any,before=c._rhSnapshot(),identity=w.mammalIdentity();w.mammalCamera.copy(w.flightCamera);c._rhCommand('scenic',false);const p=before.raptorPosition,h=before.headingRadians,pitch=before.pitchRadians;
      w.mammalRoots.forEach((o:any,i:number)=>o.position.set(o===w.mammalChosen?p.x+Math.sin(h)*Math.cos(pitch)*3:2000+i*20,o===w.mammalChosen?p.y+Math.sin(pitch)*3:2000,o===w.mammalChosen?p.z-Math.cos(h)*Math.cos(pitch)*3:2000));
      c._rhCommand('strike');w.stepMammal(25);const after=c._rhSnapshot();return {catchDelta:after.missionCatches-before.missionCatches,carried:after.carriedPreyMs,sameIdentity:JSON.stringify(identity)===JSON.stringify(w.mammalIdentity()),headPitch:w.mammalVisual.rotation.x,headRoll:w.mammalVisual.rotation.z,offset:w.mammalVisual.position.y,label:after.carriedPreyLabel,angles:w.mammalAngles(),tail:w.mammalVisual.getObjectByName('prey-mammal-tail').rotation.z};
    });
    expect(caught.catchDelta).toBe(1);expect(caught.carried).toBeGreaterThan(0);expect(caught.label).toBe(model.name);for(const angles of caught.angles)expect(angles[0]).toBe(0);expect(caught.tail).toBe(0);expect(caught.sameIdentity).toBe(true);expect(caught.headPitch).toBeCloseTo(0,10);expect(caught.headRoll).toBeCloseTo(0,10);expect(caught.offset).toBe(0);
    await canvas.evaluate(()=>{const w=window as any;w.skipMammalRender=false;w.mammalRenderer.render(w.mammalScene,w.mammalCamera);});
    if(model.width===320)await expect.poll(()=>stage.evaluate((s:any)=>{const cue=s.querySelector('.rh-flight-target-cue').getBoundingClientRect(),progress=s.querySelector('.rh-flight-mission-hud').getBoundingClientRect();return progress.top-cue.bottom;})).toBeGreaterThanOrEqual(7);
    await stage.screenshot({path:resolve(output,model.label+'-mammal-catch.png'),timeout:90000});
    const expired=await canvas.evaluate((c:any)=>{const w=window as any;w.skipMammalRender=true;for(let i=0;i<28;i++)w.stepMammal(50);return {remaining:c._rhSnapshot().carriedPreyMs,disposed:w.mammalDisposed};});expect(expired.remaining).toBe(0);expect(expired.disposed).toHaveLength(7);expect(new Set(expired.disposed).size).toBe(7);
    await testInfo.attach('mammal-lifecycle',{body:JSON.stringify({models:review.poses.length,meshCount:review.identity.length,catchDelta:caught.catchDelta,sameIdentity:caught.sameIdentity,neutralCarry:true,disposed:expired.disposed.length,paused:true,reducedMotionWhilePaused:true,catchWithReducedMotion:model.width===320,smoothResume:true,reusedBuffers:quiet.samePositions}),contentType:'application/json'});
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
