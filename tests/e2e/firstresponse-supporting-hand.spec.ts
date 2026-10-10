import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const report = process.env.FIRST_RESPONSE_SUPPORTING_HAND_REPORT || 'reports/firstresponse-supporting-hand';
const beforeSource = readFileSync(process.env.FIRST_RESPONSE_SUPPORTING_HAND_BEFORE || report + '/before.js', 'utf8');
const hostSource = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
// The host loads before the tool creates its viewer. Observe only the real public
// viewer calls so the saved source can replay exactly the same camera later.
const cameraHook = `
  (function(){
    var makeViewer=window.StemLab.makeBayViewer;
    window.StemLab.makeBayViewer=function(cfg){
      var viewer=makeViewer.apply(this,arguments);
      if(!cfg.parts.some(function(part){return part.id==='patientArms';}))return viewer;
      window.__supportViewer=viewer;
      var nudges=[],reset=viewer.reset,nudge=viewer.nudge,focus=viewer.focus;
      viewer.reset=function(){nudges=[];window.__supportCameraRequest=null;return reset.apply(this,arguments);};
      viewer.nudge=function(yaw,pitch){nudges.push([yaw,pitch]);return nudge.apply(this,arguments);};
      viewer.focus=function(partId,options){
        var result=focus.apply(this,arguments);
        if(result!==false)window.__supportCameraRequest=JSON.parse(JSON.stringify({
          partId:partId,home:cfg.home,nudges:nudges,options:options
        }));
        return result;
      };
      return viewer;
    };
  })();`;
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const metrics: Record<string, unknown>[] = [];
const browserErrors = new WeakMap<Page, string[]>();
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__supportDraws=new WeakMap();window.__supportIds=new WeakMap();window.__supportNextId=0;
    function supportId(object){if(!object)return null;var id=window.__supportIds.get(object);if(!id){id=++window.__supportNextId;window.__supportIds.set(object,id);}return id;}
    var SupportRenderer=THREE.WebGLRenderer;
    THREE.WebGLRenderer=new Proxy(SupportRenderer,{construct:function(target,args,newTarget){
      var renderer=Reflect.construct(target,args,newTarget),render=renderer.render;
      renderer.render=function(scene,camera){var result=render.apply(this,arguments);
        if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){
          var previous=window.__supportDraws.get(this.domElement);
          window.__supportDraws.set(this.domElement,{scene:scene,camera:camera,renderer:renderer,calls:renderer.info.render.calls,
            triangles:renderer.info.render.triangles,sequence:(previous?previous.sequence:0)+1});
        }return result;
      };return renderer;
    }});
    function supportVisible(object){for(var parent=object;parent;parent=parent.parent)if(!parent.visible)return false;return true;}
    function supportHash(arrays){var hash=2166136261;arrays.filter(Boolean).forEach(function(array){
      var bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);for(var i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);
    });return ('00000000'+(hash>>>0).toString(16)).slice(-8);}
    window.__supportProbe=function(){
      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__supportDraws.get(canvas),record=canvas && window.__glRecorder.forCanvas(canvas);
      if(!record || !drawn)return null;var scene=drawn.scene,camera=drawn.camera;
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      function summary(mesh){var geometry=mesh.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal,index=geometry.index;
        var total=index?index.count:position.count,start=geometry.drawRange.start,end=Math.min(total,start+geometry.drawRange.count);
        var min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],worlds=[],seen=new Set(),invalid=0;
        for(var offset=start;offset<end;offset++){var i=index?index.getX(offset):offset;if(seen.has(i))continue;seen.add(i);
          var world=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld),p=world.clone().project(camera).toArray();
          worlds.push(world.x,world.y,world.z);if(!world.toArray().concat(p).every(Number.isFinite))invalid++;
          for(var axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],p[axis]);max[axis]=Math.max(max[axis],p[axis]);}
        }
        var materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
        return {name:mesh.name,min:min,max:max,invalid:invalid,matrix:mesh.matrixWorld.elements.slice(),visible:supportVisible(mesh),
          fingerprint:supportHash([position.array,normal && normal.array,index && index.array]),worldFingerprint:supportHash([new Float64Array(worlds)]),
          drawRange:[start,end-start],resources:[supportId(mesh),supportId(geometry),supportId(position),supportId(position.array),
            supportId(normal),supportId(normal && normal.array),supportId(index),supportId(index && index.array)].concat(materials.map(supportId)),
          materials:materials.map(function(m){return {name:m.name,type:m.type,color:m.color.toArray(),opacity:m.opacity,transparent:m.transparent,
            patientContour:m.userData.frPatientContourStrength?m.userData.frPatientContourStrength.value:null,
            rescuerContour:m.userData.frContourStrength?m.userData.frContourStrength.value:null};})};
      }
      var parts=[],all=[],hand=scene.getObjectByName('fr-patient-right-hand'),head=scene.getObjectByName('fr-manikin-head-pivot');
      scene.traverse(function(mesh){if(mesh.isMesh && mesh.geometry.attributes.position)all.push(summary(mesh));});
      hand.traverse(function(mesh){if(mesh.isMesh && mesh.geometry.attributes.position)parts.push(summary(mesh));});
      var context=hand.userData.inspection && hand.userData.inspection.context;
      var projectedContext=Array.isArray(context)?context.map(function(point){var vector=new THREE.Vector3().fromArray(point),ndc=vector.clone().project(camera);
        var ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(ndc.x,ndc.y),camera);
        var hits=ray.intersectObjects(scene.children,true).filter(function(hit){return supportVisible(hit.object) && hit.object.material.opacity>0;});
        var first=hits[0],firstHead=false;for(var parent=first && first.object;parent;parent=parent.parent)if(parent===head)firstHead=true;
        return {world:point.slice(),ndc:ndc.toArray(),first:first && first.object.name,firstHead:firstHead,distance:first && first.distance};
      }):[];
      return {parts:parts,all:all,inspection:hand.userData.inspection?JSON.parse(JSON.stringify(hand.userData.inspection)):null,context:projectedContext,
        handGroupId:supportId(hand),meshCount:all.length,sceneNodeCount:(function(){var count=0;scene.traverse(function(){count++;});return count;})(),
        camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect,near:camera.near},
        cameraRequest:window.__supportCameraRequest?JSON.parse(JSON.stringify(window.__supportCameraRequest)):null,
        canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
        draw:{id:record.id,draws:record.draws,sequence:drawn.sequence,createdBy:record.createdBy,calls:drawn.calls,triangles:drawn.triangles,
          geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length},
        state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};
    };
    window.__supportRasterSamples=function(width,height){
      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__supportDraws.get(canvas);
      if(!drawn)throw new Error('Real drawn supporting-hand scene required');
      var scene=drawn.scene,camera=drawn.camera,hand=scene.getObjectByName('fr-patient-right-hand'),head=scene.getObjectByName('fr-manikin-head-pivot');
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      var samples=[],probe=window.__supportProbe(),min=[Infinity,Infinity],max=[-Infinity,-Infinity];
      probe.parts.forEach(function(part){for(var axis=0;axis<2;axis++){min[axis]=Math.min(min[axis],part.min[axis]);max[axis]=Math.max(max[axis],part.max[axis]);}});
      var visibleMeshes=[];scene.traverse(function(mesh){if(mesh.isMesh && supportVisible(mesh) && mesh.material.opacity>0)visibleMeshes.push(mesh);});
      function firstAt(x,y){var ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x,y),camera);var hit=ray.intersectObjects(visibleMeshes,false)[0];
        var onHand=false,onHead=false;for(var parent=hit && hit.object;parent;parent=parent.parent){if(parent===hand)onHand=true;if(parent===head)onHead=true;}
        return {hand:onHand,head:onHead,name:hit && hit.object.name};
      }
      for(var yi=0;yi<25;yi++)for(var xi=0;xi<25;xi++){
        var x=min[0]+(max[0]-min[0])*(xi+.5)/25,y=min[1]+(max[1]-min[1])*(yi+.5)/25;
        var first=firstAt(x,y);if(first.hand)samples.push({x:Math.min(width-1,Math.max(0,Math.round((x+1)*width/2))),
          y:Math.min(height-1,Math.max(0,Math.round((1-y)*height/2))),name:first.name});
      }
      var cheek=[];(hand.userData.inspection.context || []).forEach(function(point,index){var p=new THREE.Vector3().fromArray(point).project(camera),first=firstAt(p.x,p.y);
        cheek.push({index:index,x:Math.round((p.x+1)*width/2),y:Math.round((1-p.y)*height/2),ndc:p.toArray(),head:first.head,name:first.name});
      });return {hand:samples,cheek:cheek,grid:25,background:scene.background.toArray().map(function(value){return Math.round(value*255);}),handProjectedArea:(max[0]-min[0])*(max[1]-min[1])*width*height/4};
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 600000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { writeFileSync(report + '/supporting-hand-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
test.beforeEach(async ({ page }) => {
  await page.route('**/stem_lab/stem_lab_module.js', async request => request.fulfill({
    status: 200, contentType: 'application/javascript', body: hostSource + '\n' + cameraHook,
  }));
  const errors: string[] = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__supportDraws.get(canvas)?.sequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__supportDraws.get(canvas);
    return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  }, previous);
}
async function mount(page: Page, age: string, width: number, patch: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'recovery', b3dAge: age,
    b3dRec: completed, b3dRecView: 5, b3dRecoveryGuides: false, b3dChildHands: 'two', b3dPlaced: 'correct',
    b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
    b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
    b3dDepthInquiry: { signature: 'supporting-hand-observation', explanation: 'Retain this saved observation.' }, ...patch } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' }); await settle(page);
}
async function probe(page: Page): Promise<any> {
  const handle = await page.waitForFunction(() => (window as any).__supportProbe());
  try { return await handle.jsonValue(); } finally { await handle.dispose(); }
}
async function update(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(p => (window as any).__ctx.updateMulti('firstResponse', p), patch); await settle(page);
}
const preserved = (state: any) => ({ rec: state.b3dRec, depth: state.b3dDepthLab, reference: state.b3dDepthReference,
  inquiry: state.b3dDepthInquiry, hands: state.b3dChildHands, placed: state.b3dPlaced });
const geometry = (pose: any) => pose.all.map((part: any) => [part.name, part.fingerprint, part.worldFingerprint, part.matrix, part.drawRange, part.visible]);
const materials = (pose: any) => pose.all.map((part: any) => [part.name, part.materials]);
const resources = (pose: any) => ({ all: pose.all.map((part: any) => part.resources), hand: pose.handGroupId, canvas: pose.draw.id });
function footprint(pose: any) {
  const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
  for (const part of pose.parts) for (const axis of [0, 1]) { min[axis] = Math.min(min[axis], part.min[axis]); max[axis] = Math.max(max[axis], part.max[axis]); }
  return { min, max, width: (max[0] - min[0]) * pose.canvasSize[0] / 2, height: (max[1] - min[1]) * pose.canvasSize[1] / 2,
    area: (max[0] - min[0]) * (max[1] - min[1]) * pose.canvasSize[0] * pose.canvasSize[1] / 4 };
}
function valid(pose: any) {
  expect(pose.parts.length).toBeGreaterThan(10); expect(pose.draw.createdBy).toBe('page');
  expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  expect(pose.draw.calls).toBeGreaterThan(0); expect(pose.draw.triangles).toBeGreaterThan(0);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2);
  for (const part of pose.all) expect(part.invalid, part.name).toBe(0);
  expect(pose.errors).toEqual([]);
}
function fitted(pose: any) {
  valid(pose); expect(pose.inspection.radius).toBeGreaterThan(0);
  for (const field of ['center', 'normal', 'forward']) { expect(pose.inspection[field]).toHaveLength(3); expect(pose.inspection[field].every(Number.isFinite)).toBe(true); }
  expect(pose.inspection.context).toHaveLength(5);
  for (const part of pose.parts) for (const axis of [0, 1]) {
    expect(part.min[axis], part.name + ' stays within the camera').toBeGreaterThan(-.995);
    expect(part.max[axis], part.name + ' stays within the camera').toBeLessThan(.995);
  }
  expect(pose.parts.filter((part: any) => /-(palm|wrist)$/.test(part.name))).toHaveLength(2);
  for (const point of pose.context) for (const axis of [0, 1]) expect(Math.abs(point.ndc[axis]), 'cheek context fits beside the hand').toBeLessThan(.995);
  expect(pose.context.filter((point: any) => point.firstHead).length, 'some actual cheek patch remains visible beside the supporting hand').toBeGreaterThan(0);
}
async function control(page: Page, name: string, keyboard = false) {
  const before = await probe(page), button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); } else await button.click();
  await settle(page); const after = await probe(page);
  expect(after.state).toEqual(before.state); expect(geometry(after)).toEqual(geometry(before));
  expect(materials(after)).toEqual(materials(before)); expect(resources(after)).toEqual(resources(before));
  expect(after.meshCount).toBe(before.meshCount); expect(after.sceneNodeCount).toBe(before.sceneNodeCount);
  expect(after.draw.geometries).toBe(before.draw.geometries); expect(after.draw.programs).toBe(before.draw.programs); return after;
}
async function selectPose(page: Page, pose: number) {
  await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
}
async function photograph(page: Page, name: string) {
  await settle(page); const before = await probe(page), box = await page.locator('.fr-body3d-stage').boundingBox(); expect(box).toBeTruthy();
  await page.screenshot({ path: report + '/' + name + '-stage.png', clip: box!, timeout: 60000 });
  const gl = await harness.glPixels(page, '#wrap'); expect(gl).toBeTruthy(); writeFileSync(report + '/' + name + '-gl.png', gl!.png);
  const pixels = readPng(gl!.png), source = await page.evaluate(({ width, height }) => (window as any).__supportRasterSamples(width, height), { width: pixels.width, height: pixels.height });
  const signal = (point: any) => {
    let value = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = point.x + dx, y = point.y + dy;
      if (x >= 0 && x < pixels.width && y >= 0 && y < pixels.height) value = Math.max(value,
        ...pixels.at(x, y).slice(0, 3).map((channel: number, index: number) => Math.abs(channel - source.background[index])));
    } return value;
  };
  const handLit = source.hand.filter((point: any) => signal(point) > 32).length;
  const cheek = source.cheek.filter((point: any) => point.head && signal(point) > 32);
  const evidence = { width: pixels.width, height: pixels.height, footprint: footprint(before), handSourceSamples: source.hand.length,
    handLit, background: source.background, cheekSourceSamples: source.cheek, cheekLit: cheek.length, calls: before.draw.calls, triangles: before.draw.triangles };
  writeFileSync(report + '/' + name + '-evidence.json', JSON.stringify({ pose: before, evidence }, null, 2)); metrics.push({ name, evidence, pose: before });
  expect(source.hand.length, 'source rays intersect the real supporting hand').toBeGreaterThan(25);
  expect(handLit / source.hand.length, 'raw GPU image contains the ray-proven hand').toBeGreaterThan(.7);
  expect(cheek.length, 'raw GPU image contains visible cheek context').toBeGreaterThan(0);
  await settle(page); const after = await probe(page); expect(after.camera).toEqual(before.camera); expect(after.state).toEqual(before.state);
  expect(resources(after)).toEqual(resources(before)); return before;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  writeFileSync(report + '/' + name + '-axe.json', JSON.stringify(violations, null, 2));
  expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect(browserErrors.get(page)).toEqual([]);
}
async function release(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
}
async function baselineViews(page: Page, age: string, width: number) {
  const route = '**/stem_lab/stem_tool_firstresponse.js';
  await page.route(route, async request => request.fulfill({ status: 200, contentType: 'application/javascript', body: beforeSource }));
  await mount(page, age, width); const head: Record<number, any> = {};
  for (const pose of [4, 5, 8]) { await selectPose(page, pose); head[pose] = await control(page, 'Head close-up'); }
  await selectPose(page, 5); const palm = await control(page, 'Palm detail view');
  const summary = { head, palm }; writeFileSync(report + '/' + age + '-baseline-cameras.json', JSON.stringify(summary, null, 2));
  await release(page); await page.unroute(route); return summary;
}
async function replaySupportingCameras(page: Page, age: string, width: number, captured: any[]) {
  const route = '**/stem_lab/stem_tool_firstresponse.js';
  await page.route(route, async request => request.fulfill({ status: 200, contentType: 'application/javascript', body: beforeSource }));
  await mount(page, age, width);
  let contrast = false;
  const replayed: any[] = [];
  for (const sample of captured) {
    const request = sample.pose.cameraRequest;
    expect(request.partId, 'capture comes from the real supporting-hand focus').toBe('supportingHand');
    expect(request.nudges.length, 'supporting camera resets and nudges the real viewer').toBeGreaterThan(0);
    expect(Number.isFinite(request.options.distance)).toBe(true);
    expect(Object.values(request.options.target).every(Number.isFinite)).toBe(true);
    if (contrast !== sample.contrast) {
      contrast = sample.contrast;
      await page.evaluate(value => { (window as any).__ctx.isContrast = value; (window as any).__rerender(); }, contrast);
      await settle(page);
    }
    await selectPose(page, sample.phase);
    await page.evaluate(request => {
      const viewer = (window as any).__supportViewer;
      if (!viewer) throw new Error('Real public body viewer required for saved-source replay');
      viewer.reset();
      for (const [yaw, pitch] of request.nudges) viewer.nudge(yaw, pitch);
      // The saved source already exposes head. Explicit target and distance
      // override its bounds, reproducing the new camera without an added alias.
      if (viewer.focus('head', request.options) === false) throw new Error('Saved-source focus replay failed');
    }, request);
    await settle(page); const before = await probe(page); valid(before);
    expect(before.camera, 'saved source renders the identical supporting camera').toEqual(sample.pose.camera);
    expect(geometry(before), 'camera target adds no anatomy or transforms').toEqual(geometry(sample.pose));
    expect(materials(before), 'camera target adds no materials').toEqual(materials(sample.pose));
    expect([before.meshCount, before.sceneNodeCount, before.draw.calls, before.draw.triangles],
      'same camera draws exactly the existing scene from the saved source').toEqual([
      sample.pose.meshCount, sample.pose.sceneNodeCount, sample.pose.draw.calls, sample.pose.draw.triangles,
    ]);
    expect(preserved(before.state)).toEqual(preserved(sample.pose.state));
    replayed.push({ phase: sample.phase, contrast: sample.contrast, cameraRequest: request, candidate: sample.pose, baseline: before });
  }
  writeFileSync(report + '/' + age + '-support-camera-baseline.json', JSON.stringify(replayed, null, 2));
  metrics.push({ name: age + '-support-camera-baseline', comparisons: replayed });
  await release(page); await page.unroute(route);
}
async function workflow(page: Page, age: string, width: number, keyboard: boolean) {
  const baseline = await baselineViews(page, age, width), prefix = age === 'infant' ? 'phone-infant' : age;
  await mount(page, age, width, { b3dRec: completed.slice(0, 2), b3dRecView: 2 });
  await expect(page.getByRole('button', { name: 'Supporting hand close-up', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Inspect support before turn', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Inspect support after turn', exact: true })).toBeDisabled();
  await update(page, { b3dRec: completed.slice(0, 4), b3dRecView: 3 });
  await expect(page.getByRole('button', { name: 'Supporting hand close-up', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Inspect support before turn', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Inspect support after turn', exact: true })).toBeDisabled();
  await update(page, { b3dRec: completed, b3dRecView: 2 }); const saved = preserved((await probe(page)).state);
  const beforeTurn = page.getByRole('button', { name: 'Inspect support before turn', exact: true });
  if (keyboard) { await beforeTurn.focus(); await page.keyboard.press('Enter'); } else await beforeTurn.click(); await settle(page);
  await expect(beforeTurn).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByLabel('Pose to inspect', { exact: true })).toHaveValue('4');
  fitted(await probe(page)); expect(preserved((await probe(page)).state)).toEqual(saved);
  const standard: Record<number, any> = {}, captured: any[] = [];
  for (const pose of [4, 5, 8]) {
    await selectPose(page, pose); fitted(await probe(page));
    const head = await control(page, 'Head close-up', keyboard); valid(head);
    expect(head.camera, 'existing Head close-up camera matches saved source exactly').toEqual(baseline.head[pose].camera);
    expect(geometry(head)).toEqual(geometry(baseline.head[pose])); expect(materials(head)).toEqual(materials(baseline.head[pose]));
    expect([head.meshCount, head.sceneNodeCount, head.draw.calls, head.draw.triangles]).toEqual([
      baseline.head[pose].meshCount, baseline.head[pose].sceneNodeCount, baseline.head[pose].draw.calls, baseline.head[pose].draw.triangles]);
    const support = await control(page, 'Supporting hand close-up', keyboard); fitted(support);
    const ratio = footprint(support).area / footprint(head).area;
    metrics.push({ name: prefix + '-standard-pose-' + pose + '-enlargement', ratio, head: footprint(head), supporting: footprint(support) });
    expect(ratio, 'supporting-hand camera meaningfully enlarges the same hand').toBeGreaterThanOrEqual(1.5);
    if (width === 320) expect(footprint(support).width, 'supporting hand remains at least 60px wide on a phone').toBeGreaterThanOrEqual(60);
    expect(preserved(support.state)).toEqual(saved); standard[pose] = support; await photograph(page, prefix + '-standard-pose-' + pose + '-support');
    captured.push({ phase: pose, contrast: false, pose: support });
  }
  await selectPose(page, 5); const palm = await control(page, 'Palm detail view', keyboard);
  expect(palm.camera, 'existing near-palm camera matches saved source exactly').toEqual(baseline.palm.camera);
  await control(page, 'Supporting hand close-up', keyboard);
  await page.getByRole('checkbox', { name: 'Show arm positioning guides', exact: true }).check(); await settle(page); fitted(await probe(page));
  await page.getByRole('checkbox', { name: 'Show arm positioning guides', exact: true }).uncheck(); await settle(page); fitted(await probe(page));
  const oldCanvas = await page.locator('#wrap canvas').elementHandle();
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  await expect.poll(async () => oldCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  fitted(await probe(page));
  for (const pose of [4, 5, 8]) {
    await selectPose(page, pose); fitted(await probe(page)); const support = await control(page, 'Supporting hand close-up', keyboard);
    fitted(support); expect(geometry(support)).toEqual(geometry(standard[pose])); expect(preserved(support.state)).toEqual(saved);
    expect(support.draw.calls).toBe(standard[pose].draw.calls); expect(support.draw.triangles).toBe(standard[pose].draw.triangles);
    await photograph(page, prefix + '-contrast-pose-' + pose + '-support');
    captured.push({ phase: pose, contrast: true, pose: support });
  }
  const afterTurn = page.getByRole('button', { name: 'Inspect support after turn', exact: true });
  if (keyboard) { await afterTurn.focus(); await page.keyboard.press('Space'); } else await afterTurn.click(); await settle(page);
  await expect(afterTurn).toHaveAttribute('aria-pressed', 'true'); await expect(beforeTurn).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Pose to inspect', { exact: true })).toHaveValue('5'); fitted(await probe(page)); expect(preserved((await probe(page)).state)).toEqual(saved);
  const observation = page.getByText('Check supporting-hand observation', { exact: true });
  await observation.click(); await expect(observation.locator('..')).toHaveAttribute('open', ''); expect(preserved((await probe(page)).state)).toEqual(saved);
  if (keyboard) {
    const narrow = await control(page, 'Supporting hand close-up', true), ids = resources(narrow);
    await page.setViewportSize({ width: 760, height: 840 }); await settle(page); const wide = await probe(page); fitted(wide);
    expect(resources(wide)).toEqual(ids); expect(geometry(wide)).toEqual(geometry(narrow)); expect(preserved(wide.state)).toEqual(saved);
    await page.setViewportSize({ width: 320, height: 840 }); await settle(page); const restored = await probe(page); fitted(restored);
    expect(resources(restored)).toEqual(ids); expect(restored.camera).toEqual(narrow.camera); expect(preserved(restored.state)).toEqual(saved);
    await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Supporting hand close-up', true); fitted(await probe(page));
    await photograph(page, prefix + '-forced-colors-support'); await audit(page, prefix + '-forced-colors'); await page.emulateMedia({ forcedColors: 'none' });
    const currentAge = age; await update(page, { b3dAge: 'child' }); fitted(await probe(page)); expect(preserved((await probe(page)).state)).toEqual(saved);
    await update(page, { b3dAge: currentAge }); fitted(await probe(page)); expect(preserved((await probe(page)).state)).toEqual(saved);
    const stage = page.locator('.fr-body3d-stage'); await stage.focus(); await expect(stage).toBeFocused();
    const initial = await probe(page); await page.keyboard.press('ArrowLeft'); await settle(page); const orbit = await probe(page);
    expect(orbit.camera.position).not.toEqual(initial.camera.position); expect(resources(orbit)).toEqual(resources(initial)); expect(preserved(orbit.state)).toEqual(saved);
    await control(page, 'Supporting hand close-up', true);
  }
  await selectPose(page, 2); await expect(page.getByRole('button', { name: 'Supporting hand close-up', exact: true })).toBeDisabled();
  await selectPose(page, 5); await control(page, 'Supporting hand close-up', keyboard); fitted(await probe(page));
  await audit(page, prefix + '-final'); await release(page);
  await replaySupportingCameras(page, age, width, captured);
}
for (const age of ['adult', 'child']) test(age + ' supporting-hand inspection enlarges contact and preserves poses and saved observations', async ({ page }) => {
  await workflow(page, age, 1280, false);
});
test('320px infant supporting-hand inspection preserves keyboard cameras resize contrast and teardown', async ({ page }) => {
  await workflow(page, 'infant', 320, true);
});
