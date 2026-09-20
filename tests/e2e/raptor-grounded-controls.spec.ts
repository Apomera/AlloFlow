import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor grounded strike and takeoff controls',()=>{
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

  test('requires takeoff before a ground strike and resumes normal hunting after launch',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    const landed=await canvas.evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;c._rhCommand('hold',{key:'q',pressed:true});
      for(let i=0;i<400&&!c._rhSnapshot().landed&&!c._rhSnapshot().crashed;i++)w.stepHunt(50);
      c._rhCommand('hold',{key:'q',pressed:false});w.skipGroundRender=false;w.advanceHunt(150);
      w.placeHuntPrey(3);const before=c._rhSnapshot();c._rhCommand('strike');c.dispatchEvent(new KeyboardEvent('keydown',{key:'f',code:'KeyF',bubbles:true,cancelable:true}));c.dispatchEvent(new KeyboardEvent('keyup',{key:'f',code:'KeyF',bubbles:true}));return {before,after:c._rhSnapshot()};
    });
    expect(landed.before.landed).toBe(true);expect(landed.before.perched).toBe(false);expect(landed.before.crashed).toBe(false);
    expect(landed.before.targetCanStrike).toBe(false);expect(landed.after.missionCatches).toBe(landed.before.missionCatches);expect(landed.after.pendingHuntActions).toBe(0);expect(landed.after.strikeReady).toBe(true);
    const strike=page.locator('.rh-flight-btn-strike');await expect(strike).toBeDisabled();await expect(strike).toHaveText('Launch first');await expect(strike).toHaveAttribute('title',/Take off/);
    await expect(page.getByRole('region',{name:'Last strike',exact:true})).toHaveCount(0);
    const takeoff=page.getByRole('button',{name:/^Hold to take off/});await expect(takeoff).toBeEnabled();await takeoff.focus();await page.keyboard.down('Enter');
    await canvas.evaluate((c:any)=>{(window as any).advanceHunt(150);});await page.keyboard.up('Enter');
    expect(await canvas.evaluate((c:any)=>c._rhSnapshot().landed)).toBe(false);await expect(page.getByRole('button',{name:/^Hold to pull up/})).toBeVisible();await expect(strike).toBeEnabled();
    const caught=await canvas.evaluate((c:any)=>{(window as any).placeHuntPrey(3);const before=c._rhSnapshot();c._rhCommand('strike');return {before,after:c._rhSnapshot()};});
    await expect(page.getByRole('button',{name:/^Hold to dive/})).toHaveClass(/rh-flight-btn-primary/);
    await expect(page.getByRole('button',{name:/^Hold to pull up/})).not.toHaveClass(/rh-flight-btn-primary/);
    expect(caught.before.targetCanStrike).toBe(true);expect(caught.after.missionCatches).toBe(caught.before.missionCatches+1);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('immediately explains launch from a perch and keeps controls readable on a phone',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),strike=page.locator('.rh-flight-btn-strike');
    await page.getByRole('button',{name:'Perched practice',exact:true}).click();
    // No animation step: entering practice must publish its resting state immediately.
    await expect(page.locator('.rh-flight-state')).toHaveAttribute('data-flight-state','perched');await expect(strike).toBeDisabled();await expect(strike).toHaveText('Launch first');
    await expect(page.getByRole('button',{name:/^Hold to take off/})).toBeVisible();
    await expect(page.getByRole('button',{name:/^Hold to take off/})).toHaveClass(/rh-flight-btn-primary/);
    await expect(page.getByRole('button',{name:/^Hold to dive/})).not.toHaveClass(/rh-flight-btn-primary/);
    const before=await canvas.evaluate((c:any)=>{(window as any).placeHuntPrey(3);const before=c._rhSnapshot();c._rhCommand('strike');return {before,after:c._rhSnapshot()};});
    expect(before.after.missionCatches).toBe(before.before.missionCatches);expect(before.after.pendingHuntActions).toBe(0);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(strike).toHaveText('Paused');await expect(strike).toHaveAttribute('title',/Resume/);
    await canvas.evaluate((c:any)=>{(window as any).stepHunt(60000);c._rhCommand('pause');});await expect(strike).toHaveText('Launch first');
    await page.setViewportSize({width:360,height:1100});await page.addStyleTag({content:'#wrap{width:320px}'});
    const controls=page.locator('.rh-flight-controls-flight');for(const b of await controls.getByRole('button').all())expect(await b.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    await controls.screenshot({path:'scratch/raptor-flight-review/takeoff-controls-320.png',timeout:90000});
    await page.getByRole('button',{name:/^Hold to take off/}).focus();await page.keyboard.down('Enter');await canvas.evaluate((c:any)=>(window as any).advanceHunt(150));await page.keyboard.up('Enter');
    expect(await canvas.evaluate((c:any)=>c._rhSnapshot().perched)).toBe(false);await expect(strike).toBeEnabled();await expect(page.getByRole('button',{name:/^Hold to pull up/})).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
