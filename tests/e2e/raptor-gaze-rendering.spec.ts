import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.gazeReviewScene=scene;window.gazeReviewRenderer=renderer;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor gaze and facial detail',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1000,height:720,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  for(const model of [{id:'baldEagle',quality:'high'},{id:'greatHorned',quality:'low'}])test('tracks prey with an attached face for '+model.id,async({page})=>{
    await page.setViewportSize({width:model.quality==='low'?440:1100,height:1200});
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).advanceGaze=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:model.id,activeMission:'open',flightSession:{speciesId:model.id,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:model.quality}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(model.quality==='low')await page.addStyleTag({content:'#wrap{width:420px}'});
    const tracking=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,T=w.THREE;c._rhCommand('assist');c._rhCommand('environment',{windSpeed:0,dayPhase:0.4,cloudCover:0.15});w.advanceGaze(25);
      const scene=w.gazeReviewScene,head=scene.getObjectByName('raptor-head-rig'),bird=head.parent,prey=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
      w.placeGazePrey=(side:number)=>{bird.updateWorldMatrix(true,false);const origin=head.position.clone().applyMatrix4(bird.matrixWorld),offset=new T.Vector3(side*20,-12,26).applyQuaternion(bird.quaternion);prey.forEach((p:any,i:number)=>p.position.copy(i===0?origin.clone().add(offset):origin.clone().add(new T.Vector3(2000+i*20,2000,2000))));};
      for(let i=0;i<30;i++){w.placeGazePrey(1);w.advanceGaze(25);}const right=c._rhSnapshot();w.placeGazePrey(-1);w.advanceGaze(25);const firstLeft=c._rhSnapshot();for(let i=0;i<30;i++){w.placeGazePrey(-1);w.advanceGaze(25);}const left=c._rhSnapshot();
      const eye=head.getObjectByName('right-eye'),pupil=head.getObjectByName('right-pupil'),beak=head.getObjectByName('hooked-beak');
      return {right,firstLeft,left,bodyVertexColors:bird.getObjectByName('raptor-contour-body').material.vertexColors,tuftVertices:head.getObjectByName('field-mark-great-horned-tufts')?.geometry.attributes.position.count||0,eyeRadius:eye.position.length(),pupilRadius:pupil.position.length(),beakVertices:beak.geometry.attributes.position.count,irisVertices:eye.geometry.attributes.position.count,irisMap:!!eye.material.map,billLineCompiled:!!beak.material.userData.billLineCompiled,attached:[eye,pupil,beak].every(o=>o.parent===head)};
    });
    expect(tracking.right.gazeTracking).toBe(true);expect(tracking.right.gazeYaw).toBeGreaterThan(0.3);expect(tracking.right.gazePitch).toBeGreaterThan(0.15);expect(tracking.left.gazeYaw).toBeLessThan(-0.3);
    expect(Math.abs(tracking.firstLeft.gazeYaw-tracking.right.gazeYaw)).toBeLessThan(0.2);expect(tracking.left.drawCalls).toBeLessThan(150);
    expect(tracking.bodyVertexColors).toBe(true);expect(tracking.tuftVertices).toBe(model.id==='greatHorned'?150:0);
    expect(tracking.eyeRadius).toBeGreaterThan(0.22);expect(tracking.pupilRadius).toBeGreaterThan(tracking.eyeRadius);expect(tracking.beakVertices).toBe(274);expect(tracking.irisVertices).toBe(193);expect(tracking.irisMap).toBe(true);expect(tracking.billLineCompiled).toBe(true);expect(tracking.attached).toBe(true);
    const paused=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');const a=c._rhSnapshot();(window as any).advanceGaze(60000);return {a,b:c._rhSnapshot()};});
    expect(paused.a.gazeYaw).toBe(paused.b.gazeYaw);expect(paused.a.gazePitch).toBe(paused.b.gazePitch);
    const portrait=await page.evaluate(()=>{
      const w=window as any,T=w.THREE,scene=w.gazeReviewScene,renderer=w.gazeReviewRenderer,head=scene.getObjectByName('raptor-head-rig'),bird=head.parent;
      const study=new T.Scene();study.background=new T.Color(0x182f3b);study.add(new T.HemisphereLight(0xe2f2ff,0x5c5743,1.05));const light=new T.DirectionalLight(0xffe5bb,1.35);light.position.set(2,5,5);study.add(light);
      const copy=bird.clone(true);copy.position.set(0,0,0);copy.rotation.set(0,0,0);copy.scale.setScalar(1);study.add(copy);const face=copy.getObjectByName('raptor-head-rig');face.rotation.set(0.12,0.28,0,'YXZ');
      const center=face.position.clone(),camera=new T.PerspectiveCamera(32,renderer.domElement.clientWidth/renderer.domElement.clientHeight,0.01,100),framing=Math.max(1.15,1.05/camera.aspect);camera.position.copy(center).add(new T.Vector3(0.88,0.32,1.1).multiplyScalar(framing));camera.lookAt(center);
      renderer.render(study,camera);const png=renderer.domElement.toDataURL('image/png');renderer.render(scene,camera);return png;
    });
    writeFileSync('scratch/raptor-flight-review/iris-bill-face-'+model.id+'.png',Buffer.from(portrait.split(',')[1],'base64'));
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const s=c._rhSnapshot();return s.gazeYaw===0&&s.gazePitch===0&&!s.gazeTracking;})).toBe(true);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
    const dive=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');for(let i=0;i<20;i++){w.placeGazePrey(1);w.advanceGaze(25);}const before=c._rhSnapshot();c._rhCommand('hold',{key:'shift',pressed:true});for(let i=0;i<20;i++){w.placeGazePrey(1);w.advanceGaze(25);}return {before,after:c._rhSnapshot()};});
    expect(dive.before.gazeYaw).toBeGreaterThan(0.2);expect(dive.after.gazeTracking).toBe(false);expect(Math.abs(dive.after.gazeYaw)).toBeLessThan(Math.abs(dive.before.gazeYaw));
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
