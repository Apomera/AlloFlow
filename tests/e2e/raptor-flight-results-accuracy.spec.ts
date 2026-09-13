import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(!window.skipFlightRender)return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor flight results accuracy',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'feedChicks',flightSession:{speciesId:'peregrine',missionId:'feedChicks'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0});
      w.placeHuntPrey=(distance:number,yawOffset=0,pitchOffset=0)=>{
        const scene=w.huntScene,s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians+yawOffset,pitch=s.pitchRadians+pitchOffset;
        const prey=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
        // Reposition real scene prey to exercise production acquisition and catch code.
        prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*Math.cos(pitch)*distance:2000+i*20,i===0?p.y+Math.sin(pitch)*distance:2000,i===0?p.z-Math.cos(yaw)*Math.cos(pitch)*distance:2000));
      };
    });
  });





  test('preserves catches before a crash in the debrief and saved flight history',async({page})=>{
    const recovery=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);const first=c._rhSnapshot().missionCatches;
      // Keep production physics running; skip GPU submission during this long input sequence.
      w.skipFlightRender=true;c._rhCommand('hold',{key:'shift',pressed:true});
      for(let i=0;i<400&&!c._rhSnapshot().crashed;i++)w.stepHunt(50);
      c._rhCommand('hold',{key:'shift',pressed:false});const crashed=c._rhSnapshot();
      w.advanceHunt(3200);c._rhCommand('hold',{key:' ',pressed:true});w.advanceHunt(1500);c._rhCommand('hold',{key:' ',pressed:false});
      c._rhCommand('hold',{key:'e',pressed:true});w.advanceHunt(1200);c._rhCommand('hold',{key:'e',pressed:false});w.skipFlightRender=false;w.stepHunt(1);
      return {first,crashed:crashed.crashed,catchesAfterCrash:crashed.missionCatches,landed:c._rhSnapshot().landed};
    });expect(recovery).toEqual({first:1,crashed:true,catchesAfterCrash:1,landed:false});
    for(let i=0;i<12;i++){
      const done=await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);if(document.querySelector('[data-mission-state="success"]'))return true;w.advanceHunt(1000);return false;});if(done)break;
    }
    const dialog=page.getByRole('dialog',{name:'Mission complete',exact:true});await expect(dialog).toBeVisible();
    const catches=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().missionCatches);expect(catches).toBeGreaterThan(1);
    const stat=dialog.locator('.rh-flight-debrief-stat').filter({has:page.locator('.rh-flight-debrief-label',{hasText:/^Catches$/})});await expect(stat.locator('strong')).toHaveText(String(catches));
    expect(await page.evaluate(()=>(window as any).__toolData.raptorHunt.runHistory.at(-1).catches)).toBe(catches);
    await expect(dialog.locator('.rh-flight-progress-pulse-value')).toContainText(String(catches-1)+' /');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('previews the actual next mission and species before launching it',async({page})=>{
    for(let i=0;i<12;i++){
      const done=await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);if(document.querySelector('[data-mission-state="success"]'))return true;w.advanceHunt(1000);return false;});if(done)break;
    }
    const dialog=page.getByRole('dialog',{name:'Mission complete',exact:true}),next=dialog.getByRole('button',{name:'Next mission',exact:true});
    await expect(next).toHaveAccessibleDescription(/Cross the Desert.*Red-tailed Hawk.*6 min/);
    await page.setViewportSize({width:360,height:1000});await page.addStyleTag({content:'#wrap{width:320px}[data-raptor-flight-stage]{height:460px!important;min-height:0!important}'});
    await expect(dialog.locator('[data-raptor-next-mission]')).toBeVisible();
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/next-mission-preview-320.png',timeout:90000});
    await next.click();await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(()=>(window as any).__toolData.raptorHunt.flightSession)).toEqual({speciesId:'redTail',missionId:'crossDesert'});
    await expect(page.locator('[data-raptor-mission-progress]')).toHaveAttribute('data-raptor-mission-progress','crossDesert');
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot?.().missionCatches)).toBe(0);
    const start=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().motionTimeMs);await page.evaluate(()=>{(window as any).advanceHunt(150);});expect(await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().motionTimeMs)).toBeGreaterThan(start);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
