import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_HAND_REPORT || 'reports/firstresponse-hand-surfaces';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `var HandCamera = THREE.PerspectiveCamera;
    THREE.PerspectiveCamera = class extends HandCamera {
      constructor(...args) { super(...args); window.__handSurfaceCamera = this; }
    };
    window.__handSurfaces = function () {
      var canvas = document.querySelector('#wrap canvas');
      var record = canvas && window.__glRecorder.forCanvas(canvas);
      var scene = record && record.scene, camera = window.__handSurfaceCamera;
      if (!scene || !camera) return null;
      scene.updateMatrixWorld(true);
      function project(p) { return p.clone().project(camera).toArray(); }
      function allVertices(object) {
        var points = [], flat = true, vertices = 0;
        object.traverseVisible(function (mesh) {
          if (!mesh.geometry || !mesh.geometry.attributes.position) return;
          var positions = mesh.geometry.attributes.position;
          flat = flat && mesh.material.type === 'MeshBasicMaterial';
          for (var i = 0; i < positions.count; i++) {
            points.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld));
            vertices++;
          }
        });
        return { world: points, points: points.map(project), flat: flat, vertices: vertices };
      }
      function hand(prefix, dorsal) {
        var object = scene.getObjectByName(prefix + (prefix.indexOf('fr-patient-') === 0 ? '-hand' : ''));
        if (!object) return null;
        var active = true, ancestor = object;
        while (ancestor) { active = active && ancestor.visible; ancestor = ancestor.parent; }
        var fingers = [], nails = [], flat = true, points = [], thumbDetail = null;
        for (var i = 0; i < 5; i++) {
          var digitName = i < 4 ? prefix + '-finger-' + i : prefix + '-thumb';
          var finger = scene.getObjectByName(digitName);
          var nail = scene.getObjectByName(i < 4 ? prefix + '-nail-' + i : prefix + '-thumb-nail');
          if (!finger || !nail) return { missing: true, name: prefix };
          var geometry = allVertices(finger), local = geometry.world.map(function (p) { return object.worldToLocal(p.clone()); });
          var box = new THREE.Box3().setFromPoints(local), skin = [];
          finger.traverse(function (mesh) { if (mesh.geometry) skin.push(mesh); });
          var nailCenter = nail.getWorldPosition(new THREE.Vector3());
          var normal = new THREE.Vector3(0, 1, 0).transformDirection(nail.matrixWorld);
          var outward = new THREE.Vector3(0, dorsal, 0).transformDirection(object.matrixWorld);
          var rayStart = nailCenter.clone().addScaledVector(normal, .025);
          var hits = new THREE.Raycaster(rayStart, normal.clone().negate()).intersectObjects(skin, false);
          var gap = hits.length ? hits[0].distance - .025 : null;
          var tip = scene.getObjectByName(digitName + '-tip');
          var detail = { min: box.min.toArray(), max: box.max.toArray(), meshes: skin.length,
            vertices: geometry.vertices, tip: tip ? object.worldToLocal(tip.getWorldPosition(new THREE.Vector3())).toArray() : null };
          var nailDetail = { local: object.worldToLocal(nailCenter.clone()).toArray(), gap: gap,
            scale: object.getWorldScale(new THREE.Vector3()).x, outward: normal.dot(outward) };
          if (i < 4) { fingers.push(detail); nails.push(nailDetail); }
          else thumbDetail = { finger: detail, nail: nailDetail };
          points = points.concat(geometry.points, allVertices(nail).points);
          flat = flat && geometry.flat && nail.material.type === 'MeshBasicMaterial';
        }
        return { name: prefix, active: active, fingers: fingers, nails: nails, thumb: thumbDetail, points: points, flat: flat };
      }
      var patientLeft = hand('fr-patient-left', -1), patientRight = hand('fr-patient-right', -1);
      var lower = hand('fr-rescuer-lower', 1), upper = hand('fr-rescuer-upper', 1);
      var head = scene.getObjectByName('fr-manikin-head');
      var patientRightHand = scene.getObjectByName('fr-patient-right-hand');
      var palm = scene.getObjectByName('fr-patient-right-palm');
      var palmNormal = new THREE.Vector3(0, 1, 0).transformDirection(patientRightHand.matrixWorld);
      var palmBack = palm.getWorldPosition(new THREE.Vector3()).addScaledVector(palmNormal, -palm.getWorldScale(new THREE.Vector3()).y);
      var cheek = new THREE.Raycaster(palmBack, palmNormal.clone().negate()).intersectObject(head, false);
      return { patient: [patientLeft, patientRight], rescuer: [lower, upper].filter(Boolean),
        cheekGap: cheek.length ? cheek[0].distance : null,
        marker: scene.getObjectByName('fr-depth-marker').position.y };
    };`,
});

test.describe.configure({ mode: 'serial', retries: 0, timeout: 240000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1280, extra = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth', ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
}
const pose = (page: Page) => page.evaluate(() => (window as any).__handSurfaces());
const framed = (points: number[][]) => points.length > 0 && points.every(p => Math.abs(p[0]) < .94 && Math.abs(p[1]) < .94 && p[2] > -1 && p[2] < 1);
const span = (points: number[][], axis: number) => Math.max(...points.map(p => p[axis])) - Math.min(...points.map(p => p[axis]));

function fitted(hand: any) {
  expect(hand).toBeTruthy(); expect(hand.missing).toBeUndefined();
  expect(hand.fingers).toHaveLength(4); expect(hand.nails).toHaveLength(4);
  expect(hand.thumb).toBeTruthy();
  for (const finger of [...hand.fingers, hand.thumb.finger]) {
    expect(finger.meshes).toBe(1); expect(finger.vertices).toBeGreaterThan(150); expect(finger.tip).not.toBeNull();
  }
  for (const nail of [...hand.nails, hand.thumb.nail]) {
    expect(nail.gap).not.toBeNull(); expect(nail.gap).toBeGreaterThan(-.001 * nail.scale);
    expect(nail.gap).toBeLessThan(.004 * nail.scale); expect(nail.outward).toBeGreaterThan(.6);
  }
}
function mirrored(left: any, right: any) {
  fitted(left); fitted(right);
  for (let i = 0; i < 4; i++) {
    const j = 3 - i;
    expect(left.fingers[i].min[0]).toBeCloseTo(-right.fingers[j].max[0], 5);
    expect(left.fingers[i].max[0]).toBeCloseTo(-right.fingers[j].min[0], 5);
    expect(left.fingers[i].tip[0]).toBeCloseTo(-right.fingers[j].tip[0], 5);
    for (const axis of [1, 2]) {
      expect(left.fingers[i].min[axis]).toBeCloseTo(right.fingers[j].min[axis], 5);
      expect(left.fingers[i].max[axis]).toBeCloseTo(right.fingers[j].max[axis], 5);
      expect(left.fingers[i].tip[axis]).toBeCloseTo(right.fingers[j].tip[axis], 5);
      expect(left.nails[i].local[axis]).toBeCloseTo(right.nails[j].local[axis], 5);
    }
    expect(left.nails[i].local[0]).toBeCloseTo(-right.nails[j].local[0], 5);
  }
  expect(left.thumb.finger.min[0]).toBeCloseTo(-right.thumb.finger.max[0], 5);
  expect(left.thumb.finger.max[0]).toBeCloseTo(-right.thumb.finger.min[0], 5);
  expect(left.thumb.finger.tip[0]).toBeCloseTo(-right.thumb.finger.tip[0], 5);
  expect(left.thumb.nail.local[0]).toBeCloseTo(-right.thumb.nail.local[0], 5);
  for (const axis of [1, 2]) {
    expect(left.thumb.finger.min[axis]).toBeCloseTo(right.thumb.finger.min[axis], 5);
    expect(left.thumb.finger.max[axis]).toBeCloseTo(right.thumb.finger.max[axis], 5);
    expect(left.thumb.finger.tip[axis]).toBeCloseTo(right.thumb.finger.tip[axis], 5);
    expect(left.thumb.nail.local[axis]).toBeCloseTo(right.thumb.nail.local[axis], 5);
  }
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}
async function finishRecovery(page: Page) {
  await page.getByRole('tab', { name: /Recovery position/ }).click();
  const reset = page.getByRole('button', { name: /Start again/ }); if (await reset.count()) await reset.click();
  const steps = page.locator('.fr-body3d-content ol button');
  for (let i = 0; i < 8; i++) await steps.nth(i).click();
}
async function oneCanvas(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  await expect.poll(async () => (await harness.glContexts(page)).filter(r => r.connected && r.inWrap && !r.lost).length).toBe(1);
  const live = (await harness.glContexts(page)).find(r => r.connected && r.inWrap && !r.lost)!;
  expect(live.createdBy).toBe('page'); expect(live.draws).toBeGreaterThan(0); expect(live.renders).toBeGreaterThan(0);
}

test('continuous rescuer fingers and fitted nails remain useful in all age-specific chest views', async ({ page }) => {
  await mount(page); const canvas = await page.locator('#wrap canvas').elementHandle();
  for (const [label, age, count] of [[/^Adult —/, 'adult', 2], [/^Child —/, 'child', 2], [/^Infant —/, 'infant', 1]] as const) {
    await page.getByRole('button', { name: label }).click();
    if (age === 'child') await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check();
    await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
    await expect.poll(async () => (await pose(page))?.rescuer.filter((h: any) => h.active).length).toBe(count);
    const current = await pose(page); for (const hand of current.rescuer) fitted(hand);
    if (current.rescuer.length === 2) mirrored(current.rescuer[0], current.rescuer[1]);
    const active = current.rescuer.filter((h: any) => h.active);
    await expect.poll(async () => (await pose(page)).rescuer.filter((h: any) => h.active).every((h: any) => framed(h.points))).toBe(true);
    expect(Math.max(...active.map((h: any) => span(h.points, 0)))).toBeGreaterThan(.12);
    const release = current.marker; await page.getByRole('button', { name: 'Show compression', exact: true }).click();
    await expect.poll(async () => (await pose(page)).marker).toBeLessThan(release);
    await page.getByRole('button', { name: 'Show release', exact: true }).click();
    await expect.poll(async () => (await pose(page)).marker).toBeCloseTo(release, 8);
    await page.locator('.fr-body3d-stage').screenshot({ path: report + '/' + age + '-chest-hands.png' });
    expect(await canvas!.evaluate(el => el === document.querySelector('#wrap canvas'))).toBe(true);
  }
  await oneCanvas(page); await audit(page);
});

test('mirrored patient digits stay joined and the recovery supporting hand meets the cheek at every age', async ({ page }) => {
  await mount(page, 1280, { b3dTab: 'coach' }); const canvas = await page.locator('#wrap canvas').elementHandle();
  for (const [label, age] of [[/^Adult —/, 'adult'], [/^Child —/, 'child'], [/^Infant —/, 'infant']] as const) {
    await page.getByRole('tab', { name: /30:2 coach/ }).click(); await page.getByRole('button', { name: label }).click();
    let patient = (await pose(page)).patient; mirrored(patient[0], patient[1]);
    await finishRecovery(page);
    await page.getByRole('button', { name: 'Hands + arms', exact: true }).click();
    await expect.poll(async () => (await pose(page)).patient.every((h: any) => framed(h.points))).toBe(true);
    const hands = (await pose(page)).patient.flatMap((h: any) => h.points);
    expect(Math.max(span(hands, 0), span(hands, 1))).toBeGreaterThan(.55);
    patient = (await pose(page)).patient; mirrored(patient[0], patient[1]);
    await page.locator('.fr-body3d-stage').screenshot({ path: report + '/' + age + '-recovery-hand-surfaces.png' });
    await page.getByRole('button', { name: 'Head close-up', exact: true }).click();
    await expect.poll(async () => (await pose(page)).cheekGap).not.toBeNull();
    await expect.poll(async () => (await pose(page)).cheekGap).toBeLessThan(.02);
    await expect.poll(async () => framed((await pose(page)).patient[1].points)).toBe(true);
    expect(Math.max(span((await pose(page)).patient[1].points, 0), span((await pose(page)).patient[1].points, 1))).toBeGreaterThan(.12);
    await page.locator('.fr-body3d-stage').screenshot({ path: report + '/' + age + '-recovery-cheek-hand.png' });
    expect(await canvas!.evaluate(el => el === document.querySelector('#wrap canvas'))).toBe(true);
  }
  await oneCanvas(page); await audit(page);
});

test('phone hand views preserve keyboard access, spacing, contrast and GL cleanup', async ({ page }) => {
  await mount(page, 320, { b3dAge: 'child', b3dChildHands: 'two' });
  const initial = await page.locator('#wrap canvas').elementHandle();
  const chest = page.getByRole('button', { name: 'Chest close-up', exact: true });
  await chest.focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await pose(page)).rescuer.filter((h: any) => h.active).every((h: any) => framed(h.points))).toBe(true);
  await page.locator('.fr-body3d-stage').focus(); await page.keyboard.press('ArrowLeft');
  await chest.focus(); await page.keyboard.press('Enter');
  await page.addStyleTag({ content: '.fr-body3d{line-height:1.5!important}.fr-body3d p{margin-bottom:2em!important}.fr-body3d *{letter-spacing:.12em!important;word-spacing:.16em!important}' });
  await audit(page); await page.locator('.fr-body3d-stage').screenshot({ path: report + '/phone-chest-hands.png' });
  await finishRecovery(page);
  const arms = page.getByRole('button', { name: 'Hands + arms', exact: true });
  await arms.focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await pose(page)).patient.every((h: any) => framed(h.points))).toBe(true);
  await page.emulateMedia({ forcedColors: 'active' }); await arms.click(); await audit(page);
  await page.locator('.fr-body3d-stage').screenshot({ path: report + '/forced-colors-phone-hands.png' });
  expect(await initial!.evaluate(el => el === document.querySelector('#wrap canvas'))).toBe(true);
  const previous = await page.locator('#wrap canvas').elementHandle();
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); });
  await arms.click();
  await expect.poll(async () => (await pose(page)).patient.every((h: any) => h.flat)).toBe(true);
  await expect.poll(async () => previous!.evaluate(el => (window as any).__glRecorder.forCanvas(el)?.ctx.isContextLost())).toBe(true);
  await oneCanvas(page); await audit(page);
  await page.locator('.fr-body3d-stage').screenshot({ path: report + '/contrast-phone-hands.png' });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});
