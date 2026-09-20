import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor telemetry clarity',()=>{
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


  test('labels live reserves and keeps telemetry inside its cells through resize and pause',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),strip=page.locator('.rh-flight-telemetry-strip'),energy=page.locator('[data-raptor-metric=energy]');
    await canvas.evaluate((c:any)=>{c._rhCommand('hold',{key:' ',pressed:true});(window as any).advanceHunt(1500);c._rhCommand('hold',{key:' ',pressed:false});});
    const s=await canvas.evaluate((c:any)=>c._rhSnapshot());
    await expect(energy.locator('[data-energy-resource=calories]')).toHaveText('Calories'+Math.round(Math.max(0,Math.min(100,s.calories/s.caloriesMax*100)))+'%');
    await expect(energy.locator('[data-energy-resource=stamina]')).toHaveText('Stamina'+Math.round(s.stamina)+'%');
    await expect(energy).toHaveAttribute('role','group');await expect(energy).toHaveAttribute('aria-label',/Energy: calories \d+ percent, stamina \d+ percent/);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const paused=await strip.textContent();const state=await canvas.evaluate((c:any)=>c._rhSnapshot());
    for(const width of [880,760,420,320,300]){
      await page.setViewportSize({width:width+40,height:1100});await page.addStyleTag({content:'#wrap{width:'+width+'px}'});
      await page.waitForFunction(()=>{const c=document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!;return Math.abs(c.width-c.clientWidth)<2;},null,{polling:50});
      const overflow=await strip.evaluate(el=>Array.from(el.querySelectorAll<HTMLElement>('[data-raptor-metric]')).filter(cell=>cell.offsetWidth>0&&['speed','altitude','energy','weather'].includes(cell.dataset.raptorMetric!)).flatMap(cell=>{
        const r=cell.getBoundingClientRect(),walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT),bad:string[]=[];let node;while(node=walker.nextNode()){if(!node.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const b of Array.from(range.getClientRects()))if(b.left<r.left||b.right>r.right||b.bottom>r.bottom)bad.push(cell.dataset.raptorMetric+': '+node.textContent);}return bad;
      }));expect(overflow,'text stays within telemetry cells at '+width).toEqual([]);
      expect(await strip.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      const clearance=await strip.evaluate(el=>document.querySelector('.rh-flight-state')!.getBoundingClientRect().top-el.getBoundingClientRect().bottom);expect(clearance).toBeGreaterThanOrEqual(0);
      await expect(strip).toHaveText(paused!);
      if(width===320||width===880){await canvas.evaluate((c:any)=>c._rhCommand('pause'));await strip.screenshot({path:'scratch/raptor-flight-review/telemetry-clarity-'+width+'.png',timeout:90000});await canvas.evaluate((c:any)=>c._rhCommand('pause'));}
    }
    const after=await canvas.evaluate((c:any)=>{(window as any).stepHunt(60000);return c._rhSnapshot();});for(const field of ['motionTimeMs','calories','stamina','raptorPosition'])expect(after[field]).toEqual(state[field]);
    await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await expect(energy).toBeVisible();await canvas.evaluate((c:any)=>c._rhCommand('pause'));await strip.screenshot({path:'scratch/raptor-flight-review/telemetry-clarity-forced-colors.png',timeout:90000});await canvas.evaluate((c:any)=>c._rhCommand('pause'));
    await page.emulateMedia({forcedColors:'none'});await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).advanceHunt(200);});const resumed=await canvas.evaluate((c:any)=>c._rhSnapshot()),shown=parseInt((await energy.locator('[data-energy-resource=stamina] .rh-flight-energy-value').textContent())!,10);
    // HUD updates at 10 Hz; ground recovery can gain 3.5 stamina points between readouts.
    expect(resumed.motionTimeMs).toBeGreaterThan(state.motionTimeMs);expect(Math.abs(shown-Math.round(resumed.stamina))).toBeLessThanOrEqual(4);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
