import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;
(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.wakeReviewScene=scene;window.wakeReviewRenderer=renderer;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor directional lake wakes',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1000,height:720,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  for(const quality of ['high','low'])test('renders wave-following surface trails at '+quality+' quality',async({page})=>{
    await page.setViewportSize({width:quality==='low'?440:1100,height:1200});
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).advanceWakes=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'baldEagle',activeMission:'open',flightSession:{speciesId:'baldEagle',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(quality==='low')await page.addStyleTag({content:'#wrap{width:420px}'});
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    const before=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('assist');c._rhCommand('environment',{windSpeed:8,dayPhase:0.4,cloudCover:0.15});for(let i=0;i<60;i++)(window as any).advanceWakes(25);return c._rhSnapshot();});
    expect(before.waterWakeCount).toBeGreaterThan(0);expect(before.waterWakeCount).toBeLessThanOrEqual(before.preyCount);
    expect(before.waterWakeVertices).toBe(quality==='low'?45:153);expect(before.waterWakePositionVersion).toBe(2);
    expect(before.waterWakeStates.some((s:any)=>s.visible&&!s.fish)).toBe(true);
    for(const wake of before.waterWakeStates){if(wake.fish&&wake.depth>=1.25)expect(wake.visible).toBe(false);}
    expect(before.drawCalls).toBeLessThan(150);
    expect(before.fishSwimPoses.length).toBeGreaterThan(0);
    expect(before.fishSwimPoses.some((p:any)=>Math.abs(p.tailYaw)>0.001)).toBe(true);
    for(const p of before.fishSwimPoses){expect(p.amplitude).toBeGreaterThan(0);expect(p.amplitude).toBeLessThanOrEqual(0.305);expect(p.visualY).toBe(0);}
    expect(before.wetShoreMaterial).toBe(true);expect(before.shoreReedCount).toBeGreaterThan(20);
    expect(before.shoreReedCount).toBeLessThanOrEqual(quality==='low'?72:260);
    expect(before.shoreReedVertices).toBe(quality==='low'?160:224);
    expect(before.waterBirdFloats.length).toBeGreaterThan(0);
    expect(before.waterBirdFloats.some((p:any)=>Math.abs(p.pitch)+Math.abs(p.roll)>0.0001)).toBe(true);
    for(const p of before.waterBirdFloats){
      expect(p.rootY).toBeCloseTo(-1.5+p.clearance+p.flightHeight,6);
      expect(Math.abs(p.pitch)).toBeLessThan(0.2);expect(Math.abs(p.roll)).toBeLessThan(0.2);
      if(p.flightHeight===0)expect(p.rootY+p.visualY-p.clearance).toBeCloseTo(-1.5+p.waveHeight-p.clearance*0.42,6);
    }
    const next=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{for(let i=0;i<20;i++)(window as any).advanceWakes(25);return c._rhSnapshot();});
    expect(next.fishSwimPoses.some((p:any,i:number)=>Math.abs(p.phase-before.fishSwimPoses[i].phase)>0.01)).toBe(true);
    expect(next.shoreReedMatrixVersion).toBe(before.shoreReedMatrixVersion);
    expect(next.waterBirdFloats.some((p:any,i:number)=>Math.abs(p.waveHeight-before.waterBirdFloats[i].waveHeight)>0.0001)).toBe(true);
    const paused=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');const a=c._rhSnapshot();(window as any).advanceWakes(60000);return {a,b:c._rhSnapshot()};});
    expect(paused.b.fishSwimPoses).toEqual(paused.a.fishSwimPoses);
    expect(paused.b.waterBirdFloats).toEqual(paused.a.waterBirdFloats);expect(paused.b.waterWakeStates).toEqual(paused.a.waterWakeStates);expect(paused.b.sceneryTime).toBe(paused.a.sceneryTime);
    await page.addStyleTag({content:'.rh-flight-pause,.rh-scenic-toggle,.rh-practice-toggle{display:none!important}'});
    const close=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,scene=w.wakeReviewScene,renderer=w.wakeReviewRenderer;
      const group=scene.getObjectByName('raptor-prey-water-wakes'),wake=group.children.filter((o:any)=>o.visible).sort((a:any,b:any)=>b.material.opacity-a.material.opacity)[0];
      const center=wake.getWorldPosition(new T.Vector3()),heading=wake.rotation.y;
      const camera=new T.PerspectiveCamera(42,renderer.domElement.clientWidth/renderer.domElement.clientHeight,0.1,2000);
      const framing=Math.max(1,1/camera.aspect);
      camera.position.copy(center).add(new T.Vector3(8,7,10).multiplyScalar(framing));camera.lookAt(center.clone().add(new T.Vector3(-Math.sin(heading)*2,0,-Math.cos(heading)*2)));
      renderer.render(scene,camera);const gl=renderer.getContext(),pixel=new Uint8Array(4);gl.readPixels(Math.floor(renderer.domElement.width/2),Math.floor(renderer.domElement.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return {brightness:pixel[0]+pixel[1]+pixel[2],png:renderer.domElement.toDataURL('image/png'),compiled:wake.material.userData.compiled,version:wake.geometry.attributes.position.version,opacity:wake.material.opacity};
    });
    expect(close.brightness).toBeGreaterThan(0);expect(close.compiled).toBe(true);expect(close.version).toBe(before.waterWakePositionVersion);
    writeFileSync('scratch/raptor-flight-review/lake-float-'+quality+'.png',Buffer.from(close.png.split(',')[1],'base64'));
    const shoreline=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,scene=w.wakeReviewScene,renderer=w.wakeReviewRenderer,reeds=scene.getObjectByName('raptor-shore-reeds');
      const matrix=new T.Matrix4();reeds.getMatrixAt(0,matrix);const center=new T.Vector3().setFromMatrixPosition(matrix);
      const radial=new T.Vector3(center.x,0,center.z).normalize(),side=new T.Vector3(-radial.z,0,radial.x);
      const camera=new T.PerspectiveCamera(45,renderer.domElement.clientWidth/renderer.domElement.clientHeight,0.1,2000),framing=Math.max(1,1/camera.aspect);
      camera.position.copy(center).addScaledVector(radial,-12*framing).addScaledVector(side,9*framing);camera.position.y+=6*framing;camera.lookAt(center.clone().add(new T.Vector3(0,0.5,0)));
      renderer.render(scene,camera);const gl=renderer.getContext(),pixel=new Uint8Array(4);gl.readPixels(Math.floor(renderer.domElement.width/2),Math.floor(renderer.domElement.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      return {png:renderer.domElement.toDataURL('image/png'),brightness:pixel[0]+pixel[1]+pixel[2],drawCalls:renderer.info.render.calls,matrixVersion:reeds.instanceMatrix.version};
    });
    expect(shoreline.brightness).toBeGreaterThan(0);expect(shoreline.drawCalls).toBeLessThan(150);expect(shoreline.matrixVersion).toBe(before.shoreReedMatrixVersion);
    writeFileSync('scratch/raptor-flight-review/lake-shore-'+quality+'.png',Buffer.from(shoreline.png.split(',')[1],'base64'));
    const fishReview=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,scene=w.wakeReviewScene,renderer=w.wakeReviewRenderer;
      const fish=scene.getObjectByName('prey-fish-fish');
      const center=fish.getWorldPosition(new T.Vector3());
      const camera=new T.PerspectiveCamera(42,renderer.domElement.clientWidth/renderer.domElement.clientHeight,0.1,2000),framing=Math.max(1,1/camera.aspect);
      camera.position.copy(center).add(new T.Vector3(5,12,8).multiplyScalar(framing));camera.lookAt(center);
      renderer.render(scene,camera);const lake=renderer.domElement.toDataURL('image/png');
      const study=new T.Scene();study.background=new T.Color(0x18323d);
      study.add(new T.HemisphereLight(0xe9faff,0x344452,0.9));const key=new T.DirectionalLight(0xffe5bd,1.1);key.position.set(3,6,4);study.add(key);
      const model=fish.clone(true);model.position.set(0,0,0);model.rotation.set(0,-0.4,0);study.add(model);
      camera.position.set(5*framing,3*framing,6*framing);camera.lookAt(0,0,0);
      renderer.render(study,camera);const detail=renderer.domElement.toDataURL('image/png');
      renderer.render(scene,camera);
      return {lake,detail};
    });
    writeFileSync('scratch/raptor-flight-review/lake-fish-'+quality+'.png',Buffer.from(fishReview.lake.split(',')[1],'base64'));
    writeFileSync('scratch/raptor-flight-review/fish-detail-'+quality+'.png',Buffer.from(fishReview.detail.split(',')[1],'base64'));
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().waterWakeStates.every((w:any)=>!w.visible&&w.opacity===0))).toBe(true);
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().waterBirdFloats.every((p:any)=>p.pitch===0&&p.roll===0))).toBe(true);
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().fishSwimPoses.every((p:any)=>p.amplitude===0&&p.tailYaw===0&&p.bodyYaw===0&&p.roll===0&&p.visualY===0))).toBe(true);
    const resumed=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');(window as any).advanceWakes(25);return c._rhSnapshot();});
    expect(resumed.preyCount).toBe(paused.b.preyCount);
    expect(resumed.fishSwimPoses.map((p:any)=>p.phase)).toEqual(paused.b.fishSwimPoses.map((p:any)=>p.phase));
    expect(resumed.fishSwimPoses.length).toBeGreaterThan(0);
    for(const p of resumed.fishSwimPoses){expect(p.amplitude).toBe(0);expect(p.tailYaw).toBe(0);expect(p.bodyYaw).toBe(0);expect(p.roll).toBe(0);}
    expect(resumed.shoreReedMatrixVersion).toBe(before.shoreReedMatrixVersion);expect(resumed.vegetationWindX).toBe(0);expect(resumed.vegetationWindZ).toBe(0);expect(resumed.waterWakePositionVersion).toBe(before.waterWakePositionVersion);for(const p of resumed.waterBirdFloats){expect(p.pitch).toBe(0);expect(p.roll).toBe(0);}
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
