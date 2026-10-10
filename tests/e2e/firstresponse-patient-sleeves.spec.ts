import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

// Supplying a saved pre-change source runs only the six matched recovery captures.
// It bypasses new sleeve assertions and leaves the shared runtime file untouched.
const baselineSource = process.env.FIRST_RESPONSE_SLEEVES_BASELINE_SOURCE;
const baselineScript = baselineSource ? readFileSync(baselineSource, 'utf8') : null;
const report = process.env.FIRST_RESPONSE_SLEEVES_REPORT || 'reports/firstresponse-patient-sleeves' + (baselineSource ? '/before-recovery' : '');
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const metrics: Record<string, unknown>[] = [];
const browserErrors = new WeakMap<Page, string[]>();
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__sleeveDraws = new WeakMap();
    var SleeveRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(SleeveRenderer, { construct:function (target,args,newTarget) {
      var renderer=Reflect.construct(target,args,newTarget), render=renderer.render;
      renderer.render=function (scene,camera) {
        var result=render.apply(this,arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')) {
          var previous=window.__sleeveDraws.get(this.domElement);
          window.__sleeveDraws.set(this.domElement,{scene:scene,camera:camera,sequence:(previous?previous.sequence:0)+1});
        } return result;
      }; return renderer;
    }});
    window.__patientSleeves=function () {
      var canvas=document.querySelector('#wrap canvas'), drawn=canvas && window.__sleeveDraws.get(canvas);
      var record=canvas && window.__glRecorder.forCanvas(canvas);
      if (!drawn || !record) return null;
      var scene=drawn.scene, camera=drawn.camera;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      function visible(mesh) { for (var p=mesh;p;p=p.parent) if (!p.visible) return false; return true; }
      function vertex(mesh,index) { return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,index).applyMatrix4(mesh.matrixWorld); }
      function summary(mesh) {
        var geometry=mesh.geometry, positions=geometry.attributes.position, normals=geometry.attributes.normal;
        var min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity], worldMin=min.slice(), worldMax=max.slice();
        var invalid=0, invalidNormals=0, normalError=0, hash=2166136261;
        var available=geometry.index ? geometry.index.count : positions.count;
        var drawStart=Math.max(0,geometry.drawRange.start), drawEnd=Math.min(available,drawStart+geometry.drawRange.count), drawnVertices=[];
        var visited=new Set();
        for(var offset=drawStart;offset<drawEnd;offset++) {
          var vi=geometry.index ? geometry.index.getX(offset) : offset;
          if(!visited.has(vi)){visited.add(vi);drawnVertices.push(vi);}
        }
        for (var vertexAt=0;vertexAt<drawnVertices.length;vertexAt++) {
          var i=drawnVertices[vertexAt];
          var world=vertex(mesh,i), point=world.clone().project(camera).toArray(), coords=world.toArray();
          if (!point.concat(coords).every(Number.isFinite)) invalid++;
          for (var axis=0;axis<3;axis++) {
            min[axis]=Math.min(min[axis],point[axis]);max[axis]=Math.max(max[axis],point[axis]);
            worldMin[axis]=Math.min(worldMin[axis],coords[axis]);worldMax[axis]=Math.max(worldMax[axis],coords[axis]);
          }
          if (normals) {
            var normal=new THREE.Vector3().fromBufferAttribute(normals,i);
            if (!normal.toArray().every(Number.isFinite)) invalidNormals++;
            normalError=Math.max(normalError,Math.abs(normal.length()-1));
          }
        }
        [positions.array,normals && normals.array,geometry.index && geometry.index.array].filter(Boolean).forEach(function (array) {
          var bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
          for (var j=0;j<bytes.length;j++) hash=Math.imul(hash^bytes[j],16777619);
        });
        return {name:mesh.name,min:min,max:max,worldMin:worldMin,worldMax:worldMax,vertices:positions.count,
          invalid:invalid,invalidNormals:invalidNormals,normalError:normalError,normals:normals?normals.count:0,
          renderedVertices:drawnVertices.length,drawRange:{start:drawStart,count:drawEnd-drawStart},
          fingerprint:('00000000'+(hash>>>0).toString(16)).slice(-8),flat:mesh.material.type==='MeshBasicMaterial',
          visible:visible(mesh),material:mesh.material.name || '',color:mesh.material.color.getHexString()};
      }
      function endpoints(mesh) {
        var length=mesh.geometry.parameters.height;
        return [new THREE.Vector3(0,-length/2,0).applyMatrix4(mesh.matrixWorld),new THREE.Vector3(0,length/2,0).applyMatrix4(mesh.matrixWorld)];
      }
      var sleeves=[],limbs=[],patientParts=[],rescuerParts=[],hands=[];
      ['left','right'].forEach(function (side) {
        var prefix='fr-patient-'+side, sleeve=scene.getObjectByName(prefix+'-sleeve');
        var upper=scene.getObjectByName(prefix+'-upper-arm'), forearm=scene.getObjectByName(prefix+'-forearm');
        var elbow=scene.getObjectByName(prefix+'-elbow'), hand=scene.getObjectByName(prefix+'-hand');
        var ends=endpoints(upper), distal=endpoints(forearm), scale=upper.getWorldScale(new THREE.Vector3()).x;
        var params=sleeve.geometry.parameters || {}, segments=params.radialSegments;
        var data=summary(sleeve), outer=[],inner=[],gaps=[],thickness=[],missingHits=0;
        var metadata=Number.isInteger(segments) && Number.isInteger(params.cuffOuterStart) && Number.isInteger(params.cuffInnerStart);
        data.metadata=metadata; data.scale=scale; data.parameters=params;
        if (metadata) {
          for (var i=0;i<segments;i++) { outer.push(vertex(sleeve,params.cuffOuterStart+i));inner.push(vertex(sleeve,params.cuffInnerStart+i)); }
          var center=new THREE.Vector3();inner.forEach(function (p) { center.add(p); });center.multiplyScalar(1/segments);
          var expected=ends[0].clone().lerp(ends[1],params.cuffFraction), axis=ends[1].clone().sub(ends[0]).normalize();
          var innerRadii=inner.map(function(p){return p.distanceTo(center)/scale;}), outerRadii=outer.map(function(p){return p.distanceTo(center)/scale;});
          var planeError=0;
          inner.concat(outer).forEach(function(p){planeError=Math.max(planeError,Math.abs(p.clone().sub(center).dot(axis))/scale);});
          for (var i=0;i<segments;i++) {
            thickness.push(outer[i].distanceTo(center)/scale-inner[i].distanceTo(center)/scale);
            // Include edge midpoints: an inscribed polygon can cut skin even when every vertex clears it.
            [inner[i],inner[i].clone().lerp(inner[(i+1)%segments],.5)].forEach(function (point) {
              var radial=point.clone().sub(center), direction=radial.clone().normalize();
              var hit=new THREE.Raycaster(point.clone().addScaledVector(direction,scale),direction.clone().negate()).intersectObject(upper,false)[0];
              if (!hit) missingHits++;
              else gaps.push((radial.length()-hit.point.distanceTo(center))/scale);
            });
          }
          var index=sleeve.geometry.index, cuffTriangles=0, fanTriangles=0;
          if (index) for (var t=sleeve.geometry.drawRange.start;t<Math.min(index.count,sleeve.geometry.drawRange.start+sleeve.geometry.drawRange.count);t+=3) {
            var tri=[vertex(sleeve,index.getX(t)),vertex(sleeve,index.getX(t+1)),vertex(sleeve,index.getX(t+2))];
            if (tri.every(function(p){return Math.abs(p.clone().sub(center).dot(axis))/scale<.00001;})) {
              cuffTriangles++;
              if (tri.some(function(p){return p.distanceTo(center)/scale<Math.min.apply(null,innerRadii)-.00001;})) fanTriangles++;
            }
          }
          data.cuff={center:center.toArray(),centerError:center.distanceTo(expected)/scale,planeError:planeError,
            innerRadii:innerRadii,outerRadii:outerRadii,thickness:thickness,gaps:gaps,missingHits:missingHits,
            triangles:cuffTriangles,fanTriangles:fanTriangles,innerProjection:inner.map(function(p){return p.clone().project(camera).toArray();})};
        }
        sleeves.push(data);
        limbs.push({side:side,scale:scale,shoulder:ends[0].toArray(),elbow:ends[1].toArray(),wrist:distal[1].toArray(),
          upperLength:ends[0].distanceTo(ends[1])/scale,forearmLength:distal[0].distanceTo(distal[1])/scale,
          elbowGap:ends[1].distanceTo(distal[0])/scale,elbowJointGap:ends[1].distanceTo(elbow.getWorldPosition(new THREE.Vector3()))/scale,
          wristGap:distal[1].distanceTo(hand.getWorldPosition(new THREE.Vector3()))/scale,
          upperDrawRange:{start:upper.geometry.drawRange.start,count:upper.geometry.drawRange.count},
          upperGroups:upper.geometry.groups,upperIndices:upper.geometry.index.count,
          palmNormal:new THREE.Vector3(0,1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())).toArray()});
      });
      var arms=scene.getObjectByName('fr-patient-arms');
      arms.traverse(function(mesh){if(mesh.isMesh && visible(mesh))patientParts.push(summary(mesh));});
      ['lower','upper'].forEach(function(side){
        var hand=scene.getObjectByName('fr-rescuer-'+side);if(!hand || !visible(hand))return;
        hands.push(side);hand.traverse(function(mesh){
          if(mesh.isMesh && visible(mesh) && /^fr-rescuer-(lower|upper)-(palm|heel|wrist-bridge|finger-[0-3]-surface|thumb-surface|nail-[0-3]|thumb-nail)$/.test(mesh.name))rescuerParts.push(summary(mesh));
        });
      });
      var heel=scene.getObjectByName('fr-rescuer-lower-heel'), contactGap=null;
      if(heel && hands.length){
        var center=heel.getWorldPosition(new THREE.Vector3()), heelBox=new THREE.Box3().setFromObject(heel);
        var hit=new THREE.Raycaster(new THREE.Vector3(center.x,center.y+2,center.z),new THREE.Vector3(0,-1,0)).intersectObject(scene.getObjectByName('fr-manikin-torso'),false)[0];
        contactGap=hit ? heelBox.min.y-hit.point.y : null;
      }
      return {sleeves:sleeves,limbs:limbs,patientParts:patientParts,rescuerParts:rescuerParts,hands:hands,contactGap:contactGap,
        camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),
          direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
        canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
        draw:{id:record.id,draws:record.draws,renders:record.renders,sequence:drawn.sequence,createdBy:record.createdBy},
        state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 600000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { writeFileSync(report + '/sleeve-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1280, age = 'adult') {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (baselineScript) await page.route('**/stem_lab/stem_tool_firstresponse.js', route => route.fulfill({
    status: 200, contentType: 'application/javascript', body: baselineScript,
  }));
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth', b3dAge: age,
    b3dChildHands: 'two', b3dPlaced: 'correct', b3dRec: completed, b3dRecView: 2, b3dRecoveryGuides: false,
    b3dDepthLab: { age, depth: age === 'adult' ? 5.5 : 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
    b3dDepthReference: { age, depth: age === 'adult' ? 5.5 : 5, lean: 0 },
    b3dDepthInquiry: { signature: 'sleeve-visual-preservation', explanation: 'Keep my observation.' } } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  await settle(page);
}
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__sleeveDraws.get(canvas)?.sequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__sleeveDraws.get(canvas);
    return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  }, previous);
}
async function probe(page: Page): Promise<any> {
  const value = await page.waitForFunction(() => (window as any).__patientSleeves());
  try { return await value.jsonValue(); } finally { await value.dispose(); }
}
async function update(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(p => (window as any).__ctx.updateMulti('firstResponse', p), patch); await settle(page);
}
async function control(page: Page, name: string, keyboard = false) {
  const before = await probe(page), button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); }
  else await button.click();
  await settle(page);
  const after = await probe(page); expect(after.state, name + ' only changes the camera').toEqual(before.state);
  unchangedPatient(before, after); return after;
}
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, index) => value - b[index]));
function framed(parts: any[]) {
  expect(parts.length).toBeGreaterThan(0);
  for (const part of parts) {
    expect(part.invalid, part.name).toBe(0);
    for (const axis of [0, 1]) { expect(part.min[axis], part.name).toBeGreaterThan(-.995); expect(part.max[axis], part.name).toBeLessThan(.995); }
    expect(part.min[2], part.name).toBeGreaterThan(-1); expect(part.max[2], part.name).toBeLessThan(1);
  }
}
function valid(pose: any, contrast = false) {
  expect(pose.sleeves.map((s: any) => s.name)).toEqual(['fr-patient-left-sleeve', 'fr-patient-right-sleeve']);
  for (const sleeve of pose.sleeves) {
    expect(sleeve.visible, sleeve.name).toBe(true); expect(sleeve.invalid, sleeve.name).toBe(0);
    expect(sleeve.renderedVertices).toBeGreaterThan(0);
    expect(sleeve.normals).toBe(sleeve.vertices); expect(sleeve.invalidNormals).toBe(0); expect(sleeve.normalError).toBeLessThan(.0001);
    expect(sleeve.flat).toBe(contrast); expect(sleeve.metadata, 'cuff metadata identifies actual drawn vertices').toBe(true);
    expect(sleeve.parameters.cuffFraction).toBe(.42);
    const cuff = sleeve.cuff;
    expect(cuff.centerError, sleeve.name + ' keeps the original cuff position').toBeLessThan(.00001);
    expect(cuff.planeError).toBeLessThan(.00001); expect(cuff.missingHits).toBe(0);
    expect(cuff.gaps).toHaveLength(sleeve.parameters.radialSegments * 2);
    expect(Math.min(...cuff.gaps), sleeve.name + ' vertices and edge midpoints clear the actual arm').toBeGreaterThan(.0001);
    expect(Math.max(...cuff.gaps), sleeve.name + ' cuff stays close to the skin').toBeLessThan(.02);
    expect(Math.min(...cuff.thickness)).toBeGreaterThan(.002); expect(Math.max(...cuff.thickness)).toBeLessThan(.012);
    expect(cuff.triangles, 'annular cuff faces are present').toBeGreaterThanOrEqual(sleeve.parameters.radialSegments * 2);
    expect(cuff.fanTriangles, 'no cuff face cuts through the arm').toBe(0);
  }
  for (const limb of pose.limbs) {
    expect(limb.upperLength).toBeGreaterThan(.2); expect(limb.forearmLength).toBeGreaterThan(.2);
    expect(limb.elbowGap).toBeLessThan(.000001); expect(limb.elbowJointGap).toBeLessThan(.000001); expect(limb.wristGap).toBeLessThan(.000001);
    expect(limb.upperGroups).toHaveLength(3);
    expect(limb.upperDrawRange, 'only the proximal shoulder disk is excluded').toEqual({ start: 0, count: limb.upperGroups[2].start });
    expect(limb.upperDrawRange.count).toBe(limb.upperGroups[1].start + limb.upperGroups[1].count);
    expect(limb.upperDrawRange.count).toBeLessThan(limb.upperIndices);
  }
  for (const part of pose.patientParts) expect(part.invalid, part.name).toBe(0);
  expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2); expect(pose.errors).toEqual([]);
}
function contact(pose: any, count: number, contrast = false) {
  valid(pose, contrast); expect(pose.hands).toHaveLength(count); expect(pose.rescuerParts).toHaveLength(13 * count);
  framed(pose.rescuerParts); expect(pose.contactGap).not.toBeNull(); expect(Math.abs(pose.contactGap)).toBeLessThan(.00001);
}
function unchangedPatient(before: any, after: any) {
  expect(after.limbs).toEqual(before.limbs);
  expect(after.patientParts.map((part: any) => [part.name, part.fingerprint, part.drawRange, part.worldMin, part.worldMax]))
    .toEqual(before.patientParts.map((part: any) => [part.name, part.fingerprint, part.drawRange, part.worldMin, part.worldMax]));
}
function sameDirection(before: any, after: any) {
  for (let axis = 0; axis < 3; axis++) expect(after.camera.direction[axis]).toBeCloseTo(before.camera.direction[axis], 7);
}
const learning = (state: any) => ({ rec: state.b3dRec, depth: state.b3dDepthLab, inquiry: state.b3dDepthInquiry,
  reference: state.b3dDepthReference, placed: state.b3dPlaced, hands: state.b3dChildHands });
function record(name: string, pose: any) { const { state, ...geometry } = pose; metrics.push({ name, ...geometry }); }
async function capture(page: Page, name: string) {
  const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  await page.screenshot({ path: report + '/' + name + '.png', clip: clip!, timeout: 60000 });
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect(browserErrors.get(page)).toEqual([]);
}
async function release(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
}
async function recoveryPoses(page: Page, age: string, phone = false) {
  const preserved = learning((await probe(page)).state);
  const lengths: Record<string, number[]> = {};
  for (const pose of [2, 4, 5, 8]) {
    await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
    const arms = await control(page, 'Hands + arms', phone); valid(arms); framed(arms.patientParts);
    expect(learning(arms.state)).toEqual(preserved);
    for (const limb of arms.limbs) {
      if (!lengths[limb.side]) lengths[limb.side] = [limb.upperLength, limb.forearmLength];
      expect(limb.upperLength).toBeCloseTo(lengths[limb.side][0], 6); expect(limb.forearmLength).toBeCloseTo(lengths[limb.side][1], 6);
    }
    expect(arms.limbs[0].palmNormal[1], 'near palm remains facing up across the turn').toBeGreaterThan(.98);
    record(age + '-recovery-' + pose, arms);
    if (pose === 4 || pose === 5) await capture(page, (phone ? 'phone-' : '') + age + '-recovery-' + (pose === 4 ? 'before-turn' : 'after-turn'));
  }
}

test('patient cloth sleeves clear the arms across ages while contact cameras and adult recovery remain stable', async ({ page }) => {
  test.skip(!!baselineSource, 'Saved baseline source uses the capture-only workflow.');
  await mount(page);
  const initial = await page.locator('#wrap canvas').elementHandle();
  for (const [age, label, count] of [['adult', /^Adult —/, 2], ['child', /^Child —/, 2], ['infant', /^Infant —/, 1]] as const) {
    if (age !== 'adult') { await page.getByRole('button', { name: label }).click(); await settle(page); }
    if (age === 'child') { await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check(); await settle(page); }
    const oblique = await control(page, 'Hand contact close-up'); contact(oblique, count);
    record(age + '-standard-oblique', oblique); await capture(page, age + '-standard-oblique');
    if (age === 'adult') {
      const side = await control(page, 'Heel side view'); contact(side, 2); await capture(page, 'adult-standard-side');
      await page.getByRole('button', { name: 'Show release', exact: true }).click(); await settle(page);
      const rest = await probe(page); contact(rest, 2); expect(rest.camera).toEqual(side.camera); unchangedPatient(side, rest);
      await page.getByRole('button', { name: 'Show compression', exact: true }).click(); await settle(page);
      const peak = await probe(page); contact(peak, 2); expect(peak.camera).toEqual(rest.camera); unchangedPatient(rest, peak);
      expect(peak.rescuerParts[0].worldMin).not.toEqual(rest.rescuerParts[0].worldMin);
      for (const key of ['b3dDepthInquiry', 'b3dDepthReference', 'b3dRec', 'b3dPlaced']) expect(peak.state[key]).toEqual(side.state[key]);
      record('adult-stable-side-phase', peak);
    }
  }
  await page.getByRole('tab', { name: /Recovery position/ }).click(); await settle(page);
  // The recovery panel has no age selector; use the same host preference API as its parent lesson.
  await update(page, { b3dAge: 'adult' }); await recoveryPoses(page, 'adult');
  expect(await initial!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await audit(page); await release(page);
});

test('phone child and infant sleeves stay clear across recovery poses resizing contrast and teardown', async ({ page }) => {
  test.skip(!!baselineSource, 'Saved baseline source uses the capture-only workflow.');
  await mount(page, 320, 'child');
  const initial = await page.locator('#wrap canvas').elementHandle();
  const oblique = await control(page, 'Hand contact close-up', true); contact(oblique, 2);
  record('phone-child-standard-oblique', oblique); await capture(page, 'phone-child-standard-oblique');
  const side = await control(page, 'Heel side view', true); contact(side, 2); await capture(page, 'phone-child-standard-side');
  const saved = learning(side.state);
  await page.setViewportSize({ width: 760, height: 840 }); await settle(page);
  const wider = await probe(page); contact(wider, 2); sameDirection(side, wider); expect(learning(wider.state)).toEqual(saved); unchangedPatient(side, wider);
  await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  const narrow = await probe(page); contact(narrow, 2); sameDirection(side, narrow); expect(learning(narrow.state)).toEqual(saved);
  expect(distance(narrow.camera.position, side.camera.position)).toBeLessThan(.000001);
  await page.getByRole('tab', { name: /Recovery position/ }).click(); await settle(page);
  await recoveryPoses(page, 'child', true);
  await update(page, { b3dAge: 'infant' }); await recoveryPoses(page, 'infant', true);
  const standard = await probe(page); expect(learning(standard.state)).toEqual(saved);
  await audit(page);
  await page.emulateMedia({ forcedColors: 'active' });
  const forced = await control(page, 'Hands + arms', true); valid(forced); framed(forced.patientParts);
  expect(learning(forced.state)).toEqual(saved); await audit(page);
  expect(await initial!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await page.emulateMedia({ forcedColors: 'none' });
  const oldCanvas = await page.locator('#wrap canvas').elementHandle();
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  const contrast = await control(page, 'Hands + arms', true); valid(contrast, true); framed(contrast.patientParts);
  expect(learning(contrast.state)).toEqual(saved); unchangedPatient(standard, contrast);
  await expect.poll(async () => oldCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  record('phone-infant-recovery-app-contrast', contrast); await capture(page, 'phone-infant-recovery-app-contrast');
  await audit(page); await release(page);
});

test('capture matched recovery views from an optional saved baseline source', async ({ page }) => {
  test.skip(!baselineSource, 'Set FIRST_RESPONSE_SLEEVES_BASELINE_SOURCE to a saved pre-change runtime for baseline captures.');
  await mount(page);
  await page.getByRole('tab', { name: /Recovery position/ }).click(); await settle(page);
  for (const age of ['adult', 'child', 'infant']) {
    if (age === 'child') { await page.setViewportSize({ width: 320, height: 840 }); await settle(page); }
    await update(page, { b3dAge: age });
    for (const pose of [4, 5]) {
      await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
      const drawn = await control(page, 'Hands + arms', age !== 'adult');
      expect(drawn.draw.createdBy).toBe('page'); expect(drawn.draw.draws).toBeGreaterThan(0); expect(drawn.errors).toEqual([]);
      const name = (age === 'adult' ? '' : 'phone-') + age + '-recovery-' + (pose === 4 ? 'before-turn' : 'after-turn');
      record('baseline-' + name, drawn); await capture(page, name);
    }
  }
  await release(page);
});
