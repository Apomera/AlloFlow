import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor uncluttered strike feedback',()=>{
  test.describe.configure({mode:'serial',timeout:240000});
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
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0});
      w.placeHuntPrey=(distance:number)=>{
        const scene=w.huntScene,s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians,pitch=s.pitchRadians;
        const prey=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
        // Reposition real scene prey to exercise production acquisition and catch code.
        prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*Math.cos(pitch)*distance:2000+i*20,i===0?p.y+Math.sin(pitch)*distance:2000,i===0?p.z-Math.cos(yaw)*Math.cos(pitch)*distance:2000));
      };
    });
  });
  test('shows one in-flight strike message while preserving coaching and pause timing',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),cue=page.locator('[data-raptor-target-guidance]'),events=page.locator('[data-raptor-flight-events]');
    for(const width of [880,320]){
      await page.setViewportSize({width:width+40,height:1000});await page.addStyleTag({content:'#wrap{width:'+width+'px}'});await page.waitForFunction(w=>document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!.width<w,width,{polling:50});
      if(width===320)await canvas.evaluate((c:any)=>c._rhCommand('assist'));
      for(const kind of ['miss','hit']){
        await canvas.evaluate((c:any,kind)=>{const w=window as any;w.advanceHunt(4000);w.placeHuntPrey(kind==='hit'?3:40);c._rhCommand('strike');w.advanceHunt(150);},kind);
        await expect(cue).toHaveAttribute('data-target-state',kind);await expect(cue).toContainText(kind==='hit'?'CATCH':'TOO FAR');expect(await cue.evaluate(el=>getComputedStyle(el).borderTopColor)).toBe(kind==='hit'?'rgb(110, 231, 183)':'rgb(251, 191, 36)');await expect(page.locator('.rh-strike-feedback')).toHaveCount(0);await expect(events).not.toContainText(/CATCH|MISS|TOO FAR/);
        await expect(page.getByRole('region',{name:'Last strike',exact:true})).toContainText(kind==='hit'?'Catch secured':'Strike missed');
        const visible=await cue.textContent();const snapshot=await canvas.evaluate((c:any)=>{c._rhCommand('pause');return c._rhSnapshot();});
        await page.evaluate(()=>{(window as any).stepHunt(60000);});await expect(cue).toHaveText(visible!);expect(await canvas.evaluate((c:any)=>c._rhSnapshot().motionTimeMs)).toBe(snapshot.motionTimeMs);
        await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(cue).toBeHidden();await expect(page.locator('.rh-strike-feedback')).toHaveCount(0);await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(cue).toBeVisible();
        await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).stepHunt(25);});
        await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/strike-clean-'+kind+'-'+width+'.png',timeout:90000});
        await page.emulateMedia({reducedMotion:'reduce'});await canvas.evaluate((c:any)=>{(window as any).advanceHunt(1200);});await expect(cue).not.toHaveAttribute('data-target-state',kind);if(width===320)await expect(cue).toHaveAttribute('data-target-state','off');await expect(page.getByRole('region',{name:'Last strike',exact:true})).toContainText(kind==='hit'?'Catch secured':'Strike missed');
      }
    }
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
