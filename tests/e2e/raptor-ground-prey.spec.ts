import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_GROUND_PREY_SCREENSHOTS||resolve('scratch/raptor-ground-prey-review');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const builders=['preyKindFor','mergeGroundPreyParts','buildGroundPreyParts','buildPreyVisual','advanceGroundPreyGait','setGroundPreyLegPose'].map(body).join('\n');
const probes=`window.AlloPostFXEnabled=false;${builders};window.preyReview={build:buildPreyVisual,advance:advanceGroundPreyGait,leg:setGroundPreyLegPose};(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.preyRenderer=r;r.render=function(scene,camera){window.preyScene=scene;window.preyCamera=camera;if(!window.skipPreyRender)return render(scene,camera);};return r;};})();`;

test.describe('Raptor ground prey detail and movement',()=>{
  test.describe.configure({timeout:240000});
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
      (window as any).stepPrey=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  const mount=async(page:any,quality='balanced',species='redTail')=>harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:'open',flightSession:{speciesId:species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");

  test('renders eight ground prey with four paws and smoothly moving poses',async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await mount(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const gallery=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,api=w.preyReview;
      const panel=document.createElement('section');panel.id='ground-prey-gallery';panel.style.cssText='position:fixed;left:16px;top:16px;width:1080px;height:600px;z-index:99999;border:1px solid #537080;border-radius:12px;overflow:hidden;background:#142631';document.body.appendChild(panel);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1080,600);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.setScissorTest(true);panel.appendChild(renderer.domElement);
      const scene=new T.Scene();scene.background=new T.Color(0x142631);scene.add(new T.HemisphereLight(0xe0edff,0x6b6652,.8));
      const key=new T.DirectionalLight(0xffebce,1.2);key.position.set(3,7,5);scene.add(key);
      const floor=new T.Mesh(new T.CircleGeometry(1.35,48),new T.MeshBasicMaterial({color:0x203640}));floor.rotation.x=-Math.PI/2;floor.position.y=-.529;scene.add(floor);
      const camera=new T.PerspectiveCamera(36,270/300,.1,100);camera.position.set(2.6,1.55,3.8);camera.lookAt(0,.20,0);
      const ids=['rodent','rabbit','hare','arcticHare','groundSquirrel','squirrel','lemming','skunk'];
      const labels=['Field mouse','Cottontail','Snowshoe hare','Arctic hare','Ground squirrel','Squirrel','Lemming','Skunk'];
      const models=ids.map(id=>api.build({id,color:0xa78b6f},1.25)),captions:any[]=[],counts:any[]=[];
      models.forEach((model:any,index:number)=>{
        scene.add(model.root);model.root.visible=false;let count=0;model.root.traverse((o:any)=>{if(o.isMesh)count++;});counts.push(count);
        const label=document.createElement('div');label.textContent=labels[index]+' · REST';label.style.cssText=`position:absolute;left:${index%4*270}px;top:${Math.floor(index/4)*300+266}px;width:270px;text-align:center;color:#e5ece8;font:600 12px system-ui;letter-spacing:.03em`;panel.appendChild(label);captions.push(label);
      });
      w.paintGroundGallery=()=>{const calls=[];models.forEach((model:any,index:number)=>{model.root.visible=true;renderer.setViewport(index%4*270,(1-Math.floor(index/4))*300,270,300);renderer.setScissor(index%4*270,(1-Math.floor(index/4))*300,270,300);renderer.render(scene,camera);calls.push(renderer.info.render.calls);model.root.visible=false;});return calls;};
      w.groundGalleryPixels=()=>{const gl=renderer.getContext(),p=new Uint8Array(1080*600*4);gl.readPixels(0,0,1080,600,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
      const calls=w.paintGroundGallery();w.groundStill=w.groundGalleryPixels();
      w.moveGroundGallery=()=>{
        models.forEach((model:any,index:number)=>{const g=model.gait;for(let i=0;i<45;i++)api.advance(g,7,7,1.25,model.kind,1/60,false,index*.4);model.root.position.y=g.bob;model.legs.forEach((leg:any,i:number)=>api.leg(leg,i===0?g.front:g.hind));model.tail.rotation.z=g.tail;captions[index].textContent=labels[index]+' · MOVING';});
        const calls=w.paintGroundGallery(),pixels=w.groundGalleryPixels();let changed=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-w.groundStill[i])+Math.abs(pixels[i+1]-w.groundStill[i+1])+Math.abs(pixels[i+2]-w.groundStill[i+2])>3)changed++;
        return {calls,changed,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
      };
      w.closeGroundGallery=()=>{const resources=new Set<any>();scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(o=>o.dispose());renderer.dispose();panel.remove();};
      return {calls,counts,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
    });
    expect(gallery.counts).toEqual(Array(8).fill(5));expect(gallery.calls).toEqual(Array(8).fill(6));expect(gallery.textures).toBe(0);
    await page.locator('#ground-prey-gallery').screenshot({path:resolve(output,'ground-prey-rest-study.png'),timeout:90000});
    const moving=await page.evaluate(()=>(window as any).moveGroundGallery());
    expect(moving.changed).toBeGreaterThan(1000);expect(moving.calls).toEqual(gallery.calls);expect(moving.geometries).toBe(gallery.geometries);expect(moving.textures).toBe(gallery.textures);
    await page.locator('#ground-prey-gallery').screenshot({path:resolve(output,'ground-prey-moving-study.png'),timeout:90000});
    await testInfo.attach('ground-prey-gallery',{body:JSON.stringify({gallery,moving}),contentType:'application/json'});
    await page.evaluate(()=>(window as any).closeGroundGallery());expect(errors).toEqual([]);
  });

  for(const model of [{label:'day-desktop',species:'redTail',phase:.44,width:880,quality:'high'},{label:'night-mobile',species:'greatHorned',phase:.93,width:320,quality:'low'}])
  test(`keeps ${model.label} prey identity through approach, pause and catch`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    if(model.width===320)await page.setViewportSize({width:360,height:1100});
    await mount(page,model.quality,model.species);
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:any)=>{const w=window as any,v=w.preyRenderer.getSize(new w.THREE.Vector2());return Math.abs(v.x-c.clientWidth)<2&&Math.abs(v.y-c.clientHeight)<2;})).toBe(true);
    await canvas.evaluate((c:any,phase)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0,dayPhase:phase,cloudCover:.18});for(let i=0;i<8;i++)w.stepPrey(25);
      const roots=w.preyScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
      const selected=roots.find((o:any)=>o.getObjectByName('prey-ground-face'));if(!selected)throw Error('No ground prey spawned');roots.splice(roots.indexOf(selected),1);roots.unshift(selected);
      w.chosenPrey=roots[0];w.preyVisual=roots[0].children.find((o:any)=>o.name.startsWith('prey-'));w.preyDisposed=[];
      w.preyVisual.traverse((o:any)=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>w.preyDisposed.push(o.geometry.uuid));});
      w.preyIdentity=()=>{const ids:any[]=[];w.preyVisual.traverse((o:any)=>{if(o.isMesh)ids.push({geometry:o.geometry.uuid,material:o.material.uuid,color:Array.from(o.geometry.attributes.color.array)});});return ids;};
      w.placePrey=(distance:number)=>{const s=c._rhSnapshot(),p=s.raptorPosition,y=s.headingRadians,pitch=s.pitchRadians;
        roots.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(y)*Math.cos(pitch)*distance:2000+i*20,i===0?p.y+Math.sin(pitch)*distance:2000,i===0?p.z-Math.cos(y)*Math.cos(pitch)*distance:2000));c._rhCommand('scenic',false);w.preyRenderer.render(w.preyScene,w.preyCamera);};
      w.placePrey(5.1);
    },model.phase);
    await stage.screenshot({path:resolve(output,model.label+'-ground-approach.png'),timeout:90000});
    const caught=await canvas.evaluate((c:any)=>{
      const w=window as any,before=c._rhSnapshot(),identity=w.preyIdentity();w.placePrey(3);c._rhCommand('strike');w.stepPrey(25);
      return {before,after:c._rhSnapshot(),sameIdentity:JSON.stringify(identity)===JSON.stringify(w.preyIdentity()),meshCount:w.preyIdentity().length,carried:w.chosenPrey.parent?.name};
    });
    expect(caught.before.strikeWindowOpen).toBe(true);expect(caught.after.missionCatches).toBe(caught.before.missionCatches+1);
    expect(caught.after.carriedPreyMs).toBeGreaterThan(0);expect(caught.sameIdentity).toBe(true);expect(caught.meshCount).toBe(5);
    await stage.screenshot({path:resolve(output,model.label+'-ground-catch.png'),timeout:90000});
    // The visual assertions are complete; lifecycle checks need no repeated GPU rasterization.
    const paused=await canvas.evaluate((c:any)=>{const w=window as any;w.skipPreyRender=true;c._rhCommand('pause');const before=c._rhSnapshot();w.stepPrey(60000);return {before,after:c._rhSnapshot()};});
    expect(paused.after.groundPreyGaits).toEqual(paused.before.groundPreyGaits);
    expect(paused.after.preyVisualPoses).toEqual(paused.before.preyVisualPoses);expect(paused.after.carriedPreyMs).toBe(paused.before.carriedPreyMs);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const quiet=await canvas.evaluate((c:any)=>c._rhSnapshot().groundPreyGaits);expect(quiet.length).toBeGreaterThan(0);for(const gait of quiet){expect(gait.front).toBe(0);expect(gait.hind).toBe(0);expect(gait.bob).toBe(0);expect(gait.effort).toBe(0);}
    const reduced=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');w.stepPrey(25);const before=c._rhSnapshot();for(let i=0;i<28;i++)w.stepPrey(50);return {before,after:c._rhSnapshot(),disposed:w.preyDisposed};});
    expect(reduced.after.carriedPreyMs).toBe(0);expect(reduced.disposed).toHaveLength(5);expect(new Set(reduced.disposed).size).toBe(5);
    for(const p of reduced.after.preyVisualPoses){expect(p.bank).toBe(0);expect(p.wingAngle).toBe(.08);}
    reduced.before.preyVisualPoses.forEach((p:any,i:number)=>expect(reduced.after.preyVisualPoses[i].phase).toBe(p.phase));
    reduced.before.groundPreyGaits.forEach((g:any,i:number)=>expect(reduced.after.groundPreyGaits[i].phase).toBe(g.phase));
    await testInfo.attach('ground-prey-catch-transition',{body:JSON.stringify({sameIdentity:caught.sameIdentity,meshCount:caught.meshCount,catchDelta:caught.after.missionCatches-caught.before.missionCatches,disposed:reduced.disposed.length,paused:true,reducedMotion:true}),contentType:'application/json'});
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
