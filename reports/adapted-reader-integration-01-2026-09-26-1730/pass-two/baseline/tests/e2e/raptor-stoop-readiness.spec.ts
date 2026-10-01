import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(!window.skipStoopRender)return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor High Stoop readiness',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'highStoop',flightSession:{speciesId:'peregrine',missionId:'highStoop'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
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




  test('requires a qualifying catch and preserves clear readiness through pause and restart',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),panel=page.locator('[data-raptor-mission-progress]'),meter=page.getByRole('progressbar',{name:'Dive speed requirement',exact:true}),route=page.locator('[data-raptor-mission-route]');
    await canvas.evaluate((c:any)=>{const w=window as any;w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);});
    await expect(route).toHaveAttribute('data-route-outcome','active');
    await expect(page.locator('[data-raptor-strike-review]')).toContainText('High Stoop needs a catch while diving at 180 mph or faster');
    expect(await canvas.evaluate((c:any)=>c._rhSnapshot().missionCatches)).toBe(1);
    const dive=await canvas.evaluate((c:any)=>{const w=window as any;w.skipStoopRender=true;c._rhCommand('hold',{key:'shift',pressed:true});let reached=false;for(let i=0;i<500;i++){w.stepHunt(50);const s=c._rhSnapshot();if(s.speedMph>=182&&s.diveActive){reached=true;break;}if(s.crashed)break;}w.skipStoopRender=false;w.stepHunt(25);return {reached,snapshot:c._rhSnapshot()};});
    expect(dive.reached).toBe(true);expect(dive.snapshot.diveActive).toBe(true);await expect(route).toHaveAttribute('data-route-outcome','active');await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(meter).toHaveAttribute('aria-valuemax','180');await expect(meter).toHaveAttribute('aria-valuenow','180');await expect(meter).toHaveAttribute('aria-valuetext',/successful catch is still required/);await expect(meter).not.toHaveAttribute('aria-valuetext',/100% complete/);await expect(panel).toContainText('left');
    await canvas.evaluate((c:any)=>{const w=window as any;w.placeHuntPrey(3);w.stepHunt(1);});
    await expect(route).toHaveAttribute('data-route-phase','3');await expect(page.locator('[data-raptor-mission-focus]')).toContainText('Strike now');
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/stoop-strike-readiness.png',timeout:90000});
    const frozen=await canvas.evaluate((c:any)=>{c._rhCommand('pause');return c._rhSnapshot();});const textBefore=await panel.textContent();
    await page.evaluate(()=>{(window as any).stepHunt(60000);});expect(await canvas.evaluate((c:any)=>c._rhSnapshot().motionTimeMs)).toBe(frozen.motionTimeMs);await expect(panel).toHaveText(textBefore!);
    await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');c._rhCommand('hold',{key:'shift',pressed:true});w.stepHunt(1);w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);});
    await expect(page.getByRole('dialog',{name:'Mission complete',exact:true})).toBeVisible();await expect(route).toHaveAttribute('data-route-phase','4');await expect(route).toHaveAttribute('data-route-outcome','success');await expect(page.getByRole('progressbar',{name:'Mission completion',exact:true})).toHaveAttribute('aria-valuenow','100');
    await page.setViewportSize({width:440,height:1000});await page.addStyleTag({content:'#wrap{width:420px}'});await page.waitForFunction(()=>document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!.width<420);await page.evaluate(()=>{(window as any).stepHunt(25);});
    await page.getByRole('button',{name:'Fly again',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(route).toHaveAttribute('data-route-outcome','active');await expect(meter).toHaveAttribute('aria-valuemax','180');expect(await canvas.evaluate((c:any)=>c._rhSnapshot().missionCatches)).toBe(0);
    await page.evaluate(()=>{(window as any).advanceHunt(150);});await expect(panel).toContainText('180 mph');
    const bounds=await panel.evaluate(el=>{const r=el.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();return {left:r.left-host.left,right:host.right-r.right,overflow:el.scrollWidth-el.clientWidth};});expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeGreaterThanOrEqual(0);expect(bounds.overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/stoop-guidance-420.png',timeout:90000});
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
