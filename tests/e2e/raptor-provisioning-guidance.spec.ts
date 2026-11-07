import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor provisioning mission guidance',()=>{
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



  test('counts calories only when each catch reaches the nest, until the objective completes',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),panel=page.getByRole('group',{name:'Mission progress',exact:true}),route=panel.locator('[data-raptor-mission-route]'),meter=panel.getByRole('progressbar');
    const snap=()=>canvas.evaluate((c:any)=>{const s=c._rhSnapshot();return {catches:s.missionCatches,carrying:s.carryingToNest,kcal:s.missionCaloriesCounted,deliveries:s.nestDeliveries,label:s.carriedPreyLabel,calories:s.calories,state:s.targetState};});
    await expect.poll(()=>route.locator('[data-route-key]').evaluateAll(els=>els.map((el:any)=>el.getAttribute('data-route-key')))).toEqual(['scan','catch','carry','feed']);
    let previous=0,lastProgress=0;
    for(let trip=1;trip<=14;trip++){
      await page.evaluate(()=>{const w=window as any;w.placeHuntPrey(3);(document.querySelector('[data-raptor-canvas]') as any)._rhCommand('strike');w.stepHunt(1);});
      const caught=await snap();expect(caught.catches).toBe(trip);expect(caught.carrying).toBe(true);expect(caught.kcal).toBe(previous);
      await expect(meter).toHaveAttribute('aria-valuenow',String(lastProgress));
      await expect(panel).toContainText('Carry it to the nest');await expect(route.locator('[aria-current="step"]')).toHaveAttribute('data-route-key','carry');
      await page.evaluate(()=>{(window as any).advanceHunt(1500);});
      expect((await snap()).state).toBe('deliver');await expect(page.locator('[data-raptor-target-guidance]')).toContainText('DELIVER');
      // Talons are full: a second strike is refused and costs nothing.
      await page.evaluate(()=>{const w=window as any;w.placeHuntPrey(3);(document.querySelector('[data-raptor-canvas]') as any)._rhCommand('strike');w.stepHunt(1);});
      expect((await snap()).catches).toBe(trip);
      // Bring the nest to the bird so delivery runs through the production proximity check.
      await canvas.evaluate((c:any)=>{const w=window as any,s=c._rhSnapshot(),n=w.huntScene.getObjectByName('raptor-nest'),height=s.nest.y-n.position.y;n.position.set(s.raptorPosition.x+2,s.raptorPosition.y-height,s.raptorPosition.z);w.stepHunt(25);});
      const fed=await snap();expect(fed.carrying).toBe(false);expect(fed.deliveries).toBe(trip);expect(fed.kcal).toBeGreaterThan(previous);
      expect(await canvas.evaluate(()=>!!(window as any).huntScene.getObjectByName('raptor-nest').getObjectByName('raptor-carried-prey'))).toBe(true);
      previous=fed.kcal;const progress=Number(await meter.getAttribute('aria-valuenow'));expect(progress).toBeGreaterThan(lastProgress);lastProgress=progress;
      if(await route.getAttribute('data-route-outcome')==='success')break;
      await expect(panel).toContainText('Chicks fed');await expect(panel).toContainText(/(kcal|trips?) to go/);await expect(route.locator('[aria-current="step"]')).toHaveAttribute('data-route-key','feed');
      await canvas.evaluate((c:any)=>{const w=window as any,s=c._rhSnapshot(),n=w.huntScene.getObjectByName('raptor-nest');n.position.x=s.raptorPosition.x+400;w.advanceHunt(4500);});
      expect(await canvas.evaluate(()=>!!(window as any).huntScene.getObjectByName('raptor-nest').getObjectByName('raptor-carried-prey'))).toBe(false);
    }
    expect(previous).toBeGreaterThanOrEqual(400);expect((await snap()).deliveries).toBeGreaterThanOrEqual(3);await expect(route).toHaveAttribute('data-route-outcome','success');await expect(meter).toHaveAttribute('aria-valuenow','100');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('keeps coaching and calorie progress honest after a miss, pause, and assist changes',async({page})=>{
    const panel=page.getByRole('group',{name:'Mission progress',exact:true}),meter=panel.getByRole('progressbar');
    await page.setViewportSize({width:440,height:1000});await page.addStyleTag({content:'#wrap{width:420px}'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:HTMLCanvasElement)=>c.clientWidth)).toBeLessThan(420);
    await page.evaluate(()=>{const w=window as any;for(let i=0;i<8;i++){w.placeHuntPrey(30,.95);w.stepHunt(25);}});
    await expect(panel).toContainText('Line up your approach');
    const bounds=await panel.evaluate(el=>{const p=el.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();return {left:p.left-host.left,right:host.right-p.right,bottom:host.bottom-p.bottom,overflow:el.scrollWidth-el.clientWidth};});
    for(const key of ['left','right','bottom'] as const)expect(bounds[key]).toBeGreaterThanOrEqual(0);expect(bounds.overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/provisioning-guidance-narrow.png',timeout:90000});
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(4,.95);c._rhCommand('strike');w.stepHunt(1);c._rhCommand('pause');});
    await expect(panel).toContainText('Reset your approach');await expect(meter).toHaveAttribute('aria-valuenow','0');const frozen=await panel.textContent();
    await page.evaluate(()=>{(window as any).stepHunt(60000);});expect(await panel.textContent()).toBe(frozen);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('assist'));await expect(panel).toContainText('Scan without assist');await expect(meter).toHaveAttribute('aria-valuenow','0');
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;c._rhCommand('pause');w.advanceHunt(1000);w.placeHuntPrey(30,.95);c._rhCommand('assist');w.stepHunt(1);});await expect(panel).toContainText('Line up your approach');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
