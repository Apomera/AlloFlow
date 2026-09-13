import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.pauseRenderCount=0;renderer.render=function(scene,camera){window.pauseRenderer=renderer;window.pauseScene=scene;window.pauseCamera=camera;window.pauseRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor paused prey-marker projection',()=>{
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
  test('reprojects the prey marker for paused zoom and camera changes without advancing the hunt',async({page})=>{
    await prepareTarget(page);const before=await page.evaluate(()=>(window as any).captureMarker());
    let previous=before;
    for(const label of ['Toggle paused zoom','Change paused camera','Toggle paused zoom','Change paused camera']){
      await page.getByRole('button',{name:label,exact:true}).click();const after=await page.evaluate(()=>(window as any).captureMarker());expectAligned(after);expectFrozen(before,after);expect(after.renders-previous.renders).toBe(1);previous=after;
    }
    const idle=await page.evaluate(()=>{(window as any).stepControls(60000);return (window as any).captureMarker();});expectFrozen(before,idle);expect(idle.renders).toBe(previous.renders);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('reprojects after a paused resize and keeps the caption inside the new viewport',async({page})=>{
    await page.setViewportSize({width:1000,height:1000});await prepareTarget(page);const before=await page.evaluate(()=>(window as any).captureMarker());
    await page.setViewportSize({width:440,height:1000});await page.addStyleTag({content:'#wrap{width:420px}'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:HTMLCanvasElement)=>c.width)).toBeLessThan(440);
    const after=await page.evaluate(()=>(window as any).captureMarker());expectAligned(after);expectFrozen(before,after);expect(after.renders).toBeGreaterThan(before.renders);
    const tracker=page.locator('.rh-target-tracker');await expect(tracker).toBeVisible();
    const bounds=await tracker.evaluate(el=>{const r=el.querySelector('.rh-target-label')!.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();return {left:r.left-host.left,right:host.right-r.right,top:r.top-host.top,bottom:host.bottom-r.bottom};});for(const value of Object.values(bounds))expect(value).toBeGreaterThanOrEqual(0);
    const overlaps=await tracker.evaluate(el=>{const label=el.querySelector('.rh-target-label')!.getBoundingClientRect();return [...el.parentElement!.querySelectorAll('.rh-practice-toggle,.rh-scenic-toggle')].map(node=>{const r=node.getBoundingClientRect();return Math.max(0,Math.min(r.right,label.right)-Math.max(r.left,label.left))*Math.max(0,Math.min(r.bottom,label.bottom)-Math.max(r.top,label.top));});});expect(overlaps.every(area=>area===0)).toBe(true);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/paused-target-projection-narrow.png',timeout:90000});
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('removes a caught prey marker when pausing before the next animation frame',async({page})=>{
    await prepareTarget(page);
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');const s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians,pitch=s.pitchRadians;w.markerPrey.position.set(p.x+Math.sin(yaw)*Math.cos(pitch)*3,p.y+Math.sin(pitch)*3,p.z-Math.cos(yaw)*Math.cos(pitch)*3);c._rhCommand('strike');c._rhCommand('pause');return c._rhSnapshot();});
    expect(result.missionCatches).toBe(1);await expect(page.locator('.rh-target-tracker')).toBeHidden();expect(result.targetProjectionState).toBe('none');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

});
