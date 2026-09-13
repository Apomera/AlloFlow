import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.pauseRenderCount=0;renderer.render=function(scene,camera){window.pauseRenderer=renderer;window.pauseScene=scene;window.pauseCamera=camera;window.pauseRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor paused Scenic view',()=>{
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


  async function capture(page:any){return page.evaluate(()=>{const w=window as any,trail=w.pauseScene.getObjectByName('raptor-flight-trail'),flow=w.pauseScene.getObjectByName('raptor-airflow-lines');return {...w.captureMarker(),trailVisible:trail.visible,trailVersion:trail.geometry.attributes.position.version,flowVersion:flow.geometry.attributes.position.version};});}
  test('hides and restores paused flight effects without changing their geometry or advancing the hunt',async({page})=>{
    await prepareTarget(page);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');c._rhCommand('strike');(window as any).stepControls(25);c._rhCommand('pause');});
    const before=await capture(page);expect(before.trailVisible).toBe(true);expect(before.snapshot.targetHaloVisible).toBe(true);
    const scenic=page.getByRole('button',{name:'Scenic view',exact:true});
    let previous=before;
    for(let i=0;i<2;i++){
      await scenic.click();await expect(scenic).toHaveAttribute('aria-pressed','true');const hidden=await capture(page);expectFrozen(before,hidden);expect(hidden.renders-previous.renders).toBe(1);expect(hidden.trailVisible).toBe(false);
      for(const key of ['targetGuideVisible','targetHaloVisible','airflowOverlayVisible','speedOverlayVisible'])expect(hidden.snapshot[key]).toBe(false);expect(hidden.snapshot.visibleBeaconCount).toBe(0);await expect(page.locator('.rh-target-tracker')).toBeHidden();
      await scenic.click();await expect(scenic).toHaveAttribute('aria-pressed','false');const shown=await capture(page);expectFrozen(before,shown);expect(shown.renders-hidden.renders).toBe(1);expect(shown.trailVisible).toBe(before.trailVisible);
      for(const key of ['targetGuideVisible','targetHaloVisible','airflowOverlayVisible','speedOverlayVisible','visibleBeaconCount'])expect(shown.snapshot[key]).toBe(before.snapshot[key]);
      expect(shown.trailVersion).toBe(before.trailVersion);expect(shown.flowVersion).toBe(before.flowVersion);previous=shown;
    }
    await scenic.click();await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/paused-scenic-clean.png',timeout:90000});
    const final=await capture(page);await page.evaluate(()=>(window as any).stepControls(60000));const idle=await capture(page);expectFrozen(before,idle);expect(idle.renders).toBe(final.renders);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('keeps assist-off and reduced-motion effects hidden when restoring the paused HUD',async({page})=>{
    await prepareTarget(page);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('assist'));
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const before=await capture(page),scenic=page.getByRole('button',{name:'Scenic view',exact:true});
    await scenic.click();await scenic.click();const after=await capture(page);expectFrozen(before,after);expect(after.trailVisible).toBe(false);for(const key of ['targetGuideVisible','targetHaloVisible','airflowOverlayVisible','speedOverlayVisible'])expect(after.snapshot[key]).toBe(false);expect(after.snapshot.visibleBeaconCount).toBe(0);expect(after.renders-before.renders).toBe(2);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
