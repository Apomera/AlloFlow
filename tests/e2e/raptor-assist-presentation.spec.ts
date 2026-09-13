import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.pauseRenderCount=0;renderer.render=function(scene,camera){window.pauseRenderer=renderer;window.pauseScene=scene;window.pauseCamera=camera;window.pauseRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor immediate target-assist presentation',()=>{
  test.describe.configure({mode:'serial',timeout:180000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).stepControls=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'redTail',activeMission:'open',flightSession:{speciesId:'redTail',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  });

  async function prepareTarget(page:any){
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0});const s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians;
      const prey=w.pauseScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
      prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*35+Math.cos(yaw)*6:2000+i*20,i===0?p.y:2000,i===0?p.z-Math.cos(yaw)*35+Math.sin(yaw)*6:2000));
      w.markerPrey=prey[0];w.stepControls(25);c._rhCommand('pause');
      w.captureMarker=()=>{w.pauseCamera.updateMatrixWorld(true);const p=w.markerPrey.position,v=new w.THREE.Vector3(p.x,p.y+.6,p.z).project(w.pauseCamera);return {snapshot:c._rhSnapshot(),expected:[v.x,v.y],renders:w.pauseRenderCount,prey:prey.map((o:any)=>o.position.toArray())};};
    });
  }
  function expectAligned(state:any){expect(state.snapshot.targetNdcX).toBeCloseTo(state.expected[0],7);expect(state.snapshot.targetNdcY).toBeCloseTo(state.expected[1],7);}
  function expectFrozen(before:any,after:any){for(const field of ['motionTimeMs','calories','stamina','missionCatches','strikeRecoveryMs','wingAngle'])expect(after.snapshot[field]).toEqual(before.snapshot[field]);expect(after.snapshot.raptorPosition).toEqual(before.snapshot.raptorPosition);expect(after.prey).toEqual(before.prey);}

  test('updates paused assist guidance and scene highlights immediately without advancing the hunt',async({page})=>{
    await prepareTarget(page);
    await page.getByLabel('Open flight view and sound settings',{exact:true}).click();
    const toggle=page.getByRole('button',{name:'Toggle target assist',exact:true}),range=page.locator('[data-raptor-metric="target"] .rh-flight-metric-value'),tracker=page.locator('.rh-target-tracker'),hint=page.locator('[data-raptor-target-guidance]');
    const before=await page.evaluate(()=>(window as any).captureMarker());await expect(tracker).toBeVisible();
    await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');await expect(tracker).toBeHidden();await expect(range).toHaveText('Off');await expect(hint).toHaveText('Target assist is off');
    const off=await page.evaluate(()=>(window as any).captureMarker());expectFrozen(before,off);expect(off.renders-before.renders).toBe(1);expect(off.snapshot.targetGuideVisible).toBe(false);expect(off.snapshot.targetHaloVisible).toBe(false);expect(off.snapshot.visibleBeaconCount).toBe(0);
    await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(tracker).toBeVisible();await expect(range).not.toHaveText('Off');await expect(hint).not.toHaveText('Target assist is off');
    const on=await page.evaluate(()=>(window as any).captureMarker());expectFrozen(before,on);expect(on.renders-off.renders).toBe(1);expect(on.snapshot.targetGuideVisible).toBe(true);expect(on.snapshot.targetHaloVisible).toBe(true);expect(on.snapshot.visibleBeaconCount).toBe(1);
    const idle=await page.evaluate(()=>{(window as any).stepControls(60000);return (window as any).captureMarker();});expectFrozen(before,idle);expect(idle.renders).toBe(on.renders);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  for(const mode of ['scenic','trail'])test('respects '+mode+' display while paused assist is toggled',async({page})=>{
    if(mode==='scenic')await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    else await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('trail'));
    await prepareTarget(page);const before=await page.evaluate(()=>(window as any).captureMarker());
    const states=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('assist');const off=(window as any).captureMarker();c._rhCommand('assist');return [off,(window as any).captureMarker()];});
    for(const state of states){expectFrozen(before,state);expect(state.snapshot.targetGuideVisible).toBe(false);expect(state.snapshot.targetHaloVisible).toBe(false);expect(state.snapshot.visibleBeaconCount).toBe(0);}
    expect(states[1].renders-before.renders).toBe(2);await expect(page.locator('.rh-target-tracker')).toBeHidden();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
