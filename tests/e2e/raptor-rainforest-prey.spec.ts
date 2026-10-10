import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_RAINFOREST_SCREENSHOTS||resolve('scratch/raptor-rainforest-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const builders=['preyKindFor','mergeGroundPreyParts','buildRainforestPreyParts','advanceGroundPreyGait','setGroundPreyLegPose','buildPreyVisual','createPreyContactGeometry','preyContactProfile','writePreyContactPatch','finishPreyContactPatches','softenPreyContactMaterial'].map(body).join('\n');
const probes=`window.AlloPostFXEnabled=false;${builders};window.rainforestReview={build:buildPreyVisual,advance:advanceGroundPreyGait,leg:setGroundPreyLegPose,create:createPreyContactGeometry,profile:preyContactProfile,write:writePreyContactPatch,finish:finishPreyContactPatches,soften:softenPreyContactMaterial};(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.rainforestRenderer=r;r.render=function(scene,camera){window.rainforestScene=scene;window.rainforestCamera=camera;if(!window.skipRainforestRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor rainforest prey',()=>{
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
      (window as any).stepRainforest=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,quality='balanced')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'harpyEagle',activeMission:'open',flightSession:{speciesId:'harpyEagle',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");

  test('renders distinct sloth, howler, capuchin and coati markings and four limb poses',async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const study=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,api=w.rainforestReview;
      const panel=document.createElement('section');panel.id='rainforest-study';panel.style.cssText='position:fixed;left:16px;top:16px;width:1080px;height:1040px;z-index:99999;border:1px solid #537080;border-radius:12px;overflow:hidden;background:#16252f';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1080,1040);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const camera=new T.PerspectiveCamera(35,540/260,.1,100);camera.position.set(4.0,3.5,5.7);camera.lookAt(0,1.45,0);
      const rows=[{id:'sloth',label:'Three-toed sloth · face mask · resting',color:0x44403c,speed:0,maxSpeed:.25,phase:1.2},{id:'howlerMonkey',label:'Howler monkey · dark coat · walk',color:0x1c1917,speed:3,maxSpeed:5,phase:2.1},{id:'capuchin',label:'Capuchin monkey · pale face · walk',color:0x57534e,speed:3,maxSpeed:6.5,phase:3.2},{id:'coati',label:'Coati · ringed upright tail · run',color:0x92400e,speed:5,maxSpeed:5,phase:4.3}];
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
          for(let i=0;i<90;i++)api.advance(gait,row.speed,row.maxSpeed,size,'mammal',1/60,false,row.phase);
          model.legs.forEach((leg:any,i:number)=>api.leg(leg,gait.strides[i]));model.tail.rotation.z=gait.tail;model.root.position.y=gait.bob;root.add(model.root);
        }
        const geometry=api.create(1),material=new T.MeshBasicMaterial({color:new T.Color(0x263448).convertSRGBToLinear(),transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});api.soften(material,{value:1});api.write(geometry,0,0,0,0,api.profile({},size,0,'mammal',0),()=>0);api.finish(geometry,1);const shadow=new T.Mesh(geometry,material);shadow.frustumCulled=false;scene.add(shadow);
        scenes.push(scene);renderer.setViewport(col*540,(3-r)*260,540,260);renderer.setScissor(col*540,(3-r)*260,540,260);renderer.render(scene,camera);
        root.updateMatrixWorld(true);let clearance=Infinity;const point=new T.Vector3();root.traverse((o:any)=>{if(!o.geometry)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);clearance=Math.min(clearance,point.y);}});
        evidence.push({label:row.label,updated:col===1,minimumClearance:clearance,calls:renderer.info.render.calls,strides:gait?.strides,rate:gait?.rate,effort:gait?.effort,id:row.id});
        const label=document.createElement('div');label.textContent=(col?'UPDATED':'PREVIOUS')+' · '+row.label;label.style.cssText=`position:absolute;left:${col*540+18}px;top:${r*260+225}px;width:504px;padding:7px 0;border-radius:6px;background:rgba(9,24,34,.88);text-align:center;color:#e5ece8;font:600 11px system-ui;letter-spacing:.05em`;panel.appendChild(label);
      }});
      w.closeRainforestStudy=()=>{const resources=new Set<any>();scenes.forEach(scene=>scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);}));resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};
      return {evidence,textures:renderer.info.memory.textures};
    });
    expect(study.textures).toBe(0);for(const sample of study.evidence){expect(sample.calls).toBe(sample.updated?9:7);expect(sample.minimumClearance).toBeGreaterThanOrEqual(-.00001);if(sample.updated){expect(sample.strides).toHaveLength(4);if(sample.id==='sloth'){expect(sample.rate).toBe(0);expect(sample.effort).toBe(0);expect(sample.strides.map(Math.abs)).toEqual([0,0,0,0]);}}}
    await page.locator('#rainforest-study').screenshot({path:resolve(output,'rainforest-before-after.png'),timeout:90000});await testInfo.attach('rainforest-study',{body:JSON.stringify(study),contentType:'application/json'});await page.evaluate(()=>(window as any).closeRainforestStudy());expect(errors).toEqual([]);
  });

  for(const model of [{label:'sloth-day-desktop',id:'sloth',name:'Three-toed Sloth',width:880,quality:'balanced',phase:.44},{label:'howler-day-desktop',id:'howlerMonkey',name:'Howler Monkey',width:880,quality:'high',phase:.44},{label:'capuchin-night-desktop',id:'capuchin',name:'Capuchin Monkey',width:880,quality:'balanced',phase:.93},{label:'coati-night-mobile',id:'coati',name:'Coati',width:320,quality:'low',phase:.93}])
  test(`keeps ${model.label} rainforest gait and identity through pause, reduced motion and catch`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    if(model.width===320)await page.setViewportSize({width:360,height:1100});
    try{await mount(page,model.quality);}catch(error){await testInfo.attach('mount-diagnostics',{body:JSON.stringify({errors,events:await page.evaluate(()=>(window as any).__events?.errors||[]).catch(()=>['Page unavailable'])}),contentType:'application/json'});throw error;}
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.rainforestRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    const review=await canvas.evaluate((c:any,setup)=>{
      const w=window as any,T=w.THREE;c._rhCommand('environment',{windSpeed:0,dayPhase:setup.phase,cloudCover:.18});w.skipRainforestRender=true;w.stepRainforest(25);
      const scene=w.rainforestScene,roots=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))),chosen=roots.find((o:any)=>o.getObjectByName('prey-mammal-'+setup.id));
      if(!chosen)throw Error('Seeded Harpy Eagle session has no '+setup.id);
      const firstPosition=chosen.position.clone(),firstGait=c._rhSnapshot().groundPreyGaits.find((p:any)=>p.id===setup.id);
      for(let i=0;i<35;i++)w.stepRainforest(25);w.skipRainforestRender=false;
      const stillness={distance:chosen.position.distanceTo(firstPosition),firstPhase:firstGait.phase,lastPhase:c._rhSnapshot().groundPreyGaits.find((p:any)=>p.id===setup.id).phase};
      const visual=chosen.children.find((o:any)=>o.name.startsWith('prey-'));w.rainforestChosen=chosen;w.rainforestRoots=roots;w.rainforestVisual=visual;w.rainforestDisposed=[];
      visual.traverse((o:any)=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>w.rainforestDisposed.push(o.geometry.uuid));});w.rainforestIdentity=()=>{const ids:any[]=[];visual.traverse((o:any)=>{if(o.isMesh)ids.push([o.geometry.uuid,o.material.uuid]);});return ids;};
      w.rainforestBuffers=[];visual.traverse((o:any)=>{if(o.geometry)w.rainforestBuffers.push(o.geometry.attributes.position);});w.rainforestLegs=visual.children.filter((o:any)=>/^prey-rainforest-(front|hind)-/.test(o.name));w.rainforestAngles=()=>w.rainforestLegs.map((o:any)=>[o.rotation.x,o.position.y]);
      w.flightCamera=w.rainforestCamera.clone();const box=new T.Box3().setFromObject(visual),v=box.getSize(new T.Vector3()),radius=Math.max(v.x,v.y,v.z)*.5,angle=Math.tan(w.rainforestCamera.fov*Math.PI/360),distance=Math.max(3,radius/Math.min(angle,angle*w.rainforestCamera.aspect)*1.50);
      const h=visual.rotation.y,offset=new T.Vector3(Math.cos(h)*.7+Math.sin(h)*.8,.55,-Math.sin(h)*.7+Math.cos(h)*.8).normalize().multiplyScalar(distance),center=box.getCenter(new T.Vector3());
      w.rainforestCamera.position.copy(center).add(offset);w.rainforestCamera.lookAt(center);c._rhCommand('scenic',true);w.rainforestRenderer.render(scene,w.rainforestCamera);
      return {stillness,poses:c._rhSnapshot().groundPreyGaits,identity:w.rainforestIdentity(),calls:w.rainforestRenderer.info.render.calls,textures:w.rainforestRenderer.info.memory.textures,legAngles:w.rainforestAngles(),position:chosen.position.toArray()};
    },{phase:model.phase,id:model.id});
    expect(review.identity).toHaveLength(7);expect(new Set(review.identity.map((entry:any)=>entry[1])).size).toBe(1);const chosenGait=review.poses.find((s:any)=>s.id===model.id);expect(chosenGait?.strides).toHaveLength(4);expect(review.legAngles).toHaveLength(4);if(model.id==='sloth'){expect(review.stillness.distance).toBeLessThan(.000001);expect(review.stillness.lastPhase).toBe(review.stillness.firstPhase);expect(chosenGait.rate).toBe(0);expect(chosenGait.effort).toBe(0);expect(chosenGait.strides.map(Math.abs)).toEqual([0,0,0,0]);}else expect(Math.abs(review.stillness.lastPhase-review.stillness.firstPhase)).toBeGreaterThan(.001);
    await stage.screenshot({path:resolve(output,model.label+'-rainforest.png'),timeout:90000});
    const paused=await canvas.evaluate((c:any)=>{const w=window as any;w.skipRainforestRender=true;c._rhCommand('pause');const before=c._rhSnapshot().groundPreyGaits,angles=w.rainforestAngles();w.stepRainforest(60000);return {before,after:c._rhSnapshot().groundPreyGaits,samePose:JSON.stringify(angles)===JSON.stringify(w.rainforestAngles())};});expect(paused.after).toEqual(paused.before);expect(paused.samePose).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const quiet=await canvas.evaluate((c:any)=>{const w=window as any,rest=c._rhSnapshot().groundPreyGaits,angles=w.rainforestAngles();w.stepRainforest(25);const whilePaused=c._rhSnapshot().groundPreyGaits;c._rhCommand('pause');for(let i=0;i<20;i++)w.stepRainforest(25);const buffers:any[]=[];w.rainforestVisual.traverse((o:any)=>{if(o.geometry)buffers.push(o.geometry.attributes.position);});return {rest,whilePaused,after:c._rhSnapshot().groundPreyGaits,angles,samePositions:buffers.every((b:any,i:number)=>b===w.rainforestBuffers[i]),identity:w.rainforestIdentity()};});
    expect(quiet.whilePaused).toEqual(quiet.rest);for(const p of quiet.after){expect(p.front).toBe(0);expect(p.hind).toBe(0);expect(p.bob).toBe(0);if(p.strides)expect(p.strides.map(Math.abs)).toEqual([0,0,0,0]);}expect(quiet.angles.every((v:any)=>v[0]===0)).toBe(true);expect(quiet.after.map((p:any)=>p.phase)).toEqual(quiet.rest.map((p:any)=>p.phase));expect(quiet.samePositions).toBe(true);expect(quiet.identity).toEqual(review.identity);
    await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
    const resumed=await canvas.evaluate((c:any)=>{const w=window as any,before=c._rhSnapshot().groundPreyGaits;w.stepRainforest(25);return {before,after:c._rhSnapshot().groundPreyGaits};});
    const resumedChosen=resumed.after.find((p:any)=>p.id===model.id),beforeChosen=resumed.before.find((p:any)=>p.id===model.id);if(model.id==='sloth'){expect(resumedChosen.phase).toBe(beforeChosen.phase);expect(resumedChosen.strides.map(Math.abs)).toEqual([0,0,0,0]);}else{expect(Math.abs(resumedChosen.phase-beforeChosen.phase)).toBeGreaterThan(0);expect(resumedChosen.rate).toBeGreaterThan(0);expect(resumedChosen.effort).toBeGreaterThan(0);}
    for(let i=0;i<resumed.after.length;i++){const d=resumed.after[i].phase-resumed.before[i].phase;expect(Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))).toBeLessThan(.41);}
    if(model.width===320){await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);}
    const caught=await canvas.evaluate((c:any)=>{
      const w=window as any,before=c._rhSnapshot(),identity=w.rainforestIdentity();w.rainforestCamera.copy(w.flightCamera);c._rhCommand('scenic',false);const p=before.raptorPosition,h=before.headingRadians,pitch=before.pitchRadians;
      w.rainforestRoots.forEach((o:any,i:number)=>o.position.set(o===w.rainforestChosen?p.x+Math.sin(h)*Math.cos(pitch)*3:2000+i*20,o===w.rainforestChosen?p.y+Math.sin(pitch)*3:2000,o===w.rainforestChosen?p.z-Math.cos(h)*Math.cos(pitch)*3:2000));
      c._rhCommand('strike');w.stepRainforest(25);const after=c._rhSnapshot();return {catchDelta:after.missionCatches-before.missionCatches,carried:after.carriedPreyMs,sameIdentity:JSON.stringify(identity)===JSON.stringify(w.rainforestIdentity()),headPitch:w.rainforestVisual.rotation.x,headRoll:w.rainforestVisual.rotation.z,offset:w.rainforestVisual.position.y,label:after.carriedPreyLabel,angles:w.rainforestAngles(),tail:w.rainforestVisual.getObjectByName('prey-rainforest-tail').rotation.z};
    });
    expect(caught.catchDelta).toBe(1);expect(caught.carried).toBeGreaterThan(0);expect(caught.label).toBe(model.name);for(const angles of caught.angles)expect(angles[0]).toBe(0);expect(caught.tail).toBe(0);expect(caught.sameIdentity).toBe(true);expect(caught.headPitch).toBeCloseTo(0,10);expect(caught.headRoll).toBeCloseTo(0,10);expect(caught.offset).toBe(0);
    await canvas.evaluate(()=>{const w=window as any;w.skipRainforestRender=false;w.rainforestRenderer.render(w.rainforestScene,w.rainforestCamera);});
    if(model.width===320)await expect.poll(()=>stage.evaluate((s:any)=>{const cue=s.querySelector('.rh-flight-target-cue').getBoundingClientRect(),progress=s.querySelector('.rh-flight-mission-hud').getBoundingClientRect();return progress.top-cue.bottom;})).toBeGreaterThanOrEqual(7);
    await stage.screenshot({path:resolve(output,model.label+'-rainforest-catch.png'),timeout:90000});
    const expired=await canvas.evaluate((c:any)=>{const w=window as any;w.skipRainforestRender=true;for(let i=0;i<28;i++)w.stepRainforest(50);return {remaining:c._rhSnapshot().carriedPreyMs,disposed:w.rainforestDisposed};});expect(expired.remaining).toBe(0);expect(expired.disposed).toHaveLength(7);expect(new Set(expired.disposed).size).toBe(7);
    await testInfo.attach('rainforest-lifecycle',{body:JSON.stringify({models:review.poses.length,stillness:review.stillness,meshCount:review.identity.length,catchDelta:caught.catchDelta,sameIdentity:caught.sameIdentity,neutralCarry:true,disposed:expired.disposed.length,paused:true,reducedMotionWhilePaused:true,catchWithReducedMotion:model.width===320,smoothResume:true,reusedBuffers:quiet.samePositions}),contentType:'application/json'});
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
