import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_SHADOW_SCREENSHOTS||resolve('scratch/raptor-prey-shadows-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const builders=['createPreyContactGeometry','preyContactProfile','writePreyContactPatch','finishPreyContactPatches','softenPreyContactMaterial','preyBirdPalette','createPreyBirdBodyGeometry','createPreyWingGeometry','createPreyTailGeometry','preyKindFor','mergeGroundPreyParts','buildGroundPreyParts','buildPreyVisual'].map(body).join('\n');
const probes=`window.AlloPostFXEnabled=false;${builders};window.shadowReview={create:createPreyContactGeometry,profile:preyContactProfile,write:writePreyContactPatch,finish:finishPreyContactPatches,soften:softenPreyContactMaterial,build:buildPreyVisual};(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.shadowRenderer=r;r.render=function(scene,camera){window.shadowScene=scene;window.shadowCamera=camera;if(!window.skipShadowRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor soft prey shadows',()=>{
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
      (window as any).stepShadow=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,species='redTail',quality='balanced')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:'open',flightSession:{speciesId:species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");

  test('renders soft terrain contact and a progressively lighter takeoff shadow',async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const study=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,api=w.shadowReview;
      const panel=document.createElement('section');panel.id='shadow-study';panel.style.cssText='position:fixed;left:16px;top:16px;width:1080px;height:720px;z-index:99999;border:1px solid #537080;border-radius:12px;overflow:hidden;background:#16252f';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1080,720);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const height=(x:number,z:number)=>.12*Math.sin(x*1.4)+.05*z+.1*Math.sin(z);
      const scenes:any[]=[],shadows:any[]=[],profiles:any[]=[],calls:number[]=[];
      const labels=['PREVIOUS · rigid contact disc','UPDATED · soft terrain contact','TAKEOFF · broadening shadow','HIGHER · fading shadow'];
      const camera=new T.PerspectiveCamera(38,540/360,.1,100);camera.position.set(5,5,7);camera.lookAt(0,.7,0);
      for(let index=0;index<4;index++){
        const scene=new T.Scene();scene.background=new T.Color(0x16252f);scene.add(new T.HemisphereLight(0xe0edff,0x6b6652,.8));const key=new T.DirectionalLight(0xffebce,1.2);key.position.set(3,7,5);scene.add(key);
        const floorGeometry=new T.PlaneGeometry(7,7,56,56);floorGeometry.rotateX(-Math.PI/2);const p=floorGeometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,height(p.getX(i),p.getZ(i)));floorGeometry.computeVertexNormals();
        const floor=new T.Mesh(floorGeometry,new T.MeshStandardMaterial({color:new T.Color(0x8a9b74).convertSRGBToLinear(),roughness:1}));scene.add(floor);
        const model=api.build({id:index<2?'rabbit':'pigeon',color:0xa78b6f},1.75),lift=index<2?0:index===2?.9:2.7;
        const box=new T.Box3().setFromObject(model.root);model.root.position.y=-box.min.y+lift;scene.add(model.root);
        if(index>=2)model.wings.forEach((wing:any,i:number)=>{wing.rotation.set(0,0,(i===0?-1:1)*.10);wing.scale.x=1;});
        let shadow:any;
        if(index===0){shadow=new T.Mesh(new T.CircleGeometry(1,20),new T.MeshBasicMaterial({color:0x07111d,transparent:true,opacity:.34,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));shadow.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(-.168,1,-.15).normalize());shadow.position.y=.018;shadow.scale.set(1.05,.615,1);}
        else{const geometry=api.create(1),material=new T.MeshBasicMaterial({color:new T.Color(0x263448).convertSRGBToLinear(),transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});api.soften(material,{value:1});const profile=api.profile({},1.75,lift,model.kind,index>=2?1:0);profiles.push(profile);api.write(geometry,0,0,0,0,profile,height);api.finish(geometry,1);shadow=new T.Mesh(geometry,material);shadow.frustumCulled=false;}
        scene.add(shadow);scenes.push(scene);shadows.push(shadow);
        const label=document.createElement('div');label.textContent=labels[index];label.style.cssText=`position:absolute;left:${index%2*540}px;top:${Math.floor(index/2)*360+326}px;width:540px;text-align:center;color:#e5ece8;font:600 12px system-ui;letter-spacing:.07em`;panel.appendChild(label);
      }
      w.paintShadowStudy=()=>{scenes.forEach((scene,index)=>{renderer.setViewport(index%2*540,(1-Math.floor(index/2))*360,540,360);renderer.setScissor(index%2*540,(1-Math.floor(index/2))*360,540,360);renderer.render(scene,camera);calls[index]=renderer.info.render.calls;});};
      w.paintShadowStudy();const gl=renderer.getContext();const capture=()=>{const p=new Uint8Array(1080*720*4);gl.readPixels(0,0,1080,720,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};const on=capture(),textures=renderer.info.memory.textures,geometries=renderer.info.memory.geometries;
      shadows.forEach(s=>s.material.opacity=0);w.paintShadowStudy();const off=capture();let changed=0;for(let i=0;i<on.length;i+=4)if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>3)changed++;
      shadows.forEach((s,i)=>s.material.opacity=i===0?.34:.42);w.paintShadowStudy();
      w.closeShadowStudy=()=>{const resources=new Set<any>();scenes.forEach(scene=>scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);}));resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};
      return {changed,profiles,calls,textures,afterTextures:renderer.info.memory.textures,geometries,afterGeometries:renderer.info.memory.geometries,compiled:shadows.slice(1).every(s=>s.material.userData.softContactCompiled)};
    });
    expect(study.compiled).toBe(true);expect(study.changed).toBeGreaterThan(400);expect(study.textures).toBe(0);expect(study.afterTextures).toBe(study.textures);expect(study.afterGeometries).toBe(study.geometries);expect(study.calls).toEqual([7,7,7,7]);
    expect(study.profiles[2].opacity).toBeLessThan(study.profiles[1].opacity);expect(study.profiles[2].width).toBeGreaterThan(study.profiles[1].width);
    await page.locator('#shadow-study').screenshot({path:resolve(output,'prey-shadow-study.png'),timeout:90000});
    await testInfo.attach('shadow-study',{body:JSON.stringify(study),contentType:'application/json'});await page.evaluate(()=>(window as any).closeShadowStudy());expect(errors).toEqual([]);
  });

  for(const model of [{label:'day-desktop',species:'redTail',width:880,quality:'high',phase:.44},{label:'night-mobile',species:'greatHorned',width:320,quality:'low',phase:.93}])
  test(`keeps ${model.label} contact shadows stable through pause and catch`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    if(model.width===320)await page.setViewportSize({width:360,height:1100});await mount(page,model.species,model.quality);
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.shadowRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    const state=await canvas.evaluate((c:any,phase)=>{
      const w=window as any,T=w.THREE;c._rhCommand('environment',{windSpeed:0,dayPhase:phase,cloudCover:.18});for(let i=0;i<8;i++)w.stepShadow(25);
      const scene=w.shadowScene,renderer=w.shadowRenderer,pool=scene.getObjectByName('raptor-prey-contact-pool');w.contactPool=pool;w.contactDisposed=[];[pool.geometry,pool.material].forEach(o=>o.addEventListener('dispose',()=>w.contactDisposed.push(o.uuid)));
      w.contactBuffers=Object.values(pool.geometry.attributes).map((a:any)=>a.array);w.contactRead=()=>({positions:Array.from(pool.geometry.attributes.position.array),opacity:Array.from(pool.geometry.attributes.preyContactOpacity.array),count:pool.geometry.drawRange.count,geometry:pool.geometry.uuid,material:pool.material.uuid});
      w.liveCamera=w.shadowCamera.clone();const roots=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))),chosen=roots.find((o:any)=>o.getObjectByName('prey-ground-face'));if(!chosen)throw Error('No ground prey');w.contactChosen=chosen;w.contactRoots=roots;
      // A close review camera examines the real production terrain and contact pool.
      const p=chosen.position,box=new T.Box3().setFromObject(chosen.children.find((o:any)=>o.name.startsWith('prey-'))),dimensions=box.getSize(new T.Vector3()),radius=Math.max(dimensions.x,dimensions.y,dimensions.z)*.5;const angle=Math.tan(w.shadowCamera.fov*Math.PI/360),distance=Math.max(12,radius/Math.min(angle,angle*w.shadowCamera.aspect)*1.55),offset=new T.Vector3(.5,.45,.75).normalize().multiplyScalar(distance);w.shadowCamera.position.copy(p).add(offset);w.shadowCamera.lookAt(p.x,p.y-radius*.3,p.z);c._rhCommand('scenic',true);
      w.paintContact=()=>renderer.render(scene,w.shadowCamera);w.paintContact();
      const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d')!;w.contactPixels=()=>{ctx.drawImage(c,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
      const on=w.contactPixels(),before={calls:renderer.info.render.calls,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries};pool.material.opacity=0;w.paintContact();const off=w.contactPixels();let changed=0;for(let i=0;i<on.length;i+=4)if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>3)changed++;
      const after={calls:renderer.info.render.calls,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries};pool.material.opacity=.42;w.paintContact();
      return {changed,before,after,compiled:pool.material.userData.softContactCompiled,vertices:pool.geometry.attributes.position.count,count:c._rhSnapshot().preyContactCount,drawIndices:pool.geometry.drawRange.count,identity:w.contactRead()};
    },model.phase);
    expect(state.compiled).toBe(true);expect(state.changed).toBeGreaterThan(5);expect(state.before).toEqual(state.after);expect(state.vertices).toBe(972);expect(state.drawIndices).toBe(state.count*384);
    await stage.screenshot({path:resolve(output,model.label+'-terrain-contact.png'),timeout:90000});
    const paused=await canvas.evaluate((c:any)=>{const w=window as any;w.skipShadowRender=true;c._rhCommand('pause');const before=w.contactRead();w.stepShadow(60000);return {before,after:w.contactRead()};});expect(paused.after).toEqual(paused.before);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);expect(await page.evaluate(()=>(window as any).contactRead())).toEqual(paused.before);
    const caught=await canvas.evaluate((c:any)=>{
      const w=window as any,T=w.THREE,before=c._rhSnapshot(),identity=w.contactRead();w.shadowCamera.copy(w.liveCamera);c._rhCommand('scenic',false);c._rhCommand('pause');
      const p=before.raptorPosition,y=before.headingRadians,pitch=before.pitchRadians;w.contactRoots.forEach((o:any,i:number)=>{if(o===w.contactChosen)o.position.set(p.x+Math.sin(y)*Math.cos(pitch)*3,p.y+Math.sin(pitch)*3,p.z-Math.cos(y)*Math.cos(pitch)*3);});
      c._rhCommand('strike');w.stepShadow(25);const after=c._rhSnapshot();
      return {before:before.missionCatches,after:after.missionCatches,beforeCount:before.preyContactCount,afterCount:after.preyContactCount,identity,written:w.contactRead(),sameBuffers:Object.values(w.contactPool.geometry.attributes).every((a:any,i:number)=>a.array===w.contactBuffers[i]),carried:after.carriedPreyMs};
    });
    expect(caught.after).toBe(caught.before+1);expect(caught.carried).toBeGreaterThan(0);expect(caught.afterCount).toBe(caught.beforeCount-1);expect(caught.written.count).toBe(caught.afterCount*384);expect(caught.sameBuffers).toBe(true);expect(caught.written.geometry).toBe(caught.identity.geometry);expect(caught.written.material).toBe(caught.identity.material);
    await canvas.evaluate(()=>{const w=window as any;w.skipShadowRender=false;w.paintContact();});await stage.screenshot({path:resolve(output,model.label+'-catch.png'),timeout:90000});
    await testInfo.attach('shadow-lifecycle',{body:JSON.stringify({changed:state.changed,resources:state.before,vertices:state.vertices,beforeCount:caught.beforeCount,afterCount:caught.afterCount,stableBuffers:caught.sameBuffers,catchDelta:caught.after-caught.before,paused:true,reducedMotion:true}),contentType:'application/json'});
    await harness.unmount(page);const disposed=await page.evaluate(()=>(window as any).contactDisposed);expect(disposed).toHaveLength(2);expect(new Set(disposed).size).toBe(2);expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
