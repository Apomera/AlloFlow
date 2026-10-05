import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_INSPECTION_REPORT || 'reports/firstresponse-hand-inspection';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const metrics: Record<string, unknown>[] = [];
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__inspectionDraws = new WeakMap();
    var InspectionRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(InspectionRenderer, { construct: function (target, args, newTarget) {
      var renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function (scene, camera) {
        var result = render.apply(this, arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera) {
          window.__inspectionDrawCamera = camera;
          var previous = window.__inspectionDraws.get(this.domElement);
          window.__inspectionDraws.set(this.domElement, {
            scene: scene, camera: camera, bodyRenderSequence: (previous ? previous.bodyRenderSequence : 0) + 1
          });
        }
        return result;
      };
      return renderer;
    } });
    var InspectionCamera = THREE.PerspectiveCamera;
    THREE.PerspectiveCamera = class extends InspectionCamera {
      constructor(...args) { super(...args); window.__inspectionCamera = this; }
    };
    window.__handInspection = function () {
      var canvas = document.querySelector('#wrap canvas');
      var record = canvas && window.__glRecorder.forCanvas(canvas);
      var drawn = canvas && window.__inspectionDraws.get(canvas);
      if (!record || !drawn) return null;
      var scene = drawn.scene, camera = drawn.camera;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      function visible(object) {
        var parent = object;
        while (parent) { if (!parent.visible) return false; parent = parent.parent; }
        return true;
      }
      function vertices(object, mustBeVisible) {
        var points = [], worlds = [], flat = true;
        if (!object || (mustBeVisible && !visible(object))) return { points: points, world: worlds, flat: flat };
        object.traverse(function (mesh) {
          if (!mesh.geometry || !mesh.geometry.attributes.position || (mustBeVisible && !visible(mesh))) return;
          flat = flat && mesh.material.type === 'MeshBasicMaterial';
          var position = mesh.geometry.attributes.position;
          for (var i = 0; i < position.count; i++) {
            var world = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
            worlds.push(world.toArray()); points.push(world.clone().project(camera).toArray());
          }
        });
        return { points: points, world: worlds, flat: flat };
      }
      var parts = [], hands = [];
      ['lower', 'upper'].forEach(function (id) {
        var hand = scene.getObjectByName('fr-rescuer-' + id);
        if (!hand || !visible(hand)) return;
        hands.push(id);
        hand.children.forEach(function (part) {
          if (/^fr-rescuer-(lower|upper)-(palm|heel|wrist-bridge|finger-[0-3]|thumb|nail-[0-3]|thumb-nail)$/.test(part.name)) {
            var data = vertices(part, true); parts.push({ name: part.name, points: data.points, world: data.world, flat: data.flat });
          }
        });
      });
      var contact = scene.getObjectByName('fr-hand-contact-focus');
      var bounds = scene.getObjectByName('fr-hand-contact-bounds');
      var palm = scene.getObjectByName('fr-patient-left-hand');
      var palmParts = [];
      if (palm) palm.traverse(function (part) {
        if (part.name) palmParts.push({ name: part.name, points: vertices(part, true).points });
      });
      var arrow = [], arrowParts = [];
      ['fr-recovery-palm-arrow-stem', 'fr-recovery-palm-arrow-tip'].forEach(function (name) {
        var object = scene.getObjectByName(name); if (object && visible(object)) { var guidePoints = vertices(object, true).points; arrow = arrow.concat(guidePoints); arrowParts.push({ name: name, points: guidePoints }); }
      });
      return {
        parts: parts, hands: hands, contact: { exists: !!contact, visible: contact && contact.visible,
          bounds: bounds && { scale: bounds.scale.toArray(), position: bounds.position.toArray(), points: vertices(bounds, false).points } },
        viewerConfig: window.__inspectionViewerConfig, palmEuclideanDistance: scene.getObjectByName('fr-palm-bounds') ? camera.getWorldPosition(new THREE.Vector3()).distanceTo(scene.getObjectByName('fr-palm-bounds').getWorldPosition(new THREE.Vector3())) : null, palmOrbitDistance: scene.getObjectByName('fr-palm-bounds') && window.__inspectionViewerConfig ? camera.getWorldPosition(new THREE.Vector3()).sub(scene.getObjectByName('fr-palm-bounds').getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(window.__inspectionViewerConfig.homeTarget.x, window.__inspectionViewerConfig.homeTarget.y, window.__inspectionViewerConfig.homeTarget.z)).length() : null, cameraAspect: camera.aspect, canvasSize: [canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height], palm: vertices(palm, true), palmCenter: palm ? new THREE.Box3().setFromObject(palm).getCenter(new THREE.Vector3()).project(camera).toArray() : null, palmParts: palmParts, arrow: arrow, arrowParts: arrowParts,
        camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.elements.slice() },
        marker: scene.getObjectByName('fr-depth-marker').getWorldPosition(new THREE.Vector3()).toArray(),
        state: JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)), trace: (window.__inspectionTrace || []).slice(),
        cameraCapturedMatchesDraw: window.__inspectionCamera === camera, errors: window.__events.errors.slice()
      };
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 240000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { writeFileSync(report + '/geometry-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1280, extra: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/stem_lab/stem_tool_firstresponse.js', async route => {
    const response = await route.fetch();
    const instrument = `(function(){
      window.__inspectionTrace=[];
      var tracing=${JSON.stringify(Boolean(process.env.FIRST_RESPONSE_INSPECTION_TRACE))};
      var make=window.StemLab.makeBayViewer;
      window.StemLab.makeBayViewer=function(config){
        window.__inspectionViewerConfig={minDistance:config.minDistance,minCameraY:typeof config.minCameraY==='number'?config.minCameraY:null,homeTarget:{x:config.home.target.x,y:config.home.target.y,z:config.home.target.z}};
        if(tracing){
          var build=config.buildScene;
          config.buildScene=function(THREE,api){
            window.__inspectionTrace.push({event:'build'});
            var content=build.apply(this,arguments), sync=api.handInspectionSync;
            if(sync) api.handInspectionSync=function(changed,visible){window.__inspectionTrace.push({event:'handSync',changed:changed,visible:visible});return sync.apply(this,arguments);};
            return content;
          };
        }
        var viewer=make.apply(this,arguments);
        if(tracing) ['focus','reset','attach'].forEach(function(method){
          var old=viewer[method];
          if(old) viewer[method]=function(){window.__inspectionTrace.push({event:method,name:method==='focus'?arguments[0]:null,attached:method==='attach'?!!arguments[0]:null});return old.apply(this,arguments);};
        });
        return viewer;
      };
    })();`;
    await route.fulfill({ response, body: instrument + '\n' + await response.text() });
  });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth', ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
}
async function probe(page: Page): Promise<any> {
  // Keep the successful snapshot if the viewer is rebuilt before the next protocol call.
  const snapshot = await page.waitForFunction(() => (window as any).__handInspection());
  try { return await snapshot.jsonValue(); }
  finally { await snapshot.dispose(); }
}
const points = (pose: any): number[][] => pose.parts.flatMap((part: any) => part.points);
const span = (vertices: number[][], axis: number) => Math.max(...vertices.map(p => p[axis])) - Math.min(...vertices.map(p => p[axis]));
const prominence = (vertices: number[][]) => Math.max(span(vertices, 0), span(vertices, 1));
const inFrame = (vertices: number[][]) => vertices.length > 0 && vertices.every(p => Math.abs(p[0]) < .98 && Math.abs(p[1]) < .98 && p[2] > -1 && p[2] < 1);
const range = (vertices: number[][]) => vertices.length ? { x: span(vertices, 0), y: span(vertices, 1), maxX: Math.max(...vertices.map(p => Math.abs(p[0]))), maxY: Math.max(...vertices.map(p => Math.abs(p[1]))), vertices: vertices.length, minZ: Math.min(...vertices.map(p => p[2])), maxZ: Math.max(...vertices.map(p => p[2])), outside: vertices.filter(p => !(Math.abs(p[0]) < .98 && Math.abs(p[1]) < .98 && p[2] > -1 && p[2] < 1)).length } : null;
async function settle(page: Page) {
  // Finish queued focus scrolling before revealing the native viewer.
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__inspectionDraws.get(canvas);
    return { id: record?.id || 0, bodyRenderSequence: drawn?.bodyRenderSequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__inspectionDraws.get(canvas);
    return record && drawn && drawn.bodyRenderSequence >= (record.id === previous.id ? previous.bodyRenderSequence + 2 : 2);
  }, previous);
}
function recordMetric(metric: Record<string, any>) {
  metrics.push(metric);
  const name = [metric.kind, metric.age, metric.pose].filter(Boolean).join('-');
  writeFileSync(report + '/geometry-' + name + '.json', JSON.stringify(metric, null, 2));
}
async function update(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(p => (window as any).__ctx.updateMulti('firstResponse', p), patch); await settle(page);
}
async function capture(page: Page, name: string) {
  const stage = page.locator('.fr-body3d-stage');
  await stage.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  await settle(page);
  const box = await stage.boundingBox(); expect(box).toBeTruthy();
  await page.screenshot({ path: report + '/' + name + '.png', clip: box!, timeout: 60000 });
}
async function contextCapture(page: Page, name: string) {
  await page.locator('.fr-hand-inspection').evaluate(element => element.scrollIntoView({ block: 'end', behavior: 'instant' as ScrollBehavior }));
  await settle(page); const before = await probe(page), viewport = page.viewportSize();
  await page.screenshot({ path: report + '/' + name + '.png', timeout: 60000 });
  await settle(page); const after = await probe(page);
  expect(page.viewportSize()).toEqual(viewport); expect(after.camera.projection).toEqual(before.camera.projection);
  expect(after.cameraAspect).toBeCloseTo(after.canvasSize[0] / after.canvasSize[1], 2);
}
async function contactFocus(page: Page) {
  const button = page.getByRole('button', { name: 'Hand contact close-up', exact: true });
  await expect(button).toBeEnabled(); await button.click(); await settle(page);
  await expect.poll(async () => inFrame(points(await probe(page)))).toBe(true);
}
function contactParts(pose: any, count: number) {
  expect(pose.hands).toHaveLength(count); expect(pose.parts).toHaveLength(count * 13);
  for (const hand of pose.hands) {
    for (const suffix of ['palm', 'heel', 'wrist-bridge', 'thumb', 'thumb-nail', ...[0,1,2,3].flatMap(i => ['finger-' + i, 'nail-' + i])]) {
      const part = pose.parts.find((p: any) => p.name === 'fr-rescuer-' + hand + '-' + suffix);
      expect(part, suffix).toBeTruthy(); expect(part.points.length, suffix).toBeGreaterThan(0);
      expect(inFrame(part.points), part.name).toBe(true);
    }
  }
  expect(pose.contact.exists).toBe(true); expect(pose.contact.visible).toBe(false);
  expect(pose.contact.bounds.scale.every((n: number) => n > 0)).toBe(true);
}
async function oneCanvas(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  await expect.poll(async () => (await harness.glContexts(page)).filter(r => r.connected && r.inWrap && !r.lost).length).toBe(1);
  const active = (await harness.glContexts(page)).find(r => r.connected && r.inWrap && !r.lost)!;
  expect(active.createdBy).toBe('page'); expect(active.draws).toBeGreaterThan(0); expect(active.renders).toBeGreaterThan(0);
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-hand-inspection', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect((await probe(page)).errors).toEqual([]);
}

test('contact close-ups frame every actual palm heel wrist finger thumb and nail at each age', async ({ page }) => {
  await mount(page); const initial = await page.locator('#wrap canvas').elementHandle();
  for (const [age, label, count] of [['adult', /^Adult —/, 2], ['child', /^Child —/, 2], ['infant', /^Infant —/, 1]] as const) {
    await page.getByRole('button', { name: label }).click();
    if (age === 'child') await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check();
    await page.getByRole('button', { name: 'Hands + arms', exact: true }).click(); await settle(page);
    const full = prominence(points(await probe(page)));
    await contactFocus(page); const close = await probe(page); contactParts(close, count);
    const ratio = prominence(points(close)) / full;
    recordMetric({ kind: 'contact', age, ratio, range: range(points(close)), bounds: close.contact.bounds.scale });
    expect(ratio).toBeGreaterThanOrEqual(1.5); expect(prominence(points(close))).toBeGreaterThan(.32);
    await capture(page, age + '-contact-close-up');
    if (age === 'adult') {
      await contextCapture(page, 'desktop-contact-controls');
      const beforeResize = await probe(page);
      await page.setViewportSize({ width: 800, height: 1080 }); await settle(page);
      await expect.poll(async () => inFrame(points(await probe(page)))).toBe(true);
      const resized = await probe(page); contactParts(resized, count);
      expect(resized.cameraAspect).toBeCloseTo(resized.canvasSize[0] / resized.canvasSize[1], 2);
      expect(resized.cameraAspect).toBeLessThan(1);
      expect(resized.camera.projection).not.toEqual(beforeResize.camera.projection);
      expect(resized.camera.position).not.toEqual(beforeResize.camera.position);
      recordMetric({ kind: 'contact-resize', age, before: beforeResize.camera, after: resized.camera, canvas: resized.canvasSize, range: range(points(resized)) });
      await page.setViewportSize({ width: 1280, height: 1080 }); await settle(page);
      await expect.poll(async () => { const restored = await probe(page); return Math.hypot(...restored.camera.position.map((value: number, i: number) => value - beforeResize.camera.position[i])); }).toBeLessThan(.000001);
      contactParts(await probe(page), count);
    }
    expect(await initial!.evaluate(el => el === document.querySelector('#wrap canvas'))).toBe(true);
  }
  await oneCanvas(page); await audit(page);
});

test('contact camera keeps release and peak stable and refits visible child hands and changed settings', async ({ page }) => {
  await mount(page, 1280, { b3dAge: 'child', b3dChildHands: 'one',
    b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 115, motion: 'cycle', phase: 25, hands: true, anatomy: true, measure: true },
    b3dDepthInquiry: { signature: 'retained-inquiry', peak: 'same' } });
  const beforeZoom = await probe(page);
  await contactFocus(page); const first = await probe(page); contactParts(first, 1);
  expect(first.state.b3dDepthLab).toEqual(beforeZoom.state.b3dDepthLab);
  expect(first.state.b3dDepthInquiry).toEqual(beforeZoom.state.b3dDepthInquiry);
  expect(first.state.b3dChildHands).toEqual(beforeZoom.state.b3dChildHands);
  const settings = first.state.b3dDepthLab, inquiry = first.state.b3dDepthInquiry;
  await page.getByRole('button', { name: 'Inspect released contact', exact: true }).click(); await settle(page);
  const released = await probe(page); contactParts(released, 1);
  await page.getByRole('button', { name: 'Inspect deepest contact', exact: true }).click(); await settle(page);
  await expect.poll(async () => (await probe(page)).marker[1]).toBeLessThan(released.marker[1]);
  const peak = await probe(page); contactParts(peak, 1);
  expect(peak.camera).toEqual(released.camera); expect(peak.marker[1]).toBeLessThan(released.marker[1]);
  for (const state of [released.state, peak.state]) {
    for (const field of ['depth', 'lean', 'rate', 'hands', 'anatomy', 'measure']) expect(state.b3dDepthLab[field]).toEqual(settings[field]);
    expect(state.b3dChildHands).toBe('one'); expect(state.b3dDepthInquiry).toEqual(inquiry);
    expect(state.b3dDepthLab.motion).toBe('inspect');
  }
  expect(released.state.b3dDepthLab.phase).toBe(0); expect(peak.state.b3dDepthLab.phase).toBe(50);
  await capture(page, 'child-one-hand-peak');
  await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check(); await settle(page);
  await expect.poll(async () => JSON.stringify((await probe(page)).contact.bounds.scale)).not.toBe(JSON.stringify(peak.contact.bounds.scale)); await expect.poll(async () => (await probe(page)).camera).not.toEqual(peak.camera); const two = await probe(page); contactParts(two, 2); recordMetric({ kind: 'child-refit', beforeBounds: peak.contact.bounds, afterBounds: two.contact.bounds, beforeCamera: peak.camera, afterCamera: two.camera, trace: two.trace });
  await page.locator('#fr-depth-depth').focus(); await page.keyboard.press('End'); await settle(page);
  await expect.poll(async () => (await probe(page)).camera).not.toEqual(two.camera); const deeper = await probe(page); contactParts(deeper, 2);
  await page.locator('#fr-depth-lean').focus(); await page.keyboard.press('End'); await settle(page);
  await expect.poll(async () => (await probe(page)).camera).not.toEqual(deeper.camera); const leaning = await probe(page); contactParts(leaning, 2);
  for (const refitted of [two, deeper, leaning]) { expect(refitted.state.b3dDepthLab.motion).toBe('inspect'); expect(refitted.state.b3dDepthLab.phase).toBe(50); expect(refitted.state.b3dDepthLab.rate).toBe(settings.rate); expect(refitted.state.b3dChildHands).toBe('two'); }
  await page.getByRole('button', { name: 'Inspect released contact', exact: true }).click(); await settle(page);
  const changedRelease = await probe(page);
  await page.getByRole('button', { name: 'Inspect deepest contact', exact: true }).click(); await settle(page);
  const changedPeak = await probe(page); expect(changedPeak.camera).toEqual(changedRelease.camera); contactParts(changedPeak, 2);
  recordMetric({ kind: 'child-stability', releaseCamera: released.camera, peakCamera: peak.camera,
    oneRange: range(points(peak)), twoRange: range(points(changedPeak)), settings: changedPeak.state.b3dDepthLab });
  await capture(page, 'child-two-hands-peak');
  await page.getByRole('checkbox', { name: 'Show rescuer hands and arms', exact: true }).uncheck(); await settle(page);
  await expect(page.getByRole('button', { name: 'Hand contact close-up', exact: true })).toBeDisabled();
  expect((await probe(page)).hands).toEqual([]);
  await page.getByRole('checkbox', { name: 'Show rescuer hands and arms', exact: true }).check(); await contactFocus(page);
  const inspectionCamera = (await probe(page)).camera;
  await page.getByRole('tab', { name: /AED pads/ }).click(); await settle(page);
  await expect(page.locator('.fr-hand-inspection')).toHaveCount(0);
  await page.getByRole('tab', { name: /Depth \+ recoil/ }).click(); await settle(page);
  expect((await probe(page)).camera).not.toEqual(inspectionCamera);
  await page.getByRole('tab', { name: /Hand placement/ }).click(); await settle(page);
  await expect(page.getByRole('button', { name: 'Hand contact close-up', exact: true })).toBeDisabled();
  await update(page, { b3dPlaced: 'correct' }); await contactFocus(page);
  await update(page, { b3dStatus: 'failed' });
  await expect(page.getByRole('button', { name: 'Hand contact close-up', exact: true })).toBeDisabled();
  await oneCanvas(page);
});

test('recovery palm close-up frames flat and rolled palms with a useful increase at each age', async ({ page }) => {
  await mount(page, 1280, { b3dRec: completed });
  for (const [age, label] of [['adult', /^Adult —/], ['child', /^Child —/], ['infant', /^Infant —/]] as const) {
    await page.getByRole('tab', { name: /Depth \+ recoil/ }).click(); await page.getByRole('button', { name: label }).click();
    await page.getByRole('tab', { name: /Recovery position/ }).click();
    for (const [value, pose] of [['2', 'flat'], ['8', 'rolled']] as const) {
      await page.getByLabel('Pose to inspect', { exact: true }).selectOption(value); await settle(page);
      await page.getByRole('button', { name: 'Hands + arms', exact: true }).click(); await settle(page);
      const arms = prominence((await probe(page)).palm.points);
      await page.getByRole('button', { name: 'Palm close-up', exact: true }).click(); await settle(page);
      const close = await probe(page), ratio = prominence(close.palm.points) / arms;
      recordMetric({ kind: 'recovery-focus-diagnostic', age, pose, ratio, range: range(close.palm.points), parts: close.palmParts.map((part: any) => ({ name: part.name, range: range(part.points) })), camera: close.camera, cameraCapturedMatchesDraw: close.cameraCapturedMatchesDraw });

      await expect.poll(async () => inFrame((await probe(page)).palm.points)).toBe(true);
      if (age === 'infant' && pose === 'rolled') { expect(close.viewerConfig.minDistance).toBe(.8); expect(close.viewerConfig.minCameraY).toBeNull(); expect(close.palmOrbitDistance).toBeCloseTo(.8, 6); expect(ratio).toBeGreaterThanOrEqual(1.4); } else expect(ratio).toBeGreaterThanOrEqual(1.5);
      expect(prominence(close.palm.points)).toBeGreaterThan(.25);
      expect(Math.abs(close.palmCenter[0])).toBeLessThan(.02); expect(Math.abs(close.palmCenter[1])).toBeLessThan(.02);
      for (const suffix of ['palm', 'thumb', 'thumb-nail', ...[0,1,2,3].flatMap(i => ['finger-' + i, 'nail-' + i])]) {
        const part = close.palmParts.find((p: any) => p.name === 'fr-patient-left-' + suffix);
        expect(part).toBeTruthy(); expect(inFrame(part.points), suffix).toBe(true);
      }
      recordMetric({ kind: 'recovery-palm', age, pose, ratio, range: range(close.palm.points), orbitDistance: close.palmOrbitDistance, euclideanDistance: close.palmEuclideanDistance });
      await page.getByRole('checkbox', { name: 'Show arm positioning guides', exact: true }).check();
      await settle(page);
      await expect.poll(async () => { const current = await probe(page); return current.arrowParts.length === 2 && current.arrowParts.every((part: any) => inFrame(part.points)) && inFrame(current.palm.points); }).toBe(true);
      const guided = await probe(page);
      recordMetric({ kind: 'recovery-guides', age, pose, palm: range(guided.palm.points), arrow: range(guided.arrow), parts: guided.arrowParts.map((part: any) => ({ name: part.name, range: range(part.points) })) });

      expect(inFrame(guided.palm.points)).toBe(true); expect(guided.arrowParts).toHaveLength(2);
      for (const part of guided.arrowParts) { expect(part.points.length).toBeGreaterThan(0); expect(inFrame(part.points), part.name).toBe(true); }
      await page.getByRole('checkbox', { name: 'Show arm positioning guides', exact: true }).uncheck(); await settle(page);
      await expect.poll(async () => { const restored = await probe(page); return Math.hypot(...restored.camera.position.map((value: number, i: number) => value - close.camera.position[i])); }).toBeLessThan(.000001);
      const restored = await probe(page); expect(restored.arrowParts).toHaveLength(0); expect(inFrame(restored.palm.points)).toBe(true);
      recordMetric({ kind: 'recovery-guide-refit', age, pose, before: close.camera, guided: guided.camera, restored: restored.camera });
    }
    await capture(page, age + '-recovery-palm-rolled');
    await page.getByLabel('Pose to inspect', { exact: true }).selectOption('0'); await settle(page);
    await expect(page.getByRole('button', { name: 'Palm close-up', exact: true })).toBeDisabled();
    await page.getByLabel('Pose to inspect', { exact: true }).selectOption('2'); await settle(page);
    await expect(page.getByRole('button', { name: 'Palm close-up', exact: true })).toBeEnabled();
  }
  await oneCanvas(page); await audit(page);
});

test('phone keyboard inspection survives spacing forced colors contrast and releases its only drawn GL context', async ({ page }) => {
  await mount(page, 320, { b3dAge: 'child', b3dChildHands: 'two', b3dRec: completed });
  const initial = await page.locator('#wrap canvas').elementHandle();
  const contact = page.getByRole('button', { name: 'Hand contact close-up', exact: true });
  await contact.focus(); await page.keyboard.press('Enter'); await settle(page);
  contactParts(await probe(page), 2);
  await page.getByRole('button', { name: 'Inspect deepest contact', exact: true }).focus();
  await page.keyboard.press('Space'); await settle(page);
  expect((await probe(page)).state.b3dDepthLab.phase).toBe(50);
  await page.addStyleTag({ content: '.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}' });
  await contact.focus(); await page.keyboard.press('Enter'); await settle(page); contactParts(await probe(page), 2);
  await audit(page); await capture(page, 'phone-contact-spacing');
  await contextCapture(page, 'phone-contact-controls');
  await page.getByRole('tab', { name: /Recovery position/ }).click();
  await page.getByLabel('Pose to inspect', { exact: true }).selectOption('8');
  const palm = page.getByRole('button', { name: 'Palm close-up', exact: true });
  await palm.focus(); await page.keyboard.press('Enter'); await settle(page);
  expect(inFrame((await probe(page)).palm.points)).toBe(true);
  await page.emulateMedia({ forcedColors: 'active' }); await palm.click(); await settle(page); await audit(page);
  expect(inFrame((await probe(page)).palm.points)).toBe(true);
  expect(await initial!.evaluate(el => el === document.querySelector('#wrap canvas'))).toBe(true);
  const previous = await page.locator('#wrap canvas').elementHandle();
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  await palm.click(); await settle(page);
  await expect.poll(async () => (await probe(page)).palm.flat).toBe(true);
  expect(inFrame((await probe(page)).palm.points)).toBe(true);
  await expect.poll(async () => previous!.evaluate(el => (window as any).__glRecorder.forCanvas(el)?.ctx.isContextLost())).toBe(true);
  await oneCanvas(page); await audit(page); await capture(page, 'phone-palm-app-contrast');
  recordMetric({ kind: 'phone', width: 320, contact: range(points(await probe(page))), palm: range((await probe(page)).palm.points), contexts: await harness.glContexts(page) });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});
