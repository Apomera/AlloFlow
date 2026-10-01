import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor window focus continuity',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',flightSession:{speciesId:'peregrine',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('environment',{windSpeed:0}));
  });


  test('pauses on window focus loss and resumes only on request',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    await canvas.evaluate((c:any)=>{c._rhCommand('assist');c._rhCommand('hold',{key:'d',pressed:true});(window as any).advanceHunt(600);window.dispatchEvent(new Event('blur'));});
    await expect(page.locator('.rh-flight-pause')).toHaveAttribute('data-visible','true');
    const before=await canvas.evaluate((c:any)=>({state:c._rhSnapshot(),renders:(window as any).huntRenderCount}));
    await canvas.evaluate(()=>(window as any).stepHunt(60000));
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await expect(page.locator('.rh-flight-pause')).toHaveAttribute('data-visible','true');
    const frozen=await canvas.evaluate((c:any)=>({state:c._rhSnapshot(),renders:(window as any).huntRenderCount}));
    for(const key of ['raptorPosition','motionTimeMs','calories','stamina','cameraPosition','cameraQuaternion','headingRadians','wingAngle'])expect(frozen.state[key]).toEqual(before.state[key]);
    expect(frozen.renders).toBe(before.renders);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    expect(await page.evaluate(()=>(window as any).huntRenderCount)).toBe(before.renders);
    await page.locator('.rh-flight-pause').screenshot({path:'scratch/raptor-flight-review/window-focus-paused.png',timeout:90000});
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).advanceHunt(250);});
    await expect(page.locator('.rh-flight-pause')).toHaveAttribute('data-visible','false');
    const resumed=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(resumed.motionTimeMs-before.state.motionTimeMs).toBeCloseTo(250,6);expect(resumed.headingRadians).toBeCloseTo(before.state.headingRadians,8);expect(resumed.raptorPosition).not.toEqual(before.state.raptorPosition);
    // Moving from the canvas to in-page controls must not stop the flight.
    await canvas.evaluate(c=>c.dispatchEvent(new FocusEvent('blur')));
    await expect(page.locator('.rh-flight-pause')).toHaveAttribute('data-visible','false');
    await canvas.evaluate(()=>(window as any).advanceHunt(100));
    expect(await canvas.evaluate((c:any)=>c._rhSnapshot().motionTimeMs)).toBeGreaterThan(resumed.motionTimeMs);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
