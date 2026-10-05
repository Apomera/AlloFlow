import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_BROW_REPORT || 'reports/firstresponse-brow-contours';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const featureNames = [
  'fr-manikin-head', 'fr-manikin-nose', 'fr-manikin-nostril-left', 'fr-manikin-nostril-right',
  'fr-manikin-upper-lip', 'fr-manikin-lower-lip', 'fr-manikin-mouth',
  'fr-manikin-eye-left', 'fr-manikin-eye-right', 'fr-manikin-upper-lid-left', 'fr-manikin-upper-lid-right',
  'fr-manikin-lower-lid-left', 'fr-manikin-lower-lid-right',
  'fr-manikin-brow-left', 'fr-manikin-brow-right', 'fr-manikin-ear-left', 'fr-manikin-ear-right',
];
const browNames = ['fr-manikin-brow-left', 'fr-manikin-brow-right'];
const metrics: Record<string, unknown>[] = [];
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__browDraws = new WeakMap();
    var BrowRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(BrowRenderer, { construct: function (target, args, newTarget) {
      var renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene, camera) {
        var result = render.apply(this, arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')) {
          var previous = window.__browDraws.get(this.domElement);
          window.__browDraws.set(this.domElement, {
            scene: scene, camera: camera, bodyRenderSequence: (previous ? previous.bodyRenderSequence : 0) + 1
          });
        }
        return result;
      };
      return renderer;
    } });
    window.__browContours = function () {
      var canvas = document.querySelector('#wrap canvas'), record = canvas && window.__glRecorder.forCanvas(canvas);
      var drawn = canvas && window.__browDraws.get(canvas);
      if (!record || !drawn) return null;
      var scene = drawn.scene, camera = drawn.camera;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      function visible(object) {
        for (var parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
        return true;
      }
      function vertices(object) {
        var points = [], depths = [], flat = true;
        if (!object || !visible(object)) return { points: points, depths: depths, flat: flat };
        object.traverse(function (mesh) {
          if (!mesh.geometry || !mesh.geometry.attributes.position || !visible(mesh)) return;
          var materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          flat = flat && materials.every(function (material) { return material && material.type === 'MeshBasicMaterial'; });
          var positions = mesh.geometry.attributes.position;
          for (var i = 0; i < positions.count; i++) {
            var world = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
            points.push(world.clone().project(camera).toArray());
            depths.push(-world.clone().applyMatrix4(camera.matrixWorldInverse).z);
          }
        });
        return { points: points, depths: depths, flat: flat };
      }
      var parts = ${JSON.stringify(featureNames)}.map(function (name) {
        var data = vertices(scene.getObjectByName(name));
        return { name: name, points: data.points, depths: data.depths, flat: data.flat };
      });
      var head = scene.getObjectByName('fr-manikin-head'), pivot = scene.getObjectByName('fr-manikin-head-pivot');
      function geometryFingerprint(geometry) {
        var hash = 2166136261;
        [geometry.attributes.position.array, geometry.attributes.normal.array, geometry.index.array].forEach(function (array) {
          var bytes = new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
          for (var i = 0; i < bytes.length; i++) hash = Math.imul(hash ^ bytes[i],16777619);
        });
        return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
      }
      var browParts = ${JSON.stringify(browNames)}.map(function (name) {
        var mesh = scene.getObjectByName(name), positions = mesh.geometry.attributes.position;
        var localCenter = new THREE.Vector3(), sample = new THREE.Vector3();
        for (var i = 0; i < positions.count; i++) localCenter.add(sample.fromBufferAttribute(positions,i));
        localCenter.divideScalar(positions.count);
        var worldCenter = localCenter.clone().applyMatrix4(mesh.matrixWorld);
        var material = mesh.material;
        var materialFingerprint = JSON.stringify({ type: material.type, color: material.color.getHex(),
          opacity: material.opacity, transparent: material.transparent, side: material.side,
          shininess: material.shininess == null ? null : material.shininess,
          specular: material.specular ? material.specular.getHex() : null });
        return { name: name, vertices: positions.count, geometryFingerprint: geometryFingerprint(mesh.geometry),
          materialFingerprint: materialFingerprint,
          parent: mesh.parent.name, localCenter: localCenter.toArray(), worldCenter: worldCenter.toArray(),
          pivotLocalCenter: worldCenter.clone().applyMatrix4(pivot.matrixWorld.clone().invert()).toArray(),
          localMatrix: mesh.matrix.elements.slice(), matrixWorld: mesh.matrixWorld.elements.slice() };
      });
      var headBox = new THREE.Box3().setFromObject(head), headBounds = [];
      for (var x of [headBox.min.x,headBox.max.x]) for (var y of [headBox.min.y,headBox.max.y]) for (var z of [headBox.min.z,headBox.max.z])
        headBounds.push(new THREE.Vector3(x,y,z).project(camera).toArray());
      var cameraPosition = camera.getWorldPosition(new THREE.Vector3());
      var headPosition = pivot.getWorldPosition(new THREE.Vector3());
      var front = new THREE.Vector3(0,1,0).transformDirection(pivot.matrixWorld);
      var right = scene.getObjectByName('fr-patient-right-hand'), palm = scene.getObjectByName('fr-patient-right-palm');
      var rightPalm = palm.getWorldPosition(new THREE.Vector3());
      var farNormal = new THREE.Vector3(0,1,0).transformDirection(right.matrixWorld);
      var back = rightPalm.clone().addScaledVector(farNormal,-palm.getWorldScale(new THREE.Vector3()).y);
      var cheekHits = new THREE.Raycaster(back,farNormal.clone().negate()).intersectObject(head,false);
      return {
        parts: parts, browParts: browParts, headBounds: headBounds,
        faceFacing: front.dot(cameraPosition.clone().sub(headPosition).normalize()),
        farCheekGap: cheekHits.length ? cheekHits[0].distance : null,
        mouthWorld: new THREE.Box3().setFromObject(scene.getObjectByName('fr-manikin-mouth')).getCenter(new THREE.Vector3()).toArray(),
        modelScale: scene.getObjectByName('fr-training-manikin').getWorldScale(new THREE.Vector3()).x,
        camera: { position: cameraPosition.toArray(), quaternion: camera.quaternion.toArray(),
          projection: camera.projectionMatrix.elements.slice(), aspect: camera.aspect, near: camera.near },
        canvasSize: [canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
        draw: { id: record.id, renders: record.renders, draws: record.draws, bodyRenderSequence: drawn.bodyRenderSequence, createdBy: record.createdBy },
        state: JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)), errors: window.__events.errors.slice()
      };
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 300000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { writeFileSync(report + '/geometry-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1280, extra: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'coach', ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  await settle(page);
}
async function probe(page: Page): Promise<any> {
  const snapshot = await page.waitForFunction(() => (window as any).__browContours());
  try { return await snapshot.jsonValue(); } finally { await snapshot.dispose(); }
}
async function settle(page: Page) {
  // Finish queued native focus scrolling before revealing the viewer it pauses offscreen.
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__browDraws.get(canvas);
    return { id: record?.id || 0, bodyRenderSequence: drawn?.bodyRenderSequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__browDraws.get(canvas);
    return record && drawn && drawn.bodyRenderSequence >= (record.id === previous.id ? previous.bodyRenderSequence + 2 : 2);
  }, previous);
}
const span = (points: number[][], axis: number) => Math.max(...points.map(p => p[axis])) - Math.min(...points.map(p => p[axis]));
const inFrame = (points: number[][]) => points.length > 0 && points.every(p => Math.abs(p[0]) < .94 && Math.abs(p[1]) < .94 && p[2] > -1 && p[2] < 1);
const range = (points: number[][]) => ({
  vertices: points.length, x: span(points, 0), y: span(points, 1),
  maxX: Math.max(...points.map(p => Math.abs(p[0]))), maxY: Math.max(...points.map(p => Math.abs(p[1]))),
  minZ: Math.min(...points.map(p => p[2])), maxZ: Math.max(...points.map(p => p[2])),
});
function framed(pose: any) {
  expect(pose.parts.map((part: any) => part.name)).toEqual(featureNames);
  expect(pose.browParts.map((part: any) => part.name)).toEqual(browNames);
  for (const part of pose.browParts) {
    expect(part.parent, part.name).toBe('fr-manikin-head-pivot');
    expect(part.localMatrix, part.name).toEqual([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
    expect(part.geometryFingerprint, part.name).toMatch(/^[0-9a-f]{8}$/);
    expect(part.vertices, part.name).toBe(2145);
    const material = JSON.parse(part.materialFingerprint);
    expect(material.opacity, part.name).toBe(1); expect(material.transparent, part.name).toBe(false);
    expect([...part.localCenter, ...part.worldCenter, ...part.pivotLocalCenter, ...part.matrixWorld]
      .every(Number.isFinite), part.name).toBe(true);
  }
  for (const part of pose.parts) {
    expect(part.points.length, part.name).toBeGreaterThan(0);
    expect(inFrame(part.points), part.name).toBe(true);
    expect(Math.min(...part.depths), part.name).toBeGreaterThan(pose.camera.near);
  }
  expect(pose.parts.reduce((count: number, part: any) => count + part.points.length, 0)).toBeGreaterThan(1500);
  expect(span(pose.headBounds, 1)).toBeGreaterThan(.5);
  expect(pose.faceFacing).toBeGreaterThan(.45);
  expect(pose.draw.createdBy).toBe('page');
  expect(pose.draw.renders).toBeGreaterThan(0); expect(pose.draw.draws).toBeGreaterThan(0);
  expect(pose.draw.bodyRenderSequence).toBeGreaterThanOrEqual(2);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2);
  expect(pose.errors).toEqual([]);
}
function recordMetric(age: string, view: string, pose: any) {
  const metric = { age, view, modelScale: pose.modelScale, faceFacing: pose.faceFacing, farCheekGap: pose.farCheekGap,
    mouthWorld: pose.mouthWorld, browParts: pose.browParts, camera: pose.camera, draw: pose.draw,
    features: pose.parts.map((part: any) => ({ name: part.name, ...range(part.points), flat: part.flat,
      minimumCameraDepth: Math.min(...part.depths) })) };
  metrics.push(metric);
  writeFileSync(report + '/geometry-' + age + '-' + view + '.json', JSON.stringify(metric, null, 2));
}
function attachedAfterHeadTurn(before: any, after: any) {
  expect(after.browParts.map((part: any) => part.name)).toEqual(before.browParts.map((part: any) => part.name));
  for (let i = 0; i < browNames.length; i++) {
    const original = before.browParts[i], turned = after.browParts[i];
    expect(turned.geometryFingerprint, turned.name).toBe(original.geometryFingerprint);
    expect(turned.materialFingerprint, turned.name).toBe(original.materialFingerprint);
    expect(turned.localCenter, turned.name).toEqual(original.localCenter);
    for (let axis = 0; axis < 3; axis++)
      expect(turned.pivotLocalCenter[axis], turned.name).toBeCloseTo(original.pivotLocalCenter[axis], 10);
    expect(turned.worldCenter, turned.name).not.toEqual(original.worldCenter);
    expect(turned.matrixWorld, turned.name).not.toEqual(original.matrixWorld);
  }
}
async function headFocus(page: Page, keyboard = false) {
  const control = page.getByRole('button', { name: 'Head close-up', exact: true });
  await expect(control).toBeEnabled();
  if (keyboard) { await control.focus(); await page.keyboard.press('Enter'); } else await control.click();
  await settle(page);
  await expect.poll(async () => (await probe(page)).faceFacing).toBeGreaterThan(.45);
  framed(await probe(page));
}
async function capture(page: Page, name: string) {
  await settle(page);
  const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  await page.screenshot({ path: report + '/' + name + '.png', clip: clip!, timeout: 60000 });
}
async function oneCanvas(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  await expect.poll(async () => (await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost).length).toBe(1);
  const active = (await harness.glContexts(page)).find(record => record.connected && record.inWrap && !record.lost)!;
  expect(active.createdBy).toBe('page'); expect(active.draws).toBeGreaterThan(0); expect(active.renders).toBeGreaterThan(0);
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect((await probe(page)).errors).toEqual([]);
}
async function released(page: Page) {
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0);
}

test('fitted brow contours stay framed for every age and follow the completed recovery pose', async ({ page }) => {
  await mount(page);
  const canvas = await page.locator('#wrap canvas').elementHandle();
  for (const [label, age] of [[/^Adult —/, 'adult'], [/^Child —/, 'child'], [/^Infant —/, 'infant']] as const) {
    await page.getByRole('tab', { name: /30:2 coach/ }).click();
    await page.getByRole('button', { name: label }).click(); await settle(page);
    await headFocus(page);
    const before = await probe(page); framed(before);
    expect(before.modelScale).toBeCloseTo(age === 'infant' ? .46 : age === 'child' ? .72 : 1, 6);
    recordMetric(age, 'before-recovery', before);
    await capture(page, age + '-brow-contours-before-recovery');
    await page.getByRole('tab', { name: /Recovery position/ }).click();
    const reset = page.getByRole('button', { name: /Start again/ }); if (await reset.count()) await reset.click();
    const steps = page.locator('.fr-body3d-content ol button'); expect(await steps.count()).toBe(8);
    for (let i = 0; i < 8; i++) { await expect(steps.nth(i)).toBeEnabled(); await steps.nth(i).click(); }
    await expect(page.getByText('Positioned — now keep watching', { exact: true })).toBeVisible();
    await headFocus(page);
    const after = await probe(page); framed(after);
    attachedAfterHeadTurn(before, after);
    expect(after.state.b3dRec).toEqual(completed); expect(after.mouthWorld).not.toEqual(before.mouthWorld);
    expect(after.camera.position).not.toEqual(before.camera.position);
    expect(after.farCheekGap).not.toBeNull(); expect(after.farCheekGap).toBeGreaterThanOrEqual(0); expect(after.farCheekGap).toBeLessThan(.02);
    recordMetric(age, 'after-recovery', after);
    await capture(page, age + '-brow-contours-after-recovery');
    expect(await canvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
    await oneCanvas(page);
  }
  await audit(page); await released(page);
});

test('phone brow inspection keeps keyboard viewing, learner progress, spacing, contrast and context cleanup', async ({ page }) => {
  await mount(page, 320, { b3dTab: 'recovery', b3dAge: 'child', b3dChildHands: 'two',
    b3dRec: completed, b3dRecView: 4, b3dRecoveryGuides: false,
    b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 115, motion: 'inspect', phase: 25, hands: true, anatomy: false, measure: false },
    b3dDepthInquiry: { signature: 'retained-brow-inquiry', peak: 'same' } });
  const canvas = await page.locator('#wrap canvas').elementHandle();
  const saved = (await probe(page)).state;
  await headFocus(page, true); expect((await probe(page)).state).toEqual(saved);
  const head = await probe(page);
  await page.locator('.fr-body3d-stage').focus(); await page.keyboard.press('ArrowLeft'); await settle(page);
  expect((await probe(page)).camera.position).not.toEqual(head.camera.position);
  expect((await probe(page)).state).toEqual(saved);
  await headFocus(page, true); expect((await probe(page)).state).toEqual(saved);
  const afterTurn = page.getByRole('button', { name: 'Inspect after the turn', exact: true });
  await afterTurn.focus(); await page.keyboard.press('Enter'); await settle(page);
  await expect(page.getByLabel('Pose to inspect', { exact: true })).toHaveValue('5');
  const turnedState = (await probe(page)).state;
  expect({ ...turnedState, b3dRecView: saved.b3dRecView }).toEqual(saved);
  await headFocus(page, true); const turned = await probe(page); framed(turned);
  attachedAfterHeadTurn(head, turned);
  expect(turned.farCheekGap).not.toBeNull(); expect(turned.farCheekGap).toBeLessThan(.02);
  recordMetric('child', 'phone-after-turn', turned);
  await capture(page, 'phone-brow-contours'); await audit(page);
  await page.addStyleTag({ content: '.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}' });
  await headFocus(page, true); await audit(page); expect((await probe(page)).state).toEqual(turnedState);
  await page.emulateMedia({ forcedColors: 'active' }); await headFocus(page, true); await audit(page);
  expect((await probe(page)).state).toEqual(turnedState);
  expect(await canvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); });
  await settle(page); await headFocus(page, true);
  const contrast = await probe(page); framed(contrast); expect(contrast.parts.every((part: any) => part.flat)).toBe(true);
  for (let i = 0; i < browNames.length; i++) {
    expect(contrast.browParts[i].geometryFingerprint, browNames[i]).toBe(turned.browParts[i].geometryFingerprint);
    expect(contrast.browParts[i].localCenter, browNames[i]).toEqual(turned.browParts[i].localCenter);
    expect(contrast.browParts[i].materialFingerprint, browNames[i]).not.toBe(turned.browParts[i].materialFingerprint);
  }
  expect(contrast.state).toEqual(turnedState); recordMetric('child', 'phone-app-contrast', contrast);
  await audit(page); await capture(page, 'phone-brow-contours-app-contrast');
  await expect.poll(async () => canvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  await oneCanvas(page); await released(page);
  expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData.firstResponse)))).toEqual(turnedState);
});
