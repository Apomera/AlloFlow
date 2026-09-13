import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor recurring hunt cycle',()=>{
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
      w.placeHuntPrey=(distance:number,yawOffset=0,pitchOffset=0)=>{
        const scene=w.huntScene,s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians+yawOffset,pitch=s.pitchRadians+pitchOffset;
        const prey=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
        // Reposition real scene prey to exercise production acquisition and catch code.
        prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*Math.cos(pitch)*distance:2000+i*20,i===0?p.y+Math.sin(pitch)*distance:2000,i===0?p.z-Math.cos(yaw)*Math.cos(pitch)*distance:2000));
      };
    });
  });


  test('repeats the hunt cycle after catches and keeps the flight count through the next approach',async({page})=>{
    const panel=page.getByRole('group',{name:'Free Hunt progress',exact:true});
    const route=panel.locator('[data-raptor-mission-route]');
    const place=async(distance:number,yaw=0)=>page.evaluate(({distance,yaw})=>{const w=window as any;w.placeHuntPrey(distance,yaw);w.stepHunt(1);},{distance,yaw});
    await place(2000);await expect(panel).toContainText('Find your next target');await expect(route.locator('[aria-current="step"]')).toHaveAttribute('data-route-key','scan');
    await place(30,.95);await expect(panel).toContainText('Line up your approach');await expect(route.locator('[aria-current="step"]')).toHaveAttribute('data-route-key','align');
    await place(30);await expect(panel).toContainText('Close the distance');
    for(let catches=1;catches<=2;catches++){
      await place(3);await expect(panel).toContainText('Strike window open');await expect(route.locator('[aria-current="step"]')).toHaveAttribute('data-route-key','strike');
      await page.evaluate(()=>{const w=window as any;w.placeHuntPrey(3);(document.querySelector('[data-raptor-canvas]') as any)._rhCommand('strike');w.stepHunt(1);});
      await expect(panel).toContainText('Catch secured');await expect(panel).toContainText(catches+(catches===1?' catch this flight':' catches this flight'));await expect(route.locator('[aria-current="step"]')).toHaveAttribute('data-route-key','reset');
      await page.evaluate(()=>{(window as any).advanceHunt(1000);});await place(2000);
      await expect(panel).toContainText('Find your next target');await expect(route.locator('[aria-current="step"]')).toHaveAttribute('data-route-key','scan');
      await expect(route.locator('[data-route-state="complete"]')).toHaveCount(0);
    }
    await page.getByRole('button',{name:'Restart this flight',exact:true}).click();await expect(panel).toContainText('0 catches this flight');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('supports missed approaches, pause, manual exploration, and a readable narrow hunt panel',async({page})=>{
    const panel=page.getByRole('group',{name:'Free Hunt progress',exact:true});
    await page.setViewportSize({width:440,height:1000});await page.addStyleTag({content:'#wrap{width:420px}'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:HTMLCanvasElement)=>c.width)).toBeLessThan(440);
    await page.evaluate(()=>{const w=window as any;for(let i=0;i<8;i++){w.placeHuntPrey(30,.95);w.stepHunt(25);}});
    await expect(panel).toContainText('Line up your approach');
    const bounds=await panel.evaluate(el=>{const r=el.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();return {left:r.left-host.left,right:host.right-r.right,overflow:el.scrollWidth-el.clientWidth,height:r.height,hostHeight:host.height};});
    expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeGreaterThanOrEqual(0);expect(bounds.overflow).toBeLessThanOrEqual(1);expect(bounds.height).toBeLessThan(bounds.hostHeight*.35);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/free-hunt-cycle-narrow.png',timeout:90000});
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(4,.95);c._rhCommand('strike');w.stepHunt(1);c._rhCommand('pause');});
    await expect(panel).toContainText('Reset your approach');const frozen=await panel.textContent();
    await page.evaluate(()=>{(window as any).stepHunt(60000);});expect(await panel.textContent()).toBe(frozen);
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;c._rhCommand('pause');w.advanceHunt(800);w.placeHuntPrey(30,.95);w.stepHunt(1);});
    await expect(panel).toContainText('Line up your approach');await expect(panel).toContainText('0 catches this flight');
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;c._rhCommand('assist');w.stepHunt(1);});await expect(panel).toContainText('Explore freely');await expect(panel).toContainText('Target assist is off');
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(panel).toBeHidden();await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(panel).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
