import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.pauseRenderCount=0;renderer.render=function(scene,camera){window.pauseRenderer=renderer;window.pauseScene=scene;window.pauseCamera=camera;window.pauseRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor live prey-marker projection',()=>{
  test.describe.configure({mode:'serial',timeout:180000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).stepControls=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'redTail',activeMission:'open',flightSession:{speciesId:'redTail',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  });

  test('tracks the rendered prey position and range in the same flight frame',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    await page.getByRole('button',{name:'Perched practice',exact:true}).click();
    await canvas.evaluate((c:any)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0});const s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians;
      const prey=w.pauseScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
      prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*35+Math.cos(yaw)*4:2000+i*20,i===0?p.y:2000,i===0?p.z-Math.cos(yaw)*35+Math.sin(yaw)*4:2000));
      w.markerPrey=prey[0];
      w.captureLiveMarker=()=>{w.pauseCamera.updateMatrixWorld(true);const p=w.markerPrey.position,v=new w.THREE.Vector3(p.x,p.y+.6,p.z).project(w.pauseCamera),s=c._rhSnapshot(),bird=s.raptorPosition;return {snapshot:s,expected:[v.x,v.y],distance:Math.hypot(p.x-bird.x,p.y-bird.y,p.z-bird.z),prey:p.toArray(),caption:document.querySelector('.rh-target-name')?.textContent,range:document.querySelector('[data-raptor-metric="target"] .rh-flight-metric-value')?.textContent};};
    });
    const samples=await canvas.evaluate((c:any)=>{const w=window as any,frames=[];for(let i=0;i<12;i++){w.stepControls(50);frames.push(w.captureLiveMarker());}return frames;});
    for(const state of samples){expect(state.snapshot.attendedTargetIndex).toBe(0);expect(state.snapshot.targetNdcX).toBeCloseTo(state.expected[0],7);expect(state.snapshot.targetNdcY).toBeCloseTo(state.expected[1],7);expect(state.distance).toBeGreaterThan(10);expect(state.distance).toBeLessThan(50);expect(state.range).toBe(Math.ceil(state.distance)+' m');expect(state.caption).toContain(state.range);expect(state.snapshot.gazeTargetIndex).toBe(state.snapshot.attendedTargetIndex);}
    expect(samples.at(-1)!.prey).not.toEqual(samples[0].prey);
    const flying=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('hold',{key:' ',pressed:true});const frames=[];for(let i=0;i<8;i++){w.stepControls(25);frames.push(w.captureLiveMarker());}c._rhCommand('hold',{key:' ',pressed:false});return frames;});
    for(const state of flying){expect(state.snapshot.landed).toBe(false);expect(state.snapshot.attendedTargetIndex).toBe(0);expect(state.snapshot.targetNdcX).toBeCloseTo(state.expected[0],7);expect(state.snapshot.targetNdcY).toBeCloseTo(state.expected[1],7);}
    await canvas.evaluate((c:any)=>c._rhCommand('zoom'));
    await page.emulateMedia({reducedMotion:'reduce'});
    const zoomed=await canvas.evaluate((c:any)=>{const w=window as any;w.stepControls(25);return w.captureLiveMarker();});
    expect(zoomed.snapshot.targetNdcX).toBeCloseTo(zoomed.expected[0],7);expect(zoomed.snapshot.targetNdcY).toBeCloseTo(zoomed.expected[1],7);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));
    const frozen=await canvas.evaluate((c:any)=>{const w=window as any,before=w.captureLiveMarker();w.stepControls(60000);return {before,after:w.captureLiveMarker()};});expect(frozen.after.prey).toEqual(frozen.before.prey);expect(frozen.after.snapshot.motionTimeMs).toBe(frozen.before.snapshot.motionTimeMs);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
