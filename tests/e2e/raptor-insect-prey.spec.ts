import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_INSECT_SCREENSHOTS||resolve('scratch/raptor-insect-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const builders=['preyKindFor','mergeGroundPreyParts','createInsectWingGeometry','buildInsectPreyParts','advanceInsectFlight','applyInsectFlight','buildPreyVisual','createPreyContactGeometry','preyContactProfile','writePreyContactPatch','finishPreyContactPatches','softenPreyContactMaterial'].map(body).join('\n');
const probes=`window.AlloPostFXEnabled=false;${builders};window.insectReview={build:buildPreyVisual,advance:advanceInsectFlight,apply:applyInsectFlight,create:createPreyContactGeometry,profile:preyContactProfile,write:writePreyContactPatch,finish:finishPreyContactPatches,soften:softenPreyContactMaterial};(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.insectRenderer=r;r.render=function(scene,camera){window.insectScene=scene;window.insectCamera=camera;if(!window.skipInsectRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor insect prey',()=>{
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
      (window as any).stepInsect=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,species='missKite',quality='balanced')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:'open',flightSession:{speciesId:species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");

  test('renders distinct veined cicada, dragonfly and large insect models',async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const study=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,api=w.insectReview;
      const panel=document.createElement('section');panel.id='insect-study';panel.style.cssText='position:fixed;left:16px;top:16px;width:1080px;height:780px;z-index:99999;border:1px solid #537080;border-radius:12px;overflow:hidden;background:#16252f';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1080,780);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const camera=new T.PerspectiveCamera(35,540/260,.1,100);camera.position.set(2.5,4.8,4.4);camera.lookAt(0,1.45,0);
      const rows=[{id:'cicada',label:'Cicada · broad forewings',phase:1.2},{id:'dragonfly',label:'Dragonfly · slim banded abdomen',phase:2.1},{id:'largeInsect',label:'Large insect · olive markings',phase:4.3}];
      const scenes:any[]=[],evidence:any[]=[];
      rows.forEach((row,r)=>{for(let col=0;col<2;col++){
        const scene=new T.Scene();scene.background=new T.Color(0x16252f);scene.add(new T.HemisphereLight(0xe0edff,0x6b6652,.85));const key=new T.DirectionalLight(0xffebce,1.2);key.position.set(3,7,5);scene.add(key);
        const floorGeometry=new T.PlaneGeometry(5,5,40,40);floorGeometry.rotateX(-Math.PI/2);const fp=floorGeometry.attributes.position;for(let i=0;i<fp.count;i++)fp.setY(i,0);floorGeometry.computeVertexNormals();scene.add(new T.Mesh(floorGeometry,new T.MeshStandardMaterial({color:new T.Color(0x8a9b74).convertSRGBToLinear(),roughness:1})));
        const size=2,root=new T.Group();root.position.y=size*.156+1;scene.add(root);
        if(col===0){
          const body=new T.Mesh(new T.SphereGeometry(size*.24,8,6),new T.MeshStandardMaterial({color:0x1c1917,roughness:.82}));body.scale.set(.65,.65,1.8);root.add(body);
          const mat=new T.MeshStandardMaterial({color:0xe7e5e4,roughness:.82});[-1,1].forEach(side=>{const wing=new T.Mesh(new T.BoxGeometry(size*.65,.018,size*.22),mat);wing.position.set(side*size*.38,size*.04,0);wing.rotation.z=-side*Math.sin(row.phase*1.7)*.4;root.add(wing);});
        }else{
          const model=api.build({id:row.id,color:0x84cc16},size);for(let i=0;i<90;i++)api.advance(model.insect,5,5,1,1/60,false,row.phase);api.apply(model,0);root.add(model.root);
        }
        const geometry=api.create(1),material=new T.MeshBasicMaterial({color:new T.Color(0x263448).convertSRGBToLinear(),transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});api.soften(material,{value:1});api.write(geometry,0,0,0,0,api.profile({},size,1,'insect',0),()=>0);api.finish(geometry,1);const shadow=new T.Mesh(geometry,material);shadow.frustumCulled=false;scene.add(shadow);
        scenes.push(scene);renderer.setViewport(col*540,(2-r)*260,540,260);renderer.setScissor(col*540,(2-r)*260,540,260);renderer.render(scene,camera);
        root.updateMatrixWorld(true);let clearance=Infinity;const point=new T.Vector3();root.traverse((o:any)=>{if(!o.geometry)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);clearance=Math.min(clearance,point.y);}});
        evidence.push({label:row.label,updated:col===1,minimumClearance:clearance,calls:renderer.info.render.calls,phase:row.phase});
        const label=document.createElement('div');label.textContent=(col?'UPDATED':'PREVIOUS')+' · '+row.label;label.style.cssText=`position:absolute;left:${col*540+18}px;top:${r*260+225}px;width:504px;padding:7px 0;border-radius:6px;background:rgba(9,24,34,.88);text-align:center;color:#e5ece8;font:600 11px system-ui;letter-spacing:.05em`;panel.appendChild(label);
      }});
      w.closeInsectStudy=()=>{const resources=new Set<any>();scenes.forEach(scene=>scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);}));resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};
      return {evidence,textures:renderer.info.memory.textures};
    });
    expect(study.textures).toBe(0);for(const sample of study.evidence){expect(sample.calls).toBe(sample.updated?7:5);if(sample.updated)expect(sample.minimumClearance).toBeGreaterThan(.01);}
    await page.locator('#insect-study').screenshot({path:resolve(output,'insect-before-after.png'),timeout:90000});await testInfo.attach('insect-study',{body:JSON.stringify(study),contentType:'application/json'});await page.evaluate(()=>(window as any).closeInsectStudy());expect(errors).toEqual([]);
  });

  for(const model of [{label:'dragonfly-day-desktop',id:'dragonfly',species:'missKite',width:880,quality:'high',phase:.44},{label:'cicada-day-desktop',id:'cicada',species:'missKite',width:880,quality:'balanced',phase:.44},{label:'large-insect-night-mobile',id:'largeInsect',species:'missKite',width:320,quality:'low',phase:.93}])
  test(`keeps ${model.label} insect motion and identity through pause, reduced motion and catch`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    if(model.width===320)await page.setViewportSize({width:360,height:1100});
    try{await mount(page,model.species,model.quality);}catch(error){await testInfo.attach('mount-diagnostics',{body:JSON.stringify({errors,events:await page.evaluate(()=>(window as any).__events?.errors||[]).catch(()=>['Page unavailable'])}),contentType:'application/json'});throw error;}
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.insectRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    const review=await canvas.evaluate((c:any,setup)=>{
      const w=window as any,T=w.THREE;c._rhCommand('environment',{windSpeed:0,dayPhase:setup.phase,cloudCover:.18});w.stepInsect(25);
      const scene=w.insectScene,roots=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))),chosen=roots.find((o:any)=>o.getObjectByName('prey-insect-'+setup.id));
      if(!chosen)throw Error('Seeded session has no insect');
      const player=c._rhSnapshot().raptorPosition;chosen.position.set(player.x+12,player.y,player.z);w.skipInsectRender=true;for(let i=0;i<36;i++)w.stepInsect(25);w.skipInsectRender=false;
      const visual=chosen.children.find((o:any)=>o.name.startsWith('prey-'));w.insectChosen=chosen;w.insectRoots=roots;w.insectVisual=visual;w.insectDisposed=[];
      visual.traverse((o:any)=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>w.insectDisposed.push(o.geometry.uuid));});w.insectIdentity=()=>{const ids:any[]=[];visual.traverse((o:any)=>{if(o.isMesh)ids.push([o.geometry.uuid,o.material.uuid]);});return ids;};
      const g=chosen.getObjectByName('prey-insect-body').geometry;w.insectBuffer=g.attributes.position;w.insectWings=visual.children.filter((o:any)=>o.name.includes('wing'));w.insectAngles=()=>w.insectWings.map((o:any)=>[o.rotation.y,o.rotation.z]);
      w.flightCamera=w.insectCamera.clone();const box=new T.Box3().setFromObject(visual),v=box.getSize(new T.Vector3()),radius=Math.max(v.x,v.y,v.z)*.5,angle=Math.tan(w.insectCamera.fov*Math.PI/360),distance=Math.max(3,radius/Math.min(angle,angle*w.insectCamera.aspect)*1.45);
      const h=visual.rotation.y,offset=new T.Vector3(Math.cos(h)*.6+Math.sin(h)*.7,.80,-Math.sin(h)*.6+Math.cos(h)*.7).normalize().multiplyScalar(distance),p=chosen.position;
      w.insectCamera.position.copy(p).add(offset);w.insectCamera.lookAt(p.x,p.y-radius*.05,p.z);c._rhCommand('scenic',true);w.insectRenderer.render(scene,w.insectCamera);
      return {poses:c._rhSnapshot().insectFlightPoses,identity:w.insectIdentity(),calls:w.insectRenderer.info.render.calls,textures:w.insectRenderer.info.memory.textures};
    },{phase:model.phase,id:model.id});
    expect(review.identity).toHaveLength(5);expect(review.poses.length).toBeGreaterThan(0);expect(review.poses.some((s:any)=>s.phase>0)).toBe(true);expect(review.poses.some((p:any)=>p.id===model.id&&p.height>1&&p.amplitude>.3)).toBe(true);
    await stage.screenshot({path:resolve(output,model.label+'-insect.png'),timeout:90000});
    const paused=await canvas.evaluate((c:any)=>{const w=window as any;w.skipInsectRender=true;c._rhCommand('pause');const before=c._rhSnapshot().insectFlightPoses,angles=w.insectAngles();w.stepInsect(60000);return {before,after:c._rhSnapshot().insectFlightPoses,sameVertices:JSON.stringify(angles)===JSON.stringify(w.insectAngles())};});expect(paused.after).toEqual(paused.before);expect(paused.sameVertices).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const quiet=await canvas.evaluate((c:any)=>{const w=window as any,before=c._rhSnapshot().insectFlightPoses;c._rhCommand('pause');for(let i=0;i<20;i++)w.stepInsect(25);const g=w.insectChosen.getObjectByName('prey-insect-body').geometry;return {before,after:c._rhSnapshot().insectFlightPoses,samePosition:g.attributes.position===w.insectBuffer,identity:w.insectIdentity()};});
    for(const p of quiet.after){expect(p.fore).toBe(.12);expect(p.hind).toBe(.12);expect(p.bob).toBe(0);expect(p.pitch).toBe(0);expect(p.amplitude).toBe(0);}expect(quiet.after.map((p:any)=>p.phase)).toEqual(quiet.before.map((p:any)=>p.phase));expect(quiet.samePosition).toBe(true);expect(quiet.identity).toEqual(review.identity);
    if(model.width!==320){
      await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
      const resumed=await canvas.evaluate((c:any)=>{const w=window as any,before=c._rhSnapshot().insectFlightPoses;w.stepInsect(25);return {before,after:c._rhSnapshot().insectFlightPoses};});
      expect(resumed.after.some((p:any,i:number)=>Math.abs(p.phase-resumed.before[i].phase)>.001)).toBe(true);
      for(let i=0;i<resumed.after.length;i++){const d=resumed.after[i].phase-resumed.before[i].phase;expect(Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))).toBeLessThan(.76);}
    }
    const caught=await canvas.evaluate((c:any)=>{
      const w=window as any,before=c._rhSnapshot(),identity=w.insectIdentity();w.insectCamera.copy(w.flightCamera);c._rhCommand('scenic',false);const p=before.raptorPosition,h=before.headingRadians,pitch=before.pitchRadians;
      w.insectRoots.forEach((o:any,i:number)=>o.position.set(o===w.insectChosen?p.x+Math.sin(h)*Math.cos(pitch)*3:2000+i*20,o===w.insectChosen?p.y+Math.sin(pitch)*3:2000,o===w.insectChosen?p.z-Math.cos(h)*Math.cos(pitch)*3:2000));
      c._rhCommand('strike');w.stepInsect(25);const after=c._rhSnapshot();return {catchDelta:after.missionCatches-before.missionCatches,carried:after.carriedPreyMs,sameIdentity:JSON.stringify(identity)===JSON.stringify(w.insectIdentity()),headPitch:w.insectVisual.rotation.x,headRoll:w.insectVisual.rotation.z,offset:w.insectVisual.position.y,label:after.carriedPreyLabel,angles:w.insectAngles()};
    });
    expect(caught.catchDelta).toBe(1);expect(caught.carried).toBeGreaterThan(0);expect(caught.label).toBe(model.id==='cicada'?'Cicada':model.id==='dragonfly'?'Dragonfly':'Cicada/Dragonfly');for(const angles of caught.angles)expect(Math.abs(angles[1])).toBeCloseTo(.12,9);expect(caught.sameIdentity).toBe(true);expect(caught.headPitch).toBeCloseTo(0,10);expect(caught.headRoll).toBeCloseTo(0,10);expect(caught.offset).toBe(0);
    await canvas.evaluate(()=>{const w=window as any;w.skipInsectRender=false;w.insectRenderer.render(w.insectScene,w.insectCamera);});
    if(model.width===320)await expect.poll(()=>stage.evaluate((s:any)=>{const cue=s.querySelector('.rh-flight-target-cue').getBoundingClientRect(),progress=s.querySelector('.rh-flight-mission-hud').getBoundingClientRect();return progress.top-cue.bottom;})).toBeGreaterThanOrEqual(7);
    await stage.screenshot({path:resolve(output,model.label+'-insect-catch.png'),timeout:90000});
    const expired=await canvas.evaluate((c:any)=>{const w=window as any;w.skipInsectRender=true;for(let i=0;i<28;i++)w.stepInsect(50);return {remaining:c._rhSnapshot().carriedPreyMs,disposed:w.insectDisposed};});expect(expired.remaining).toBe(0);expect(expired.disposed).toHaveLength(5);expect(new Set(expired.disposed).size).toBe(5);
    await testInfo.attach('insect-lifecycle',{body:JSON.stringify({insects:review.poses.length,meshCount:review.identity.length,catchDelta:caught.catchDelta,sameIdentity:caught.sameIdentity,neutralCarry:true,disposed:expired.disposed.length,paused:true,reducedMotion:true,catchWithReducedMotion:model.width===320,smoothResume:model.width!==320,reusedBuffers:quiet.samePosition}),contentType:'application/json'});
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
