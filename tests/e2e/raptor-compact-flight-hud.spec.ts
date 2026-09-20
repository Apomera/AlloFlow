import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor compact flight instruments',()=>{
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


  test('keeps the ring center clear while retaining paused ring history',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),hud=page.locator('.rh-practice-hud');
    await page.setViewportSize({width:360,height:1100});await page.addStyleTag({content:'#wrap{width:320px}'});
    await page.waitForFunction(()=>{const c=document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!;return Math.abs(c.width-c.clientWidth)<2;},null,{polling:50});
    await canvas.evaluate((c:any)=>{c._rhCommand('trail');(window as any).advanceHunt(150);});
    const layout=await hud.evaluate(el=>{const w=window as any,r=el.getBoundingClientRect(),canvas=document.querySelector('[data-raptor-canvas]')!.getBoundingClientRect(),point=w.huntScene.getObjectByName('raptor-practice-gate-0').position.clone().project(w.huntCamera);return {height:r.height,overflow:el.scrollWidth-el.clientWidth,clearance:canvas.top+(1-point.y)*canvas.height/2-r.bottom};});
    expect(layout.height).toBeLessThan(60);expect(layout.clearance).toBeGreaterThan(12);expect(layout.overflow).toBeLessThanOrEqual(1);await expect(hud.locator('.rh-practice-score')).toBeVisible();await expect(hud.locator('.rh-practice-hint')).toBeVisible();await expect(hud.getByRole('img')).toHaveCount(5);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/compact-flight-ring-320.png',timeout:90000});
    const before=await canvas.evaluate((c:any)=>{c._rhCommand('pause');return c._rhSnapshot();});expect(await hud.locator('.rh-practice-pip').first().evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(15);
    const after=await canvas.evaluate((c:any)=>{(window as any).stepHunt(60000);return c._rhSnapshot();});for(const field of ['raptorPosition','motionTimeMs','practiceTrailScore','practiceTrailIndex'])expect(after[field]).toEqual(before[field]);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));expect(await hud.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(60);
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();expect(await hud.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);await expect(hud.locator('.rh-practice-feedback')).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('fits strong wind and ground speed on phones without crowding nearby instruments',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),wind=page.locator('.rh-flight-wind'),detail=wind.locator('.rh-flight-wind-detail');
    await canvas.evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:20,windDir:3*Math.PI/4});(window as any).advanceHunt(200);});await expect(wind).toContainText('WIND TO SE 20.0 m/s');await expect(detail).toHaveText(/GS \d+ mph/);
    for(const width of [880,420,320,300]){
      await page.setViewportSize({width:width+40,height:1100});await page.addStyleTag({content:'#wrap{width:'+width+'px}'});
      const bounds=await wind.evaluate(el=>{const r=el.getBoundingClientRect(),parts=[...el.querySelectorAll('span')].filter(n=>n.getBoundingClientRect().width>0),overflow=parts.filter(n=>{const range=document.createRange();range.selectNodeContents(n);const b=range.getBoundingClientRect();return b.left<r.left||b.right>r.right||b.bottom>r.bottom;}).map(n=>n.textContent),obstacles=[...el.parentElement!.querySelectorAll('.rh-flight-state,.rh-flight-heading,.rh-flight-target-cue')].filter(n=>n.getBoundingClientRect().width>0).filter(n=>{const b=n.getBoundingClientRect();return Math.min(r.right,b.right)>Math.max(r.left,b.left)&&Math.min(r.bottom,b.bottom)>Math.max(r.top,b.top);}).map(n=>n.className);return {overflow,obstacles};});expect(bounds.overflow).toEqual([]);expect(bounds.obstacles).toEqual([]);
      if(width<=320){
        await canvas.evaluate((c:any)=>{if(!c._rhSnapshot().practiceTrailActive)c._rhCommand('trail');});
        const feedback=page.locator('.rh-practice-feedback');await expect(feedback).toBeVisible();
        const clash=await feedback.evaluate(el=>{const r=el.getBoundingClientRect(),w=document.querySelector('.rh-flight-wind')!.getBoundingClientRect();return Math.max(0,Math.min(r.right,w.right)-Math.max(r.left,w.left))*Math.max(0,Math.min(r.bottom,w.bottom)-Math.max(r.top,w.top));});expect(clash).toBe(0);
      }
      if(width===320)await wind.screenshot({path:'scratch/raptor-flight-review/compact-wind-320.png',timeout:90000});
    }
    const text=await wind.textContent();await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).stepHunt(60000);});await expect(wind).toHaveText(text!);
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');c._rhCommand('environment',{windSpeed:0});(window as any).advanceHunt(200);});await expect(detail).toBeHidden();await expect(wind).toContainText('0.0 m/s');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
