import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
test.use({video:'off'});
for(const width of [1100,420])test.describe('Raptor target guidance '+width,()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width,height:700,appStyles:true,probes:'window.AlloPostFXEnabled = false;'});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});
  test.afterEach(async({page})=>{await harness.destroy(page);});
  test('keeps edge bearings and captions readable and respects flight display modes',async({page})=>{
    await page.setViewportSize({width:Math.max(width,420),height:900});
    await page.addInitScript(()=>{
      let clock=1000,nextId=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      performance.now=()=>clock;
      window.requestAnimationFrame=cb=>{const id=nextId++;callbacks.set(id,cb);return id;};
      window.cancelAnimationFrame=id=>{callbacks.delete(id);};
      (window as any).advanceFlight=(ms=16.667)=>{clock+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(clock));};
    });
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',flightSession:{speciesId:'peregrine',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    const command=async(action:string,value?:any)=>page.locator('[data-raptor-canvas]').evaluate((c:any,{action,value})=>{c._rhCommand(action,value);(window as any).advanceFlight();return c._rhSnapshot();},{action,value});
    const tracker=page.locator('.rh-target-tracker');
    for(const [x,y,edge] of [[-1.6,1.4,'left-top'],[1.6,1.4,'right-top'],[-1.6,-1.4,'left-bottom'],[1.6,-1.4,'right-bottom'],[0,0,'']] as const){
      await command('targetProbe',{ndcX:x,ndcY:y,ndcZ:0});
      const bounds=await tracker.evaluate(el=>{
        const marker=el.getBoundingClientRect(),label=el.querySelector('.rh-target-label')!.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();
        const rect=(r:DOMRect)=>({left:r.left-host.left,top:r.top-host.top,right:r.right-host.left,bottom:r.bottom-host.top});
        const obstacles=Array.from(el.parentElement!.querySelectorAll('.rh-flight-mission-hud,.rh-flight-telemetry-strip,.rh-flight-key-guide,.rh-flight-altitude-gauge,.rh-scenic-toggle,.rh-practice-toggle')).map(node=>rect(node.getBoundingClientRect()));
        return {obstacles,marker:rect(marker),label:rect(label),width:host.width,height:host.height,edge:(el as HTMLElement).dataset.targetEdge,arrow:getComputedStyle(el,'::after').content};
      });
      expect(bounds.edge).toBe(edge);
      for(const rect of [bounds.marker,bounds.label]){expect(rect.left).toBeGreaterThanOrEqual(0);expect(rect.top).toBeGreaterThanOrEqual(0);expect(rect.right).toBeLessThanOrEqual(bounds.width);expect(rect.bottom).toBeLessThanOrEqual(bounds.height);}
      expect(bounds.arrow).toBe(edge?'""':'none');
      if(edge)for(const r of [bounds.marker,bounds.label])for(const obstacle of bounds.obstacles){
        const overlap=Math.max(0,Math.min(r.right,obstacle.right)-Math.max(r.left,obstacle.left))*Math.max(0,Math.min(r.bottom,obstacle.bottom)-Math.max(r.top,obstacle.top));
        expect(overlap).toBe(0);
      }
    }
    await command('targetProbe',{ndcX:1.6,ndcY:-1.4,ndcZ:0});
    await page.screenshot({fullPage:true,clip:(await page.locator('[data-raptor-flight-stage]').boundingBox())!,path:'scratch/raptor-flight-review/target-guidance-'+width+'.png',timeout:90000});
    let snap=await command('assist');expect(snap.assistEnabled).toBe(false);expect(snap.targetGuideVisible).toBe(false);expect(snap.targetHaloVisible).toBe(false);await expect(tracker).toBeHidden();
    snap=await command('assist');expect(snap.assistEnabled).toBe(true);await expect(tracker).toBeVisible();
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    snap=await command('targetProbe',{ndcX:1.6,ndcY:-1.4,ndcZ:0});expect(snap.targetGuideVisible).toBe(false);expect(snap.targetHaloVisible).toBe(false);await expect(tracker).toBeHidden();
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();await command('targetProbe',{ndcX:0,ndcY:0,ndcZ:0});await expect(tracker).toBeVisible();
    snap=await command('trail');expect(snap.targetGuideVisible).toBe(false);expect(snap.targetHaloVisible).toBe(false);await expect(tracker).toBeHidden();
    await command('trail');await expect(tracker).toBeVisible();
    await page.emulateMedia({reducedMotion:'reduce'});snap=await command('targetProbe',{ndcX:1.6,ndcY:0,ndcZ:0});expect(snap.reducedMotion).toBe(true);expect(snap.targetGuideVisible).toBe(false);await expect(tracker).toBeVisible();
    await command('targetProbe',{ndcX:0,ndcY:0,ndcZ:2});await expect(tracker).toBeHidden();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
