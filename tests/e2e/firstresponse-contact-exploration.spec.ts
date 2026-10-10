import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_CONTACT_REPORT || 'reports/firstresponse-contact-exploration';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const metrics: Record<string, unknown>[] = [];
const browserErrors = new WeakMap<Page, string[]>();
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__contactDraws = new WeakMap();
    var ContactRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(ContactRenderer, { construct: function (target,args,newTarget) {
      var renderer = Reflect.construct(target,args,newTarget), render = renderer.render;
      renderer.render = function (scene,camera) {
        var result = render.apply(this,arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')) {
          var previous = window.__contactDraws.get(this.domElement);
          window.__contactDraws.set(this.domElement,{ scene:scene,camera:camera,sequence:(previous ? previous.sequence : 0)+1 });
        }
        return result;
      }; return renderer;
    } });
    window.__contactExploration = function () {
      var canvas = document.querySelector('#wrap canvas'), drawn = canvas && window.__contactDraws.get(canvas);
      var record = canvas && window.__glRecorder.forCanvas(canvas);
      if (!drawn || !record) return null;
      var scene = drawn.scene, camera = drawn.camera;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      function visible(object) { for (var p = object; p; p = p.parent) if (!p.visible) return false; return true; }
      function bounds(mesh) {
        var position = mesh.geometry.attributes.position, min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
        var worldMin = min.slice(), worldMax = max.slice(), invalid = 0;
        for (var i = 0; i < position.count; i++) {
          var world = new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
          var point = world.clone().project(camera).toArray(), coords = world.toArray();
          if (!point.concat(coords).every(Number.isFinite)) invalid++;
          for (var axis = 0; axis < 3; axis++) {
            min[axis] = Math.min(min[axis],point[axis]); max[axis] = Math.max(max[axis],point[axis]);
            worldMin[axis] = Math.min(worldMin[axis],coords[axis]); worldMax[axis] = Math.max(worldMax[axis],coords[axis]);
          }
        }
        return { name:mesh.name, vertices:position.count, invalid:invalid, min:min, max:max, worldMin:worldMin, worldMax:worldMax,
          flat:mesh.material.type === 'MeshBasicMaterial', color:mesh.material.color.getHexString() };
      }
      var hands = [], surfaces = [];
      ['lower','upper'].forEach(function (side) {
        var hand = scene.getObjectByName('fr-rescuer-' + side);
        if (!hand || !visible(hand)) return;
        hands.push(side);
        hand.traverse(function (mesh) {
          if (mesh.isMesh && visible(mesh) && /^fr-rescuer-(lower|upper)-(palm|heel|wrist-bridge|finger-[0-3]-surface|thumb-surface|nail-[0-3]|thumb-nail)$/.test(mesh.name)) surfaces.push(bounds(mesh));
        });
      });
      var rest = scene.getObjectByName('fr-depth-resting-line'), sections = [];
      rest.traverse(function (mesh) { if (mesh.isMesh && visible(mesh)) sections.push(bounds(mesh)); });
      sections.sort(function (a,b) { return a.worldMin[0]-b.worldMin[0]; });
      var heel = scene.getObjectByName('fr-rescuer-lower-heel'), centre = heel.getWorldPosition(new THREE.Vector3());
      var heelBox = new THREE.Box3().setFromObject(heel);
      var clearance = new THREE.Box3().setFromObject(scene.getObjectByName('fr-manikin-torso'));
      clearance.union(new THREE.Box3().setFromObject(scene.getObjectByName('fr-depth-hands')));
      var hit = new THREE.Raycaster(new THREE.Vector3(centre.x,centre.y+2,centre.z),new THREE.Vector3(0,-1,0))
        .intersectObject(scene.getObjectByName('fr-manikin-torso'),false)[0];
      var target = scene.getObjectByName('fr-hand-contact-bounds'), targetBox = new THREE.Box3().setFromObject(target);
      return {
        hands:hands, surfaces:surfaces, sections:sections, restY:rest.getWorldPosition(new THREE.Vector3()).y,
        modelScale:scene.getObjectByName('fr-training-manikin').getWorldScale(new THREE.Vector3()).x,
        handScale:heel.getWorldScale(new THREE.Vector3()).x/.085,
        clearance:{ minX:clearance.min.x, maxX:clearance.max.x },
        heelMin:heelBox.min.toArray(), heelMax:heelBox.max.toArray(), contactGap:hit ? heelBox.min.y-hit.point.y : null,
        target:{ min:targetBox.min.toArray(), max:targetBox.max.toArray() },
        marker:scene.getObjectByName('fr-depth-marker').getWorldPosition(new THREE.Vector3()).toArray(),
        camera:{ position:camera.getWorldPosition(new THREE.Vector3()).toArray(), quaternion:camera.quaternion.toArray(),
          direction:camera.getWorldDirection(new THREE.Vector3()).toArray(), projection:camera.projectionMatrix.elements.slice(), aspect:camera.aspect },
        canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
        draw:{ id:record.id, draws:record.draws, renders:record.renders, sequence:drawn.sequence, createdBy:record.createdBy },
        state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)), errors:window.__events.errors.slice()
      };
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 420000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { writeFileSync(report + '/contact-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
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
async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__contactDraws.get(canvas)?.sequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__contactDraws.get(canvas);
    return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  }, previous);
}
async function probe(page: Page): Promise<any> {
  const value = await page.waitForFunction(() => (window as any).__contactExploration());
  try { return await value.jsonValue(); } finally { await value.dispose(); }
}
async function control(page: Page, name: string, keyboard = false) {
  const button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  await settle(page);
}
function valid(pose: any, handCount: number) {
  expect(pose.hands).toEqual(handCount === 2 ? ['lower', 'upper'] : ['lower']);
  expect(pose.surfaces).toHaveLength(handCount * 13);
  for (const surface of pose.surfaces) {
    expect(surface.vertices, surface.name).toBeGreaterThan(0); expect(surface.invalid, surface.name).toBe(0);
    for (const axis of [0, 1]) {
      expect(surface.min[axis], surface.name).toBeGreaterThan(-.99); expect(surface.max[axis], surface.name).toBeLessThan(.99);
    }
    expect(surface.min[2], surface.name).toBeGreaterThan(-1); expect(surface.max[2], surface.name).toBeLessThan(1);
  }
  expect(pose.contactGap).not.toBeNull(); expect(Math.abs(pose.contactGap)).toBeLessThan(.00001);
  expect(pose.sections).toHaveLength(2);
  const [left, right] = pose.sections;
  expect([left.name, right.name]).toEqual(['fr-depth-resting-left', 'fr-depth-resting-right']);
  expect(left.worldMax[0], 'clear middle of the resting guide').toBeLessThan(pose.heelMin[0]);
  expect(right.worldMin[0], 'clear middle of the resting guide').toBeGreaterThan(pose.heelMax[0]);
  for (const section of pose.sections) {
    expect(section.invalid).toBe(0); expect(section.flat).toBe(true);
    expect((section.worldMin[1] + section.worldMax[1]) / 2).toBeCloseTo(pose.restY, 7);
  }
  expect(left.worldMin[0]).toBeCloseTo(-.825 * pose.modelScale, 6);
  expect(right.worldMax[0]).toBeCloseTo(.825 * pose.modelScale, 6);
  expect(left.worldMax[0]).toBeCloseTo(pose.clearance.minX - .055 * pose.handScale, 6);
  expect(right.worldMin[0]).toBeCloseTo(pose.clearance.maxX + .055 * pose.handScale, 6);
  expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0);
  expect(pose.draw.sequence).toBeGreaterThanOrEqual(2); expect(pose.errors).toEqual([]);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0] / pose.canvasSize[1], 2);
}
function sameOrientation(before: any, after: any) {
  for (let axis = 0; axis < 4; axis++) expect(after.camera.quaternion[axis]).toBeCloseTo(before.camera.quaternion[axis], 7);
}
function stableGuide(before: any, after: any) {
  expect(after.restY).toBe(before.restY);
  expect(after.sections.map((section: any) => [section.name, section.worldMin, section.worldMax]))
    .toEqual(before.sections.map((section: any) => [section.name, section.worldMin, section.worldMax]));
}
function retained(before: any, after: any) {
  for (const key of ['b3dDepthInquiry', 'b3dDepthReference', 'b3dPlaced', 'b3dRec', 'b3dChildHands']) expect(after[key], key).toEqual(before[key]);
  for (const key of ['age', 'depth', 'lean', 'rate', 'hands', 'anatomy', 'measure']) expect(after.b3dDepthLab[key], key).toBe(before.b3dDepthLab[key]);
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
  expect(browserErrors.get(page)).toEqual([]);
}
async function release(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(browserErrors.get(page)).toEqual([]);
}

test('heel side inspection and split resting marks explain contact across ages without moving the guide', async ({ page }) => {
  await mount(page);
  const canvas = await page.locator('#wrap canvas').elementHandle();
  let stackedObservation = '';
  for (const [age, label] of [['adult', /^Adult —/], ['child', /^Child —/], ['infant', /^Infant —/]] as const) {
    if (age !== 'adult') { await page.getByRole('button', { name: label }).click(); await settle(page); }
    if (age === 'child') { await page.getByRole('radio', { name: 'One hand', exact: true }).check(); await settle(page); }
    await control(page, 'Show release');
    const stateBeforeView = (await probe(page)).state;
    await control(page, 'Heel side view');
    let rest = await probe(page); valid(rest, age === 'adult' ? 2 : 1); expect(rest.state).toEqual(stateBeforeView);
    expect(Math.abs(rest.camera.direction[1]), 'side view stays low enough to compare the stack').toBeLessThan(.5);
    const observation = page.locator('.fr-contact-observation');
    await expect(observation).toHaveCount(1);
    await expect(observation.locator('summary')).toHaveText('Check your observation');
    await expect(observation).toContainText(/heel/i); await expect(observation).toContainText(/finger/i);
    if (age === 'adult') stackedObservation = (await observation.textContent())!;
    else expect(await observation.textContent(), 'observation follows the one-hand arrangement').not.toBe(stackedObservation);
    if (age === 'child') {
      const one = rest;
      await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check(); await settle(page);
      rest = await probe(page); valid(rest, 2); sameOrientation(one, rest);
      expect(rest.camera.position, 'active side close-up refits to two hands').not.toEqual(one.camera.position);
      expect(await observation.textContent(), 'child two-hand explanation follows the illustrated stack').toBe(stackedObservation);
    }
    record(age + '-side-release', rest);
    if (age === 'adult') await capture(page, 'adult-heel-side-release');
    await control(page, 'Show compression');
    const peak = await probe(page); valid(peak, age === 'infant' ? 1 : 2);
    expect(peak.camera).toEqual(rest.camera); expect(peak.target).toEqual(rest.target); stableGuide(rest, peak);
    expect(peak.marker[1]).toBeLessThan(rest.marker[1] - .005); record(age + '-side-compression', peak);
    if (age !== 'adult') await capture(page, age + '-heel-side-compression');
    if (age === 'adult') {
      await control(page, 'Hand contact close-up');
      const oblique = await probe(page); valid(oblique, 2); stableGuide(rest, oblique);
      expect(oblique.camera.position).not.toEqual(rest.camera.position); record('adult-oblique-compression', oblique);
      await capture(page, 'adult-oblique-contact-compression');
      await control(page, 'Show release');
      await control(page, 'Heel side view');
      const beforeRange = await probe(page);
      await page.locator('#fr-depth-depth').focus(); await page.keyboard.press('End'); await settle(page);
      const range = await probe(page); valid(range, 2); sameOrientation(beforeRange, range);
      expect(range.camera.position, 'side close-up refits the larger depth envelope').not.toEqual(beforeRange.camera.position);
      stableGuide(beforeRange, range); record('adult-side-expanded-depth', range);
    }
  }
  expect(await canvas!.evaluate(element => element === document.querySelector('#wrap canvas'))).toBe(true);
  await audit(page); await release(page);
});

test('phone heel inspection preserves learning state through keyboard use resizing contrast and cleanup', async ({ page }) => {
  await mount(page, 320, { b3dAge: 'child', b3dChildHands: 'two', b3dDepthLab: {
    age: 'child', depth: 5, lean: 1, rate: 115, motion: 'inspect', phase: 0, hands: true, anatomy: false, measure: true },
    b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
    b3dDepthInquiry: { signature: 'retained-contact-inquiry', peak: 'same', explanation: 'Contact is different from complete recoil.' } });
  const canvas = await page.locator('#wrap canvas').elementHandle(), initial = await probe(page);
  await control(page, 'Heel side view', true);
  const side = await probe(page); valid(side, 2); expect(side.state).toEqual(initial.state);
  const observation = page.locator('.fr-contact-observation');
  await observation.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(observation).toHaveAttribute('open', '');
  expect(await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData.firstResponse)))).toEqual(initial.state);
  record('phone-side-320', side); await capture(page, 'phone-heel-side-320');
  await page.setViewportSize({ width: 760, height: 840 }); await settle(page);
  const wider = await probe(page); valid(wider, 2); sameOrientation(side, wider); expect(wider.state).toEqual(initial.state);
  expect(wider.canvasSize[0]).not.toBe(side.canvasSize[0]);
  await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  const narrow = await probe(page); valid(narrow, 2); sameOrientation(side, narrow); expect(narrow.state).toEqual(initial.state);
  const graph = page.getByRole('slider', { name: 'Inspect cycle on graph', exact: true });
  await graph.focus(); for (let i = 0; i < 5; i++) await page.keyboard.press('PageUp'); await settle(page);
  await expect(graph).toHaveAttribute('aria-valuenow', '50');
  const peak = await probe(page); valid(peak, 2); retained(initial.state, peak.state); expect(peak.camera).toEqual(narrow.camera);
  stableGuide(narrow, peak); record('phone-side-peak', peak);
  await page.emulateMedia({ forcedColors: 'active' }); await control(page, 'Heel side view', true); await audit(page);
  expect((await probe(page)).state).toEqual(peak.state);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); });
  await settle(page); await control(page, 'Heel side view', true);
  const contrast = await probe(page); valid(contrast, 2); expect(contrast.state).toEqual(peak.state);
  expect(contrast.surfaces.every((surface: any) => surface.flat)).toBe(true);
  expect(contrast.sections.every((section: any) => section.color === 'ffffff')).toBe(true);
  record('phone-side-app-contrast', contrast); await capture(page, 'phone-heel-side-app-contrast'); await audit(page);
  await expect.poll(async () => canvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  const showHands = page.getByRole('checkbox', { name: 'Show rescuer hands and arms', exact: true });
  await showHands.uncheck(); await settle(page);
  await expect(page.getByRole('button', { name: 'Heel side view', exact: true })).toBeDisabled();
  await expect(page.locator('.fr-contact-observation')).toHaveCount(0);
  const hidden = await probe(page); expect(hidden.hands).toEqual([]);
  expect(hidden.camera.position, 'hiding the hands clears the contact close-up').not.toEqual(contrast.camera.position);
  await showHands.check(); await settle(page); await control(page, 'Heel side view', true);
  const beforeTab = (await probe(page)).state;
  await page.getByRole('tab', { name: '5 · AED pads', exact: true }).click(); await settle(page);
  await expect(page.getByRole('button', { name: 'Heel side view', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: '3 · Depth + recoil', exact: true }).click(); await settle(page);
  const returned = await probe(page); retained(beforeTab, returned.state);
  expect(returned.camera.position, 'an unsupported tab clears the contact close-up').not.toEqual(contrast.camera.position);
  await release(page);
});
