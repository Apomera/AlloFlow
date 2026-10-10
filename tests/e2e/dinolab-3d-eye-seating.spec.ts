import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const report=process.env.DINO_EYE_REPORT_DIR||'reports/dinolab-3d-eye-seating';
test.describe.configure({timeout:360_000});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var now=performance.now.bind(performance);window.__eyeTime=10000;performance.now=function(){return window.__eyeTime==null?now():window.__eyeTime;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__eyeScene=s;window.__eyeCamera=c;window.__eyeRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){
 await page.waitForFunction(()=>{const w=window as any,h=w.__glCanvas();return !!h&&!h.gl.isContextLost()&&w.__eyeRenderer?.domElement===h.el&&h.el.isConnected;});
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
async function snapshot(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__eyeScene,renderer=w.__eyeRenderer;
 const model=scene.getObjectByName('dinolab-specimen'),rig=model?.getObjectByName('dinolab-connected-cranial-motion');
 const head=model?.getObjectByName('continuous-cranial-surface');
 if(!model||!rig||!head)throw Error('Actual specimen, cranial rig or skull surface is missing.');
 scene.updateMatrixWorld(true);
 const rows:any[]=[];
 model.traverse(part=>{
  if(!part.isMesh||!part.userData.dinoSurfaceSeatedEye)return;
  const side=part.userData.dinoEyeSide||(part.position.z<0?-1:1);
  const frameData=part.userData.dinoEyeFrame;
  if(!Array.isArray(frameData)||frameData.length!==4||!frameData.every(Number.isFinite))throw Error('Seated mesh has no finite active frame.');
  const frame=new T.Quaternion().fromArray(frameData);
  let role=part.userData.dinoEyeRole;
  if(!role&&part.geometry.type==='TorusGeometry')role=part.quaternion.angleTo(frame)<1e-6?'upper-lid':'lower-lid';
  if(!role)throw Error('Unexpected seated eye mesh.');
  const localAxis=new T.Vector3(0,0,side).applyQuaternion(frame);
  const worldAxis=new T.Vector3(0,0,side).applyQuaternion(part.getWorldQuaternion(new T.Quaternion()));
  const ancestry=[];for(let owner=part.parent;owner;owner=owner.parent)ancestry.push({uuid:owner.uuid,name:owner.name});
  rows.push({side,role,mesh:part.uuid,geometry:part.geometry.uuid,vertices:part.geometry.attributes.position.count,
   material:part.material.uuid,parent:part.parent.uuid,ancestry,frame:frameData.slice(),
   frameTurn:Math.acos(Math.max(-1,Math.min(1,localAxis.z*side))),
   position:part.position.toArray(),quaternion:part.quaternion.toArray(),scale:part.scale.toArray(),visible:part.visible,
   world:part.matrixWorld.elements.slice(),worldPosition:part.getWorldPosition(new T.Vector3()).toArray(),worldAxis:worldAxis.toArray()});
 });
 const order=['iris','pupil','glint','cornea','upper-lid','lower-lid'];
 rows.sort((a,b)=>a.side-b.side||order.indexOf(a.role)-order.indexOf(b.role));
 const stacks=[-1,1].map(side=>{
  const eyeRows=rows.filter(row=>row.side===side),irisRow=eyeRows.find(row=>row.role==='iris');
  const pupilRow=eyeRows.find(row=>row.role==='pupil'),upper=eyeRows.find(row=>row.role==='upper-lid'),lower=eyeRows.find(row=>row.role==='lower-lid');
  if(!irisRow||!pupilRow||!upper||!lower)throw Error('An actual bilateral eye stack is incomplete.');
  const iris=model.getObjectByProperty('uuid',irisRow.mesh);
  const center=new T.Vector3().fromArray(irisRow.worldPosition),axis=new T.Vector3().fromArray(irisRow.worldAxis);
  const pupilDelta=new T.Vector3().fromArray(pupilRow.worldPosition).sub(center);
  const radius=iris.geometry.parameters.radius*Math.abs(iris.getWorldScale(new T.Vector3()).x);
  const hit=new T.Raycaster(center.clone().addScaledVector(axis,radius*3),axis.clone().negate(),0,radius*6).intersectObject(head,false)[0];
  return {side,roles:eyeRows.map(row=>row.role),framesMatch:eyeRows.every(row=>row.frame.every((value,index)=>Math.abs(value-irisRow.frame[index])<1e-12)),
   actualEyeFrameError:new T.Quaternion().fromArray(irisRow.quaternion).angleTo(new T.Quaternion().fromArray(irisRow.frame)),
   lidHalfTurn:new T.Quaternion().fromArray(upper.quaternion).angleTo(new T.Quaternion().fromArray(lower.quaternion)),
   upperLidAxisDot:axis.dot(new T.Vector3().fromArray(upper.worldAxis)),lowerLidAxisDot:axis.dot(new T.Vector3().fromArray(lower.worldAxis)),
   pupilForward:pupilDelta.dot(axis)/radius,pupilTangentError:pupilDelta.clone().cross(axis).length()/radius,
   skinHit:!!hit,skinDistance:hit?hit.point.distanceTo(center)/radius:null,
   skinOutward:hit?hit.point.clone().sub(center).dot(axis)/radius:null};
 });
 return {model:model.uuid,rig:rig.uuid,pivot:rig.userData.pivot?.slice(),rootCount:rig.userData.rootCount,
  head:head.uuid,rows,stacks,errors:w.__events.errors,lost:w.__glLive().lost,
  shaderFailures:renderer.info.programs.filter(program=>program.diagnostics&&program.diagnostics.runnable===false).length};
});}
function check(snapshot){
 expect(snapshot.errors).toEqual([]);expect(snapshot.lost).toBe(false);expect(snapshot.shaderFailures).toBe(0);
 expect(snapshot.rows).toHaveLength(12);expect(snapshot.pivot).toHaveLength(3);
 for(const row of snapshot.rows){
  expect(row.parent).toBe(snapshot.rig);
  expect(row.ancestry.some(owner=>owner.uuid===snapshot.rig&&owner.name==='dinolab-connected-cranial-motion')).toBe(true);
  expect(row.frameTurn).toBeGreaterThan(.001);expect(row.frameTurn).toBeLessThanOrEqual(35*Math.PI/180+1e-8);
  expect([...row.position,...row.quaternion,...row.scale,...row.world,...row.worldAxis].every(Number.isFinite)).toBe(true);
 }
 for(const stack of snapshot.stacks){
  expect(stack.roles).toEqual(['iris','pupil','glint','cornea','upper-lid','lower-lid']);
  expect(stack.framesMatch).toBe(true);expect(stack.actualEyeFrameError).toBeLessThan(1e-7);
  expect(stack.lidHalfTurn).toBeCloseTo(Math.PI,7);
  expect(stack.upperLidAxisDot).toBeCloseTo(1,7);expect(stack.lowerLidAxisDot).toBeCloseTo(1,7);
  expect(stack.pupilForward).toBeGreaterThan(.2);expect(stack.pupilTangentError).toBeLessThan(1e-6);
  expect(stack.skinHit).toBe(true);expect(stack.skinDistance).toBeLessThan(.35);expect(stack.skinOutward).toBeGreaterThan(0);
 }
}
function identities(snapshot){return snapshot.rows.map(row=>[row.side,row.role,row.mesh,row.geometry,row.material,row.parent,row.position,row.quaternion]);}

test('Tyrannosaurus seated eyes preserve their cranial frame through a native blink',async({page})=>{
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:'tyrannosaurus',field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__eyeScene)).toBe(true);
 expect(await page.evaluate(()=>(window as any).__harnessNotes.substitutes)).toEqual(process.env.STEM_GL_SUBSTITUTE?['stem_lab/stem_tool_dinolab.js']:[]);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();
 await page.getByRole('button',{name:'Study head details',exact:true}).click();await settle(page);
 await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
 const initial=await snapshot(page);check(initial);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/tyrannosaurus-eye-open.png'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(page.getByRole('button',{name:'Pause motion',exact:true})).toBeEnabled();await settle(page);
 // Native clock counts active time only and caps each delta at .1 seconds.
 // With a fixed starting clock, 50 ms steps produce the first T. rex blink:
 // phase = 13*.47; cycle = elapsed*.16 + phase*.13; closure occupies .92..1.
 const active=await snapshot(page);check(active);expect(identities(active)).toEqual(identities(initial));
 const samples=[];
 for(let step=1;step<=32;step++){
  await page.evaluate(async()=>{(window as any).__eyeTime+=50;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
  const sample=await snapshot(page);check(sample);
  expect(sample.model).toBe(initial.model);expect(sample.rig).toBe(initial.rig);expect(sample.head).toBe(initial.head);
  expect(sample.pivot).toEqual(initial.pivot);expect(sample.rootCount).toBe(initial.rootCount);
  expect(identities(sample)).toEqual(identities(initial));
  const elapsed=step*.05,cycle=(elapsed*.16+'tyrannosaurus'.length*.47*.13)%1;
  const expectedBlink=cycle>.92?Math.sin(((cycle-.92)/.08)*Math.PI):0;
  for(let index=0;index<sample.rows.length;index++){
   const row=sample.rows[index],rest=initial.rows[index];
   expect(row.scale[0]).toBe(rest.scale[0]);expect(row.scale[2]).toBe(rest.scale[2]);
   const amount=row.role==='pupil'?.90:row.role==='glint'?0:.88;
   expect(row.scale[1]/rest.scale[1]).toBeCloseTo(1-expectedBlink*amount,5);
   if(row.role==='glint')expect(row.visible).toBe(expectedBlink<.48);
  }
  samples.push({step,elapsed,expectedBlink,sample});
  if(step===21)await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/tyrannosaurus-eye-blink.png'});
 }
 for(const side of [-1,1]){
  const irisIndex=initial.rows.findIndex(row=>row.side===side&&row.role==='iris');
  expect(Math.min(...samples.map(item=>item.sample.rows[irisIndex].scale[1]/initial.rows[irisIndex].scale[1]))).toBeLessThan(.2);
  expect(samples.at(-1)!.sample.rows[irisIndex].scale).toEqual(initial.rows[irisIndex].scale);
 }
 expect(samples.some(item=>item.sample.rows.some((row,index)=>row.world.some((value,column)=>Math.abs(value-initial.rows[index].world[column])>1e-8)))).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await settle(page);
 const recovered=await snapshot(page);check(recovered);expect(identities(recovered)).toEqual(identities(initial));
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/tyrannosaurus-eye-recovered.png'});
 fs.writeFileSync(report+'/tyrannosaurus-eye-seating-metrics.json',JSON.stringify({initial,active,samples,recovered,
  actualRenderedFramesActivated:true,nativeBlinkClosedAndRecovered:true,meshGeometryPositionAndCranialOwnerPreserved:true},null,2));
});
