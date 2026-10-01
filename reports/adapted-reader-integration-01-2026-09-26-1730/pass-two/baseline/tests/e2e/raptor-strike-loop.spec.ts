import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor strike timing and coaching',()=>{
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
  test('freezes catch recovery, feedback and replacement prey until simulation time advances',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    const caught=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any;w.placeHuntPrey(3);const before=c._rhSnapshot();c._rhCommand('strike');w.stepHunt(50);c._rhCommand('pause');return {before,after:c._rhSnapshot(),renders:w.huntRenderCount};});
    expect(caught.after.missionCatches).toBe(caught.before.missionCatches+1);expect(caught.after.preyCount).toBe(caught.before.preyCount-1);expect(caught.after.strikeRecoveryMs).toBe(350);expect(caught.after.strikeReady).toBe(false);expect(caught.after.pendingHuntActions).toBe(3);
    await expect(page.getByRole('region',{name:'Last strike',exact:true})).toContainText('Catch secured');
    // This real-time wait deliberately detects callbacks that incorrectly bypass pause.
    await page.waitForTimeout(1750);
    const frozen=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any;w.stepHunt(60000);c._rhCommand('strike');return {snapshot:c._rhSnapshot(),renders:w.huntRenderCount};});
    expect(frozen.renders).toBe(caught.renders);
    for(const field of ['preyCount','strikeRecoveryMs','strikeReady','pendingHuntActions','strikeFeedbackKind','strikeFeedbackAgeMs','motionTimeMs','missionCatches'])expect(frozen.snapshot[field]).toEqual(caught.after[field]);
    expect(frozen.snapshot.raptorPosition).toEqual(caught.after.raptorPosition);
    const resumed=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');w.stepHunt(50);const early=c._rhSnapshot();w.advanceHunt(250);const justBefore=c._rhSnapshot();w.stepHunt(50);const recovered=c._rhSnapshot();w.advanceHunt(1099);const beforeSpawn=c._rhSnapshot();w.stepHunt(1);return {early,justBefore,recovered,beforeSpawn,spawned:c._rhSnapshot()};});
    expect(resumed.early.strikeFeedbackKind).toBe('hit');expect(resumed.early.strikeFeedbackAgeMs).toBe(100);expect(resumed.early.strikeReady).toBe(false);
    expect(resumed.justBefore.strikeReady).toBe(false);expect(resumed.justBefore.strikeRecoveryMs).toBe(50);expect(resumed.recovered.strikeReady).toBe(true);expect(resumed.recovered.pendingHuntActions).toBe(1);
    expect(resumed.beforeSpawn.preyCount).toBe(caught.after.preyCount);expect(resumed.spawned.preyCount).toBe(caught.before.preyCount);expect(resumed.spawned.pendingHuntActions).toBe(0);
    await page.locator('[data-raptor-canvas]').evaluate(()=>{(window as any).advanceHunt(4000);});
    await expect(page.getByRole('region',{name:'Last strike',exact:true})).toContainText('Glide to conserve energy');expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('keeps missed-strike coaching readable, blocks rapid repeats, and clears results on restart',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).placeHuntPrey(30);for(let i=0;i<8;i++)c._rhCommand('strike');});
    await expect.poll(()=>page.evaluate(()=>(window as any).__toolData.raptorHunt.huntStats.peregrine.attempts)).toBe(1);
    const review=page.getByRole('region',{name:'Last strike',exact:true});await expect(review).toContainText('Strike missed');await expect(review).toContainText('TOO FAR');await expect(review).toContainText('range meter');
    await page.setViewportSize({width:440,height:1000});await page.addStyleTag({content:'#wrap{width:420px}'});
    await page.locator('[data-raptor-canvas]').evaluate(()=>{(window as any).advanceHunt(4000);});
    await expect(review).toBeVisible();
    const fit=await review.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();return {left:r.left-p.left,right:p.right-r.right,overflow:el.scrollWidth-el.clientWidth};});expect(fit.left).toBeGreaterThanOrEqual(0);expect(fit.right).toBeGreaterThanOrEqual(0);expect(fit.overflow).toBeLessThanOrEqual(1);
    await review.screenshot({path:'scratch/raptor-flight-review/last-strike-coaching-narrow.png',timeout:90000});
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).placeHuntPrey(3);c._rhCommand('strike');});
    await expect(review).toContainText('Catch secured');
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).oldHuntCanvas=c;});
    await page.getByRole('button',{name:'Restart this flight',exact:true}).click();
    await expect(review).toHaveCount(0);
    await expect.poll(()=>page.evaluate(()=>{const c=document.querySelector('[data-raptor-canvas]') as any;return c?._rhSnapshot?.()?.missionCatches;})).toBe(0);
    expect(await page.evaluate(()=>{const old=(window as any).oldHuntCanvas;return !old.isConnected && old!==document.querySelector('[data-raptor-canvas]') && old._rhSnapshot===null;})).toBe(true);
    const fresh=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).advanceHunt(1600);return c._rhSnapshot();});expect(fresh.pendingHuntActions).toBe(0);expect(fresh.strikeReady).toBe(true);expect(fresh.preyCount).toBe(12);expect(fresh.missionCatches).toBe(0);
    await page.getByLabel('Open flight view and sound settings',{exact:true}).click();
    await page.getByLabel('Graphics quality',{exact:true}).selectOption('balanced');
    await expect.poll(()=>page.evaluate(()=>{const c=document.querySelector('[data-raptor-canvas]') as any;return c?._rhSnapshot?.()?.graphicsQuality;})).toBe('balanced');
    await expect(page.getByText('WebGL is not available',{exact:true})).toHaveCount(0);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
