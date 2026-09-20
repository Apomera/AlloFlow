import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor vertical movement feedback',()=>{
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


  test('shows actual climb and sink, fits narrow telemetry, and freezes with pause',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),rate=page.locator('.rh-flight-vertical-speed'),metric=page.locator('[data-raptor-metric=altitude]');
    await canvas.evaluate((c:any)=>{
      const w=window as any;
      w.measureVertical=(key:string)=>{
        for(const k of ['e','q'])c._rhCommand('hold',{key:k,pressed:k===key});
        w.skipGroundRender=true;w.advanceHunt(1800);const before=c._rhSnapshot();w.advanceHunt(400);const after=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);
        return {speed:(after.raptorPosition.y-before.raptorPosition.y)/0.4,state:after,text:document.querySelector('.rh-flight-vertical-speed').textContent};
      };
      c._rhCommand('assist');
    });
    const climb=await page.evaluate(()=>(window as any).measureVertical('e'));
    expect(climb.state.pitchRadians).toBeCloseTo(0,6);expect(climb.speed).toBeGreaterThan(5);
    await expect(rate).toHaveAttribute('data-vertical-state','climb');await expect(rate).toHaveText(/^↑ /);
    const number=(text:string)=>Number(text.match(/[0-9]+(?:[.][0-9]+)?/)![0]);
    expect(Math.abs(number(climb.text)-climb.speed)).toBeLessThan(0.3);await expect(metric).toHaveAttribute('aria-label',/Climbing at .* meters per second/);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const frozen=await canvas.evaluate((c:any)=>c._rhSnapshot()),label=await metric.textContent();
    for(const width of [880,420,320,300]){
      await page.setViewportSize({width:width+40,height:1100});await page.addStyleTag({content:'#wrap{width:'+width+'px}'});
      const layout=await metric.evaluate(el=>{const outer=el.getBoundingClientRect(),node=el.querySelector('.rh-flight-vertical-speed')!,r=document.createRange();r.selectNodeContents(node);const text=r.getBoundingClientRect(),strip=el.parentElement!.getBoundingClientRect();return {left:text.left-outer.left,right:outer.right-text.right,bottom:outer.bottom-text.bottom,clearance:document.querySelector('.rh-flight-state')!.getBoundingClientRect().top-strip.bottom};});
      for(const n of Object.values(layout))expect(n).toBeGreaterThanOrEqual(-0.1);
      await expect(metric).toHaveText(label!);
      if(width===320){
        // Reveal frozen instruments for review without resuming simulation time.
        const style=await page.addStyleTag({content:'.rh-flight-pause{visibility:hidden!important}'});
        await page.locator('.rh-flight-telemetry-strip').screenshot({path:'scratch/raptor-flight-review/vertical-speed-320.png',timeout:90000});
        await style.evaluate(el=>el.remove());
      }
    }
    await canvas.evaluate(()=>(window as any).stepHunt(60000));const paused=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(paused.raptorPosition).toEqual(frozen.raptorPosition);expect(paused.motionTimeMs).toBe(frozen.motionTimeMs);
    await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await expect(metric).toHaveText(label!);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const descent=await page.evaluate(()=>(window as any).measureVertical('q'));
    expect(descent.speed).toBeLessThan(-5);await expect(rate).toHaveAttribute('data-vertical-state','descent');await expect(rate).toHaveText(/^↓ /);expect(Math.abs(number(descent.text)+descent.speed)).toBeLessThan(0.3);
    await expect(metric).toHaveAttribute('aria-label',/Descending at .* meters per second/);
    const steady=await page.evaluate(()=>(window as any).measureVertical(''));expect(steady.speed).toBeLessThan(0);expect(steady.state.pitchRadians).toBeCloseTo(0,6);await expect(rate).toHaveAttribute('data-vertical-state','descent');
    await canvas.evaluate((c:any)=>{c._rhCommand('perchPractice');(window as any).advanceHunt(400);});await expect(rate).toHaveText('— 0 m/s');await expect(rate).toHaveAttribute('data-vertical-state','level');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
