import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_ARM_CONTOURS_REPORT || 'reports/firstresponse-arm-contours';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const metrics: Record<string, unknown>[] = [];
const browserErrors = new WeakMap<Page, string[]>();
const armSuffixes = ['forearm', 'upper-arm', 'sleeve'];
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__armContourDraws = new WeakMap();
    var ArmContourRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(ArmContourRenderer, { construct: function (target, args, newTarget) {
      var renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene, camera) {
        var result = render.apply(this, arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')) {
          var previous = window.__armContourDraws.get(this.domElement);
          window.__armContourDraws.set(this.domElement, {
            scene: scene, camera: camera, bodyRenderSequence: (previous ? previous.bodyRenderSequence : 0) + 1
          });
        }
        return result;
      };
      return renderer;
    } });
    window.__armContours = function () {
      var canvas = document.querySelector('#wrap canvas'), record = canvas && window.__glRecorder.forCanvas(canvas);
      var drawn = canvas && window.__armContourDraws.get(canvas);
      if (!record || !drawn) return null;
      var scene = drawn.scene, camera = drawn.camera;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      function visible(object) {
        for (var parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
        return true;
      }
      // Read every rendered vertex, but retain only compact bounds and validity counts.
      function summary(object) {
        var data = { name: object && object.name, vertices: 0, nonFinite: 0, badNormals: 0,
          minimum: [Infinity,Infinity,Infinity], maximum: [-Infinity,-Infinity,-Infinity],
          worldMinimum: [Infinity,Infinity,Infinity], worldMaximum: [-Infinity,-Infinity,-Infinity],
          minimumCameraDepth: Infinity, flat: true, geometryFingerprint: null };
        if (!object || !visible(object)) return data;
        var hash = 2166136261;
        object.traverse(function (mesh) {
          if (!visible(mesh) || !mesh.geometry || !mesh.geometry.attributes.position) return;
          var geometry = mesh.geometry, positions = geometry.attributes.position, normals = geometry.attributes.normal;
          var materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          data.flat = data.flat && materials.every(function (material) { return material && material.type === 'MeshBasicMaterial'; });
          [positions.array, normals && normals.array, geometry.index && geometry.index.array].filter(Boolean).forEach(function (array) {
            var bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
            for (var j = 0; j < bytes.length; j++) hash = Math.imul(hash ^ bytes[j], 16777619);
          });
          for (var i = 0; i < positions.count; i++) {
            var world = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
            var point = world.clone().project(camera), projected = point.toArray(), worldValues = world.toArray();
            var depth = -world.clone().applyMatrix4(camera.matrixWorldInverse).z;
            data.vertices++;
            if (!projected.concat(worldValues, [depth]).every(Number.isFinite)) data.nonFinite++;
            var length = normals && new THREE.Vector3().fromBufferAttribute(normals, i).length();
            if (!Number.isFinite(length) || length < .99 || length > 1.01) data.badNormals++;
            for (var axis = 0; axis < 3; axis++) {
              data.minimum[axis] = Math.min(data.minimum[axis], projected[axis]);
              data.maximum[axis] = Math.max(data.maximum[axis], projected[axis]);
              data.worldMinimum[axis] = Math.min(data.worldMinimum[axis], worldValues[axis]);
              data.worldMaximum[axis] = Math.max(data.worldMaximum[axis], worldValues[axis]);
            }
            data.minimumCameraDepth = Math.min(data.minimumCameraDepth, depth);
          }
        });
        data.geometryFingerprint = ('00000000' + (hash >>> 0).toString(16)).slice(-8);
        return data;
      }
      var hands = [], parts = [], heels = [];
      ['lower','upper'].forEach(function (id) {
        var hand = scene.getObjectByName('fr-rescuer-' + id);
        if (!hand || !visible(hand)) return;
        hands.push(id);
        ${JSON.stringify(armSuffixes)}.forEach(function (suffix) { parts.push(summary(hand.getObjectByName(hand.name + '-' + suffix))); });
        heels.push(summary(hand.getObjectByName(hand.name + '-heel')));
      });
      var marker = scene.getObjectByName('fr-depth-marker').getWorldPosition(new THREE.Vector3()).toArray();
      return {
        hands: hands, parts: parts, heels: heels, marker: marker,
        lowerContactGap: heels.length ? heels[0].worldMinimum[1] - marker[1] : null,
        modelScale: scene.getObjectByName('fr-training-manikin').getWorldScale(new THREE.Vector3()).x,
        camera: { position: camera.getWorldPosition(new THREE.Vector3()).toArray(), quaternion: camera.quaternion.toArray(),
          projection: camera.projectionMatrix.elements.slice(), aspect: camera.aspect, near: camera.near },
        canvasSize: [canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height],
        draw: { id: record.id, renders: record.renders, draws: record.draws, bodyRenderSequence: drawn.bodyRenderSequence, createdBy: record.createdBy },
        state: JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)), errors: window.__events.errors.slice()
      };
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 300000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => {
  writeFileSync(report + '/geometry-metrics.json', JSON.stringify(metrics, null, 2));
  await harness.stop();
});
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1280, extra: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth', ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  await settle(page);
}
async function probe(page: Page): Promise<any> {
  const snapshot = await page.waitForFunction(() => (window as any).__armContours());
  try { return await snapshot.jsonValue(); } finally { await snapshot.dispose(); }
}
async function settle(page: Page) {
  // Native focus can queue scrolling; reveal the viewer before waiting for its next drawn frames.
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__armContourDraws.get(canvas);
    return { id: record?.id || 0, bodyRenderSequence: drawn?.bodyRenderSequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__armContourDraws.get(canvas);
    return record && drawn && drawn.bodyRenderSequence >= (record.id === previous.id ? previous.bodyRenderSequence + 2 : 2);
  }, previous);
}
async function control(page: Page, name: string, keyboard = false) {
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  await settle(page);
}
function framed(pose: any, count: number) {
  expect(pose.hands).toEqual(count === 2 ? ['lower', 'upper'] : ['lower']);
  expect(pose.parts.map((part: any) => part.name)).toEqual(pose.hands.flatMap((id: string) => armSuffixes.map(suffix => 'fr-rescuer-' + id + '-' + suffix)));
  expect(pose.heels).toHaveLength(count);
  for (const part of [...pose.parts, ...pose.heels]) {
    expect(part.vertices, part.name).toBeGreaterThan(0);
    expect(part.nonFinite, part.name).toBe(0); expect(part.badNormals, part.name).toBe(0);
    expect([...part.minimum, ...part.maximum, ...part.worldMinimum, ...part.worldMaximum, part.minimumCameraDepth].every(Number.isFinite), part.name).toBe(true);
    expect(part.minimum[0], part.name).toBeGreaterThan(-.98); expect(part.maximum[0], part.name).toBeLessThan(.98);
    expect(part.minimum[1], part.name).toBeGreaterThan(-.98); expect(part.maximum[1], part.name).toBeLessThan(.98);
    expect(part.minimum[2], part.name).toBeGreaterThan(-1); expect(part.maximum[2], part.name).toBeLessThan(1);
    expect(part.minimumCameraDepth, part.name).toBeGreaterThan(pose.camera.near);
    expect(part.geometryFingerprint, part.name).toMatch(/^[0-9a-f]{8}$/);
  }
  expect(Math.abs(pose.lowerContactGap), 'lower heel remains on the moving chest plane').toBeLessThan(.00001);
  expect(pose.draw.createdBy).toBe('page');
  expect(pose.draw.renders).toBeGreaterThan(0); expect(pose.draw.draws).toBeGreaterThan(0);
  expect(pose.draw.bodyRenderSequence).toBeGreaterThanOrEqual(2);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2);
  expect(pose.errors).toEqual([]);
}
function followsCompression(released: any, peak: any) {
  const drop = peak.marker[1] - released.marker[1];
  expect(drop).toBeLessThan(-.01); expect(peak.camera).toEqual(released.camera);
  for (const collection of ['parts', 'heels']) {
    for (let index = 0; index < released[collection].length; index++) {
      const before = released[collection][index], after = peak[collection][index];
      expect(after.name).toBe(before.name); expect(after.geometryFingerprint, after.name).toBe(before.geometryFingerprint);
      for (const bound of ['worldMinimum', 'worldMaximum']) {
        expect(after[bound][0], after.name).toBeCloseTo(before[bound][0], 6);
        expect(after[bound][2], after.name).toBeCloseTo(before[bound][2], 6);
        expect(after[bound][1] - before[bound][1], after.name).toBeCloseTo(drop, 6);
      }
    }
  }
}
function recordMetric(age: string, view: string, pose: any) {
  // This is already a compact per-mesh summary; no vertex arrays or source snapshots are saved.
  metrics.push({ age, view, hands: pose.hands, parts: pose.parts, heels: pose.heels,
    marker: pose.marker, lowerContactGap: pose.lowerContactGap, modelScale: pose.modelScale,
    camera: pose.camera, canvasSize: pose.canvasSize, draw: pose.draw });
}
async function capture(page: Page, name: string) {
  await settle(page);
  const clip = await page.locator('.fr-body3d-stage').boundingBox(); expect(clip).toBeTruthy();
  await page.screenshot({ path: report + '/' + name + '.png', clip: clip!, timeout: 60000 });
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect((await probe(page)).errors).toEqual([]); expect(browserErrors.get(page)).toEqual([]);
}
async function oneCanvas(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  const active = (await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost);
  expect(active).toHaveLength(1); expect(active[0].createdBy).toBe('page'); expect(active[0].draws).toBeGreaterThan(0);
}
async function released(page: Page) {
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0);
  expect(browserErrors.get(page)).toEqual([]);
}

test('rescuer arm contours stay framed and follow chest contact through release and compression at every age', async ({ page }) => {
  await mount(page);
  const initialCanvas = await page.locator('#wrap canvas').elementHandle();
  for (const [label, age] of [[/^Adult —/, 'adult'], [/^Child —/, 'child'], [/^Infant —/, 'infant']] as const) {
    await page.getByRole('button', { name: label }).click(); await settle(page);
    if (age === 'child') {
      await page.getByRole('radio', { name: 'One hand', exact: true }).check(); await settle(page);
      await control(page, 'Hands + arms');
      const one = await probe(page); framed(one, 1); recordMetric(age, 'one-hand-arms', one);
      await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check(); await settle(page);
    }
    const count = age === 'infant' ? 1 : 2;
    for (const [label, view] of [['Hands + arms', 'arms'], ['Side view', 'side']] as const) {
      await control(page, label); await control(page, 'Show release');
      const rest = await probe(page); framed(rest, count);
      expect(rest.modelScale).toBeCloseTo(age === 'infant' ? .46 : age === 'child' ? .72 : 1, 6);
      await control(page, 'Show compression');
      const peak = await probe(page); framed(peak, count); followsCompression(rest, peak);
      recordMetric(age, view + '-release', rest); recordMetric(age, view + '-compression', peak);
      if (view === 'arms') await capture(page, age + '-arms-compression');
      if (age === 'adult' && view === 'side') await capture(page, 'adult-side-compression');
      await control(page, 'Show release');
      const restored = await probe(page); framed(restored, count);
      expect(restored.marker).toEqual(rest.marker);
    }
    expect(await initialCanvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  }
  await oneCanvas(page); await audit(page); await released(page);
});

test('320px arm inspection retains keyboard control and progress through forced colors contrast and cleanup', async ({ page }) => {
  await mount(page, 320, { b3dAge: 'child', b3dChildHands: 'two',
    b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 115, motion: 'inspect', phase: 0, hands: true, anatomy: false, measure: false },
    b3dDepthInquiry: { signature: 'retained-arm-contour-inquiry', peak: 'same' } });
  const initialCanvas = await page.locator('#wrap canvas').elementHandle();
  const saved = (await probe(page)).state;
  await control(page, 'Hands + arms', true);
  const rest = await probe(page); framed(rest, 2); expect(rest.state).toEqual(saved);
  await page.locator('.fr-body3d-stage').focus(); await page.keyboard.press('ArrowLeft'); await settle(page);
  const rotated = await probe(page); expect(rotated.camera.position).not.toEqual(rest.camera.position); expect(rotated.state).toEqual(saved);
  await control(page, 'Hands + arms', true);
  await control(page, 'Inspect deepest contact', true);
  const peak = await probe(page); framed(peak, 2); followsCompression(rest, peak);
  expect(peak.state.b3dDepthLab.phase).toBe(50); expect(peak.state.b3dDepthInquiry).toEqual(saved.b3dDepthInquiry);
  const inspectedState = peak.state;
  recordMetric('child', 'phone-arms-compression', peak); await capture(page, 'phone-arms-compression'); await audit(page);
  await control(page, 'Side view', true); framed(await probe(page), 2);
  expect((await probe(page)).state).toEqual(inspectedState);
  await page.addStyleTag({ content: '.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}' });
  await control(page, 'Hands + arms', true); framed(await probe(page), 2); await audit(page);
  await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Hands + arms', true);
  framed(await probe(page), 2); await audit(page); expect((await probe(page)).state).toEqual(inspectedState);
  expect(await initialCanvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); });
  await settle(page); await control(page, 'Hands + arms', true);
  const contrast = await probe(page); framed(contrast, 2);
  expect([...contrast.parts, ...contrast.heels].every((part: any) => part.flat)).toBe(true);
  expect(contrast.state).toEqual(inspectedState);
  for (let i = 0; i < peak.parts.length; i++) expect(contrast.parts[i].geometryFingerprint, contrast.parts[i].name).toBe(peak.parts[i].geometryFingerprint);
  recordMetric('child', 'phone-arms-app-contrast', contrast); await capture(page, 'phone-arms-app-contrast'); await audit(page);
  await expect.poll(async () => initialCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  await oneCanvas(page); await released(page);
  expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData.firstResponse)))).toEqual(inspectedState);
});
