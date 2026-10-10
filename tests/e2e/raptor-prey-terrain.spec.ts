import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_TERRAIN_SCREENSHOTS||resolve('scratch/raptor-prey-terrain-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const builders=['preyKindFor','mergeGroundPreyParts','buildGroundPreyParts','buildPreyVisual','advanceGroundPreyTerrain','createPreyContactGeometry','preyContactProfile','writePreyContactPatch','finishPreyContactPatches','softenPreyContactMaterial'].map(body).join('\n');
const probes=`window.AlloPostFXEnabled=false;${builders};window.terrainReview={build:buildPreyVisual,pose:advanceGroundPreyTerrain,create:createPreyContactGeometry,profile:preyContactProfile,write:writePreyContactPatch,finish:finishPreyContactPatches,soften:softenPreyContactMaterial};(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.terrainRenderer=r;r.render=function(scene,camera){window.terrainScene=scene;window.terrainCamera=camera;if(!window.skipTerrainRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor prey terrain posture',()=>{
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
      (window as any).stepTerrain=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,species='redTail',quality='balanced')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:'open',flightSession:{speciesId:species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");

  test('renders supported paws on uphill, cross-slope and downhill ground',async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const study=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,api=w.terrainReview;
      const panel=document.createElement('section');panel.id='terrain-study';panel.style.cssText='position:fixed;left:16px;top:16px;width:1080px;height:840px;z-index:99999;border:1px solid #537080;border-radius:12px;overflow:hidden;background:#16252f';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1080,840);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const camera=new T.PerspectiveCamera(38,540/280,.1,100);camera.position.set(3.3,2.8,5.3);camera.lookAt(0,.65,0);
      const rows=[{id:'rabbit',label:'Cottontail · uphill',height:(x:number,z:number)=>.35*z},{id:'squirrel',label:'Squirrel · cross slope',height:(x:number,z:number)=>.28*x-.1*z},{id:'arcticHare',label:'Arctic hare · downhill',height:(x:number,z:number)=>-.38*z}];
      const scenes:any[]=[],evidence:any[]=[];
      rows.forEach((row,r)=>{for(let col=0;col<2;col++){
        const scene=new T.Scene();scene.background=new T.Color(0x16252f);scene.add(new T.HemisphereLight(0xe0edff,0x6b6652,.8));const key=new T.DirectionalLight(0xffebce,1.2);key.position.set(3,7,5);scene.add(key);
        const floorGeometry=new T.PlaneGeometry(6,5,24,24);floorGeometry.rotateX(-Math.PI/2);const p=floorGeometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,row.height(p.getX(i),p.getZ(i)));floorGeometry.computeVertexNormals();scene.add(new T.Mesh(floorGeometry,new T.MeshStandardMaterial({color:new T.Color(0x8a9b74).convertSRGBToLinear(),roughness:1})));
        const model=api.build({id:row.id,color:0xa78b6f},1.8),clearance=1.8*.42;model.root.position.y=clearance;
        if(col===1){const t=model.gait.terrain;api.pose(t,0,clearance,0,0,1.8,clearance,0,true,row.height);model.root.rotation.set(t.pitch,0,t.roll,'YXZ');model.root.position.y+=t.lift;}
        scene.add(model.root);model.root.updateMatrixWorld(true);let min=Infinity;const point=new T.Vector3();model.legs.forEach((leg:any)=>{const p=leg.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(leg.matrixWorld);min=Math.min(min,point.y-row.height(point.x,point.z));}});
        const geometry=api.create(1),material=new T.MeshBasicMaterial({color:new T.Color(0x263448).convertSRGBToLinear(),transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});api.soften(material,{value:1});api.write(geometry,0,0,0,0,api.profile({},1.8,0,model.kind,0),row.height);api.finish(geometry,1);const shadow=new T.Mesh(geometry,material);shadow.frustumCulled=false;scene.add(shadow);
        scenes.push(scene);renderer.setViewport(col*540,(2-r)*280,540,280);renderer.setScissor(col*540,(2-r)*280,540,280);renderer.render(scene,camera);evidence.push({label:row.label,updated:col===1,minimumFootClearance:min,pitch:model.root.rotation.x,roll:model.root.rotation.z,lift:model.gait.terrain.lift,calls:renderer.info.render.calls});
        const label=document.createElement('div');label.textContent=(col?'SUPPORTED':'PREVIOUS')+' · '+row.label;label.style.cssText=`position:absolute;left:${col*540+18}px;top:${r*280+246}px;width:504px;padding:7px 0;border-radius:6px;background:rgba(9,24,34,.88);text-align:center;color:#e5ece8;font:600 11px system-ui;letter-spacing:.05em`;panel.appendChild(label);
      }});
      w.closeTerrainStudy=()=>{const resources=new Set<any>();scenes.forEach(scene=>scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);}));resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};
      return {evidence,textures:renderer.info.memory.textures};
    });
    expect(study.textures).toBe(0);for(const sample of study.evidence){expect(sample.calls).toBe(7);if(sample.updated)expect(sample.minimumFootClearance).toBeGreaterThan(-1e-5);else expect(sample.minimumFootClearance).toBeLessThan(-.04);}
    await page.locator('#terrain-study').screenshot({path:resolve(output,'prey-terrain-study.png'),timeout:90000});await testInfo.attach('terrain-study',{body:JSON.stringify(study),contentType:'application/json'});await page.evaluate(()=>(window as any).closeTerrainStudy());expect(errors).toEqual([]);
  });

  for(const model of [{label:'day-desktop',species:'redTail',width:880,quality:'high',phase:.44},{label:'night-mobile',species:'greatHorned',width:320,quality:'low',phase:.93}])
  test(`keeps ${model.label} slope support through pause, reduced motion and catch`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    if(model.width===320)await page.setViewportSize({width:360,height:1100});
    try{await mount(page,model.species,model.quality);}catch(error){
      await testInfo.attach('mount-diagnostics',{body:JSON.stringify({errors,events:await page.evaluate(()=>(window as any).__events?.errors||[]).catch(()=>['Page unavailable'])}),contentType:'application/json'});throw error;
    }
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.terrainRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    const review=await canvas.evaluate((c:any,phase)=>{
      const w=window as any,T=w.THREE;c._rhCommand('environment',{windSpeed:0,dayPhase:phase,cloudCover:.18});for(let i=0;i<8;i++)w.stepTerrain(25);
      const scene=w.terrainScene,roots=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))),ground=roots.filter((o:any)=>o.getObjectByName('prey-ground-face'));
      ground.sort((a:any,b:any)=>{const pose=(o:any)=>{const v=o.children.find((x:any)=>x.name.startsWith('prey-'));return Math.abs(v.rotation.x)+Math.abs(v.rotation.z);};return pose(b)-pose(a);});
      const chosen=ground[0],visual=chosen.children.find((o:any)=>o.name.startsWith('prey-'));w.terrainChosen=chosen;w.terrainRoots=roots;w.terrainVisual=visual;w.terrainDisposed=[];
      visual.traverse((o:any)=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>w.terrainDisposed.push(o.geometry.uuid));});w.terrainIdentity=()=>{const ids:any[]=[];visual.traverse((o:any)=>{if(o.isMesh)ids.push([o.geometry.uuid,o.material.uuid]);});return ids;};
      w.flightCamera=w.terrainCamera.clone();const box=new T.Box3().setFromObject(visual),v=box.getSize(new T.Vector3()),radius=Math.max(v.x,v.y,v.z)*.5,angle=Math.tan(w.terrainCamera.fov*Math.PI/360),distance=Math.max(11,radius/Math.min(angle,angle*w.terrainCamera.aspect)*1.6);
      const h=visual.rotation.y,offset=new T.Vector3(Math.cos(h)*.55+Math.sin(h)*.75,.50,-Math.sin(h)*.55+Math.cos(h)*.75).normalize().multiplyScalar(distance),p=chosen.position;
      w.terrainCamera.position.copy(p).add(offset);w.terrainCamera.lookAt(p.x,p.y-radius*.15,p.z);c._rhCommand('scenic',true);w.terrainRenderer.render(scene,w.terrainCamera);
      return {terrain:c._rhSnapshot().groundPreyTerrain,identity:w.terrainIdentity(),selectedPitch:visual.rotation.x,selectedRoll:visual.rotation.z,calls:w.terrainRenderer.info.render.calls,textures:w.terrainRenderer.info.memory.textures,geometries:w.terrainRenderer.info.memory.geometries};
    },model.phase);
    expect(review.identity).toHaveLength(5);expect(Math.abs(review.selectedPitch)+Math.abs(review.selectedRoll)).toBeGreaterThan(.001);for(const pose of review.terrain){expect(Math.abs(pose.pitch)).toBeLessThanOrEqual(.5);expect(Math.abs(pose.roll)).toBeLessThanOrEqual(.5);expect(pose.lift).toBeGreaterThanOrEqual(0);}
    await stage.screenshot({path:resolve(output,model.label+'-slope-stance.png'),timeout:90000});
    const paused=await canvas.evaluate((c:any)=>{const w=window as any;w.skipTerrainRender=true;c._rhCommand('pause');const before=c._rhSnapshot();w.stepTerrain(60000);return {before:before.groundPreyTerrain,after:c._rhSnapshot().groundPreyTerrain};});expect(paused.after).toEqual(paused.before);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const quiet=await canvas.evaluate((c:any)=>{const s=c._rhSnapshot();return {terrain:s.groundPreyTerrain,gait:s.groundPreyGaits};});
    for(const t of quiet.terrain){expect(t.visualY).toBeCloseTo(t.lift,9);expect(Number.isFinite(t.pitch)&&Number.isFinite(t.roll)).toBe(true);}for(const g of quiet.gait){expect(g.bob).toBe(0);expect(g.front).toBe(0);expect(g.hind).toBe(0);}
    const caught=await canvas.evaluate((c:any)=>{
      const w=window as any,before=c._rhSnapshot(),identity=w.terrainIdentity();w.terrainCamera.copy(w.flightCamera);c._rhCommand('scenic',false);c._rhCommand('pause');const p=before.raptorPosition,h=before.headingRadians,pitch=before.pitchRadians;
      w.terrainRoots.forEach((o:any,i:number)=>o.position.set(o===w.terrainChosen?p.x+Math.sin(h)*Math.cos(pitch)*3:2000+i*20,o===w.terrainChosen?p.y+Math.sin(pitch)*3:2000,o===w.terrainChosen?p.z-Math.cos(h)*Math.cos(pitch)*3:2000));
      c._rhCommand('strike');w.stepTerrain(25);const after=c._rhSnapshot();return {catchDelta:after.missionCatches-before.missionCatches,carried:after.carriedPreyMs,sameIdentity:JSON.stringify(identity)===JSON.stringify(w.terrainIdentity()),pitch:w.terrainVisual.rotation.x,roll:w.terrainVisual.rotation.z,offset:w.terrainVisual.position.y};
    });
    expect(caught.catchDelta).toBe(1);expect(caught.carried).toBeGreaterThan(0);expect(caught.sameIdentity).toBe(true);expect(caught.pitch).toBe(0);expect(caught.roll).toBe(0);expect(caught.offset).toBe(0);
    await canvas.evaluate(()=>{const w=window as any;w.skipTerrainRender=false;w.terrainRenderer.render(w.terrainScene,w.terrainCamera);});await stage.screenshot({path:resolve(output,model.label+'-terrain-catch.png'),timeout:90000});
    const expired=await canvas.evaluate((c:any)=>{const w=window as any;w.skipTerrainRender=true;for(let i=0;i<28;i++)w.stepTerrain(50);return {remaining:c._rhSnapshot().carriedPreyMs,disposed:w.terrainDisposed};});expect(expired.remaining).toBe(0);expect(expired.disposed).toHaveLength(5);expect(new Set(expired.disposed).size).toBe(5);
    await testInfo.attach('terrain-lifecycle',{body:JSON.stringify({selectedPitch:review.selectedPitch,selectedRoll:review.selectedRoll,groundAnimals:review.terrain.length,meshCount:review.identity.length,catchDelta:caught.catchDelta,sameIdentity:caught.sameIdentity,neutralCarry:caught.pitch===0&&caught.roll===0&&caught.offset===0,disposed:expired.disposed.length,paused:true,reducedMotion:true}),contentType:'application/json'});
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
