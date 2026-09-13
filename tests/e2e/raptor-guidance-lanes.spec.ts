import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
for(const mission of ['open','thermalKettle'])test.describe('Raptor compact guidance '+mission,()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:mission,flightSession:{speciesId:'peregrine',missionId:mission},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
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





  test('keeps real guidance clear of the status stack and mission panel',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),cue=page.locator('[data-raptor-target-guidance]');
    await page.evaluate(()=>{(window as any).advanceHunt(2500);});
    for(const width of [420,320]){
      await page.setViewportSize({width:width+20,height:900});await page.addStyleTag({content:'#wrap{width:'+width+'px}[data-raptor-flight-stage]{height:350px!important}'});
      await page.waitForFunction(w=>document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!.width<w,width,{polling:50});
      await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('environment',{windSpeed:14});w.advanceHunt(150);w.placeHuntPrey(60,.95);w.stepHunt(25);});
      const check=async()=>{
        const layout=await cue.evaluate(el=>{const r=el.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();const obstacles=[...el.parentElement!.querySelectorAll('.rh-flight-state,.rh-flight-wind,.rh-flight-heading,.rh-flight-attitude,.rh-flight-mission-hud,.rh-flight-telemetry-strip')].map(node=>{const b=node.getBoundingClientRect();return {name:node.className,overlap:Math.max(0,Math.min(r.right,b.right)-Math.max(r.left,b.left))*Math.max(0,Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top)),bottom:b.bottom-host.bottom};});return {obstacles,left:r.left-host.left,right:host.right-r.right,overflow:el.scrollWidth-el.clientWidth};});
        expect(layout.obstacles.filter(o=>o.overlap>0)).toEqual([]);expect(layout.obstacles.every(o=>o.bottom<=0)).toBe(true);expect(layout.left).toBeGreaterThanOrEqual(0);expect(layout.right).toBeGreaterThanOrEqual(0);expect(layout.overflow).toBeLessThanOrEqual(1);
      };
      await check();
      expect(await page.locator('[data-raptor-flight-stage]').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(460);
      const controlsClear=await page.locator('.rh-flight-mission-hud').evaluate(el=>{const p=el.getBoundingClientRect();return [...el.parentElement!.querySelectorAll('.rh-practice-toggle,.rh-scenic-toggle')].every(node=>{const r=node.getBoundingClientRect();return Math.max(0,Math.min(p.right,r.right)-Math.max(p.left,r.left))*Math.max(0,Math.min(p.bottom,r.bottom)-Math.max(p.top,r.top))===0;});});expect(controlsClear).toBe(true);
      expect(await page.locator('.rh-flight-mission-route-label').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1))).toBe(true);
      await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/guidance-lanes-'+mission+'-'+width+'.png',timeout:90000});
      if(mission==='open'){await canvas.evaluate((c:any)=>{(window as any).placeHuntPrey(60,.95);c._rhCommand('strike');(window as any).stepHunt(25);});await expect(cue).toContainText(/FAR|LEFT|RIGHT|ALIGN|TARGET/);await check();await canvas.evaluate((c:any)=>{const w=window as any;w.advanceHunt(500);w.placeHuntPrey(3,.95);c._rhCommand('strike');w.stepHunt(25);});await expect(cue).toContainText('Face prey before striking');await check();await page.evaluate(()=>{(window as any).advanceHunt(1600);});}

    }
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const before=await canvas.evaluate((c:any)=>c._rhSnapshot().motionTimeMs);
    await canvas.evaluate((c:any)=>{c._rhCommand('view');(window as any).stepHunt(60000);});expect(await canvas.evaluate((c:any)=>c._rhSnapshot().motionTimeMs)).toBe(before);
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(cue).toBeHidden();await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(cue).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
