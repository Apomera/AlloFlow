import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor terrain-relative height gauge',()=>{
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


  test('reaches full scale at the actual ceiling and preserves terrain-relative readings',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),gauge=page.locator('.rh-flight-altitude-gauge'),metric=page.locator('[data-raptor-metric=altitude]');
    const reached=await canvas.evaluate((c:any)=>{
      const w=window as any;c._rhCommand('assist');c._rhCommand('hold',{key:'e',pressed:true});c._rhCommand('hold',{key:'d',pressed:true});w.skipGroundRender=true;
      for(let i=0;i<1500&&c._rhSnapshot().raptorPosition.y<500;i++)w.stepHunt(50);
      for(let i=0;i<650;i++){
        const s=c._rhSnapshot();if(s.visualGroundClearance<475)break;
        const error=Math.atan2(Math.sin(Math.atan2(-88-s.raptorPosition.x,-(80-s.raptorPosition.z))-s.headingRadians),Math.cos(Math.atan2(-88-s.raptorPosition.x,-(80-s.raptorPosition.z))-s.headingRadians));
        c._rhCommand('hold',{key:'d',pressed:error>0.06});c._rhCommand('hold',{key:'a',pressed:error< -0.06});w.stepHunt(50);
      }
      w.advanceHunt(400);w.skipGroundRender=false;w.stepHunt(25);return c._rhSnapshot();
    });
    expect(reached.raptorPosition.y).toBe(500);expect(reached.landed).toBe(false);expect(reached.crashed).toBe(false);
    expect(reached.visualGroundClearance).toBeLessThan(490);
    expect(await gauge.locator('.rh-flight-altitude-fill').evaluate((el:HTMLElement)=>el.style.height)).toBe('100%');
    expect(await gauge.locator('.rh-flight-altitude-marker').evaluate((el:HTMLElement)=>el.style.bottom)).toBe('100%');
    await expect(gauge).toHaveAttribute('data-altitude-state','high');
    await expect(page.locator('.rh-flight-vertical-speed')).toHaveText('— 0 m/s');
    await expect(metric.locator('.rh-flight-metric-label')).toHaveText('Height');
    await expect(metric).toHaveAttribute('role','group');await expect(metric).toHaveAttribute('aria-label',/Height above terrain: [0-9]+ meters/);
    const shown=parseInt((await metric.locator('.rh-flight-metric-value').textContent())!,10);expect(Math.abs(shown-reached.visualGroundClearance)).toBeLessThan(2);
    await gauge.screenshot({path:'scratch/raptor-flight-review/height-gauge-ceiling.png',timeout:90000});
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const before=await canvas.evaluate((c:any)=>c._rhSnapshot()),text=await metric.textContent();
    await page.setViewportSize({width:360,height:1100});await page.addStyleTag({content:'#wrap{width:320px}'});
    await expect(gauge).toBeHidden();await expect(metric).toBeVisible();await expect(metric).toHaveText(text!);
    expect(await metric.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    await canvas.evaluate((c:any)=>(window as any).stepHunt(60000));const paused=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(paused.raptorPosition).toEqual(before.raptorPosition);expect(paused.motionTimeMs).toBe(before.motionTimeMs);
    const descent=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');c._rhCommand('hold',{key:'q',pressed:true});w.skipGroundRender=true;w.advanceHunt(3500);w.skipGroundRender=false;w.stepHunt(25);return c._rhSnapshot();});
    expect(descent.raptorPosition.y).toBeLessThan(480);
    const ratio=descent.visualGroundClearance/(500-(descent.raptorPosition.y-descent.visualGroundClearance))*100;
    const percent=await gauge.locator('.rh-flight-altitude-fill').evaluate((el:HTMLElement)=>parseFloat(el.style.height));expect(Math.abs(percent-ratio)).toBeLessThan(1.5);
    expect(percent).toBeLessThan(100);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
