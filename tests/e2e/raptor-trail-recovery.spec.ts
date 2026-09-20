import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor trail landing recovery',()=>{
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


  test('keeps earned ring progress through landing, pause, and takeoff',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),hud=page.getByRole('group',{name:'Flight trail progress',exact:true}),guide=page.locator('.rh-flight-key-guide');
    const landed=await canvas.evaluate((c:any)=>{
      const w=window as any;c._rhCommand('assist');c._rhCommand('trail');w.skipGroundRender=true;
      // Fly through the first ring using production steering and altitude controls.
      for(let i=0;i<220&&c._rhSnapshot().practiceTrailIndex===0;i++){
        const s=c._rhSnapshot(),g=s.practiceNextGate,error=Math.atan2(Math.sin(Math.atan2(g.x-s.raptorPosition.x,-(g.z-s.raptorPosition.z))-s.headingRadians),Math.cos(Math.atan2(g.x-s.raptorPosition.x,-(g.z-s.raptorPosition.z))-s.headingRadians));
        for(const [key,pressed] of [['d',error>.035],['a',error<-.035],['e',g.y-s.raptorPosition.y>.7],['q',s.raptorPosition.y-g.y>.7]])c._rhCommand('hold',{key,pressed});w.stepHunt(40);
      }
      for(const key of ['a','d','e','q'])c._rhCommand('hold',{key,pressed:false});
      const earned=c._rhSnapshot();c._rhCommand('hold',{key:'q',pressed:true});
      for(let i=0;i<400&&!c._rhSnapshot().landed&&!c._rhSnapshot().crashed;i++)w.stepHunt(50);
      c._rhCommand('hold',{key:'q',pressed:false});w.skipGroundRender=false;w.advanceHunt(150);return {earned,snapshot:c._rhSnapshot()};
    });
    expect(landed.earned.practiceTrailScore).toBeGreaterThan(0);expect(landed.snapshot.landed).toBe(true);expect(landed.snapshot.crashed).toBe(false);expect(landed.snapshot.practiceTrailActive).toBe(true);
    await expect(hud).toHaveAttribute('data-trail-state','grounded');await expect(hud).toContainText('Hold Space to launch');await expect(hud).toContainText('progress kept');await expect(guide).toContainText('Take off');await expect(guide).not.toContainText('Trim altitude');
    await expect(page.locator('[data-raptor-flight-events]')).not.toContainText(/landing|to launch/i);
    const pips=await hud.locator('.rh-practice-pip').evaluateAll(els=>els.map(el=>el.getAttribute('data-state')));
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(hud).toHaveAttribute('data-trail-state','paused');await expect(hud).toContainText('Resume flight');
    const frozen=await canvas.evaluate((c:any)=>{const before=c._rhSnapshot();(window as any).stepHunt(60000);return {before,after:c._rhSnapshot()};});expect(frozen.after.motionTimeMs).toBe(frozen.before.motionTimeMs);expect(frozen.after.raptorPosition).toEqual(frozen.before.raptorPosition);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(hud).toHaveAttribute('data-trail-state','grounded');
    await page.setViewportSize({width:360,height:1100});await page.addStyleTag({content:'#wrap{width:320px}'});expect(await hud.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);await hud.screenshot({path:'scratch/raptor-flight-review/trail-grounded-recovery-320.png',timeout:90000});
    await expect(page.locator('.rh-flight-heading')).toBeHidden();await expect(page.locator('.rh-flight-attitude')).toBeHidden();
    await page.waitForFunction(()=>{const c=document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!;return Math.abs(c.width-c.clientWidth)<2;},null,{polling:50});
    await canvas.evaluate((c:any)=>(window as any).stepHunt(25));
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/trail-grounded-stage-320.png',timeout:90000});
    await page.getByRole('button',{name:/^Hold to take off/}).focus();await page.keyboard.down('Enter');await canvas.evaluate((c:any)=>(window as any).advanceHunt(150));await page.keyboard.up('Enter');
    await expect(hud).toHaveAttribute('data-trail-state','flying');await expect(hud).not.toContainText('progress kept');await expect(guide).not.toContainText('Take off');
    const flying=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(flying.landed).toBe(false);for(const field of ['practiceTrailIndex','practiceTrailScore','practiceTrailPassed'])expect(flying[field]).toEqual(landed.snapshot[field]);expect(await hud.locator('.rh-practice-pip').evaluateAll(els=>els.map(el=>el.getAttribute('data-state')))).toEqual(pips);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('explains crash recovery without advancing the trail while grounded',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),hud=page.getByRole('group',{name:'Flight trail progress',exact:true}),guide=page.locator('.rh-flight-key-guide');
    const crash=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('trail');w.skipGroundRender=true;c._rhCommand('hold',{key:'shift',pressed:true});c._rhCommand('hold',{key:'q',pressed:true});for(let i=0;i<400&&!c._rhSnapshot().crashed&&!c._rhSnapshot().landed;i++)w.stepHunt(50);for(const key of ['shift','q'])c._rhCommand('hold',{key,pressed:false});w.skipGroundRender=false;w.advanceHunt(150);return c._rhSnapshot();});
    expect(crash.crashed).toBe(true);await expect(page.locator('[data-raptor-flight-events]')).not.toContainText('CRASH');await expect(hud).toHaveAttribute('data-trail-state','recovering');await expect(hud).toContainText('Recovering on the ground');await expect(guide).toContainText('Take off once recovered');
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).stepHunt(60000);});await expect(hud).toContainText('Resume flight');expect(await canvas.evaluate((c:any)=>c._rhSnapshot().crashed)).toBe(true);
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');});await expect(hud).toHaveAttribute('data-trail-state','recovering');
    const recovered=await canvas.evaluate((c:any)=>{const w=window as any;w.skipGroundRender=true;w.advanceHunt(3200);w.skipGroundRender=false;w.advanceHunt(150);return c._rhSnapshot();});expect(recovered.crashed).toBe(false);expect(recovered.landed).toBe(true);
    await expect(hud).toHaveAttribute('data-trail-state','grounded');await expect(hud).toContainText('Hold Space to launch');for(const field of ['practiceTrailIndex','practiceTrailScore','practiceTrailPassed'])expect(recovered[field]).toEqual(crash[field]);
    await expect(page.locator('[data-raptor-flight-events]')).not.toContainText('Stood back up');
    await canvas.evaluate((c:any)=>{c._rhCommand('trail');(window as any).advanceHunt(150);});
    await expect(page.locator('[data-raptor-flight-events]')).toContainText('Stood back up');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
