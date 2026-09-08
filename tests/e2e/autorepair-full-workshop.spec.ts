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
