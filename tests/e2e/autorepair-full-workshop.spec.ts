import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_autorepair.js', toolId: 'autoRepair',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1260, height: 900,
  probes: `
    (function () {
      var Real = THREE.WebGLRenderer;
      function Probed() {
        var renderer = Reflect.construct(Real, Array.prototype.slice.call(arguments));
        var render = renderer.render;
        renderer.render = function (scene, camera) { window.__shopScene = scene; window.__shopCamera = camera; window.__shopRenderCount = (window.__shopRenderCount || 0) + 1; return render.apply(renderer, arguments); };
        return renderer;
      }
      Probed.prototype = Real.prototype; THREE.WebGLRenderer = Probed;
    })();
    window.__shopObject = function (name) {
      var object = window.__shopScene && window.__shopScene.getObjectByName(name);
      if (!object) return null;
      return { y: object.position.y, rotation: object.rotation.z, data: object.userData };
    };
  ` });
test.describe.configure({ timeout: 180_000 });
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(async () => { await harness.start(); await mkdir('reports/automobile-workshop', { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
const equipment: Record<string, string> = { intake: 'job-card', setup: 'lift-card', 'low-lift': 'lift-controls', stability: 'lamp', raise: 'lift-controls', locks: 'lift-controls', 'wheel-off': 'socket', measure: 'gauge', service: 'brake-kit', refit: 'torque', lower: 'lift-controls', verify: 'checklist', release: 'job-card' };
async function prepareInstrument(page: any) {
  const panel = page.locator('[data-ar-shop-instrument]');
  if (!await panel.count()) return;
  const kind = await panel.getAttribute('data-ar-shop-instrument');
  if (kind === 'meter') {
    await page.locator('#ar-shop-instrument-mode').selectOption('dcv');
    await page.locator('#ar-shop-instrument-contact').selectOption('joint');
    await page.locator('#ar-shop-instrument-load').selectOption('starter');
  }
  if (kind === 'gauge') await page.locator('#ar-shop-instrument-surface').selectOption('lining');
  if (kind === 'jug' && await page.locator('[data-ar-shop-jug-quantity]').getAttribute('data-ar-shop-jug-quantity') === '4100') await page.locator('[data-ar-shop-jug-change="500"]').click();
  if (kind === 'torque') {
    if (await page.locator('[data-ar-shop-seat-wheel]').count()) await page.locator('[data-ar-shop-seat-wheel]').click();
    for (const lug of [0, 2, 4, 1, 3]) {
      const button = page.locator('[data-ar-shop-lug="' + lug + '"]');
      if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
    }
  } else await page.locator('[data-ar-shop-instrument-read]').click();
}
async function perform(page: any, tool?: string, answer = '6') {
  const id = await page.locator('[data-ar-shop-perform]').getAttribute('data-ar-shop-perform');
  await page.locator('[data-ar-shop-go-task]').click();
  await page.locator('#ar-shop-tool').selectOption(tool || equipment[id]);
  await prepareInstrument(page);
  if (await page.locator('#ar-shop-answer').count()) await page.locator('#ar-shop-answer').fill(answer);
  await page.locator('[data-ar-shop-perform]').click();
  return id;
}
test('full vehicle, staged lift, brake service, handoff and return path work on real WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await harness.mount(page, { autoRepair: { view: 'workshop' } });
  await expect(page.locator('[data-ar-shop-task="intake"]')).toBeVisible();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-vehicle'));
  expect(await page.evaluate(() => (window as any).__glLive()?.lost)).toBe(false);
  for (const name of ['workshop-vehicle', 'workshop-two-post-lift', 'workshop-tool-bench', 'service-desk', 'catalytic-converter', 'rear-muffler', 'engine-oil-sump']) {
    expect(await page.evaluate(n => (window as any).__shopObject(n), name), name).not.toBeNull();
  }
  await page.locator('[data-ar-workshop]').screenshot({ path: 'reports/automobile-workshop/full-shop.png' });
  await page.locator('#ar-shop-tool').selectOption('socket');
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('Choose Work order');
  for (let i = 0; i < 5; i++) await perform(page);
  await page.waitForFunction(() => (window as any).__shopObject('workshop-vehicle')?.data.liftState === 'raised');
  await expect(page.locator('[data-ar-shop-lift]')).toHaveText('Raised — not yet locked');
  await perform(page);
  await page.waitForFunction(() => (window as any).__shopObject('workshop-vehicle')?.data.liftState === 'locked');
  expect(await page.evaluate(() => (window as any).__shopObject('workshop-vehicle').y)).toBeCloseTo(1.58);
  await perform(page);
  await page.waitForFunction(() => (window as any).__shopObject('removed-front-wheel'));
  expect(await page.evaluate(() => (window as any).__shopObject('mounted-wheel--1.3-0.79'))).toBeNull();
  await page.locator('[data-ar-shop-camera="station"]').click();
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/brake-inspection.png' });
  await page.locator('[data-ar-shop-go-task]').click();
  await page.locator('#ar-shop-tool').selectOption('gauge');
  await page.locator('#ar-shop-answer').fill('3');
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('Check the measurement');
  await perform(page); await perform(page);
  await page.waitForFunction(() => (window as any).__shopObject('brake-pad--1.3-0.79')?.data.thicknessMm === 8);
  await page.locator('[data-ar-shop-station="exhaust"]').click();
  await page.locator('[data-ar-shop-camera="station"]').click();
  await page.waitForFunction(() => {
    const w = window as any;
    const object = w.__shopScene.getObjectByName('workshop-underbody');
    const center = new w.THREE.Box3().setFromObject(object).getCenter(new w.THREE.Vector3());
    const projected = center.clone().project(w.__shopCamera);
    return w.__shopCamera.position.y >= 0.12 && w.__shopCamera.position.y < center.y && Math.abs(projected.y) < 0.5;
  });
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/underbody.png' });
  await perform(page); await perform(page); await perform(page);
  await perform(page);
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('Write a handoff');
  await page.locator('#ar-shop-notes').fill('Found 2 mm pads below the 3 mm limit. Serviced the front axle, verified fastener torque and brake operation.');
  await perform(page);
  await expect(page.locator('[data-ar-shop-complete]')).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download work order', exact: true }).click();
  expect((await downloadEvent).suggestedFilename()).toBe('auto-workshop-brakes.txt');
  await page.getByRole('button', { name: 'Detailed engine bay', exact: true }).click();
  await page.getByRole('button', { name: 'Return to workshop', exact: true }).click();
  await expect(page.locator('[data-ar-shop-complete]')).toBeVisible();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-vehicle'));
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('mobile controls, reduced motion and independent work-order progress', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { autoRepair: { view: 'workshop' } });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await perform(page);
  await page.locator('#ar-shop-job').selectOption('electrical');
  await perform(page);
  await perform(page, 'lamp');
  // Offscreen viewers intentionally pause their RAF; inspect geometry after returning to it.
  await page.locator('.ar-bay-viewport').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-hood-pivot')?.rotation < -1);
  await page.locator('[data-ar-shop-go-task]').click();
  await page.locator('#ar-shop-tool').selectOption('meter');
  await prepareInstrument(page);
  await page.locator('#ar-shop-answer').fill('1.4');
  await page.locator('[data-ar-shop-perform]').click();
  await perform(page, 'terminal-kit');
  await page.locator('.ar-bay-viewport').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !(window as any).__shopObject('workshop-terminal-corrosion'));
  await perform(page, 'meter');
  await page.locator('#ar-shop-notes').fill('Found excessive drop at the positive joint. Serviced the connection. Repeat loaded voltage drop was 0.08 V.');
  await perform(page, 'job-card');
  await page.locator('#ar-shop-job').selectOption('brakes');
  await expect(page.locator('[data-ar-shop-task="setup"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-ar-workshop]').screenshot({ path: 'reports/automobile-workshop/mobile.png' });
  const viewport = page.locator('.ar-bay-viewport');
  await viewport.scrollIntoViewIfNeeded();
  const before = await page.locator('#wrap canvas').screenshot();
  await page.waitForTimeout(200);
  const after = await page.locator('#wrap canvas').screenshot();
  expect(Buffer.compare(before, after)).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('oil work order updates fluid and filter geometry and preserves the recorded calculation', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'oil' } } });
  const oilTools: Record<string, string> = { drain: 'drain-pan', filter: 'filter', refill: 'funnel', verify: 'checklist' };
  while (await page.locator('[data-ar-shop-perform]').count()) {
    const id = (await page.locator('[data-ar-shop-perform]').getAttribute('data-ar-shop-perform'))!;
    if (id === 'release') await page.locator('#ar-shop-notes').fill('Serviced the oil and filter using the service sheet. Verified fill level, pressure indication and absence of leaks.');
    await perform(page, oilTools[id] || equipment[id], '0.5');
    if (id === 'drain') {
      await page.locator('.ar-bay-viewport').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => (window as any).__shopObject('engine-oil-sump')?.data.fluidState === 'drained');
      expect(await page.evaluate(() => (window as any).__shopObject('captured-used-oil'))).not.toBeNull();
    }
    if (id === 'refill') {
      await page.locator('.ar-bay-viewport').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => (window as any).__shopObject('engine-oil-sump')?.data.fluidState === 'filled');
    }
  }
  await expect(page.locator('[data-ar-shop-complete]')).toBeVisible();
  const history = await page.evaluate(() => (window as any).__toolData.autoRepair.shop.history);
  expect(history.find((entry: any) => entry.id === 'refill').result).toContain('Learner calculation: 0.5 L.');
  await page.locator('.ar-bay-viewport').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-hood-pivot')?.rotation < -1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('station labels stay attached to physical components and the final views remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await harness.mount(page, { autoRepair: { view: 'workshop' } });
  await page.waitForFunction(() => (window as any).__shopObject('service-desk')?.data.labelAnchor);
  const anchor = await page.evaluate(() => {
    const w = window as any, desk = w.__shopScene.getObjectByName('service-desk');
    return desk.localToWorld(desk.userData.labelAnchor.clone()).toArray();
  });
  expect(anchor[0]).toBeCloseTo(-2.9); expect(anchor[1]).toBeCloseTo(1.15);
  expect(await page.evaluate(() => (window as any).__shopObject('workshop-two-post-lift').data.noSelectionScale)).toBe(true);
  await page.locator('[data-ar-workshop]').screenshot({ path: 'reports/automobile-workshop/full-shop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-ar-workshop]').screenshot({ path: 'reports/automobile-workshop/mobile.png' });
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'shop', {
    job: 'brakes', step: 7, station: 'brakes', tool: 'gauge', lift: 'locked', wheelRemoved: true, hood: false
  }));
  await page.locator('.ar-bay-viewport').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (window as any).__shopObject('removed-front-wheel'));
  await page.locator('[data-ar-shop-camera="station"]').click();
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/brake-inspection.png' });
  await page.locator('[data-ar-shop-station="exhaust"]').click();
  await page.locator('[data-ar-shop-camera="station"]').click();
  await page.waitForFunction(() => {
    const w = window as any, car = w.__shopScene.getObjectByName('workshop-vehicle');
    return w.__shopCamera.position.y >= 0.12 && w.__shopCamera.position.y < car.position.y;
  });
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/underbody.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('voltmeter setup changes the real display and fresh evidence is required after service', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'electrical', step: 2, station: 'engine', tool: 'meter', hood: true } } });
  await page.locator('[data-ar-shop-instrument-read]').click();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('12.6 V');
  await page.locator('#ar-shop-answer').fill('1.4');
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('Operate the equipment');
  await page.locator('#ar-shop-instrument-mode').selectOption('resistance');
  await page.locator('[data-ar-shop-instrument-read]').click();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('DC volts');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveAttribute('data-ar-shop-reading', '');
  await prepareInstrument(page);
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('1.6 V');
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-live-voltmeter')?.data.reading === 1.6);
  expect(await page.evaluate(() => (window as any).__shopObject('workshop-meter-black-lead').data.contact)).toBe('positive-clamp');
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/voltmeter-before.png' });
  await page.locator('[data-ar-shop-perform]').click();
  await perform(page, 'terminal-kit');
  await page.locator('#ar-shop-tool').selectOption('meter');
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('Operate the equipment');
  await prepareInstrument(page);
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('0.08 V');
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-live-voltmeter')?.data.reading === 0.08);
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/voltmeter-after.png' });
  await page.locator('[data-ar-shop-perform]').click();
  expect(await page.evaluate(() => (window as any).__toolData.autoRepair.shop.verified)).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('the physical wheel fasteners and accessible diagram share the reassembly sequence', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'brakes', step: 9, station: 'brakes', tool: 'torque', lift: 'locked', wheelRemoved: true, serviced: true, measured: true } } });
  await page.locator('[data-ar-shop-seat-wheel]').click();
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-wheel-fastener-0'));
  const point = await page.evaluate(() => {
    const w = window as any, lug = w.__shopScene.getObjectByName('workshop-wheel-fastener-0');
    const position = lug.getWorldPosition(new w.THREE.Vector3()).project(w.__shopCamera);
    const rect = document.querySelector('#wrap canvas')!.getBoundingClientRect();
    return { x: rect.left + (position.x + 1) * rect.width / 2, y: rect.top + (1 - position.y) * rect.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('[data-ar-shop-lugs-checked]')).toHaveAttribute('data-ar-shop-lugs-checked', '1');
  await page.locator('[data-ar-shop-lug="1"]').click();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('cross-hub diagram');
  await page.locator('[data-ar-shop-lug="0"]').click();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('already checked');
  for (const index of [2, 4, 1, 3]) await page.locator('[data-ar-shop-lug="' + index + '"]').click();
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-wheel-fastener-3')?.data.checked === true);
  await page.locator('[data-ar-workshop]').screenshot({ path: 'reports/automobile-workshop/wheel-torque.png' });
  await page.locator('[data-ar-shop-perform]').click();
  expect(await page.evaluate(() => (window as any).__toolData.autoRepair.shop.wheelRemoved)).toBe(false);
  expect(await page.evaluate(() => (window as any).__toolData.autoRepair.shop.torqued)).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('the measured jug and lining gauge render their captured values and survive mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'oil', step: 9, station: 'engine', tool: 'funnel', lift: 'ground', oilDrained: true, plugSecured: true, serviced: true } } });
  await page.locator('[data-ar-shop-jug-change="500"]').click();
  await page.locator('[data-ar-shop-instrument-read]').click();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('4.6 L');
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-measuring-jug')?.data.quantityMl === 4600);
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/measured-oil.png' });
  await page.locator('[data-ar-shop-jug-change="100"]').click();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveAttribute('data-ar-shop-reading', '');
  await page.locator('#ar-shop-answer').fill('0.5');
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('Operate the equipment');
  await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'shop', { job: 'brakes', step: 7, station: 'brakes', tool: 'gauge', lift: 'locked', wheelRemoved: true }));
  await page.locator('#ar-shop-instrument-surface').selectOption('backing');
  await page.locator('[data-ar-shop-instrument-read]').click();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('5 mm');
  await page.locator('#ar-shop-instrument-surface').selectOption('lining');
  await page.locator('[data-ar-shop-instrument-read]').click();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('2 mm');
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-pad-thickness-gauge')?.data.reading === 2);
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/lining-gauge.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-ar-workshop]').screenshot({ path: 'reports/automobile-workshop/instruments-mobile.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('alignment setup, live 3D toe, target picking and verified handoff complete a fourth job', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'alignment' } } });
  await perform(page);
  await page.locator('[data-ar-shop-go-task]').click();
  await page.locator('#ar-shop-tool').selectOption('aligner');
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-task="alignment-setup"]')).toBeVisible();
  for (const check of ['tyres', 'targets']) await page.locator('[data-ar-alignment-check="' + check + '"]').click();
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-task="alignment-setup"]')).toBeVisible();
  await page.locator('[data-ar-alignment-check="centered"]').click();
  await page.locator('[data-ar-shop-perform]').click();
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-alignment-rig')?.data.prepared);
  for (const name of ['alignment-target-left', 'alignment-target-right', 'alignment-turnplate-left', 'alignment-rear-slip-plate-right', 'stowed-lift-arm--0.75-1.36']) expect(await page.evaluate(n => (window as any).__shopObject(n), name)).not.toBeNull();
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/alignment-before.png' });
  await page.locator('[data-ar-alignment-cutaway]').click();
  await page.waitForFunction(() => (window as any).__shopScene.getObjectByName('vehicle-floorpan')?.visible === false);
  expect(await page.evaluate(() => (window as any).__shopScene.getObjectByName('workshop-brake-station').visible)).toBe(true);
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/alignment-chassis-before.png' });
  await page.locator('[data-ar-shop-instrument-read]').click();
  await page.locator('#ar-shop-answer').fill('0.4');
  await page.locator('[data-ar-shop-perform]').click();
  await page.locator('#ar-shop-tool').selectOption('tie-rod');
  await page.locator('[data-ar-alignment-side="right"]').click();
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.waitForFunction(() => (window as any).__shopObject('alignment-target-frame-left'));
  const point = await page.evaluate(() => {
    const w = window as any, object = w.__shopScene.getObjectByName('alignment-target-frame-left');
    const position = object.getWorldPosition(new w.THREE.Vector3()).project(w.__shopCamera);
    const rect = document.querySelector('.ar-bay-viewport canvas')!.getBoundingClientRect();
    return { x: rect.left + (position.x + 1) / 2 * rect.width, y: rect.top + (1 - position.y) / 2 * rect.height };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('[data-ar-alignment-side="left"]')).toHaveAttribute('aria-pressed', 'true');
  for (let i = 0; i < 4; i++) await page.locator('[data-ar-alignment-adjust="-5"]').click();
  await expect(page.locator('[data-ar-alignment-total]')).toHaveAttribute('data-ar-alignment-total', '0.2');
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.waitForFunction(() => (window as any).__shopObject('mounted-wheel--1.3-0.79')?.data.toeDegrees === 0.1);
  const wheel = await page.evaluate(() => {
    const o = (window as any).__shopScene.getObjectByName('mounted-wheel--1.3-0.79'); return { yaw: o.rotation.y, scale: o.userData.visualMagnification };
  });
  expect(wheel.yaw).toBeCloseTo(-0.1 * Math.PI / 180 * 24); expect(wheel.scale).toBe(24);
  expect(await page.evaluate(() => (window as any).__shopScene.getObjectByName('alignment-steering-corner-left').rotation.y)).toBeCloseTo(wheel.yaw);
  await page.locator('[data-ar-shop-instrument-read]').click();
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/alignment-after.png' });
  await page.locator('[data-ar-alignment-cutaway]').click();
  await page.waitForFunction(() => (window as any).__shopScene.getObjectByName('vehicle-floorpan')?.visible === true);
  await page.locator('[data-ar-shop-perform]').click();
  await page.locator('#ar-shop-tool').selectOption('aligner');
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-task="verify"]')).toBeVisible();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('Operate the equipment');
  await page.locator('[data-ar-shop-instrument-read]').click();
  await page.locator('[data-ar-shop-perform]').click();
  await page.locator('#ar-shop-notes').fill('Measured +0.40° total toe. Adjusted left toe to +0.10°, kept right at +0.10°, secured and repeated the alignment measurement.');
  await perform(page);
  await expect(page.locator('[data-ar-shop-complete]')).toBeVisible();
  const history = await page.locator('details').last().textContent();
  expect(history).toContain('Left 0.30°, right 0.10°, total 0.40°');
  expect(history).toContain('Left 0.10°, right 0.10°, total 0.20°');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('alignment rejects a misleading passing total and preserves adjustments on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'alignment', step: 3, station: 'brakes', tool: 'tie-rod', measured: true, alignmentReady: true,
    alignment: { left: 30, right: -10, tyres: true, targets: true, centered: true } } } });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await expect(page.locator('[data-ar-alignment-total]')).toContainText('Total in range');
  await expect(page.locator('[data-ar-alignment-balance]')).toHaveAttribute('data-ar-alignment-balance', 'adjust');
  await page.locator('[data-ar-shop-instrument-read]').click();
  await expect(page.locator('[data-ar-shop-reading-valid]')).toHaveAttribute('data-ar-shop-reading-valid', 'false');
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-task="service"]')).toBeVisible();
  for (let i = 0; i < 4; i++) await page.locator('[data-ar-alignment-adjust="-5"]').click();
  await page.locator('[data-ar-alignment-side="right"]').click();
  for (let i = 0; i < 4; i++) await page.locator('[data-ar-alignment-adjust="5"]').click();
  await page.locator('[data-ar-shop-instrument-read]').click();
  await expect(page.locator('[data-ar-shop-reading-valid]')).toHaveAttribute('data-ar-shop-reading-valid', 'true');
  await page.locator('[data-ar-alignment-adjust="1"]').click();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveAttribute('data-ar-shop-reading', '');
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-task="service"]')).toBeVisible();
  await page.locator('#ar-shop-job').selectOption('oil');
  await page.locator('#ar-shop-job').selectOption('alignment');
  await expect(page.locator('[data-ar-alignment-total]')).toHaveAttribute('data-ar-alignment-total', '0.21');
  await expect(page.locator('[data-ar-alignment-side="right"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-ar-shop-instrument]').screenshot({ path: 'reports/automobile-workshop/alignment-mobile.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


async function shopPoint(page: any, name: string) {
  await page.evaluate(() => { (window as any).__shopClickStable = null; });
  await page.waitForFunction(n => {
    const w = window as any, object = w.__shopScene?.getObjectByName(n);
    if (!object || !w.__shopCamera) return false;
    const point = object.getWorldPosition(new w.THREE.Vector3()).project(w.__shopCamera);
    const previous = w.__shopClickStable;
    if (previous && previous.frame === w.__shopRenderCount) return false;
    const count = previous && Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y) < 0.00001 ? previous.count + 1 : 0;
    w.__shopClickStable = { frame: w.__shopRenderCount, x: point.x, y: point.y, count };
    return count >= 3 && Math.abs(point.x) < 1 && Math.abs(point.y) < 1;
  }, name);
  return await page.evaluate(n => {
    const w = window as any, object = w.__shopScene.getObjectByName(n);
    const point = object.getWorldPosition(new w.THREE.Vector3()).project(w.__shopCamera);
    const rect = document.querySelector('.ar-bay-viewport canvas')!.getBoundingClientRect();
    return { x: rect.left + (point.x + 1) / 2 * rect.width, y: rect.top + (1 - point.y) / 2 * rect.height };
  }, name);
}
async function clickShop(page: any, name: string) { const point = await shopPoint(page, name); await page.mouse.click(point.x, point.y); }
async function pickPhysicalTool(page: any, id: string) {
  await page.locator('[data-ar-scene-tools-focus]').click();
  await clickShop(page, 'workshop-tool-kit-' + id);
  await expect(page.locator('#ar-shop-tool')).toHaveValue(id);
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('Picked up');
  await page.locator('[data-ar-scene-focus]').click();
}

test('direct 3D hood, tool cases and meter controls capture diagnostic evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'electrical', step: 1, station: 'engine', tool: 'lamp' } } });
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-hood');
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('Hood opened');
  await expect(page.locator('[data-ar-shop-task="hood"]')).toBeVisible();
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-task');
  await expect(page.locator('[data-ar-shop-task="measure"]')).toBeVisible();
  await page.locator('[data-ar-scene-tools-focus]').click();
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/direct-tool-tray.png' });
  await clickShop(page, 'workshop-tool-kit-meter');
  await expect(page.locator('#ar-shop-tool')).toHaveValue('meter');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'voltmeter-mode-dial');
  await expect(page.locator('#ar-shop-instrument-mode')).toHaveValue('resistance');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'voltmeter-mode-dial');
  await expect(page.locator('#ar-shop-instrument-mode')).toHaveValue('dcv');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-meter-contact');
  await expect(page.locator('#ar-shop-instrument-contact')).toHaveValue('joint');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-meter-load');
  await expect(page.locator('#ar-shop-instrument-load')).toHaveValue('starter');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-display-— V');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('1.6 V');
  await page.locator('[data-ar-scene-focus]').click();
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/direct-meter-controls.png' });
  await clickShop(page, 'workshop-control-task');
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('Check the measurement');
  await page.locator('#ar-shop-scene-answer').fill('1.4');
  await expect(page.locator('#ar-shop-answer')).toHaveValue('1.4');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-task');
  await expect(page.locator('[data-ar-shop-task="service"]')).toBeVisible();
  await pickPhysicalTool(page, 'terminal-kit');
  await clickShop(page, 'workshop-terminal-corrosion');
  await expect(page.locator('[data-ar-shop-task="verify"]')).toBeVisible();
  await pickPhysicalTool(page, 'meter');
  await clickShop(page, 'workshop-display-— V');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('0.08 V');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('direct lift controls distinguish orbit drag from a click and enforce the current task', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'brakes', step: 2, station: 'lift', tool: 'lamp', lift: 'prepared' } } });
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-task');
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('Choose Lift controls');
  await pickPhysicalTool(page, 'lift-controls');
  const point = await shopPoint(page, 'workshop-control-task');
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  await page.mouse.move(point.x + 70, point.y + 20, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('[data-ar-shop-task="low-lift"]')).toBeVisible();
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-task');
  await expect(page.locator('[data-ar-shop-task="stability"]')).toBeVisible();
  await expect(page.locator('[data-ar-shop-lift]')).toHaveText('Low lift — check stability');
  await page.locator('[data-ar-scene-focus]').click();
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/direct-lift-controls.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('direct jug and alignment controls change scene state and remain keyboard-accessible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'oil', step: 9, station: 'engine', tool: 'funnel', lift: 'ground', serviced: true, plugSecured: true } } });
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-jug-add');
  await expect(page.locator('[data-ar-shop-jug-quantity]')).toHaveAttribute('data-ar-shop-jug-quantity', '4600');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'jug-clear-container');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('4.6 L');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-jug-remove');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveAttribute('data-ar-shop-reading', '');
  await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'shop', { job: 'alignment', step: 3, station: 'brakes', tool: 'tie-rod', measured: true, alignmentReady: true,
    alignment: { left: 10, right: 10, selected: 'right', tyres: true, targets: true, centered: true } }));
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-toe-plus');
  await expect(page.locator('[data-ar-alignment-total]')).toHaveAttribute('data-ar-alignment-total', '0.21');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await page.locator('[data-ar-scene-action="toe-minus"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ar-alignment-total]')).toHaveAttribute('data-ar-alignment-total', '0.2');
  await page.locator('[data-ar-scene-action="read"]').click();
  await expect(page.locator('[data-ar-shop-reading-valid]')).toHaveAttribute('data-ar-shop-reading-valid', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-ar-scene-controls]').screenshot({ path: 'reports/automobile-workshop/direct-controls-mobile.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('physical lift stop latches, survives view changes and resets without resuming motion', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'brakes', step: 4, station: 'lift', tool: 'lift-controls', lift: 'checked' } } });
  await page.locator('[data-ar-lift-focus]').click();
  await clickShop(page, 'lift-emergency-stop');
  await expect(page.locator('[data-ar-lift-stop-status]')).toHaveAttribute('data-ar-lift-stop-status', 'stopped');
  await page.waitForFunction(() => (window as any).__shopObject('lift-emergency-stop')?.data.latched === true);
  expect(await page.evaluate(() => (window as any).__shopObject('workshop-vehicle').y)).toBeCloseTo(0.18);
  await page.locator('[data-ar-lift-focus]').click();
  await clickShop(page, 'workshop-control-task');
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('Lift stop is latched');
  await expect(page.locator('[data-ar-shop-task="raise"]')).toBeVisible();
  await page.locator('[data-ar-shop-perform]').click();
  await expect(page.locator('[data-ar-shop-feedback]')).toContainText('Lift stop is latched');
  await page.locator('[data-ar-lift-focus]').click();
  await clickShop(page, 'workshop-control-lift-reset');
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('Confirm the simulated bay is clear');
  await page.locator('[data-ar-lift-focus]').click();
  await clickShop(page, 'workshop-control-lift-clear');
  await expect(page.locator('[data-ar-scene-action="lift-clear"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-ar-lift-focus]').click();
  await shopPoint(page, 'workshop-control-lift-reset');
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/lift-stop-latched.png' });
  await clickShop(page, 'workshop-control-lift-reset');
  await expect(page.locator('[data-ar-lift-stop-status]')).toHaveAttribute('data-ar-lift-stop-status', 'ready');
  await page.waitForFunction(() => (window as any).__shopObject('lift-emergency-stop')?.data.latched === false);
  expect(await page.evaluate(() => (window as any).__shopObject('workshop-vehicle').y)).toBeCloseTo(0.18);
  await expect(page.locator('[data-ar-shop-task="raise"]')).toBeVisible();
  await page.locator('[data-ar-lift-focus]').click();
  await clickShop(page, 'workshop-control-task');
  await expect(page.locator('[data-ar-shop-task="locks"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await page.locator('[data-ar-scene-action="lift-stop"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-ar-lift-stop-status]')).toHaveAttribute('data-ar-lift-stop-status', 'stopped');
  await page.locator('[data-ar-shop-station="tools"]').click();
  await expect(page.locator('[data-ar-lift-stop-status]')).toHaveAttribute('data-ar-lift-stop-status', 'stopped');
  await page.locator('[data-ar-lift-stop-panel]').screenshot({ path: 'reports/automobile-workshop/lift-stop-mobile.png' });
  await page.locator('[data-ar-scene-action="lift-clear"]').focus(); await page.keyboard.press('Enter');
  await page.locator('[data-ar-scene-action="lift-reset"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-ar-lift-stop-status]')).toHaveAttribute('data-ar-lift-stop-status', 'ready');
  await expect(page.locator('[data-ar-shop-task="locks"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('brake explorer separates real parts, supports physical picking and restores service interactions', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'brakes', step: 8, station: 'brakes', tool: 'brake-kit', lift: 'locked', wheelRemoved: true, measured: true } } });
  await page.locator('[data-ar-brake-focus]').click();
  await clickShop(page, 'workshop-control-brake-spread');
  await expect(page.locator('#ar-brake-spacing')).toHaveValue('100');
  for (const part of ['rotor', 'caliper', 'pad']) {
    await page.locator('[data-ar-brake-focus]').click();
    await clickShop(page, 'brake-' + part + '--1.3-0.79');
    await expect(page.locator('[data-ar-brake-part]')).toHaveAttribute('data-ar-brake-part', part);
    await expect(page.locator('[data-ar-shop-task="service"]')).toBeVisible();
  }
  await page.locator('[data-ar-brake-focus]').click();
  await shopPoint(page, 'brake-pad--1.3-0.79');
  const positions = await page.evaluate(() => ['rotor', 'pad', 'caliper'].map(part => (window as any).__shopScene.getObjectByName('brake-' + part + '--1.3-0.79').position.z));
  expect(positions[0]).toBeCloseTo(0.99); expect(positions[1]).toBeCloseTo(1.435); expect(positions[2]).toBeCloseTo(1.87);
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/brake-explorer-3d.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await page.locator('#ar-brake-spacing').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#ar-brake-spacing')).toHaveValue('5');
  await page.keyboard.press('End'); await expect(page.locator('#ar-brake-spacing')).toHaveValue('100');
  await page.locator('[data-ar-scene-action="brake-part-caliper"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-ar-brake-part]')).toHaveAttribute('data-ar-brake-part', 'caliper');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-ar-brake-explorer]').screenshot({ path: 'reports/automobile-workshop/brake-explorer-mobile.png' });
  await page.setViewportSize({ width: 1360, height: 1100 });
  await page.locator('[data-ar-brake-focus]').click();
  await clickShop(page, 'workshop-control-brake-join');
  await expect(page.locator('#ar-brake-spacing')).toHaveValue('0');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'brake-caliper--1.3-0.79');
  await expect(page.locator('[data-ar-shop-task="refit"]')).toBeVisible();
  await page.locator('[data-ar-scene-action="brake-part-pad"]').click();
  await expect(page.locator('[data-ar-brake-part]')).toContainText('Model lining: 8 mm');
  await page.locator('[data-ar-scene-action="brake-spread"]').click();
  await page.locator('#ar-shop-tool').selectOption('torque');
  await page.locator('[data-ar-scene-action="seat"]').click();
  await expect(page.locator('[data-ar-brake-explorer]')).toHaveCount(0);
  await page.waitForFunction(() => (window as any).__shopScene.getObjectByName('brake-pad--1.3-0.79')?.position.z < 0.82);
  await expect(page.locator('[data-ar-shop-task="refit"]')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('detailed brake parts retain clickable components, tracked gauge and selected-part close-ups', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'brakes', step: 7, station: 'brakes', tool: 'gauge', lift: 'locked', wheelRemoved: true, brakeSpread: 100, brakePart: 'pad' } } });
  await page.locator('[data-ar-brake-focus]').click();
  await shopPoint(page, 'gauge-digital-head');
  const details = await page.evaluate(() => {
    const s = (window as any).__shopScene, rotor = s.getObjectByName('brake-rotor--1.3-0.79'), pad = s.getObjectByName('brake-pad--1.3-0.79');
    return { vents: rotor.children.filter((c: any) => c.name.startsWith('rotor-vent-vane')).length,
      studs: rotor.children.filter((c: any) => c.name.startsWith('rotor-hub-stud')).length,
      lining: pad.getObjectByName('pad-friction-lining').geometry.parameters.depth,
      backing: !!pad.getObjectByName('pad-steel-backing'), piston: !!s.getObjectByName('brake-caliper--1.3-0.79').getObjectByName('caliper-piston-face'),
      gauge: s.getObjectByName('workshop-pad-thickness-gauge').position.toArray() };
  });
  expect(details).toMatchObject({ vents: 16, studs: 5, backing: true, piston: true });
  expect(details.lining).toBeCloseTo(0.012); expect(details.gauge).toEqual([-0.7, 0.2, 0.62]);
  await clickShop(page, 'gauge-digital-head');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('2 mm');
  await page.locator('[data-ar-brake-closeup]').click();
  await shopPoint(page, 'brake-pad--1.3-0.79');
  const centered = await page.evaluate(() => (window as any).__shopScene.getObjectByName('brake-pad--1.3-0.79').getWorldPosition(new (window as any).THREE.Vector3()).project((window as any).__shopCamera).toArray());
  expect(Math.abs(centered[0])).toBeLessThan(0.05); expect(Math.abs(centered[1])).toBeLessThan(0.05);
  const distance = await page.evaluate(() => (window as any).__shopCamera.position.distanceTo((window as any).__shopScene.getObjectByName('brake-pad--1.3-0.79').getWorldPosition(new (window as any).THREE.Vector3())));
  // The host preserves an authored home-target offset in its orbit math.
  expect(distance).toBeLessThan(1.7);
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/brake-pad-closeup.png' });
  await page.locator('[data-ar-brake-focus]').click();
  await clickShop(page, 'workshop-control-gauge-surface');
  await expect(page.locator('#ar-shop-instrument-surface')).toHaveValue('backing');
  await page.locator('[data-ar-brake-focus]').click(); await clickShop(page, 'gauge-digital-head');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('5 mm');
  await expect(page.locator('[data-ar-shop-reading-valid]')).toHaveAttribute('data-ar-shop-reading-valid', 'false');
  await page.locator('[data-ar-scene-action="brake-part-rotor"]').click();
  await page.locator('[data-ar-brake-closeup]').click();
  await shopPoint(page, 'brake-rotor--1.3-0.79');
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/brake-rotor-closeup.png' });
  await page.locator('[data-ar-scene-action="brake-join"]').click();
  await page.locator('[data-ar-brake-focus]').click();
  await page.waitForFunction(() => (window as any).__shopScene.getObjectByName('workshop-pad-thickness-gauge').position.length() === 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await page.locator('[data-ar-brake-closeup]').focus(); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('[data-ar-shop-task="measure"]')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('live task guide navigates tools, evidence and calculation without performing the task', async ({ page }) => {
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'brakes', step: 7, station: 'tools', tool: 'lamp', lift: 'locked', wheelRemoved: true } } });
  const guide = page.locator('[data-ar-task-guide]'), go = page.locator('[data-ar-task-guide-go]');
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'tool');
  await go.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-ar-scene-tool]').first()).toBeFocused();
  await expect(page.locator('#ar-shop-tool')).toHaveValue('lamp');
  await page.locator('[data-ar-scene-tool="gauge"]').click();
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'station');
  await go.click();
  await expect(page.locator('[data-ar-scene-action="task"]')).toBeFocused();
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'evidence');
  await go.click();
  await expect(page.locator('[data-ar-scene-action="read"]')).toBeFocused();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveAttribute('data-ar-shop-reading', '');
  // The learner, rather than navigation, captures evidence.
  await page.keyboard.press('Enter');
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'calculation');
  await go.click(); await expect(page.locator('#ar-shop-scene-answer')).toBeFocused();
  await page.keyboard.type('6');
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'ready');
  await guide.locator('summary').click();
  await expect(guide.locator('[data-ar-check-ready="false"]')).toHaveCount(0);
  await guide.screenshot({ path: 'reports/automobile-workshop/task-guide-ready.png' });
  await go.click();
  await expect(page.locator('[data-ar-shop-task="measure"]')).toHaveCount(1);
  await expect(page.locator('[data-ar-scene-action="task"]')).toBeFocused();
  // Camera and explorer changes preserve readiness; a changed gauge setup does not.
  await page.locator('[data-ar-scene-action="brake-spread"]').click();
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'ready');
  await page.locator('[data-ar-scene-action="gauge-surface"]').click();
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'evidence');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await go.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-ar-scene-action="gauge-surface"]')).toBeFocused();
  await guide.screenshot({ path: 'reports/automobile-workshop/task-guide-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('live task guide supports lift recovery, alignment, wheel seating and customer handoff', async ({ page }) => {
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'brakes', step: 2, station: 'lift', tool: 'lift-controls', lift: 'prepared', liftStopped: true } } });
  const guide = page.locator('[data-ar-task-guide]'), go = page.locator('[data-ar-task-guide-go]');
  await go.click(); await expect(page.locator('[data-ar-scene-action="lift-clear"]')).toBeFocused();
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'lift-stop');
  await page.keyboard.press('Enter');
  await go.click(); await expect(page.locator('[data-ar-scene-action="lift-reset"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'ready');
  await expect(page.locator('[data-ar-shop-task="low-lift"]')).toHaveCount(1);
  await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'shop', { job: 'alignment', step: 1, station: 'brakes', tool: 'aligner' }));
  for (const check of ['tyres', 'targets', 'centered']) {
    await go.click(); await expect(page.locator('[data-ar-scene-action="check-' + check + '"]')).toBeFocused();
    await page.keyboard.press('Enter');
  }
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'ready');
  await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'shop', { job: 'brakes', step: 9, station: 'brakes', tool: 'torque', lift: 'locked', wheelRemoved: true, serviced: true }));
  await go.click(); await expect(page.locator('[data-ar-scene-action="seat"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await go.click(); await expect(page.locator('[data-ar-shop-lug="0"]')).toBeFocused();
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'evidence');
  await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'shop', { job: 'electrical', step: 5, station: 'intake', tool: 'job-card', verified: true }));
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'handoff');
  await go.click(); await expect(page.locator('#ar-shop-scene-notes')).toBeFocused();
  await page.keyboard.type('Repaired the connection and verified loaded voltage drop.');
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'ready');
  await go.click(); await expect(page.locator('[data-ar-scene-action="task"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(guide).toHaveAttribute('data-ar-task-guide', 'complete');
  await go.click(); await expect(page.locator('#ar-shop-work-order')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('instrument coach identifies meter setup and routes keyboard focus without changing it', async ({ page }) => {
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'electrical', step: 2, station: 'engine', tool: 'meter', hood: true,
    instrument: { mode: 'resistance', contact: 'posts', load: 'off' } } } });
  const coach = page.locator('[data-ar-instrument-coach="meter"]'), go = page.locator('[data-ar-task-guide-go]');
  await expect(coach).toHaveAttribute('data-ar-coach-status', 'setup');
  await expect(page.locator('[data-ar-task-guide-status]')).toContainText('Select DC volts');
  await go.click(); await expect(page.locator('[data-ar-scene-action="meter-mode"]')).toBeFocused();
  await expect(page.locator('#ar-shop-instrument-mode')).toHaveValue('resistance');
  await page.keyboard.press('Enter');
  await expect(coach).toContainText('Move the probes');
  await go.click(); await expect(page.locator('[data-ar-scene-action="meter-contact"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(coach).toContainText('Apply the simulated starter load');
  await go.click(); await expect(page.locator('[data-ar-scene-action="meter-load"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(coach).toHaveAttribute('data-ar-coach-status', 'capture');
  await go.click(); await expect(page.locator('[data-ar-scene-action="read"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(coach).toHaveAttribute('data-ar-coach-status', 'captured');
  await expect(coach.locator('[data-ar-coach-capture="valid"]')).toContainText('1.6 V');
  await expect(page.locator('[data-ar-shop-task="measure"]')).toHaveCount(1);
  await expect(page.locator('#ar-shop-scene-answer')).toHaveValue('');
  await coach.screenshot({ path: 'reports/automobile-workshop/instrument-coach-meter.png' });
  await page.locator('[data-ar-scene-action="meter-load"]').click();
  await expect(coach).toContainText('No current capture');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await coach.screenshot({ path: 'reports/automobile-workshop/instrument-coach-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('physical fine-fill control changes the jug by 100 mL and coaching routes alignment adjustment', async ({ page }) => {
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'oil', step: 9, station: 'engine', tool: 'funnel', serviced: true, plugSecured: true,
    instrument: { jugMl: 4500 } } } });
  const go = page.locator('[data-ar-task-guide-go]');
  await go.click(); await expect(page.locator('[data-ar-scene-action="jug-fine"]')).toBeFocused();
  await expect(page.locator('[data-ar-shop-jug-quantity]')).toHaveAttribute('data-ar-shop-jug-quantity', '4500');
  await page.locator('[data-ar-scene-focus]').click();
  await clickShop(page, 'workshop-control-jug-fine');
  await expect(page.locator('[data-ar-shop-jug-quantity]')).toHaveAttribute('data-ar-shop-jug-quantity', '4600');
  await expect(page.locator('[data-ar-instrument-coach="jug"]')).toHaveAttribute('data-ar-coach-status', 'capture');
  await page.locator('[data-ar-scene-focus]').click(); await clickShop(page, 'jug-clear-container');
  await expect(page.locator('[data-ar-coach-capture="valid"]')).toContainText('4.6 L');
  await page.locator('[data-ar-scene-focus]').click();
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/jug-fine-control.png' });
  await page.locator('[data-ar-scene-focus]').click(); await clickShop(page, 'workshop-control-jug-fine');
  await expect(page.locator('[data-ar-shop-jug-quantity]')).toHaveAttribute('data-ar-shop-jug-quantity', '4700');
  await expect(page.locator('[data-ar-instrument-coach="jug"]')).toContainText('No current capture');
  await expect(page.locator('[data-ar-shop-task="refill"]')).toHaveCount(1);
  await page.evaluate(() => (window as any).__ctx.update('autoRepair', 'shop', { job: 'alignment', step: 3, station: 'brakes', tool: 'tie-rod', measured: true, alignmentReady: true,
    alignment: { left: 30, right: 10, selected: 'left', tyres: true, targets: true, centered: true } }));
  await expect(page.locator('[data-ar-instrument-coach="alignment"]')).toHaveAttribute('data-ar-coach-status', 'adjust');
  await go.click(); await expect(page.locator('[data-ar-alignment-panel]')).toBeFocused();
  await expect(page.locator('[data-ar-alignment-total]')).toHaveAttribute('data-ar-alignment-total', '0.4');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('battery close-up places probes on physical contacts and preserves unchanged evidence', async ({ page }) => {
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'electrical', step: 2, station: 'engine', tool: 'meter', hood: true } } });
  const closeup = page.locator('[data-ar-meter-contacts-focus]');
  await page.locator('[data-ar-scene-action="read"]').click();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('12.6 V');
  await closeup.click();
  await clickShop(page, 'workshop-probe-label-posts');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('12.6 V');
  await closeup.click();
  await clickShop(page, 'positive-clamp-bolt');
  await expect(page.locator('#ar-shop-instrument-contact')).toHaveValue('joint');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveAttribute('data-ar-shop-reading', '');
  await closeup.click();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-meter-black-lead')?.data.contact === 'positive-clamp');
  expect(await page.evaluate(() => (window as any).__shopObject('workshop-probe-target-joint').data.selected)).toBe(true);
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/battery-joint-contact.png' });
  await page.locator('[data-ar-scene-action="meter-load"]').click();
  await page.locator('[data-ar-scene-action="read"]').click();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('1.6 V');
  await closeup.click(); await clickShop(page, 'workshop-meter-black-probe');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('1.6 V');
  await expect(page.locator('#ar-shop-instrument-contact')).toHaveValue('joint');
  await closeup.click(); await clickShop(page, 'negative-post');
  await expect(page.locator('#ar-shop-instrument-contact')).toHaveValue('posts');
  await closeup.click();
  await page.waitForFunction(() => (window as any).__shopObject('workshop-meter-black-lead')?.data.contact === 'negative-post');
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/battery-post-contact.png' });
  await page.locator('[data-ar-scene-action="read"]').click();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('10.4 V');
  await expect(page.locator('[data-ar-shop-reading-valid]')).toHaveAttribute('data-ar-shop-reading-valid', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  const joint = page.locator('[data-ar-scene-action="meter-joint"]');
  await joint.focus(); await page.keyboard.press('Enter');
  await expect(joint).toHaveAttribute('aria-pressed', 'true');
  await closeup.focus(); await page.keyboard.press('Enter');
  await shopPoint(page, 'workshop-probe-label-joint');
  await page.locator('.ar-shop-viewport').screenshot({ path: 'reports/automobile-workshop/battery-contacts-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('[data-ar-shop-task="measure"]')).toHaveCount(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('3D inspection previews controls, expires changed state and explicitly applies a current selection', async ({ page }) => {
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'electrical', step: 2, station: 'engine', tool: 'meter', hood: true } } });
  await page.locator('[data-ar-shop-interaction="inspect"]').click();
  await page.locator('[data-ar-scene-focus]').click();
  const before = await page.evaluate(() => JSON.stringify((window as any).__ctx.toolData.autoRepair.shop));
  await clickShop(page, 'workshop-control-meter-load');
  await expect(page.locator('[data-ar-control-preview]')).toContainText('Apply simulated starter load');
  expect(await page.evaluate(() => JSON.stringify((window as any).__ctx.toolData.autoRepair.shop))).toBe(before);
  await expect(page.locator('#ar-shop-instrument-load')).toHaveValue('off');
  await page.locator('[data-ar-control-inspector]').screenshot({ path: 'reports/automobile-workshop/control-inspector-desktop.png' });
  await page.locator('[data-ar-control-use]').click();
  await expect(page.locator('#ar-shop-instrument-load')).toHaveValue('starter');
  await expect(page.locator('#ar-shop-inspect-target')).toBeFocused();
  await expect(page.locator('[data-ar-control-use]')).toHaveCount(0);
  await page.locator('#ar-shop-inspect-target').selectOption('shop-use-electrical-2-read');
  await page.locator('[data-ar-scene-action="meter-contact"]').click();
  await expect(page.locator('[data-ar-control-preview]')).toContainText('workshop changed');
  await expect(page.locator('[data-ar-control-use]')).toHaveCount(0);
  await page.locator('#ar-shop-inspect-target').selectOption('shop-use-electrical-2-read');
  await page.locator('[data-ar-control-use]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('1.6 V');
  await expect(page.locator('[data-ar-shop-task="measure"]')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await page.locator('#ar-shop-inspect-target').selectOption('shop-use-electrical-2-meter-posts');
  await page.locator('[data-ar-control-inspector]').screenshot({ path: 'reports/automobile-workshop/control-inspector-mobile.png' });
  await page.locator('[data-ar-control-dismiss]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#ar-shop-inspect-target')).toBeFocused();
  await expect(page.locator('[data-ar-shop-reading]')).toHaveText('1.6 V');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('inspection keeps the physical stop immediate and retains lift gates and drag behavior', async ({ page }) => {
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'brakes', step: 2, station: 'lift', tool: 'lamp', lift: 'prepared' } } });
  await page.locator('[data-ar-shop-interaction="inspect"]').click();
  await page.locator('[data-ar-scene-focus]').click(); await clickShop(page, 'workshop-control-task');
  await expect(page.locator('[data-ar-control-preview]')).toContainText('Perform the current work-order step');
  await page.locator('[data-ar-control-use]').click();
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('Choose Lift controls');
  await expect(page.locator('[data-ar-shop-task="low-lift"]')).toHaveCount(1);
  await page.locator('[data-ar-lift-focus]').click();
  await clickShop(page, 'lift-emergency-stop');
  await expect(page.locator('[data-ar-lift-stop-status]')).toHaveAttribute('data-ar-lift-stop-status', 'stopped');
  await expect(page.locator('[data-ar-control-use]')).toHaveCount(0);
  await page.locator('[data-ar-lift-focus]').click();
  const point = await shopPoint(page, 'workshop-control-task');
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 65, point.y + 10, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('[data-ar-control-use]')).toHaveCount(0);
  await page.locator('[data-ar-shop-interaction="operate"]').click();
  await expect(page.locator('#ar-shop-inspect-target')).toHaveCount(0);
  await page.locator('[data-ar-lift-focus]').click(); await clickShop(page, 'workshop-control-lift-clear');
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('bay-clear check recorded');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('moving 3D torque wrench, numbered targets and inspection share five deliberate checks', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1100 });
  await harness.mount(page, { autoRepair: { view: 'workshop', shop: { job: 'brakes', step: 9, station: 'brakes', tool: 'torque', lift: 'locked', wheelRemoved: true, serviced: true, measured: true } } });
  await page.locator('[data-ar-shop-seat-wheel]').click();
  await page.locator('[data-ar-shop-instrument-focus]').click();
  const count = () => page.evaluate(() => (window as any).__toolData.autoRepair.shop.lugs.length);
  const next = (index: number | null) => page.waitForFunction(i => (window as any).__shopObject('workshop-torque-wrench')?.data.nextLug === i, index);
  await next(0);
  await clickShop(page, 'workshop-wheel-progress');
  expect(await count()).toBe(0);
  await expect(page.locator('[data-ar-shop-lug="0"]')).toHaveAttribute('aria-current', 'step');
  const first = await page.evaluate(() => { const w=window as any, p=w.__shopScene.getObjectByName('workshop-torque-wrench-socket').position; return { x:p.x, y:p.y }; });
  await clickShop(page, 'workshop-torque-wrench-grip');
  await next(2); expect(await count()).toBe(1);
  const second = await page.evaluate(() => { const w=window as any, p=w.__shopScene.getObjectByName('workshop-torque-wrench-socket').position; return { x:p.x, y:p.y }; });
  expect(second).not.toEqual(first);
  await clickShop(page, 'workshop-wheel-number-4');
  expect(await count()).toBe(1);
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('cross-hub diagram');
  await clickShop(page, 'workshop-wheel-number-0');
  expect(await count()).toBe(1);
  await expect(page.locator('[data-ar-scene-feedback]')).toContainText('already checked');
  await page.locator('[data-ar-shop-interaction="inspect"]').click();
  await page.locator('.ar-bay-viewport').scrollIntoViewIfNeeded();
  await clickShop(page, 'workshop-torque-wrench-grip');
  await expect(page.locator('[data-ar-control-preview]')).toContainText('Check fastener 3');
  expect(await count()).toBe(1);
  await page.locator('[data-ar-control-use]').click();
  expect(await count()).toBe(2);
  await page.locator('[data-ar-shop-interaction="operate"]').click();
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await next(4);
  await page.locator('.ar-bay-viewport').screenshot({ path: 'reports/automobile-workshop/moving-torque-wrench-desktop.png' });
  await clickShop(page, 'workshop-wheel-number-4');
  await next(1); expect(await count()).toBe(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-ar-shop-instrument-focus]').click();
  await clickShop(page, 'workshop-torque-wrench-grip');
  await next(3); expect(await count()).toBe(4);
  await page.locator('.ar-bay-viewport').screenshot({ path: 'reports/automobile-workshop/moving-torque-wrench-mobile.png' });
  await clickShop(page, 'workshop-torque-wrench-grip');
  await next(null); expect(await count()).toBe(5);
  expect(await page.evaluate(() => (window as any).__shopObject('workshop-wheel-next-ring'))).toBeNull();
  await clickShop(page, 'workshop-torque-wrench-grip');
  expect(await count()).toBe(5);
  expect(await page.evaluate(() => (window as any).__toolData.autoRepair.shop.step)).toBe(9);
  expect(await page.evaluate(() => (window as any).__toolData.autoRepair.shop.wheelRemoved)).toBe(true);
  await page.locator('[data-ar-shop-perform]').click();
  expect(await page.evaluate(() => (window as any).__toolData.autoRepair.shop)).toMatchObject({ step: 10, torqued: true, wheelRemoved: false });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
