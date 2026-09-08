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
        renderer.render = function (scene, camera) { window.__shopScene = scene; window.__shopCamera = camera; return render.apply(renderer, arguments); };
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
