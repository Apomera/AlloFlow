import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name:string){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const probes='window.AlloPostFXEnabled=false;'+['createPreyWingGeometry','advancePreyVisualPose','preyKindFor','createPreyTailGeometry','buildPreyVisual'].map(body).join('\n')+';window.wildlifeReview={build:buildPreyVisual,advance:advancePreyVisualPose};';
test.use({video:'off'});
test.describe('Raptor wildlife rendering',()=>{
  test.describe.configure({timeout:300000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1000,height:720,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test('renders folded and flying prey and freezes their visual pose while paused',async({page})=>{
    await page.setViewportSize({width:1100,height:1000});
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).advanceWildlife=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',flightSession:{speciesId:'peregrine',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'balanced'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      for(let i=0;i<20;i++)(window as any).advanceWildlife(25);
      const before=c._rhSnapshot();c._rhCommand('pause');(window as any).advanceWildlife(5000);return {before,paused:c._rhSnapshot()};
    });
    expect(result.before.preyVisualPoses.some((p:any)=>p.kind==='bird')).toBe(true);
    for(const p of result.before.preyVisualPoses){expect(Number.isFinite(p.heading)).toBe(true);expect(Math.abs(p.bank)).toBeLessThanOrEqual(0.24);if(p.height===0)expect(p.spread).toBe(0);}
    expect(result.before.drawCalls).toBeLessThan(150);expect(result.paused.preyVisualPoses).toEqual(result.before.preyVisualPoses);
    await page.emulateMedia({reducedMotion:'reduce'});
    const reduced=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');(window as any).advanceWildlife(25);return c._rhSnapshot();});
    for(const p of reduced.preyVisualPoses){expect(p.bank).toBe(0);expect(p.wingAngle).toBe(0.08);}
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    // A close study uses the production builders; no debug geometry ships in the simulator.
    const gallery=await page.evaluate(()=>{
      const T=(window as any).THREE,api=(window as any).wildlifeReview;
      const section=document.createElement('section');section.id='wildlife-review';section.style.cssText='position:fixed;inset:20px auto auto 20px;width:1000px;height:500px;z-index:99999;background:#182a35;border:1px solid #607b84;border-radius:12px;overflow:hidden';document.body.appendChild(section);
      const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,500);renderer.setPixelRatio(1);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=0.85;section.appendChild(renderer.domElement);
      const scene=new T.Scene();scene.background=new T.Color(0x182a35);scene.add(new T.HemisphereLight(0xd8ecff,0x676346,0.8));const light=new T.DirectionalLight(0xffe4c2,1.2);light.position.set(3,7,5);scene.add(light);
      const camera=new T.PerspectiveCamera(36,2,0.1,100);camera.position.set(0,3.2,9);camera.lookAt(0,0.35,0);
      const rest=api.build({id:'pigeon',color:0x9ca3af},1.5),flight=api.build({id:'duck',color:0x14532d},1.5);
      rest.root.position.set(-1.7,-0.15,0);rest.root.rotation.y=-0.45;scene.add(rest.root);
      const pose=flight.pose;for(let i=0;i<120;i++)api.advance(pose,0,1,3,90,0,true,1/60,false);
      flight.wings.forEach((wing:any,i:number)=>{const side=i===0?-1:1;wing.rotation.z=side*pose.wingAngle;wing.rotation.y=side*1.15*(1-pose.spread);wing.scale.x=0.3+0.7*pose.spread;});flight.root.position.set(1.65,0.35,0);flight.root.rotation.y=-0.45;scene.add(flight.root);
      const label=document.createElement('div');label.style.cssText='position:absolute;left:26px;right:26px;bottom:20px;display:flex;justify-content:space-around;color:#dfebea;font:600 13px system-ui;letter-spacing:.04em';label.innerHTML='<span>RESTING · FOLDED WINGS</span><span>FLIGHT · TAPERED FEATHERS</span>';section.appendChild(label);
      renderer.render(scene,camera);(window as any).closeWildlifeReview=()=>{scene.traverse((o:any)=>{o.geometry?.dispose();if(o.material)o.material.dispose();});renderer.dispose();section.remove();};
      return {drawCalls:renderer.info.render.calls,wingVertices:flight.wings[0].geometry.attributes.position.count,spread:pose.spread};
    });
    expect(gallery.drawCalls).toBe(10);expect(gallery.wingVertices).toBe(45);expect(gallery.spread).toBeGreaterThan(0.999);
    await page.screenshot({clip:(await page.locator('#wildlife-review').boundingBox())!,path:'scratch/raptor-flight-review/wildlife-wing-study.png',timeout:90000});
    await page.evaluate(()=>(window as any).closeWildlifeReview());
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
