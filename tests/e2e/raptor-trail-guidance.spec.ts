import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor continuous trail guidance',()=>{
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


  test('keeps steering visible during welcomes and ring awards with distance-aware aim tolerance',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),hud=page.getByRole('group',{name:'Flight trail progress',exact:true}),hint=hud.locator('.rh-practice-hint'),feedback=hud.locator('.rh-practice-feedback');
    await canvas.evaluate((c:any)=>{c._rhCommand('assist');c._rhCommand('trail');});
    await expect(hint).toHaveText('Hold your line through the center');await expect(feedback).toContainText('Aim inside the small circle for +2');
    await page.setViewportSize({width:360,height:1100});await page.addStyleTag({content:'#wrap{width:320px}'});
    await page.waitForFunction(()=>{const c=document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!;return Math.abs(c.width-c.clientWidth)<2;},null,{polling:50});await canvas.evaluate((c:any)=>(window as any).stepHunt(25));
    const introFit=await feedback.evaluate(el=>{const r=el.getBoundingClientRect(),hud=el.parentElement!.getBoundingClientRect(),strip=document.querySelector('.rh-flight-telemetry-strip')!.getBoundingClientRect(),wind=document.querySelector('.rh-flight-wind')!.getBoundingClientRect();return {overlap:Math.max(0,Math.min(r.right,wind.right)-Math.max(r.left,wind.left))*Math.max(0,Math.min(r.bottom,wind.bottom)-Math.max(r.top,wind.top)),top:r.top-strip.bottom,bottom:hud.top-r.bottom,overflow:el.scrollWidth-el.clientWidth};});expect(introFit.overlap).toBe(0);expect(introFit.top).toBeGreaterThanOrEqual(0);expect(introFit.bottom).toBeGreaterThanOrEqual(0);expect(introFit.overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/trail-steering-intro-320.png',timeout:90000});
    await page.setViewportSize({width:920,height:1100});await page.addStyleTag({content:'#wrap{width:880px}'});
    const turned=await canvas.evaluate((c:any)=>{c._rhCommand('hold',{key:'d',pressed:true});(window as any).advanceHunt(160);c._rhCommand('hold',{key:'d',pressed:false});(window as any).advanceHunt(150);return c._rhSnapshot();});
    const g=turned.practiceNextGate,p=turned.raptorPosition,error=Math.atan2(Math.sin(Math.atan2(g.x-p.x,-(g.z-p.z))-turned.headingRadians),Math.cos(Math.atan2(g.x-p.x,-(g.z-p.z))-turned.headingRadians));
    expect(error).toBeLessThan(-Math.atan2(g.radius*.4,Math.hypot(g.x-p.x,g.z-p.z)));expect(Math.abs(error)).toBeLessThan(.3);
    await expect(hint).toHaveText('Turn left');await expect(feedback).toBeVisible();
    const earned=await canvas.evaluate((c:any)=>{const w=window as any;w.skipGroundRender=true;
      for(let i=0;i<220&&c._rhSnapshot().practiceTrailIndex===0;i++){
        const s=c._rhSnapshot(),g=s.practiceNextGate,error=Math.atan2(Math.sin(Math.atan2(g.x-s.raptorPosition.x,-(g.z-s.raptorPosition.z))-s.headingRadians),Math.cos(Math.atan2(g.x-s.raptorPosition.x,-(g.z-s.raptorPosition.z))-s.headingRadians));
        for(const [key,pressed] of [['d',error>.035],['a',error<-.035],['e',g.y-s.raptorPosition.y>.7],['q',s.raptorPosition.y-g.y>.7]])c._rhCommand('hold',{key,pressed});w.stepHunt(40);
      }
      for(const key of ['a','d','e','q'])c._rhCommand('hold',{key,pressed:false});w.skipGroundRender=false;w.stepHunt(25);return c._rhSnapshot();
    });
    expect(earned.practiceTrailPassed).toBe(1);expect(earned.practiceTrailScore).toBeGreaterThan(0);await expect(feedback).toContainText(/Centered pass|Ring passed/);await expect(feedback).toHaveAttribute('data-feedback-tone','passed');await expect(hint).not.toContainText(/pass|points/i);
    const award=await feedback.textContent();await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).stepHunt(60000);});await expect(feedback).toBeHidden();await expect(hint).toContainText('Resume flight');await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(feedback).toHaveText(award!);
    for(const width of [880,320]){
      await page.setViewportSize({width:width+40,height:1100});await page.addStyleTag({content:'#wrap{width:'+width+'px}'});await page.waitForFunction(()=>{const c=document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!;return Math.abs(c.width-c.clientWidth)<2;},null,{polling:50});await canvas.evaluate((c:any)=>(window as any).stepHunt(25));
      expect(await hud.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      const layout=await hud.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect(),wind=el.parentElement!.querySelector('.rh-flight-wind')!.getBoundingClientRect();return {left:r.left-p.left,right:p.right-r.right,overlap:Math.max(0,Math.min(r.right,wind.right)-Math.max(r.left,wind.left))*Math.max(0,Math.min(r.bottom,wind.bottom)-Math.max(r.top,wind.top))};});expect(layout.left).toBeGreaterThanOrEqual(0);expect(layout.right).toBeGreaterThanOrEqual(0);expect(layout.overlap).toBe(0);
      await hud.screenshot({path:'scratch/raptor-flight-review/trail-steering-award-'+width+'.png',timeout:90000});
      if(width===320)await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/trail-steering-stage-320.png',timeout:90000});
    }
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    const scenicFit=await feedback.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();return {top:r.top-p.top,bottom:p.bottom-r.bottom};});expect(scenicFit.top).toBeGreaterThanOrEqual(0);expect(scenicFit.bottom).toBeGreaterThanOrEqual(0);
    await canvas.evaluate((c:any)=>{c._rhCommand('trail');});await expect(hud).toBeHidden();await expect(feedback).toBeHidden();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
