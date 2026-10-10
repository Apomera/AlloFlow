import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_CANOPY_SCREENSHOTS||resolve('scratch/raptor-canopy-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const probes=`window.AlloPostFXEnabled=false;${body('softenCameraFoliage')};window.patchCanopy=softenCameraFoliage;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.canopyRenderer=r;r.render=function(scene,camera){window.canopyScene=scene;window.canopyCamera=camera;if(!window.skipCanopyRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor canopy view clarity',()=>{
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
      (window as any).stepCanopy=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,quality='balanced')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'harpyEagle',activeMission:'open',flightSession:{speciesId:'harpyEagle',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  const watch=(page:any)=>{const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});return errors;};

  test('clears the core, feathers its edge and preserves distant and off-axis canopy pixels',async({page},testInfo)=>{
    const errors=watch(page);await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const evidence=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,panel=document.createElement('section');panel.id='canopy-study';panel.style.cssText='position:fixed;left:16px;top:16px;width:1080px;height:590px;z-index:99999;background:#14252d;border:1px solid #5a7881;border-radius:12px;overflow:hidden';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1080,540);renderer.outputEncoding=T.sRGBEncoding;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const scene=new T.Scene();scene.background=new T.Color(0x16252f);scene.add(new T.HemisphereLight(0xffffff,0x667766,1));
      const camera=new T.PerspectiveCamera(60,1,.1,60);camera.position.set(0,0,12);camera.lookAt(0,0,0);
      const state={subject:{value:new T.Vector3()},enabled:{value:0}},material=new T.MeshStandardMaterial({color:0x326c37,roughness:1,alphaTest:.32,side:T.DoubleSide});w.patchCanopy(material,state);
      const geometry=new T.PlaneGeometry(30,30),card=new T.InstancedMesh(geometry,material,1),dummy=new T.Object3D();dummy.position.z=6;dummy.updateMatrix();card.setMatrixAt(0,dummy.matrix);card.instanceMatrix.needsUpdate=true;scene.add(card);
      const target=new T.Mesh(new T.SphereGeometry(1.5,24,16),new T.MeshStandardMaterial({color:0xdd853e,roughness:.8}));scene.add(target);
      const versions=[card.instanceMatrix.version,geometry.attributes.position.version,material.version],gl=renderer.getContext();
      const draw=(col:number,on:number)=>{state.enabled.value=on;renderer.setViewport(col*540,0,540,540);renderer.setScissor(col*540,0,540,540);renderer.render(scene,camera);};
      const pixels=()=>{const p=new Uint8Array(1080*540*4);gl.readPixels(0,0,1080,540,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
      draw(0,0);draw(1,1);const pair=pixels();
      const delta=(x:number,y:number,p=pair)=>{let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(p[(y*1080+x)*4+k]-p[(y*1080+x+540)*4+k]));return d;};
      let core=0,coreChanged=0,edge=0,edgeChanged=0,corners=0,cornerChanged=0;
      for(let y=0;y<540;y++)for(let x=0;x<540;x++){
        const r=Math.hypot((x-269.5)/270,(y-269.5)/270)*6*Math.tan(Math.PI/6),d=delta(x,y);
        if(r<1){core++;if(d>12)coreChanged++;}if(r>2.65&&r<2.80){edge++;if(d>12)edgeChanged++;}if(r>4.1){corners++;if(d>0)cornerChanged++;}
      }
      draw(1,1);const repeat=pixels();let unstable=0;for(let i=0;i<pair.length;i++)if(pair[i]!==repeat[i])unstable++;
      const unchangedVersions=JSON.stringify(versions)===JSON.stringify([card.instanceMatrix.version,geometry.attributes.position.version,material.version]);
      const sameHalf=(p:Uint8Array)=>{let n=0;for(let y=0;y<540;y++)for(let x=0;x<540;x++)if(delta(x,y,p)>0)n++;return n;};
      state.subject.value.set(0,0,11.5);draw(1,1);const shortChanges=sameHalf(pixels());
      state.subject.value.set(0,0,-9);draw(1,1);const longChanges=sameHalf(pixels());
      state.subject.value.set(0,0,0);dummy.position.z=-3;dummy.updateMatrix();card.setMatrixAt(0,dummy.matrix);card.instanceMatrix.needsUpdate=true;draw(0,0);draw(1,1);const beyondChanges=sameHalf(pixels());
      dummy.position.z=6;dummy.updateMatrix();card.setMatrixAt(0,dummy.matrix);card.instanceMatrix.needsUpdate=true;draw(0,0);draw(1,1);
      ['Previous canopy','Clear chase view'].forEach((text,col)=>{const label=document.createElement('div');label.textContent=text;label.style.cssText=`position:absolute;left:${col*540}px;top:548px;width:540px;text-align:center;color:#e5ede6;font:600 17px system-ui`;panel.appendChild(label);});
      w.closeCanopyStudy=()=>{const resources=new Set<any>();scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};
      return {coreFraction:coreChanged/core,edgeFraction:edgeChanged/edge,cornerChanged,corners,unstable,shortChanges,longChanges,beyondChanges,opaque:!material.transparent,alphaTest:material.alphaTest,textures:renderer.info.memory.textures,unchangedVersions,compiled:!!material.userData.cameraFoliageCompiled};
    });
    expect(evidence.coreFraction).toBeGreaterThan(.99);expect(evidence.edgeFraction).toBeGreaterThan(.15);expect(evidence.edgeFraction).toBeLessThan(.85);
    expect(evidence.cornerChanged).toBe(0);expect(evidence.corners).toBeGreaterThan(1000);expect(evidence.unstable).toBe(0);expect(evidence.shortChanges).toBe(0);expect(evidence.longChanges).toBe(0);expect(evidence.beyondChanges).toBe(0);
    expect(evidence.opaque).toBe(true);expect(evidence.alphaTest).toBe(.32);expect(evidence.textures).toBe(0);expect(evidence.unchangedVersions).toBe(true);expect(evidence.compiled).toBe(true);
    await page.locator('#canopy-study').screenshot({path:resolve(output,'canopy-mask-comparison.png'),timeout:90000});await testInfo.attach('canopy-study',{body:JSON.stringify(evidence),contentType:'application/json'});await page.evaluate(()=>(window as any).closeCanopyStudy());expect(errors).toEqual([]);
  });

  for(const model of [{id:'howlerMonkey',label:'howler-day-desktop',name:'Howler Monkey',width:880,quality:'high',phase:.44},{id:'capuchin',label:'capuchin-night-mobile',name:'Capuchin Monkey',width:320,quality:'low',phase:.93}])
  test(`keeps ${model.label} catches readable with stable foliage and paused camera changes`,async({page},testInfo)=>{
    const errors=watch(page);if(model.width===320)await page.setViewportSize({width:360,height:1100});await mount(page,model.quality);if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.canopyRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    const caught=await canvas.evaluate((c:any,setup)=>{
      const w=window as any,T=w.THREE;c._rhCommand('environment',{windSpeed:0,dayPhase:setup.phase,cloudCover:.18});w.skipCanopyRender=true;for(let i=0;i<36;i++)w.stepCanopy(25);w.skipCanopyRender=false;
      const scene=w.canopyScene,foliage=scene.children.filter((o:any)=>o.name.startsWith('instanced-forest-foliage-')),roots=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))),chosen=roots.find((o:any)=>o.getObjectByName('prey-mammal-'+setup.id));if(!chosen)throw Error('No seeded '+setup.id);
      const visual=chosen.getObjectByName('prey-mammal-'+setup.id);w.canopyVisual=visual;w.canopyDisposed=[];visual.traverse((o:any)=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>w.canopyDisposed.push(o.geometry.uuid));});
      w.canopyIdentity=()=>{const ids:any[]=[];visual.traverse((o:any)=>{if(o.isMesh)ids.push([o.geometry.uuid,o.material.uuid]);});return ids;};
      w.canopyFoliage=foliage;w.canopyVersions=foliage.map((o:any)=>[o.uuid,o.geometry.uuid,o.material.uuid,o.instanceMatrix.version,o.geometry.attributes.position.version]);
      // Advance to the dense canopy crossing used by the existing howler catch check.
      if(setup.id==='howlerMonkey'){w.skipCanopyRender=true;for(let i=0;i<21;i++)w.stepCanopy(25);w.skipCanopyRender=false;}
      const before=c._rhSnapshot(),p=before.raptorPosition,h=before.headingRadians,pitch=before.pitchRadians,identity=w.canopyIdentity();
      roots.forEach((o:any,i:number)=>o.position.set(o===chosen?p.x+Math.sin(h)*Math.cos(pitch)*3:2000+i*20,o===chosen?p.y+Math.sin(pitch)*3:2000,o===chosen?p.z-Math.cos(h)*Math.cos(pitch)*3:2000));
      c._rhCommand('strike');w.stepCanopy(25);c._rhCommand('pause');const after=c._rhSnapshot();
      w.canopyRenderer.compile(scene,w.canopyCamera);
      const compiled=foliage.map((o:any)=>({surface:!!o.material.userData.cameraFoliageCompiled,aerial:!!o.material.userData.aerialCompiled,transmission:!!o.material.userData.transmissionCompiled,opaque:!o.material.transparent,alpha:o.material.alphaTest,depthClear:!o.customDepthMaterial||!o.customDepthMaterial.userData.cameraFoliage}));
      const state=foliage[0].material.userData.cameraFoliage;w.canopyState=state;state.enabled.value=0;w.canopyRenderer.render(scene,w.canopyCamera);w.canopyBeforeImage=w.canopyRenderer.domElement.toDataURL();
      return {catchDelta:after.missionCatches-before.missionCatches,label:after.carriedPreyLabel,carried:after.carriedPreyMs,sameIdentity:JSON.stringify(identity)===JSON.stringify(w.canopyIdentity()),compiled,sharedState:foliage.every((o:any)=>o.material.userData.cameraFoliage===state),distance:w.canopyCamera.position.distanceTo(state.subject.value),subject:state.subject.value.toArray(),motionTimeMs:after.motionTimeMs};
    },model);
    expect(caught.catchDelta).toBe(1);expect(caught.label).toBe(model.name);expect(caught.carried).toBeGreaterThan(0);expect(caught.sameIdentity).toBe(true);expect(caught.compiled.length).toBeGreaterThan(0);
    for(const m of caught.compiled){expect(m.surface).toBe(true);expect(m.aerial).toBe(true);expect(m.transmission).toBe(true);expect(m.opaque).toBe(true);expect(m.alpha).toBe(.32);expect(m.depthClear).toBe(true);}expect(caught.sharedState).toBe(true);expect(caught.distance).toBeGreaterThan(1);expect(caught.distance).toBeLessThan(18);expect(Number.isFinite(caught.motionTimeMs)).toBe(true);expect(caught.motionTimeMs).toBeGreaterThan(0);
    await stage.screenshot({path:resolve(output,model.label+'-canopy-before.png'),timeout:90000});
    const afterImage=await canvas.evaluate((c:any)=>{const w=window as any;w.canopyState.enabled.value=1;w.canopyRenderer.render(w.canopyScene,w.canopyCamera);return {image:w.canopyRenderer.domElement.toDataURL(),motionTimeMs:c._rhSnapshot().motionTimeMs,sameIdentity:JSON.stringify(w.canopyIdentity())};});
    expect(afterImage.motionTimeMs).toBe(caught.motionTimeMs);await stage.screenshot({path:resolve(output,model.label+'-canopy-after.png'),timeout:90000});
    if(model.width===880){
      await page.evaluate((after:string)=>{const w=window as any,p=document.createElement('section');p.id='native-canopy-pair';p.style.cssText='position:fixed;left:16px;top:16px;width:1080px;z-index:99999;display:flex;background:#14252d;border:1px solid #537080;border-radius:12px;overflow:hidden';[w.canopyBeforeImage,after].forEach((src,col)=>{const cell=document.createElement('div');cell.style.cssText='width:540px';const img=document.createElement('img');img.src=src;img.style.cssText='display:block;width:540px;height:auto';cell.appendChild(img);const label=document.createElement('div');label.textContent=col?'Clear chase view · same catch':'Previous canopy · same catch';label.style.cssText='padding:14px;text-align:center;color:#e3ece5;font:600 16px system-ui';cell.appendChild(label);p.appendChild(cell);});document.body.appendChild(p);},afterImage.image);
      await page.locator('#native-canopy-pair img').last().evaluate((img:HTMLImageElement)=>img.decode());await page.locator('#native-canopy-pair').screenshot({path:resolve(output,'rainforest-catch-before-after.png'),timeout:90000});await page.locator('#native-canopy-pair').evaluate(e=>e.remove());
    }
    const paused=await canvas.evaluate((c:any)=>{const w=window as any,before=c._rhSnapshot();w.stepCanopy(60000);return {timeBefore:before.motionTimeMs,timeAfter:c._rhSnapshot().motionTimeMs,identity:w.canopyIdentity(),versions:w.canopyFoliage.map((o:any)=>[o.uuid,o.geometry.uuid,o.material.uuid,o.instanceMatrix.version,o.geometry.attributes.position.version])};});expect(Number.isFinite(paused.timeBefore)).toBe(true);expect(paused.timeBefore).toBe(caught.motionTimeMs);expect(paused.timeAfter).toBe(paused.timeBefore);expect(JSON.stringify(paused.identity)).toBe(afterImage.sameIdentity);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);expect(await canvas.evaluate((c:any)=>c._rhSnapshot().canopyViewClearance)).toBe(true);
    await canvas.evaluate((c:any)=>c._rhCommand('view'));expect(await canvas.evaluate((c:any)=>c._rhSnapshot().cameraMode)).toBe('fp');expect(await canvas.evaluate((c:any)=>c._rhSnapshot().canopyViewClearance)).toBe(false);
    await canvas.evaluate((c:any)=>c._rhCommand('view'));expect(await canvas.evaluate((c:any)=>c._rhSnapshot().canopyViewClearance)).toBe(true);
    await canvas.evaluate((c:any)=>c._rhCommand('study'));expect(await canvas.evaluate((c:any)=>c._rhSnapshot().studyActive)).toBe(true);expect(await canvas.evaluate((c:any)=>c._rhSnapshot().canopyViewClearance)).toBe(false);
    await page.locator('.rh-study-close').click();expect(await canvas.evaluate((c:any)=>c._rhSnapshot().studyActive)).toBe(false);expect(await canvas.evaluate((c:any)=>c._rhSnapshot().canopyViewClearance)).toBe(true);
    const cleanup=await canvas.evaluate((c:any)=>{const w=window as any;const stable=JSON.stringify(w.canopyVersions)===JSON.stringify(w.canopyFoliage.map((o:any)=>[o.uuid,o.geometry.uuid,o.material.uuid,o.instanceMatrix.version,o.geometry.attributes.position.version]));c._rhCommand('pause');w.skipCanopyRender=true;for(let i=0;i<28;i++)w.stepCanopy(50);return {stable,remaining:c._rhSnapshot().carriedPreyMs,disposed:w.canopyDisposed};});
    expect(cleanup.stable).toBe(true);expect(cleanup.remaining).toBe(0);expect(cleanup.disposed).toHaveLength(7);expect(new Set(cleanup.disposed).size).toBe(7);
    await testInfo.attach('canopy-lifecycle',{body:JSON.stringify({model:model.label,...caught,imagesShareMotionTime:true,stableFoliage:cleanup.stable,pause:true,reducedMotion:true,firstPersonGate:true,studyGate:true,disposed:cleanup.disposed.length}),contentType:'application/json'});expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
