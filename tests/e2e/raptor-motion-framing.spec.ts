import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor paused motion framing',()=>{
  test.describe.configure({timeout:240000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:960,height:1100});
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).stepHunt=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
      (window as any).advanceHunt=(ms:number)=>{while(ms>0){const dt=Math.min(ms,50);(window as any).stepHunt(dt);ms-=dt;}};
    });
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'highStoop',flightSession:{speciesId:'peregrine',missionId:'highStoop'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('environment',{windSpeed:0}));
  });


  test('removes paused dive widening immediately and preserves deliberate zoom',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    const dive=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('assist');c._rhCommand('hold',{key:'shift',pressed:true});w.skipGroundRender=true;w.advanceHunt(6000);w.skipGroundRender=false;w.stepHunt(25);c._rhCommand('pause');return c._rhSnapshot();});
    expect(dive.diveActive).toBe(true);expect(dive.cameraFov).toBeGreaterThan(72);expect(dive.crashed).toBe(false);
    const renders=await page.evaluate(()=>(window as any).huntRenderCount);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().cameraFov)).toBe(70);
    const reduced=await canvas.evaluate((c:any)=>c._rhSnapshot());
    for(const key of ['motionTimeMs','raptorPosition','calories','stamina','cameraPosition','speedMps','missionCatches'])expect(reduced[key]).toEqual(dive[key]);
    const projection=await page.evaluate(()=>{const camera=(window as any).huntCamera;return {actual:camera.projectionMatrix.elements[0],expected:1/(camera.aspect*Math.tan(35*Math.PI/180)),renders:(window as any).huntRenderCount};});
    expect(projection.actual).toBeCloseTo(projection.expected,8);expect(projection.renders-renders).toBe(1);
    await canvas.evaluate(()=>(window as any).stepHunt(60000));expect(await page.evaluate(()=>(window as any).huntRenderCount)).toBe(projection.renders);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
    await canvas.evaluate((c:any)=>c._rhCommand('zoom'));const zoom=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(zoom.cameraFov).toBeLessThan(50);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const zoomReduced=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(zoomReduced.cameraFov).toBe(zoom.cameraFov);expect(zoomReduced.cameraPosition).toEqual(dive.cameraPosition);expect(zoomReduced.motionTimeMs).toBe(dive.motionTimeMs);
    await canvas.evaluate((c:any)=>c._rhCommand('zoom'));expect(await canvas.evaluate((c:any)=>c._rhSnapshot().cameraFov)).toBe(70);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/reduced-motion-paused-framing.png',timeout:90000});
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).advanceHunt(200);});const resumed=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(resumed.cameraFov).toBe(70);expect(resumed.motionTimeMs-dive.motionTimeMs).toBeCloseTo(200,6);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});

