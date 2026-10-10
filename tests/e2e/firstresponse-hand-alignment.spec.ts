import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_HAND_ALIGNMENT_REPORT || 'reports/firstresponse-hand-alignment';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const metrics: Record<string, unknown>[] = [];
const browserErrors = new WeakMap<Page, string[]>();
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__handAlignmentDraws = new WeakMap();
    var HandAlignmentRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(HandAlignmentRenderer, { construct: function (target, args, newTarget) {
      var renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene, camera) {
        var result = render.apply(this, arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')) {
          var previous = window.__handAlignmentDraws.get(this.domElement);
          window.__handAlignmentDraws.set(this.domElement, {
            scene: scene, camera: camera, sequence: (previous ? previous.sequence : 0) + 1
          });
        }
        return result;
      };
      return renderer;
    } });
    window.__handAlignment = function () {
      var canvas = document.querySelector('#wrap canvas'), record = canvas && window.__glRecorder.forCanvas(canvas);
      var drawn = canvas && window.__handAlignmentDraws.get(canvas);
      if (!record || !drawn) return null;
      var scene = drawn.scene, camera = drawn.camera;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      function visible(object) {
        for (var parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
        return true;
      }
      function center(object) { return new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()); }
      function end(mesh, sign) {
        return new THREE.Vector3(0, sign * mesh.geometry.parameters.height / 2, 0).applyMatrix4(mesh.matrixWorld);
      }
      function summary(mesh) {
        var p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal, hash = 2166136261;
        var result = { name: mesh.name, vertices: p.count, nonFinite: 0, badNormals: 0,
          min: [Infinity,Infinity,Infinity], max: [-Infinity,-Infinity,-Infinity],
          worldMin: [Infinity,Infinity,Infinity], worldMax: [-Infinity,-Infinity,-Infinity],
          minimumCameraDepth: Infinity, fingerprint: '', flat: false };
        [p.array, n && n.array, mesh.geometry.index && mesh.geometry.index.array].filter(Boolean).forEach(function (array) {
          var bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
          for (var j = 0; j < bytes.length; j++) hash = Math.imul(hash ^ bytes[j], 16777619);
        });
        for (var i = 0; i < p.count; i++) {
          var world = new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
          var projected = world.clone().project(camera).toArray(), coords = world.toArray();
          var depth = -world.clone().applyMatrix4(camera.matrixWorldInverse).z;
          if (!projected.concat(coords,[depth]).every(Number.isFinite)) result.nonFinite++;
          var length = n && new THREE.Vector3().fromBufferAttribute(n,i).length();
          if (!Number.isFinite(length) || length < .99 || length > 1.01) result.badNormals++;
          for (var axis = 0; axis < 3; axis++) {
            result.min[axis] = Math.min(result.min[axis], projected[axis]);
            result.max[axis] = Math.max(result.max[axis], projected[axis]);
            result.worldMin[axis] = Math.min(result.worldMin[axis], coords[axis]);
            result.worldMax[axis] = Math.max(result.worldMax[axis], coords[axis]);
          }
          result.minimumCameraDepth = Math.min(result.minimumCameraDepth, depth);
        }
        result.fingerprint = ('00000000' + (hash >>> 0).toString(16)).slice(-8);
        result.flat = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).every(function (m) { return m.type === 'MeshBasicMaterial'; });
        return result;
      }
      var hands = [], handSurfaces = [], armSurfaces = [], directions = [], heels = [];
      ['lower','upper'].forEach(function (id) {
        var hand = scene.getObjectByName('fr-rescuer-' + id);
        if (!hand || !visible(hand)) return;
        hands.push(id);
        function part(suffix) { return hand.getObjectByName(hand.name + '-' + suffix); }
        var heel = part('heel'), forearm = part('forearm'), upper = part('upper-arm');
        var heelCenter = center(heel), fingers = new THREE.Vector3(), fingerTips = [];
        for (var i = 0; i < 4; i++) {
          fingers.add(center(part('finger-' + i)));
          fingerTips.push(part('finger-' + i + '-tip').getWorldPosition(new THREE.Vector3()).toArray());
        }
        fingers.multiplyScalar(.25);
        var forward = fingers.clone().sub(heelCenter); forward.y = 0; forward.normalize();
        var thumb = center(part('thumb')).sub(heelCenter); thumb.y = 0;
        thumb.addScaledVector(forward, -thumb.dot(forward)).normalize();
        var wrist = end(forearm,-1), elbow = end(forearm,1), shoulder = end(upper,1);
        var wristSide = wrist.clone().sub(heelCenter); wristSide.y = 0; wristSide.normalize();
        directions.push({ id: id, heelCenter: heelCenter.toArray(), fingerCenter: fingers.toArray(),
          forward: forward.toArray(), thumb: thumb.toArray(), fingerTips: fingerTips,
          thumbTip: part('thumb-tip').getWorldPosition(new THREE.Vector3()).toArray(), wristSide: wristSide.toArray(),
          wrist: wrist.toArray(), elbow: elbow.toArray(), shoulder: shoulder.toArray(),
          elbowGap: elbow.distanceTo(end(upper,-1)),
          straightness: elbow.clone().sub(wrist).normalize().dot(shoulder.clone().sub(elbow).normalize()),
          uprightness: shoulder.clone().sub(wrist).normalize().y });
        hand.children.forEach(function (part) {
          if (!/^fr-rescuer-(lower|upper)-(palm|heel|wrist-bridge|finger-[0-3]|thumb|nail-[0-3]|thumb-nail)$/.test(part.name)) return;
          // Rounded digits contain a surface Mesh and a tip Object3D. Record
          // the actual rendered mesh; anchors have no geometry to inspect.
          part.traverse(function (mesh) {
            if (visible(mesh) && mesh.isMesh && mesh.geometry && mesh.geometry.attributes.position) handSurfaces.push(summary(mesh));
          });
        });
        ['forearm','upper-arm','sleeve'].forEach(function (suffix) { armSurfaces.push(summary(part(suffix))); });
        heels.push(heel);
      });
      var lower = heels[0], lowerCenter = center(lower), heelBounds = new THREE.Box3().setFromObject(lower);
      var ray = new THREE.Raycaster(new THREE.Vector3(lowerCenter.x, lowerCenter.y + 2, lowerCenter.z), new THREE.Vector3(0,-1,0));
      var chestHit = ray.intersectObject(scene.getObjectByName('fr-manikin-torso'),false)[0];
      var support = { samples: 0, minimumGap: null };
      if (heels.length === 2) {
        var upperHeel = heels[1], p = upperHeel.geometry.attributes.position;
        var supports = ['heel','palm','wrist-bridge'].map(function (name) { return scene.getObjectByName('fr-rescuer-lower-' + name); });
        var minimumGap = Infinity;
        for (var i = 0; i < p.count; i++) {
          if (p.getY(i) > .000001) continue;
          var point = new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(upperHeel.matrixWorld);
          ray.set(new THREE.Vector3(point.x, point.y + 2, point.z), new THREE.Vector3(0,-1,0));
          var hit = ray.intersectObjects(supports,false)[0];
          if (hit) { support.samples++; minimumGap = Math.min(minimumGap, point.y - hit.point.y); }
        }
        support.minimumGap = support.samples ? minimumGap : null;
      }
      return {
        hands: hands, handSurfaces: handSurfaces, armSurfaces: armSurfaces, directions: directions,
        handScale: lower.getWorldScale(new THREE.Vector3()).x / .085,
        lowerContactGap: chestHit ? heelBounds.min.y - chestHit.point.y : null,
        upperSupport: support, marker: scene.getObjectByName('fr-depth-marker').getWorldPosition(new THREE.Vector3()).toArray(),
        camera: { position: camera.getWorldPosition(new THREE.Vector3()).toArray(), quaternion: camera.quaternion.toArray(),
          projection: camera.projectionMatrix.elements.slice(), aspect: camera.aspect, near: camera.near },
        canvasSize: [canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height],
        draw: { id: record.id, draws: record.draws, renders: record.renders, sequence: drawn.sequence, createdBy: record.createdBy },
        state: JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)), errors: window.__events.errors.slice()
      };
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 420000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { writeFileSync(report + '/hand-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1280, extra: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth',
    b3dPlaced: 'correct', b3dRec: ['check', 'arm', 'hand'], ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  await settle(page);
}
async function probe(page: Page): Promise<any> {
  const value = await page.waitForFunction(() => (window as any).__handAlignment());
  try { return await value.jsonValue(); } finally { await value.dispose(); }
}
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__handAlignmentDraws.get(canvas)?.sequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__handAlignmentDraws.get(canvas);
    return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  }, previous);
}
async function control(page: Page, name: string, keyboard = false) {
  const button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  await settle(page);
}
const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, index) => value - b[index]));
function aligned(pose: any, count: number, armsVisible = false) {
  expect(pose.hands).toEqual(count === 2 ? ['lower', 'upper'] : ['lower']);
  expect(pose.directions).toHaveLength(count);
  expect(pose.handSurfaces).toHaveLength(count * 13);
  expect(new Set(pose.handSurfaces.map((part: any) => part.name)).size).toBe(count * 13);
  expect(pose.lowerContactGap, 'real torso below the lower heel').not.toBeNull();
  expect(Math.abs(pose.lowerContactGap), 'lower heel on the actual moving chest').toBeLessThan(.00001);
  for (const direction of pose.directions) {
    expect(direction.fingerTips).toHaveLength(4);
    expect(direction.fingerTips.flat().concat(direction.thumbTip).every(Number.isFinite), direction.id + ' digit tips').toBe(true);
    expect(direction.elbowGap, direction.id + ' joined elbow').toBeLessThan(.000001);
    expect(direction.straightness, direction.id + ' straight arm axis').toBeGreaterThan(.99999);
    expect(direction.uprightness, direction.id + ' upright arm').toBeGreaterThan(.90);
  }
  if (count === 2) {
    const [lower, upper] = pose.directions;
    expect(dot(lower.forward, upper.forward), 'stacked fingers face the same way').toBeGreaterThan(.85);
    expect(dot(lower.thumb, upper.thumb), 'opposite anatomical thumb sides').toBeLessThan(-.85);
    expect(dot(lower.wristSide, upper.wristSide), 'separate wrists face the same rescuer side').toBeGreaterThan(0);
    for (const hand of [lower, upper]) {
      expect(-dot(hand.wristSide, hand.forward), hand.id + ' wrist remains behind its fingers').toBeGreaterThan(.75);
    }
    expect(distance(lower.shoulder, upper.shoulder), 'arms separate above the stacked wrists').toBeGreaterThan(distance(lower.wrist, upper.wrist) + .06 * pose.handScale);
    expect(pose.upperSupport.samples).toBeGreaterThan(4);
    expect(pose.upperSupport.minimumGap / pose.handScale, 'upper heel supported by the lower hand').toBeLessThan(.004);
    expect(pose.upperSupport.minimumGap / pose.handScale, 'upper heel does not sink into the lower hand').toBeGreaterThan(-.002);
  }
  for (const part of [...pose.handSurfaces, ...pose.armSurfaces]) {
    expect(part.vertices, part.name).toBeGreaterThan(0); expect(part.nonFinite, part.name).toBe(0); expect(part.badNormals, part.name).toBe(0);
    expect(part.fingerprint).toMatch(/^[0-9a-f]{8}$/);
  }
  for (const part of [...pose.handSurfaces, ...(armsVisible ? pose.armSurfaces : [])]) {
    expect(part.min[0], part.name).toBeGreaterThan(-.99); expect(part.max[0], part.name).toBeLessThan(.99);
    expect(part.min[1], part.name).toBeGreaterThan(-.99); expect(part.max[1], part.name).toBeLessThan(.99);
    expect(part.min[2], part.name).toBeGreaterThan(-1); expect(part.max[2], part.name).toBeLessThan(1);
    expect(part.minimumCameraDepth, part.name).toBeGreaterThan(pose.camera.near);
  }
  expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0);
  expect(pose.draw.sequence).toBeGreaterThanOrEqual(2); expect(pose.errors).toEqual([]);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2);
}
function compression(released: any, peak: any) {
  const drop = peak.marker[1] - released.marker[1]; expect(drop).toBeLessThan(-.005);
  expect(peak.camera).toEqual(released.camera);
  for (const collection of ['handSurfaces', 'armSurfaces']) {
    for (let i = 0; i < released[collection].length; i++) {
      const before = released[collection][i], after = peak[collection][i];
      expect(after.name).toBe(before.name); expect(after.fingerprint, after.name).toBe(before.fingerprint);
      for (const bound of ['worldMin', 'worldMax']) {
        expect(after[bound][0], after.name).toBeCloseTo(before[bound][0], 6);
        expect(after[bound][2], after.name).toBeCloseTo(before[bound][2], 6);
        expect(after[bound][1] - before[bound][1], after.name).toBeCloseTo(drop, 6);
      }
    }
  }
}
function retained(before: any, after: any) {
  for (const key of ['b3dDepthInquiry', 'b3dDepthReference', 'b3dPlaced', 'b3dRec']) expect(after[key], key).toEqual(before[key]);
  for (const key of ['depth', 'lean', 'rate', 'hands', 'anatomy', 'measure']) expect(after.b3dDepthLab[key], key).toBe(before.b3dDepthLab[key]);
}
function record(condition: string, pose: any) { const { state, ...geometry } = pose; metrics.push({ condition, ...geometry }); }
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
  expect(browserErrors.get(page)).toEqual([]); expect((await probe(page)).errors).toEqual([]);
}
async function release(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
}
async function inspectPair(page: Page, condition: string, label: string, count: number, screenshot?: string) {
  await control(page, label); await control(page, 'Show release');
  const rest = await probe(page); aligned(rest, count, label !== 'Hand contact close-up');
  await control(page, 'Show compression');
  const peak = await probe(page); aligned(peak, count, label !== 'Hand contact close-up'); compression(rest, peak);
  record(condition + '-release', rest); record(condition + '-compression', peak);
  if (screenshot) await capture(page, screenshot);
  return peak;
}

test('adult stacked hands stay aligned and supported through all views and compression', async ({ page }) => {
  await mount(page);
  const initialCanvas = await page.locator('#wrap canvas').elementHandle();
  for (const [label, view] of [['Hand contact close-up', 'contact'], ['Hands + arms', 'arms'],
    ['Overhead view', 'overhead'], ['Side view', 'side']] as const) {
    await inspectPair(page, 'adult-' + view, label, 2, view === 'side' ? undefined : 'adult-' + view);
  }
  expect(await initialCanvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await audit(page); await release(page);
});

test('child hand options and infant hands stay aligned through contact views and compression', async ({ page }) => {
  await mount(page, 1280, { b3dAge: 'child', b3dChildHands: 'one' });
  const initialCanvas = await page.locator('#wrap canvas').elementHandle();
  await inspectPair(page, 'child-one-arms', 'Hands + arms', 1);
  await inspectPair(page, 'child-one-contact', 'Hand contact close-up', 1);
  const one = await probe(page);
  await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check(); await settle(page);
  const two = await probe(page); aligned(two, 2);
  expect(two.camera.position, 'active close-up refits to the added hand').not.toEqual(one.camera.position);
  await inspectPair(page, 'child-two-contact', 'Hand contact close-up', 2, 'child-two-contact');
  await inspectPair(page, 'child-two-arms', 'Hands + arms', 2);
  await page.getByRole('button', { name: /^Infant —/ }).click(); await settle(page);
  await inspectPair(page, 'infant-contact', 'Hand contact close-up', 1, 'infant-contact');
  await inspectPair(page, 'infant-arms', 'Hands + arms', 1);
  expect(await initialCanvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await audit(page); await release(page);
});

test('320px hand inspection keeps graph learning state, keyboard access, contrast and renderer cleanup', async ({ page }) => {
  await mount(page, 320, { b3dAge: 'child', b3dChildHands: 'two', b3dDepthLab: {
    age: 'child', depth: 5, lean: 1, rate: 115, motion: 'inspect', phase: 0, hands: true, anatomy: false, measure: true },
    b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
    b3dDepthInquiry: { signature: 'retained-hand-alignment-inquiry', peak: 'same', explanation: 'Compare full release.' } });
  const initialCanvas = await page.locator('#wrap canvas').elementHandle(), initial = await probe(page);
  await control(page, 'Hand contact close-up', true);
  const rest = await probe(page); aligned(rest, 2); expect(rest.state).toEqual(initial.state);
  await page.locator('.fr-body3d-stage').focus(); await page.keyboard.press('ArrowLeft'); await settle(page);
  const rotated = await probe(page); expect(rotated.camera.position).not.toEqual(rest.camera.position); expect(rotated.state).toEqual(initial.state);
  await control(page, 'Hand contact close-up', true);
  const graph = page.getByRole('slider', { name: 'Inspect cycle on graph', exact: true });
  await graph.focus(); await page.keyboard.press('Home');
  for (let i = 0; i < 5; i++) await page.keyboard.press('PageUp');
  await expect(graph).toHaveAttribute('aria-valuenow', '50'); await expect(page.locator('#fr-depth-phase')).toHaveValue('50');
  await settle(page);
  const peak = await probe(page); aligned(peak, 2); compression(rest, peak); retained(initial.state, peak.state);
  expect(peak.state.b3dDepthLab.phase).toBe(50); record('phone-contact', peak); await capture(page, 'phone-contact'); await audit(page);
  const inspectedState = peak.state;
  await control(page, 'Hands + arms', true); aligned(await probe(page), 2, true);
  await control(page, 'Side view', true); aligned(await probe(page), 2, true);
  expect((await probe(page)).state).toEqual(inspectedState);
  await page.addStyleTag({ content: '.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}' });
  await control(page, 'Hand contact close-up', true); aligned(await probe(page), 2); await audit(page);
  await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Hand contact close-up', true);
  aligned(await probe(page), 2); await audit(page); expect((await probe(page)).state).toEqual(inspectedState);
  expect(await initialCanvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); });
  await settle(page); await control(page, 'Hand contact close-up', true);
  const contrast = await probe(page); aligned(contrast, 2); expect(contrast.state).toEqual(inspectedState);
  expect([...contrast.handSurfaces, ...contrast.armSurfaces].every((part: any) => part.flat)).toBe(true);
  expect(contrast.handSurfaces.map((part: any) => part.fingerprint)).toEqual(peak.handSurfaces.map((part: any) => part.fingerprint));
  record('phone-contact-app-contrast', contrast); await capture(page, 'phone-contact-app-contrast'); await audit(page);
  await expect.poll(async () => initialCanvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  await release(page);
  expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData.firstResponse)))).toEqual(inspectedState);
});
