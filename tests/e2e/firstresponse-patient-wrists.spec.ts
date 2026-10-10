import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const baselinePath = process.env.FIRST_RESPONSE_WRISTS_BASELINE_SOURCE;
const baselineSource = baselinePath ? readFileSync(baselinePath, 'utf8') : null;
const report = process.env.FIRST_RESPONSE_WRISTS_REPORT || 'reports/firstresponse-patient-wrists' + (baselinePath ? '/before' : '');
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const metrics: Record<string, unknown>[] = [];
const browserErrors = new WeakMap<Page, string[]>();
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__wristDraws=new WeakMap();
    var WristRenderer=THREE.WebGLRenderer;
    THREE.WebGLRenderer=new Proxy(WristRenderer,{construct:function(target,args,newTarget){
      var renderer=Reflect.construct(target,args,newTarget),render=renderer.render;
      renderer.render=function(scene,camera){
        var result=render.apply(this,arguments);
        if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){
          var previous=window.__wristDraws.get(this.domElement);
          window.__wristDraws.set(this.domElement,{scene:scene,camera:camera,sequence:(previous?previous.sequence:0)+1});
        } return result;
      };return renderer;
    }});
    window.__patientWrists=function(){
      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__wristDraws.get(canvas),record=canvas && window.__glRecorder.forCanvas(canvas);
      if(!drawn || !record)return null;
      var scene=drawn.scene,camera=drawn.camera;
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      function visible(mesh){for(var p=mesh;p;p=p.parent)if(!p.visible)return false;return true;}
      function point(mesh,index){return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,index).applyMatrix4(mesh.matrixWorld);}
      function summary(mesh){
        var geometry=mesh.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal;
        var available=geometry.index?geometry.index.count:position.count,start=geometry.drawRange.start,end=Math.min(available,start+geometry.drawRange.count);
        var visited=new Set(),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],invalid=0,normalError=0,hash=2166136261;
        for(var offset=start;offset<end;offset++){
          var i=geometry.index?geometry.index.getX(offset):offset;if(visited.has(i))continue;visited.add(i);
          var world=point(mesh,i),projected=world.clone().project(camera).toArray();
          if(!world.toArray().concat(projected).every(Number.isFinite))invalid++;
          for(var axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],projected[axis]);max[axis]=Math.max(max[axis],projected[axis]);}
          if(normal){var n=new THREE.Vector3().fromBufferAttribute(normal,i);if(!n.toArray().every(Number.isFinite))invalid++;normalError=Math.max(normalError,Math.abs(n.length()-1));}
        }
        [position.array,normal && normal.array,geometry.index && geometry.index.array].filter(Boolean).forEach(function(array){
          var bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);for(var j=0;j<bytes.length;j++)hash=Math.imul(hash^bytes[j],16777619);
        });
        return {name:mesh.name,min:min,max:max,vertices:position.count,renderedVertices:visited.size,indices:geometry.index?geometry.index.count:0,
          invalid:invalid,normalError:normalError,fingerprint:('00000000'+(hash>>>0).toString(16)).slice(-8),
          matrix:mesh.matrixWorld.elements.slice(),drawRange:{start:start,count:end-start},flat:mesh.material.type==='MeshBasicMaterial'};
      }
      function coverage(center,samples,meshes,scale){
        var gaps=[],missing=0,fallbackAttempts=0,fallbacks=0,fallbackMinGap=null;
        samples.forEach(function(sample){
          var radial=sample.clone().sub(center),radius=radial.length(),direction=radius>1e-12?radial.clone().normalize():new THREE.Vector3(1,0,0);
          // The cap center is inside the connected wrist/palm union. Entry rays
          // in the actual cap plane inspect its drawn, already-folded surface.
          var origin=center.clone().addScaledVector(direction,scale),inward=direction.clone().negate();
          var hits=new THREE.Raycaster(origin,inward).intersectObjects(meshes,false);
          if(hits.length){gaps.push((hits[0].point.clone().sub(center).dot(direction)-radius)/scale);return;}
          // A transformed ray can land exactly on a triangulation seam. Only a
          // missing primary hit permits two tiny, opposite parallel rays. Both
          // must hit; keep the worse gap against the exact original sample.
          fallbackAttempts++;
          var basis=Math.abs(direction.x)<.8?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
          var offset=new THREE.Vector3().crossVectors(direction,basis).normalize().multiplyScalar(1e-6*scale);
          var plus=new THREE.Raycaster(origin.clone().add(offset),inward).intersectObjects(meshes,false);
          var minus=new THREE.Raycaster(origin.clone().sub(offset),inward).intersectObjects(meshes,false);
          if(!plus.length || !minus.length){missing++;return;}
          var gap=Math.min(plus[0].point.clone().sub(center).dot(direction)-radius,
            minus[0].point.clone().sub(center).dot(direction)-radius)/scale;
          gaps.push(gap);fallbacks++;fallbackMinGap=fallbackMinGap===null?gap:Math.min(fallbackMinGap,gap);
        });return {gaps:gaps,missing:missing,samples:samples.length,fallbackAttempts:fallbackAttempts,fallbacks:fallbacks,fallbackMinGap:fallbackMinGap};
      }
      var arms=scene.getObjectByName('fr-patient-arms'),parts=[],wrists=[],hands={},limbs=[];
      arms.traverse(function(mesh){if(mesh.isMesh && visible(mesh))parts.push(summary(mesh));});
      ['left','right'].forEach(function(side){
        var prefix='fr-patient-'+side,wrist=scene.getObjectByName(prefix+'-wrist'),palm=scene.getObjectByName(prefix+'-palm');
        var forearm=scene.getObjectByName(prefix+'-forearm'),upper=scene.getObjectByName(prefix+'-upper-arm'),hand=scene.getObjectByName(prefix+'-hand');
        var length=forearm.geometry.parameters.height,scale=forearm.getWorldScale(new THREE.Vector3()).x;
        var start=new THREE.Vector3(0,-length/2,0).applyMatrix4(forearm.matrixWorld),center=new THREE.Vector3(0,length/2,0).applyMatrix4(forearm.matrixWorld);
        var axis=center.clone().sub(start).normalize(),position=forearm.geometry.attributes.position,seen={},ring=[];
        for(var i=0;i<position.count;i++){
          var local=new THREE.Vector3().fromBufferAttribute(position,i);
          if(Math.abs(local.y-length/2)>1e-6 || Math.hypot(local.x,local.z)<1e-6)continue;
          var key=[local.x,local.z].map(function(v){return Math.round(v*1e7);}).join(',');
          if(seen[key])continue;seen[key]=true;ring.push({angle:Math.atan2(local.z,local.x),point:local.applyMatrix4(forearm.matrixWorld)});
        }
        ring.sort(function(a,b){return a.angle-b.angle;});
        var samples=[];ring.forEach(function(item,index){
          var next=ring[(index+1)%ring.length].point;
          samples.push(item.point,item.point.clone().lerp(next,.5),item.point.clone().add(next).add(center).multiplyScalar(1/3));
        });
        var data=summary(wrist),params=wrist.geometry.parameters || {};
        data.side=side;data.parameters=params;data.scale=scale;data.position=wrist.position.toArray();data.localScale=wrist.scale.toArray();data.quaternion=wrist.quaternion.toArray();
        data.cap=coverage(center,samples,[wrist,palm],scale);data.cap.rimVertices=ring.length;
        data.metadata=['radialSegments','ringCount','rootRing','jointRing','palmRing'].every(function(key){return Number.isInteger(params[key]);});
        if(data.metadata){
          function row(index){var points=[];for(var j=0;j<params.radialSegments;j++)points.push(point(wrist,index*params.radialSegments+j));return points;}
          var root=row(params.rootRing),end=row(params.palmRing),joint=row(params.jointRing),rootGaps=[],rootMissing=0;
          var rootFallbackAttempts=0,rootFallbacks=0,rootFallbackMinGap=null;
          root.forEach(function(p){
            var axisPoint=start.clone().addScaledVector(axis,p.clone().sub(start).dot(axis));
            var result=coverage(axisPoint,[p],[forearm],scale);rootGaps=rootGaps.concat(result.gaps);rootMissing+=result.missing;
            rootFallbackAttempts+=result.fallbackAttempts;rootFallbacks+=result.fallbacks;
            if(result.fallbackMinGap!==null)rootFallbackMinGap=rootFallbackMinGap===null?result.fallbackMinGap:Math.min(rootFallbackMinGap,result.fallbackMinGap);
          });
          data.root={gaps:rootGaps,missing:rootMissing,fallbackAttempts:rootFallbackAttempts,fallbacks:rootFallbacks,fallbackMinGap:rootFallbackMinGap};
          data.palmEnd=coverage(palm.getWorldPosition(new THREE.Vector3()),end,[palm],scale);
          var average=new THREE.Vector3();joint.forEach(function(p){average.add(p);});average.multiplyScalar(1/joint.length);
          data.jointCenterError=average.distanceTo(center)/scale;
        }
        wrists.push(data);
        var handParts=[];hand.traverse(function(mesh){if(mesh.isMesh && visible(mesh))handParts.push(summary(mesh));});hands[side]=handParts;
        var upperEnd=new THREE.Vector3(0,upper.geometry.parameters.height/2,0).applyMatrix4(upper.matrixWorld);
        limbs.push({side:side,upperLength:upper.geometry.parameters.height,forearmLength:length,
          elbowGap:upperEnd.distanceTo(start)/scale,wristGap:center.distanceTo(hand.getWorldPosition(new THREE.Vector3()))/scale,
          handMatrix:hand.matrixWorld.elements.slice(),palmNormal:new THREE.Vector3(0,1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())).toArray()});
      });
      var near=scene.getObjectByName('fr-patient-left-hand'),bounds=scene.getObjectByName('fr-palm-bounds'),alignment=null,normalDot=null;
      if(bounds){
        var rotation=near.getWorldQuaternion(new THREE.Quaternion()),normal=new THREE.Vector3(0,1,0).applyQuaternion(rotation),forward=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
        var view=camera.getWorldPosition(new THREE.Vector3()).sub(bounds.getWorldPosition(new THREE.Vector3())).normalize();
        normalDot=view.dot(normal);alignment=view.dot(normal.clone().addScaledVector(forward,.12).addScaledVector(new THREE.Vector3().crossVectors(normal,forward),.3).normalize());
      }
      return {wrists:wrists,hands:hands,parts:parts,limbs:limbs,alignment:alignment,normalDot:normalDot,
        camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),
          quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
        canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
        draw:{id:record.id,draws:record.draws,renders:record.renders,sequence:drawn.sequence,createdBy:record.createdBy},
        state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 600000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { writeFileSync(report + '/wrist-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, age: string, width = 1280) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (baselineSource) await page.route('**/stem_lab/stem_tool_firstresponse.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: baselineSource }));
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'recovery', b3dAge: age,
    b3dRec: completed, b3dRecView: 2, b3dRecoveryGuides: false, b3dChildHands: 'two', b3dPlaced: 'correct',
    b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
    b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
    b3dDepthInquiry: { signature: 'wrist-inspection-retained', explanation: 'Keep the saved observation.' } } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' }); await settle(page);
}
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__wristDraws.get(canvas)?.sequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__wristDraws.get(canvas);
    return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  }, previous);
}
async function probe(page: Page): Promise<any> {
  const handle = await page.waitForFunction(() => (window as any).__patientWrists());
  try { return await handle.jsonValue(); } finally { await handle.dispose(); }
}
const preserved = (state: any) => ({ rec: state.b3dRec, depth: state.b3dDepthLab, reference: state.b3dDepthReference,
  inquiry: state.b3dDepthInquiry, hands: state.b3dChildHands, placed: state.b3dPlaced });
const geometry = (pose: any) => pose.parts.map((part: any) => [part.name, part.fingerprint, part.matrix, part.drawRange]);
async function control(page: Page, name: string, keyboard = false) {
  const before = await probe(page), button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); }
  else await button.click();
  await settle(page); const after = await probe(page);
  expect(after.state).toEqual(before.state); expect(geometry(after)).toEqual(geometry(before)); expect(after.limbs).toEqual(before.limbs);
  return after;
}
function framed(parts: any[]) {
  expect(parts.length).toBeGreaterThan(0);
  for (const part of parts) {
    expect(part.invalid, part.name).toBe(0);
    for (const axis of [0, 1]) { expect(part.min[axis], part.name).toBeGreaterThan(-.995); expect(part.max[axis], part.name).toBeLessThan(.995); }
    expect(part.min[2], part.name).toBeGreaterThan(-1); expect(part.max[2], part.name).toBeLessThan(1);
  }
}
function valid(pose: any, contrast = false) {
  expect(pose.wrists).toHaveLength(2);
  for (const wrist of pose.wrists) {
    expect(wrist.invalid, wrist.name).toBe(0); expect(wrist.normalError).toBeLessThan(.0001); expect(wrist.flat).toBe(contrast);
    expect(wrist.metadata, 'numeric ring metadata identifies the drawn connector').toBe(true);
    expect(wrist.position).toEqual([0, 0, .015]); expect(wrist.localScale).toEqual([.048, .04, .055]); expect(wrist.quaternion).toEqual([0, 0, 0, 1]);
    const p = wrist.parameters;
    expect(wrist.vertices).toBe(p.radialSegments * p.ringCount);
    expect(wrist.indices, 'both connector ends are open and buried').toBe((p.ringCount - 1) * p.radialSegments * 6);
    expect(wrist.cap.rimVertices).toBeGreaterThanOrEqual(24); expect(wrist.cap.samples).toBe(wrist.cap.rimVertices * 3);
    expect(wrist.cap.missing).toBe(0);
    expect(Math.min(...wrist.cap.gaps), wrist.name + ' covers actual forearm rim, edge midpoints and cap interiors after the fold').toBeGreaterThan(.00005);
    expect(wrist.root.missing).toBe(0); expect(Math.min(...wrist.root.gaps), 'root is buried in the unchanged forearm').toBeGreaterThan(.00001);
    expect(wrist.palmEnd.missing).toBe(0); expect(Math.min(...wrist.palmEnd.gaps), 'open palm end is buried in the actual palm').toBeGreaterThan(.00001);
    expect(wrist.jointCenterError).toBeLessThan(.001);
  }
  for (const limb of pose.limbs) { expect(limb.elbowGap).toBeLessThan(.000001); expect(limb.wristGap).toBeLessThan(.000001); }
  expect(pose.limbs[0].palmNormal[1]).toBeGreaterThan(.98);
  for (const part of pose.parts) expect(part.invalid, part.name).toBe(0);
  expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2); expect(pose.errors).toEqual([]);
}
function palmFramed(pose: any) { framed(pose.hands.left); expect(pose.normalDot).toBeGreaterThan(.92); expect(pose.alignment).toBeGreaterThan(.9999); }
function record(name: string, pose: any) { const { state, ...drawn } = pose; metrics.push({ name, ...drawn }); }
async function capture(page: Page, name: string) {
  const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  await page.screenshot({ path: report + '/' + name + '.png', clip: clip!, timeout: 60000 });
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect(browserErrors.get(page)).toEqual([]);
}
async function release(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
}
async function poses(page: Page, age: string, keyboard = false) {
  const saved = preserved((await probe(page)).state), lengths: Record<string, number[]> = {};
  const prefix = age === 'infant' ? 'phone-infant' : age;
  for (const pose of [2, 3, 5, 8]) {
    await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
    const arms = await control(page, 'Hands + arms', keyboard); valid(arms); framed(arms.parts); expect(preserved(arms.state)).toEqual(saved);
    for (const limb of arms.limbs) {
      if (!lengths[limb.side]) lengths[limb.side] = [limb.upperLength, limb.forearmLength];
      expect(limb.upperLength).toBeCloseTo(lengths[limb.side][0], 6); expect(limb.forearmLength).toBeCloseTo(lengths[limb.side][1], 6);
    }
    record(prefix + '-pose-' + pose + '-arms', arms);
    if (age === 'adult' && pose === 5) await capture(page, 'adult-pose-5-arms');
    const palm = await control(page, 'Palm detail view', keyboard); valid(palm); palmFramed(palm); record(prefix + '-pose-' + pose + '-palm', palm);
    if (pose === 2) await capture(page, prefix + '-pose-2-palm');
    if (pose === 5) {
      const head = await control(page, 'Head close-up', keyboard); valid(head); framed([head.wrists[1]]);
      record(prefix + '-pose-5-cheek', head); await capture(page, prefix + '-pose-5-cheek');
    }
  }
  expect(preserved((await probe(page)).state)).toEqual(saved);
}

for (const age of ['adult', 'child']) {
  test(age + ' wrists cover the actual forearm caps in recovery poses while public cameras preserve learning state', async ({ page }) => {
    test.skip(!!baselinePath, 'Saved source runs only the focused baseline captures.');
    await mount(page, age); const initial = await page.locator('#wrap canvas').elementHandle();
    await poses(page, age);
    expect(await initial!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
    await audit(page); await release(page);
  });
}
test('phone infant wrists retain pose and framing through keyboard inspection resizing contrast and cleanup', async ({ page }) => {
  test.skip(!!baselinePath, 'Saved source runs only the focused baseline captures.');
  await mount(page, 'infant', 320); const initial = await page.locator('#wrap canvas').elementHandle();
  await poses(page, 'infant', true);
  const narrow = await control(page, 'Palm detail view', true), saved = preserved(narrow.state); palmFramed(narrow);
  await page.setViewportSize({ width: 760, height: 840 }); await settle(page);
  const wide = await probe(page); valid(wide); palmFramed(wide); expect(preserved(wide.state)).toEqual(saved); expect(geometry(wide)).toEqual(geometry(narrow));
  for (let axis = 0; axis < 3; axis++) expect(wide.camera.direction[axis]).toBeCloseTo(narrow.camera.direction[axis], 7);
  await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  const restored = await probe(page); valid(restored); palmFramed(restored); expect(preserved(restored.state)).toEqual(saved);
  for (let axis = 0; axis < 3; axis++) expect(restored.camera.position[axis]).toBeCloseTo(narrow.camera.position[axis], 6);
  await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Palm detail view', true); await audit(page);
  expect(await initial!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await page.emulateMedia({ forcedColors: 'none' });
  const previous = await page.locator('#wrap canvas').elementHandle();
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  const contrast = await control(page, 'Palm detail view', true); valid(contrast, true); palmFramed(contrast);
  expect(preserved(contrast.state)).toEqual(saved); expect(geometry(contrast)).toEqual(geometry(restored));
  record('phone-infant-contrast-palm', contrast); await capture(page, 'phone-infant-contrast-palm');
  const head = await control(page, 'Head close-up', true); valid(head, true); framed([head.wrists[1]]);
  record('phone-infant-contrast-cheek', head); await capture(page, 'phone-infant-contrast-cheek');
  await expect.poll(async () => previous!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  await audit(page); await release(page);
});

test('capture five matched wrist views from an optional saved baseline source', async ({ page }) => {
  test.skip(!baselinePath, 'Set FIRST_RESPONSE_WRISTS_BASELINE_SOURCE to before.js to capture the saved runtime without new geometry assertions.');
  for (const age of ['adult', 'infant']) {
    await mount(page, age, age === 'infant' ? 320 : 1280);
    const prefix = age === 'infant' ? 'phone-infant' : age;
    const palm = await control(page, 'Palm detail view', age === 'infant');
    expect(palm.draw.createdBy).toBe('page'); record(prefix + '-pose-2-palm', palm); await capture(page, prefix + '-pose-2-palm');
    await page.getByLabel('Pose to inspect', { exact: true }).selectOption('5'); await settle(page);
    const arms = await control(page, 'Hands + arms', age === 'infant');
    if (age === 'adult') { record('adult-pose-5-arms', arms); await capture(page, 'adult-pose-5-arms'); }
    // Match the candidate's public camera sequence before the cheek close-up.
    await control(page, 'Palm detail view', age === 'infant');
    const cheek = await control(page, 'Head close-up', age === 'infant'); record(prefix + '-pose-5-cheek', cheek); await capture(page, prefix + '-pose-5-cheek');
    await release(page);
  }
});
