import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
for(const mission of ['feedChicks','silentStrike','thermalKettle'])test.describe('Raptor mission clock '+mission,()=>{
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





  test('shows the deadline, freezes during pause, and resets after a finished flight',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),clock=page.locator('[data-raptor-mission-clock]'),value=clock.locator('strong');const seconds=mission==='feedChicks'?240:mission==='silentStrike'?300:180;const formatted=(n:number)=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
    await expect(page.locator('.rh-flight-altitude-gauge')).toBeVisible();
    await expect(clock).toHaveAttribute('role','timer');await expect(clock).toHaveAttribute('aria-live','off');await expect(value).toHaveText(formatted(seconds));
    await page.evaluate(()=>{(window as any).advanceHunt(1250);});await expect(value).toHaveText(formatted(seconds-1));
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(clock).toHaveAttribute('data-clock-state','paused');await expect(clock).toContainText('Paused');
    const paused=await value.textContent();await page.evaluate(()=>{(window as any).stepHunt(60000);});await expect(value).toHaveText(paused!);
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(clock).toBeHidden();await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(clock).toBeVisible();
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));await page.evaluate(()=>{(window as any).advanceHunt(1250);});await expect(value).toHaveText(formatted(seconds-2));await expect(clock).toHaveAttribute('data-clock-state','normal');
    await page.setViewportSize({width:440,height:1000});await page.addStyleTag({content:'#wrap{width:420px}'});await page.waitForFunction(()=>document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!.width<420,null,{polling:50});await page.evaluate(()=>{(window as any).stepHunt(25);});
    await expect(page.locator('.rh-flight-altitude-gauge')).toBeHidden();await expect(page.locator('[data-raptor-metric=altitude]')).toBeVisible();
    const bounds=await clock.evaluate(el=>{const r=el.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();return {left:r.left-host.left,right:host.right-r.right,overflow:el.scrollWidth-el.clientWidth};});expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeGreaterThanOrEqual(0);expect(bounds.overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/mission-clock-'+mission+'-420.png',timeout:90000});
    if(mission==='feedChicks'){
      for(let i=0;i<12;i++){const done=await canvas.evaluate((c:any)=>{const w=window as any;w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);if(document.querySelector('[data-mission-state="success"]'))return true;w.advanceHunt(1000);return false;});if(done)break;}
    }else await canvas.evaluate((c:any)=>{const w=window as any;w.placeHuntPrey(47);c._rhCommand('hold',{key:' ',pressed:true});w.stepHunt(1);});
    await expect(page.getByRole('dialog')).toBeVisible();await expect(clock).toHaveAttribute('data-clock-state','ended');await expect(clock).toContainText('Time at end');
    const ended=await value.textContent();await page.evaluate(()=>{(window as any).advanceHunt(1000);});await expect(value).toHaveText(ended!);
    await page.getByRole('button',{name:'Fly again',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(clock).toHaveAttribute('data-clock-state','normal');await expect(value).toHaveText(formatted(seconds));
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
