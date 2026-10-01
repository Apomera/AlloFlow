import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor custom control guidance',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',flightSession:{speciesId:'peregrine',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low',controlScheme:'custom',customControlKeys:{p:'pause',c:'view',f:'strike'}}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
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


  test('keeps launch instructions usable without a key and refreshes remaps while paused',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),cue=page.locator('[data-raptor-target-guidance]'),hint=page.locator('.rh-perch-keys'),guide=page.locator('.rh-flight-key-guide');
    await page.getByRole('button',{name:'Perched practice',exact:true}).click();
    await expect(hint).toContainText('Drag to scan / look');await expect(hint).toContainText('Hold Take off to launch');
    await expect(guide).toContainText('Button Take off');await expect(guide.locator('[data-primary=true] kbd')).toHaveCount(0);
    await canvas.evaluate((c:any)=>{(window as any).placeHuntPrey(12);(window as any).advanceHunt(150);c._rhCommand('pause');});
    await expect(cue).toContainText('Hold Take off to launch');const frozen=await canvas.evaluate((c:any)=>c._rhSnapshot());
    await page.getByLabel('Open flight view and sound settings',{exact:true}).click();
    await expect(page.locator('[data-raptor-rebind-warning]')).toContainText('on-screen controls');await expect(page.locator('[data-raptor-rebind-warning]')).not.toContainText('Flying needs every');
    await page.locator('[data-raptor-rebind-action=pullUp]').click();await page.keyboard.press('j');
    await expect(hint).toContainText('Hold J to launch');await expect(cue).toContainText('Hold J to launch');
    // Reusing J for another action removes the launch binding through the real settings UI.
    await page.locator('[data-raptor-rebind-action=dive]').click();await page.keyboard.press('j');
    await expect(hint).toContainText('Hold Take off to launch');await expect(cue).toContainText('Hold Take off to launch');
    const after=await canvas.evaluate((c:any)=>c._rhSnapshot());for(const field of ['motionTimeMs','calories','stamina','missionCatches','preyCount'])expect(after[field]).toEqual(frozen[field]);expect(after.raptorPosition).toEqual(frozen.raptorPosition);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(guide).toContainText('Button Take off');
    const launch=page.getByRole('button',{name:/^Hold to take off/});await expect(launch).toHaveAttribute('data-raptor-cue','primary');await expect(launch).not.toHaveAttribute('aria-keyshortcuts');
    await page.setViewportSize({width:360,height:1100});await page.addStyleTag({content:'#wrap{width:320px}'});
    expect(await hint.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);await page.locator('.rh-perch-hud').screenshot({path:'scratch/raptor-flight-review/unbound-perch-guidance-320.png',timeout:90000});
    await launch.focus();await page.keyboard.down('Enter');await canvas.evaluate((c:any)=>(window as any).advanceHunt(150));await page.keyboard.up('Enter');expect(await canvas.evaluate((c:any)=>c._rhSnapshot().perched)).toBe(false);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('uses the Dive button fallback and refreshes paused stoop guidance without moving prey',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),cue=page.locator('[data-raptor-target-guidance]'),guide=page.locator('.rh-flight-key-guide');
    await canvas.evaluate((c:any)=>{const w=window as any;w.placeHuntPrey(60);const prey=w.huntScene.children.find((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));prey.position.y=c._rhSnapshot().raptorPosition.y-15;w.advanceHunt(150);});
    await expect(cue).toHaveAttribute('data-target-state','stoop');await expect(cue).toContainText('hold Dive');await expect(guide).toContainText('Button Hold to stoop');
    await guide.screenshot({path:'scratch/raptor-flight-review/unbound-dive-key-guide.png',timeout:90000});
    const frozen=await canvas.evaluate((c:any)=>{c._rhCommand('pause');return {snapshot:c._rhSnapshot(),prey:(window as any).huntScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))).map((o:any)=>o.position.toArray())};});
    await page.getByLabel('Open flight view and sound settings',{exact:true}).click();await page.locator('[data-raptor-rebind-action=dive]').click();await page.keyboard.press('v');await expect(cue).toContainText('hold V');
    await page.locator('[data-raptor-rebind-action=zoom]').click();await page.keyboard.press('v');await expect(cue).toContainText('hold Dive');
    const after=await canvas.evaluate((c:any)=>({snapshot:c._rhSnapshot(),prey:(window as any).huntScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))).map((o:any)=>o.position.toArray())}));expect(after.snapshot.motionTimeMs).toBe(frozen.snapshot.motionTimeMs);expect(after.snapshot.raptorPosition).toEqual(frozen.snapshot.raptorPosition);expect(after.prey).toEqual(frozen.prey);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(guide).toContainText('Button Hold to stoop');await expect(page.getByRole('button',{name:/^Hold to dive/})).toHaveAttribute('data-raptor-cue','primary');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
