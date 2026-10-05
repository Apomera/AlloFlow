import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_PALM_DETAIL_REPORT || 'reports/firstresponse-palm-detail';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const metrics: Record<string, unknown>[] = [];
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__palmDetailDraws = new WeakMap();
    var DetailRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(DetailRenderer, { construct: function (target, args, newTarget) {
      var renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene, camera) {
        var result = render.apply(this, arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera) {
          var previous = window.__palmDetailDraws.get(this.domElement);
          window.__palmDetailDraws.set(this.domElement, {
            scene: scene, camera: camera, bodyRenderSequence: (previous ? previous.bodyRenderSequence : 0) + 1
          });
        }
        return result;
      };
      return renderer;
    } });
    window.__palmDetailProbe = function () {
      var canvas = document.querySelector('#wrap canvas');
      var record = canvas && window.__glRecorder.forCanvas(canvas);
      var drawn = canvas && window.__palmDetailDraws.get(canvas);
      if (!record || !drawn) return null;
      var scene = drawn.scene, camera = drawn.camera;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      function visible(object) {
        for (var parent = object; parent; parent = parent.parent) if (!parent.visible) return false;
        return true;
      }
      function vertices(object, includeWorld) {
        var points = [], worlds = includeWorld ? [] : undefined, depths = [], flat = true;
        if (!object || !visible(object)) return { points: points, world: worlds, depths: depths, flat: flat };
        object.traverse(function (mesh) {
          if (!mesh.geometry || !mesh.geometry.attributes.position || !visible(mesh)) return;
          var materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          flat = flat && materials.every(function (material) { return material && material.type === 'MeshBasicMaterial'; });
          var position = mesh.geometry.attributes.position;
          for (var i = 0; i < position.count; i++) {
            var world = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
            if (includeWorld) worlds.push(world.toArray()); points.push(world.clone().project(camera).toArray());
            depths.push(-world.clone().applyMatrix4(camera.matrixWorldInverse).z);
          }
        });
        return { points: points, world: worlds, depths: depths, flat: flat };
      }
      var hand = scene.getObjectByName('fr-patient-left-hand'), palm = vertices(hand, true), parts = [];
      if (hand) hand.traverse(function (object) {
        if (/^fr-patient-left-(palm|thumb|thumb-nail|palm-crease|thumb-crease|finger-[0-3]|nail-[0-3])$/.test(object.name)) parts.push({ name: object.name, points: vertices(object).points });
      });
      var arrow = [], arrowDepths = [], arrowParts = [];
      ['fr-recovery-palm-arrow-stem', 'fr-recovery-palm-arrow-tip'].forEach(function (name) {
        var object = scene.getObjectByName(name);
        if (object && visible(object)) {
          var data = vertices(object); arrow = arrow.concat(data.points); arrowDepths = arrowDepths.concat(data.depths);
          arrowParts.push({ name: name, points: data.points });
        }
      });
      var target = scene.getObjectByName('fr-palm-focus'), bounds = scene.getObjectByName('fr-palm-bounds');
      var normal = null, forward = null, direction = null, normalDot = null, alignment = null;
      var center = bounds ? bounds.getWorldPosition(new THREE.Vector3()) : null;
      var cameraPosition = camera.getWorldPosition(new THREE.Vector3());
      if (hand && center) {
        var rotation = hand.getWorldQuaternion(new THREE.Quaternion());
        normal = new THREE.Vector3(0,1,0).applyQuaternion(rotation);
        forward = new THREE.Vector3(0,0,1).applyQuaternion(rotation);
        direction = cameraPosition.clone().sub(center).normalize();
        normalDot = direction.dot(normal);
        alignment = direction.dot(normal.clone().addScaledVector(forward,0.12).addScaledVector(new THREE.Vector3().crossVectors(normal,forward),0.3).normalize());
      }
      var config = window.__palmDetailViewerConfig;
      var orbitDistance = center && config ? cameraPosition.clone().sub(center)
        .add(new THREE.Vector3(config.homeTarget.x,config.homeTarget.y,config.homeTarget.z)).length() : null;
      return {
        palm: palm, parts: parts, arrow: arrow, arrowDepths: arrowDepths, arrowParts: arrowParts,
        target: target ? { visible: target.visible, center: center.toArray(), scale: bounds.scale.toArray() } : null,
        normal: normal && normal.toArray(), forward: forward && forward.toArray(),
        normalDot: normalDot, alignment: alignment, actualDistance: center && cameraPosition.distanceTo(center),
        orbitDistance: orbitDistance, viewerConfig: config,
        camera: { position: cameraPosition.toArray(), quaternion: camera.quaternion.toArray(),
          projection: camera.projectionMatrix.elements.slice(), aspect: camera.aspect, near: camera.near },
        canvasSize: [canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
        draw: { id: record.id, renders: record.renders, draws: record.draws, bodyRenderSequence: drawn.bodyRenderSequence, createdBy: record.createdBy },
        state: JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),
        trace: (window.__palmDetailTrace || []).slice(), errors: window.__events.errors.slice()
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
  await page.route('**/stem_lab/stem_tool_firstresponse.js', async route => {
    const response = await route.fetch();
    const instrument = `(function(){
      window.__palmDetailTrace=[];
      var make=window.StemLab.makeBayViewer;
      window.StemLab.makeBayViewer=function(config){
        window.__palmDetailViewerConfig={minDistance:config.minDistance,
          homeTarget:{x:config.home.target.x,y:config.home.target.y,z:config.home.target.z}};
        var viewer=make.apply(this,arguments);
        ['focus','reset','attach'].forEach(function(method){
          var original=viewer[method];
          if(original) viewer[method]=function(){
            window.__palmDetailTrace.push({event:method,part:method==='focus'?arguments[0]:null,
              attached:method==='attach'?!!arguments[0]:null});
            return original.apply(this,arguments);
          };
        });
        return viewer;
      };
    })();`;
    await route.fulfill({ response, body: instrument + '\n' + await response.text() });
  });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'recovery',
    b3dRec: completed, b3dRecView: 2, b3dRecoveryGuides: false, ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  await settle(page);
}
const probe = (page: Page): Promise<any> => page.evaluate(() => (window as any).__palmDetailProbe());
const span = (vertices: number[][], axis: number) => Math.max(...vertices.map(p => p[axis])) - Math.min(...vertices.map(p => p[axis]));
const prominence = (vertices: number[][]) => Math.max(span(vertices, 0), span(vertices, 1));
const inFrame = (vertices: number[][]) => vertices.length > 0 && vertices.every(p => Math.abs(p[0]) < .98 && Math.abs(p[1]) < .98 && p[2] > -1 && p[2] < 1);
const range = (vertices: number[][]) => vertices.length ? {
  x: span(vertices, 0), y: span(vertices, 1), vertices: vertices.length,
  maxX: Math.max(...vertices.map(p => Math.abs(p[0]))), maxY: Math.max(...vertices.map(p => Math.abs(p[1]))),
  minZ: Math.min(...vertices.map(p => p[2])), maxZ: Math.max(...vertices.map(p => p[2])),
  outside: vertices.filter(p => !(Math.abs(p[0]) < .98 && Math.abs(p[1]) < .98 && p[2] > -1 && p[2] < 1)).length,
} : null;
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, i) => value - b[i]));
async function showStage(page: Page) {
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
}
async function settle(page: Page) {
  // Let native focus and key handlers finish their queued scrolling first.
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  // The native viewer pauses offscreen, so reveal it before waiting on actual draws.
  await showStage(page);
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__palmDetailDraws.get(canvas);
    return { id: record?.id || 0, bodyRenderSequence: drawn?.bodyRenderSequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__palmDetailDraws.get(canvas);
    return record && drawn && drawn.bodyRenderSequence >= (record.id === previous.id ? previous.bodyRenderSequence + 2 : 2);
  }, previous);
}
async function update(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(p => (window as any).__ctx.updateMulti('firstResponse', p), patch); await settle(page);
}
function recordMetric(metric: Record<string, any>) {
  metrics.push(metric);
  const name = [metric.kind, metric.age, metric.pose, metric.guides === true ? 'guided' : metric.guides === false ? 'plain' : ''].filter(value => value !== undefined && value !== '').join('-');
  writeFileSync(report + '/geometry-' + name + '.json', JSON.stringify(metric, null, 2));
}
function framed(pose: any, guides = false) {
  expect(pose.target).toBeTruthy(); expect(pose.target.visible).toBe(false);
  expect(pose.palm.points.length).toBeGreaterThan(5000); expect(inFrame(pose.palm.points)).toBe(true);
  for (const suffix of ['palm', 'thumb', 'thumb-nail', 'palm-crease', 'thumb-crease', ...[0,1,2,3].flatMap(i => ['finger-' + i, 'nail-' + i])]) {
    const part = pose.parts.find((item: any) => item.name === 'fr-patient-left-' + suffix);
    expect(part, suffix).toBeTruthy(); expect(inFrame(part.points), suffix).toBe(true);
  }
  expect(pose.arrowParts).toHaveLength(guides ? 2 : 0);
  if (guides) for (const part of pose.arrowParts) { expect(inFrame(part.points), part.name).toBe(true); }
  expect(Math.min(...pose.palm.depths, ...pose.arrowDepths)).toBeGreaterThan(pose.camera.near);
  expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.renders).toBeGreaterThan(0); expect(pose.draw.draws).toBeGreaterThan(0);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2);
  expect(pose.errors).toEqual([]);
}
function aligned(pose: any, guides = false) {
  framed(pose, guides); expect(pose.normalDot).toBeGreaterThan(.92); expect(pose.alignment).toBeGreaterThan(.9999);
  expect(pose.viewerConfig.minDistance).toBe(.8); expect(pose.orbitDistance).toBeGreaterThanOrEqual(.8 - .000001);
}
async function detailFocus(page: Page, keyboard = false) {
  const button = page.getByRole('button', { name: 'Palm detail view', exact: true });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  await settle(page);
  await expect.poll(async () => (await probe(page))?.alignment || 0).toBeGreaterThan(.9999);
}
async function capture(page: Page, name: string) {
  await settle(page); const box = await page.locator('.fr-body3d-stage').boundingBox(); expect(box).toBeTruthy();
  await page.screenshot({ path: report + '/' + name + '.png', clip: box!, timeout: 60000 });
}
async function contextCapture(page: Page, name: string) {
  await settle(page); const before = await probe(page), viewport = page.viewportSize();
  await page.locator('.fr-hand-inspection').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }));
  await page.screenshot({ path: report + '/' + name + '.png', timeout: 60000 });
  await settle(page); const after = await probe(page);
  expect(page.viewportSize()).toEqual(viewport); expect(after.camera.projection).toEqual(before.camera.projection);
  aligned(after, after.state.b3dRecoveryGuides === true);
}
async function oneCanvas(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  await expect.poll(async () => (await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost).length).toBe(1);
  const active = (await harness.glContexts(page)).find(record => record.connected && record.inWrap && !record.lost)!;
  expect(active.createdBy).toBe('page'); expect(active.draws).toBeGreaterThan(0); expect(active.renders).toBeGreaterThan(0);
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect((await probe(page)).errors).toEqual([]);
}
const preserved = (state: any) => ({ rec: state.b3dRec, depth: state.b3dDepthLab, inquiry: state.b3dDepthInquiry, hands: state.b3dChildHands });

for (const age of ['adult', 'child', 'infant'] as const) {
  test('palm detail aligns with actual ' + age + ' palms across poses and guides', async ({ page }) => {
    await mount(page); const initial = await page.locator('#wrap canvas').elementHandle();
    await update(page, { b3dAge: age });
    for (const pose of [2, 4, 5, 8]) {
      await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose)); await settle(page);
      for (const guides of [false, true]) {
        await page.getByRole('checkbox', { name: 'Show arm positioning guides', exact: true }).setChecked(guides); await settle(page);
        await page.getByRole('button', { name: 'Palm close-up', exact: true }).click(); await settle(page);
        const old = await probe(page); framed(old, guides);
        await detailFocus(page); const detail = await probe(page); aligned(detail, guides);
        const ratio = prominence(detail.palm.points) / prominence(old.palm.points);
        recordMetric({ kind: 'palm-detail', age, pose, guides, ratio,
          palm: range(detail.palm.points), arrow: range(detail.arrow), normalDot: detail.normalDot,
          alignment: detail.alignment, actualDistance: detail.actualDistance, orbitDistance: detail.orbitDistance,
          oldActualDistance: old.actualDistance, oldPalm: range(old.palm.points), camera: detail.camera,
          minimumCameraDepth: Math.min(...detail.palm.depths, ...detail.arrowDepths) });
        if (age === 'infant') expect(ratio).toBeGreaterThanOrEqual(2);
        if (!guides && (pose === 4 || pose === 5)) await capture(page, age + '-palm-detail-' + (pose === 4 ? 'before-turn' : 'after-turn'));
      }
    }
    expect(await initial!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
    await oneCanvas(page); await audit(page);
  });
}

test('selected palm detail refits guides poses ages and native viewport and clears unavailable requests', async ({ page }) => {
  await mount(page, 1280, { b3dAge: 'child', b3dChildHands: 'one', b3dRecView: 4,
    b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 115, motion: 'inspect', phase: 25, hands: true, anatomy: false, measure: false },
    b3dDepthInquiry: { signature: 'retained-inquiry', peak: 'same' } });
  const initial = await page.locator('#wrap canvas').elementHandle();
  const saved = preserved((await probe(page)).state);
  await detailFocus(page); const plain = await probe(page); aligned(plain);
  await page.getByRole('checkbox', { name: 'Show arm positioning guides', exact: true }).check(); await settle(page);
  await expect.poll(async () => (await probe(page))?.arrowParts.length).toBe(2);
  const guided = await probe(page); aligned(guided, true); expect(guided.camera.position).not.toEqual(plain.camera.position);
  await page.getByRole('checkbox', { name: 'Show arm positioning guides', exact: true }).uncheck(); await settle(page);
  await expect.poll(async () => distance((await probe(page)).camera.position, plain.camera.position)).toBeLessThan(.000001);
  aligned(await probe(page));
  const before = page.getByRole('button', { name: 'Inspect before the turn', exact: true });
  const after = page.getByRole('button', { name: 'Inspect after the turn', exact: true });
  await expect(before).toHaveAttribute('aria-pressed', 'true');
  await after.click(); await settle(page); await expect(after).toHaveAttribute('aria-pressed', 'true');
  await expect(before).toHaveAttribute('aria-pressed', 'false'); await expect(page.getByLabel('Pose to inspect', { exact: true })).toHaveValue('5');
  const turned = await probe(page); aligned(turned); expect(preserved(turned.state)).toEqual(saved);
  expect(turned.palm.world).not.toEqual(plain.palm.world);
  await before.click(); await settle(page); await expect(before).toHaveAttribute('aria-pressed', 'true');
  expect(preserved((await probe(page)).state)).toEqual(saved); aligned(await probe(page));
  // Recovery has no age selector; change the same saved setting through the host state API.
  await update(page, { b3dAge: 'adult' }); const adult = await probe(page); aligned(adult);
  expect(adult.palm.world).not.toEqual(plain.palm.world);
  await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  await expect.poll(async () => (await probe(page))?.camera.aspect || 2).toBeLessThan(1);
  await expect.poll(async () => distance((await probe(page)).camera.position, adult.camera.position)).toBeGreaterThan(.000001);
  const narrow = await probe(page); aligned(narrow); expect(narrow.camera.projection).not.toEqual(adult.camera.projection);
  expect(await initial!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await page.setViewportSize({ width: 1280, height: 1080 }); await settle(page);
  await expect.poll(async () => distance((await probe(page)).camera.position, adult.camera.position)).toBeLessThan(.000001);
  const restored = await probe(page); aligned(restored); expect(restored.camera.projection).toEqual(adult.camera.projection);
  recordMetric({ kind: 'retained-refit', age: 'adult', plain: plain.camera, guided: guided.camera, turned: turned.camera,
    adult: adult.camera, narrow: narrow.camera, restored: restored.camera, narrowCanvas: narrow.canvasSize, narrowPalm: range(narrow.palm.points) });
  const resetsBeforeUnavailable = (await probe(page)).trace.filter((entry: any) => entry.event === 'reset').length;
  await page.getByLabel('Pose to inspect', { exact: true }).selectOption('1'); await settle(page);
  await expect(page.getByRole('button', { name: 'Palm detail view', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Palm close-up', exact: true })).toBeDisabled();
  const unavailable = await probe(page); expect(unavailable.target).toBeNull();
  expect(unavailable.trace.filter((entry: any) => entry.event === 'reset').length).toBeGreaterThan(resetsBeforeUnavailable);
  const focusCount = unavailable.trace.filter((entry: any) => entry.event === 'focus').length;
  await page.getByLabel('Pose to inspect', { exact: true }).selectOption('2'); await settle(page);
  await expect(page.getByRole('button', { name: 'Palm detail view', exact: true })).toBeEnabled();
  expect((await probe(page)).trace.filter((entry: any) => entry.event === 'focus')).toHaveLength(focusCount);
  await page.getByRole('button', { name: 'Palm close-up', exact: true }).click(); await settle(page);
  const original = await probe(page); framed(original); expect(original.camera.position).not.toEqual(restored.camera.position);
  await oneCanvas(page); await harness.unmount(page);
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('phone palm detail keyboard controls survive spacing forced colors contrast and release the drawn context', async ({ page }) => {
  await mount(page, 320, { b3dAge: 'infant', b3dRecView: 4,
    b3dDepthInquiry: { signature: 'phone-retained', answer: 'same' } });
  const initial = await page.locator('#wrap canvas').elementHandle();
  const saved = preserved((await probe(page)).state);
  await detailFocus(page, true); aligned(await probe(page));
  const after = page.getByRole('button', { name: 'Inspect after the turn', exact: true });
  await after.focus(); await page.keyboard.press('Space'); await settle(page);
  await expect(after).toHaveAttribute('aria-pressed', 'true'); aligned(await probe(page));
  const before = page.getByRole('button', { name: 'Inspect before the turn', exact: true });
  await before.focus(); await page.keyboard.press('Enter'); await settle(page);
  await expect(before).toHaveAttribute('aria-pressed', 'true'); expect(preserved((await probe(page)).state)).toEqual(saved);
  await page.addStyleTag({ content: '.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}' });
  await detailFocus(page, true); aligned(await probe(page)); await audit(page);
  await contextCapture(page, 'phone-palm-detail-controls');
  await page.emulateMedia({ forcedColors: 'active' }); await detailFocus(page, true); aligned(await probe(page)); await audit(page);
  expect(await initial!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  const previous = await page.locator('#wrap canvas').elementHandle();
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  await detailFocus(page, true);
  await expect.poll(async () => (await probe(page))?.palm.flat).toBe(true);
  const contrast = await probe(page); aligned(contrast);
  await expect.poll(async () => previous!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  await oneCanvas(page); await audit(page); await capture(page, 'phone-palm-detail-app-contrast');
  recordMetric({ kind: 'phone', age: 'infant', width: 320, palm: range(contrast.palm.points), normalDot: contrast.normalDot,
    actualDistance: contrast.actualDistance, orbitDistance: contrast.orbitDistance, contexts: await harness.glContexts(page) });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});
