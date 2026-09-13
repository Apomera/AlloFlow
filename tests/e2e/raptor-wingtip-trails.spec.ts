import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.pauseRenderCount=0;renderer.render=function(scene,camera){window.pauseRenderer=renderer;window.pauseScene=scene;window.pauseCamera=camera;window.pauseRenderCount++;return render(scene,camera);};return renderer;};})();`;
for(const species of ['redTail','peregrine'])test.describe('Raptor wingtip trail attachment '+species,()=>{
  test.describe.configure({mode:'serial',timeout:180000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).stepControls=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:'open',flightSession:{speciesId:species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:species==='peregrine'?'high':'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
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


  test('keeps both trails attached through wing motion and hides them in Scenic and reduced-motion views',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const samples=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,T=w.THREE; c._rhCommand('environment',{windSpeed:0});c._rhCommand('hold',{key:'a',pressed:true});
      const samples:any[]=[];
      for(let frame=0;frame<100;frame++){
        w.stepControls(25);const scene=w.pauseScene,group=scene.getObjectByName('raptor-wingtip-vortices');
        if(group.visible){const gaps=group.children.map((line:any,side:number)=>{const mesh=scene.getObjectByName(side?'right-primary-0':'left-primary-0')||scene.getObjectByName(side?'right-tapered-wing':'left-tapered-wing'),a=mesh.geometry.attributes.position,m=mesh.geometry.morphAttributes.position?.[0],fold=mesh.morphTargetInfluences?.[0]||0,primary=mesh.name.includes('primary');const indices=primary?[a.count-2,a.count-1]:[a.count-4,a.count-4];const tip=new T.Vector3();for(const index of indices){const v=new T.Vector3().fromBufferAttribute(a,index);if(m)v.lerp(new T.Vector3().fromBufferAttribute(m,index),fold);tip.add(v);}tip.multiplyScalar(.5);mesh.localToWorld(tip);const root=new T.Vector3().fromBufferAttribute(line.geometry.attributes.position,0);return tip.distanceTo(root);});samples.push({gaps,angle:c._rhSnapshot().wingAngle});}
      }
      c._rhCommand('hold',{key:'a',pressed:false});c._rhCommand('pause');w.captureVortex=()=>{const g=w.pauseScene.getObjectByName('raptor-wingtip-vortices');return {visible:g.visible,version:g.children[0].geometry.attributes.position.version,time:c._rhSnapshot().motionTimeMs,position:c._rhSnapshot().raptorPosition,renders:w.pauseRenderCount,compiled:g.children[0].material.userData.tipFadeCompiled,fade:Array.from(g.children[0].geometry.attributes.tipFade.array)};};return samples;
    });
    expect(samples.length).toBeGreaterThan(15);for(const sample of samples)for(const gap of sample.gaps)expect(gap).toBeLessThan(.0001);expect(Math.max(...samples.map(s=>s.angle))-Math.min(...samples.map(s=>s.angle))).toBeGreaterThan(.02);
    const before=await page.evaluate(()=>(window as any).captureVortex());expect(before.visible).toBe(true);expect(before.compiled).toBe(true);expect(before.fade[0]).toBe(1);expect(before.fade.at(-1)).toBe(0);for(let i=1;i<before.fade.length;i++)expect(before.fade[i]).toBeLessThan(before.fade[i-1]);
    const scenic=page.getByRole('button',{name:'Scenic view',exact:true});await scenic.click();const off=await page.evaluate(()=>(window as any).captureVortex());expect(off.visible).toBe(false);await scenic.click();const on=await page.evaluate(()=>(window as any).captureVortex());expect(on.visible).toBe(true);expect(on.version).toBe(before.version);expect(on.time).toBe(before.time);expect(on.position).toEqual(before.position);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/wingtip-trails-attached-'+species+'.png',timeout:90000});
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>(window as any).captureVortex().visible)).toBe(false);await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');c._rhCommand('perchPractice');for(let i=0;i<20;i++)(window as any).stepControls(25);});expect(await page.evaluate(()=>(window as any).captureVortex().visible)).toBe(false);expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
