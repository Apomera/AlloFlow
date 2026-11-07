import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(!window.skipFlightRender)return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor evasion mission',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'kestrel',activeMission:'avoidPredator',flightSession:{speciesId:'kestrel',missionId:'avoidPredator'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
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





  const chase=(c:any,w:any,evade:boolean,seconds:number)=>{let min=999,rested=false,caught=false;
      for(let i=0;i<seconds*25;i++){const s=c._rhSnapshot();min=Math.min(min,s.hunterDistance);rested=rested||s.hunterResting;if(s.missionOutcome==='failed'){caught=true;break;}
        c._rhCommand('hold',{key:'d',pressed:evade&&s.hunterLunging});w.stepHunt(40);}
      c._rhCommand('hold',{key:'d',pressed:false});return {min,rested,caught};};
  test('flying straight gets you caught',async({page})=>{
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any,src:string)=>{const w=window as any;w.skipFlightRender=true;const out=(0,eval)('('+src+')')(c,w,false,120);w.skipFlightRender=false;w.stepHunt(25);return out;},chase.toString());
    expect(result.caught).toBe(true);
    await expect(page.getByRole('dialog',{name:'Mission ended',exact:true})).toContainText('caught you');
  });
  test('turning hard keeps the goshawk off, it breaks off, and the cue says so',async({page})=>{
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any,src:string)=>{const w=window as any;w.skipFlightRender=true;const out=(0,eval)('('+src+')')(c,w,true,70);w.skipFlightRender=false;w.stepHunt(25);return out;},chase.toString());
    expect(result.caught).toBe(false);expect(result.min).toBeGreaterThan(6);expect(result.rested).toBe(true);
    await expect(page.locator('.rh-hunter-cue')).toBeVisible();
    expect(await page.evaluate(()=>{const scene=(window as any).huntScene;return !!scene.getObjectByName('mission-pursuing-goshawk');})).toBe(true);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('keeps the survival objective active after two catches and preserves its countdown while paused',async({page})=>{
    const panel=page.locator('[data-raptor-mission-progress]'),route=panel.locator('[data-raptor-mission-route]');
    for(let i=0;i<2;i++){
      await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any,p=c._rhSnapshot().raptorPosition;w.huntScene.getObjectByName('mission-pursuing-goshawk').position.set(p.x+120,p.y,p.z);w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);});
      if(i===0)await page.evaluate(()=>{(window as any).advanceHunt(1000);});
    }
    expect(await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().missionCatches)).toBe(2);
    await expect(route).toHaveAttribute('data-route-outcome','active');await expect(panel).toContainText('2 / 2 catches');await expect(panel).toContainText('3:59 left');await expect(panel).toContainText('Catches secured');
    expect(Number(await panel.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeLessThan(100);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));const frozen=await panel.textContent();await page.evaluate(()=>{(window as any).stepHunt(60000);});expect(await panel.textContent()).toBe(frozen);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));await page.evaluate(()=>{(window as any).advanceHunt(1150);});await expect(panel).toContainText('3:58 left');
    await page.setViewportSize({width:440,height:1100});await page.addStyleTag({content:'#wrap{width:420px}'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:HTMLCanvasElement)=>c.width)).toBeLessThan(420);await page.evaluate(()=>{(window as any).stepHunt(25);});
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/evasion-survival-countdown.png',timeout:90000});
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any,p=c._rhSnapshot().raptorPosition;w.huntScene.getObjectByName('mission-pursuing-goshawk').position.set(p.x+60,p.y,p.z);w.advanceHunt(150);});
    await expect(route.locator('[aria-current="step"]')).toHaveAttribute('data-route-key','evade');await expect(panel).toContainText('turn hard');
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any,p=c._rhSnapshot().raptorPosition;w.huntScene.getObjectByName('mission-pursuing-goshawk').position.set(p.x+3,p.y,p.z);w.advanceHunt(50);});
    await expect(page.getByRole('dialog',{name:'Mission ended',exact:true})).toBeVisible();await expect(route).toHaveAttribute('data-route-outcome','failed');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
