import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor recovery indicator',()=>{
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


  test('counts down actual crash recovery, freezes on pause, and restores takeoff guidance',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),status=page.locator('.rh-flight-state');
    const crash=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('assist');w.skipGroundRender=true;c._rhCommand('hold',{key:'shift',pressed:true});c._rhCommand('hold',{key:'q',pressed:true});for(let i=0;i<400&&!c._rhSnapshot().crashed&&!c._rhSnapshot().landed;i++)w.stepHunt(50);const initial=c._rhSnapshot();for(const key of ['shift','q'])c._rhCommand('hold',{key,pressed:false});w.skipGroundRender=false;w.advanceHunt(150);return initial;});expect(crash.crashed).toBe(true);
    await expect(status).toHaveAttribute('data-flight-state','stunned');await expect(status).toHaveText('Recovering · 3s');await expect(status).toHaveAttribute('aria-label','Recovering: 3 seconds until takeoff is available');
    const progress=()=>status.evaluate(el=>parseFloat((el as HTMLElement).style.getPropertyValue('--rh-recovery-progress')));expect(await progress()).toBeGreaterThanOrEqual(0);expect(await progress()).toBeLessThan(8);
    await canvas.evaluate(()=>(window as any).advanceHunt(900));await expect(status).toHaveText('Recovering · 2s');const advancing=await progress();expect(advancing).toBeGreaterThan(30);expect(advancing).toBeLessThan(40);await expect(page.locator('.rh-flight-btn-strike')).toBeDisabled();
    const before=await canvas.evaluate((c:any)=>c._rhSnapshot());await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(status).toHaveText('Paused');await canvas.evaluate(()=>(window as any).stepHunt(60000));await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(status).toHaveText('Recovering · 2s');const resumed=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(resumed.motionTimeMs).toBe(before.motionTimeMs);expect(resumed.raptorPosition).toEqual(before.raptorPosition);expect(await progress()).toBeGreaterThanOrEqual(advancing);expect(await progress()).toBeLessThan(40);
    await page.emulateMedia({reducedMotion:'reduce'});await canvas.evaluate(()=>(window as any).advanceHunt(1000));await expect(status).toHaveText('Recovering · 1s');await expect(status).toHaveAttribute('aria-label','Recovering: 1 second until takeoff is available');expect(await progress()).toBeGreaterThan(60);
    for(const width of [320,300]){await page.setViewportSize({width:width+40,height:1000});await page.addStyleTag({content:'#wrap{width:'+width+'px}'});const bounds=await status.evaluate(el=>{const r=el.getBoundingClientRect(),wind=el.parentElement!.querySelector('.rh-flight-wind')!.getBoundingClientRect(),mission=el.parentElement!.querySelector('.rh-flight-mission-hud')!.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();return {overflow:el.scrollWidth-el.clientWidth,inside:r.left>=host.left&&r.right<=host.right,windGap:wind.top-r.bottom,overlap:Math.max(0,Math.min(r.right,mission.right)-Math.max(r.left,mission.left))*Math.max(0,Math.min(r.bottom,mission.bottom)-Math.max(r.top,mission.top))};});expect(bounds.overflow).toBeLessThanOrEqual(1);expect(bounds.inside).toBe(true);expect(bounds.windGap).toBeGreaterThanOrEqual(0);expect(bounds.overlap).toBe(0);if(width===320)await status.screenshot({path:'scratch/raptor-flight-review/recovery-countdown-320.png',timeout:90000});}
    await page.emulateMedia({forcedColors:'active'});await expect(status).toBeVisible();expect(await status.evaluate(el=>getComputedStyle(el,'::before').maskImage)).toBe('none');
    const recovered=await canvas.evaluate((c:any)=>{(window as any).advanceHunt(1100);return c._rhSnapshot();});expect(recovered.crashed).toBe(false);expect(recovered.landed).toBe(true);expect(recovered.motionTimeMs-crash.motionTimeMs).toBeCloseTo(3150,4);await expect(status).toHaveText('Landed');await expect(status).not.toHaveAttribute('aria-label',/Recovering/);expect(await status.evaluate(el=>(el as HTMLElement).style.getPropertyValue('--rh-recovery-progress'))).toBe('');await expect(page.locator('.rh-flight-key-guide')).toContainText('Take off');
    await canvas.evaluate((c:any)=>{c._rhCommand('hold',{key:' ',pressed:true});(window as any).advanceHunt(200);c._rhCommand('hold',{key:' ',pressed:false});});expect(await canvas.evaluate((c:any)=>c._rhSnapshot().landed)).toBe(false);await expect(status).not.toContainText('Recovering');expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
