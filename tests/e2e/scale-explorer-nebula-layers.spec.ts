import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const repo = path.resolve('.');
const out = path.resolve(process.env.SCALE_LAYERS_REPORT_DIR || 'reports/scale-explorer-nebula-layers');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100, layout: 'document',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `window.__layerEncodes=0;const png=HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL=function(){if(this.width===96&&this.height===96)window.__layerEncodes++;return png.apply(this,arguments);};`
});
type Pose = { x: number; y: number; z: number; heading: number; pitch: number; travel: number };
type Point = { x: number; z: number };
const canvas = (p: Page) => p.locator('[data-atlas-ready]');
const chart = (p: Page) => p.locator('[data-nebula-chart-map]');
const image = (p: Page) => p.locator('[data-nebula-map-slice]');
const nav = (p: Page) => p.getByRole('region', { name: 'Nebula navigation', exact: true });
const preview = (p: Page) => p.getByRole('button', { name: 'Preview cloud layers', exact: true });
const slider = (p: Page) => p.getByRole('slider', { name: 'Preview layer height', exact: true });
const profile = (p: Page) => p.locator('[data-nebula-layer-profile]');
const travel = (p: Page) => p.getByRole('button', { name: 'Travel to layer', exact: true });
const follow = (p: Page) => p.getByRole('button', { name: 'Follow camera layer', exact: true });
const info = (p: Page) => p.locator('[data-nebula-layer-info]');
const pose = async (p: Page): Promise<Pose> => JSON.parse((await canvas(p).getAttribute('data-atlas-nebula-position'))!);
const progress = async (p: Page) => Number(await canvas(p).getAttribute('data-atlas-nebula-progress'));
const encodes = (p: Page) => p.evaluate(() => (window as any).__layerEncodes);
const positionFixed = (v: Pose) => ({ x: v.x, z: v.z, heading: v.heading, pitch: v.pitch, travel: v.travel });
function save(name: string, data: unknown) { writeFileSync(path.join(out, name + '.json'), JSON.stringify(data, null, 2) + '\n'); }

async function mount(page: Page, options: { phone?: boolean; reduced?: boolean; cockpit?: boolean } = {}) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (options.phone) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      return type === 'webgl2' ? null : original.apply(this, [type, ...args] as any);
    };
  });
  await page.emulateMedia({ reducedMotion: options.reduced ? 'reduce' : 'no-preference' });
  await page.setViewportSize({ width: options.phone ? 320 : 1400, height: options.phone ? 780 : 1100 });
  await harness.mount(page, { _scaleExplorer: { ambient: false } }, '!!document.querySelector("[data-atlas-ready]")');
  const tools = page.getByRole('button', { name: 'Show all tools', exact: true });
  if (await tools.count()) await tools.click();
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('orion-nebula');
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', 'orion-nebula');
  await page.getByRole('button', { name: 'Enter the nebula', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active');
  await expect(image(page)).toHaveAttribute('href', /^data:image\/png;base64,/);
  await expect(preview(page)).toHaveCount(0);
  if (options.cockpit !== false) await page.getByRole('button', { name: 'Flight cockpit', exact: true }).click();
  await page.locator('[data-nebula-map-toggle]').click();
  await expect(chart(page)).toHaveAttribute('role', 'application');
  await expect(preview(page)).toHaveAttribute('aria-pressed', 'false');
  const target = await preview(page).getAttribute('aria-controls');
  expect(target).toBeTruthy(); expect(await page.locator('[data-nebula-layer-controls]').getAttribute('id')).toBe(target);
  await expect(profile(page)).toHaveCount(0);
  return errors;
}
async function setHeight(page: Page, height: number) {
  if (!await slider(page).count()) await preview(page).click();
  await expect(slider(page)).toHaveAttribute('min', '-12'); await expect(slider(page)).toHaveAttribute('max', '12'); await expect(slider(page)).toHaveAttribute('step', '0.1');
  await slider(page).fill(String(height));
  await expect(image(page)).toHaveAttribute('data-nebula-map-height', String(height));
  await expect(image(page)).toHaveAttribute('data-nebula-map-preview', 'true');
  await expect(page.locator('output[data-nebula-slice-height]')).toHaveText('Preview slice near ' + (height >= 0 ? '+' : '') + height.toFixed(1) + ' ly');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', height.toFixed(1) + ' light-years in the model');
}
async function marker(page: Page, name: string, height: number, visible = true) {
  const node = page.locator('[data-nebula-layer-' + name + ']');
  await expect(node).toHaveAttribute('visibility', visible ? 'visible' : 'hidden');
  if (visible) await expect(node).toHaveAttribute('transform', 'translate(0,' + (96 - Math.max(-12, Math.min(12, height)) * 6).toFixed(3) + ')');
}
async function choose(page: Page, target: Point, touch = false) {
  await chart(page).scrollIntoViewIfNeeded();
  const where = await chart(page).evaluate((n, v) => {
    const svg = n as SVGSVGElement, p = svg.createSVGPoint(); p.x = 100 + v.x / 33.6 * 200; p.y = 100 + v.z / 33.6 * 200;
    const s = p.matrixTransform(svg.getScreenCTM()!); return { x: s.x, y: s.y };
  }, target);
  if (touch) await page.touchscreen.tap(where.x, where.y); else await page.mouse.click(where.x, where.y);
  await expect(page.locator('[data-nebula-chart-selection]')).toHaveCount(1);
  const point = await page.locator('[data-nebula-chart-selection]').getAttribute('transform');
  const nums = point!.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/ig)!.map(Number);
  const actual = { x: (nums[0] - 100) / 200 * 33.6, z: (nums[1] - 100) / 200 * 33.6 };
  expect(Math.abs(actual.x - target.x)).toBeLessThan(touch ? .14 : 1e-5); expect(Math.abs(actual.z - target.z)).toBeLessThan(touch ? .14 : 1e-5);
  return actual;
}
async function scene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, record = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost()); let root: any;
    record.scene.traverse((n: any) => { if (n.userData.itemId === 'orion-nebula') root = n; });
    const model = root.userData.model, nebula = model.userData.nebula;
    return { type: record.type, draws: record.draws, renders: record.renders, identity: { texture: nebula.cloud.material.uniforms.uVolume.value.uuid, stars: Array.from(nebula.stars.geometry.attributes.position.array), scale: root.scale.x } };
  });
}
async function framesStart(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__layerFrames = []; w.__layerCapture = true;
    function capture() { if (!w.__layerCapture) return; const c = document.querySelector('[data-atlas-ready]') as HTMLElement;
      if (c?.dataset.atlasNebulaPosition) w.__layerFrames.push({ pose: JSON.parse(c.dataset.atlasNebulaPosition), progress: Number(c.dataset.atlasNebulaProgress), course: c.dataset.atlasNebulaCourse });
      w.__layerFrame = requestAnimationFrame(capture); } capture();
  });
}
async function framesStop(page: Page): Promise<{ pose: Pose; progress: number; course?: string }[]> {
  return page.evaluate(() => { const w = window as any; w.__layerCapture = false; cancelAnimationFrame(w.__layerFrame); return w.__layerFrames; });
}
async function midCourse(page: Page) {
  await page.waitForFunction(() => { const c = document.querySelector('[data-atlas-ready]') as HTMLElement, p = Number(c.dataset.atlasNebulaProgress); return c.dataset.atlasNebulaCourse === 'moving' && p > .05 && p < .8; }, null, { timeout: 30000, polling: 50 });
}
async function capture(page: Page, name: string) {
  await page.locator('.sx-nebula-map').screenshot({ path: path.join(out, name + '-map.png') });
  await page.locator('[data-nebula-layer-controls]').screenshot({ path: path.join(out, name + '-layers.png') });
  await page.locator('.sx-stage').screenshot({ path: path.join(out, name + '-stage.png') });
  const pixels = await harness.glPixels(page); expect(pixels).not.toBeNull(); expect(looksBlank(pixels!)).toBe(false); writeFileSync(path.join(out, name + '-gl.png'), pixels!.png);
}

test.beforeAll(async () => {
  mkdirSync(out, { recursive: true }); expect(process.env.STEM_GL_SUBSTITUTE || '').toBe('');
  const sha = (file: string) => createHash('sha256').update(readFileSync(repo + '/' + file)).digest('hex');
  save('layers-browser-source', { checkedAt: new Date().toISOString(), sourceSha256: sha('stem_lab/stem_tool_scaleexplorer.js'), desktopSha256: sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'), substitution: null }); await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  await page.evaluate(() => { const w = window as any; w.__layerCapture = false; if (w.__layerFrame) cancelAnimationFrame(w.__layerFrame); });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('layer preview has exact height markers and caches the chart image without moving the camera', async ({ page }) => {
  const errors = await mount(page), start = await pose(page), original = await image(page).getAttribute('href'), initialScene = await scene(page);
  await setHeight(page, 3.5); const changed = await image(page).getAttribute('href'), count = await encodes(page);
  expect(changed).not.toBe(original); expect(await pose(page)).toEqual(start); expect((await scene(page)).identity).toEqual(initialScene.identity);
  await marker(page, 'camera', start.y); await marker(page, 'preview', 3.5); await marker(page, 'course', 0, false);
  await expect(page.locator('[data-nebula-layer-camera-height]')).toHaveText('+0.80 ly'); await expect(info(page)).toHaveText('Rise 2.70 ly to this layer');
  await expect(travel(page)).toBeEnabled();
  await choose(page, { x: 3.5, z: -2.25 }); await chart(page).press('ArrowLeft'); await chart(page).press('ArrowRight');
  expect(await pose(page)).toEqual(start); expect(await encodes(page)).toBe(count); expect(await image(page).getAttribute('href')).toBe(changed);
  await slider(page).fill('3.5'); expect(await encodes(page)).toBe(count);
  await setHeight(page, -12); await marker(page, 'preview', -12); await setHeight(page, 12); await marker(page, 'preview', 12);
  await follow(page).click(); await expect(slider(page)).toHaveCount(0); await expect(preview(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(image(page)).toHaveAttribute('data-nebula-map-preview', 'false'); await expect(image(page)).toHaveAttribute('data-nebula-map-height', '0.8');
  expect(await image(page).getAttribute('href')).toBe(original); expect(await pose(page)).toEqual(start); await expect(profile(page)).toHaveCount(0);
  await setHeight(page, 3.5); await capture(page, 'layers-desktop-preview');
  await page.locator('[data-nebula-map-toggle]').click(); await expect(preview(page)).toHaveCount(0); await expect(image(page)).toHaveAttribute('data-nebula-map-preview', 'false');
  await page.locator('[data-nebula-map-toggle]').click(); await expect(preview(page)).toHaveAttribute('aria-pressed', 'false'); await expect(slider(page)).toHaveCount(0);
  save('layers-desktop-preview', { start, encodesAtRepeatedHeight: count, identity: initialScene.identity, errors }); expect(errors).toEqual([]);
});

test('vertical passage freezes its destination, pauses and resumes with no change to horizontal position or view', async ({ page }) => {
  const errors = await mount(page), start = await pose(page); await setHeight(page, -5.2); await framesStart(page); await travel(page).click();
  await expect(preview(page)).toHaveAttribute('aria-pressed', 'false'); await expect(slider(page)).toHaveCount(0); await expect(image(page)).toHaveAttribute('data-nebula-map-preview', 'false');
  await midCourse(page); await chart(page).press('Space'); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'paused');
  const stopped = await pose(page), p = await progress(page); expect(positionFixed(stopped)).toEqual(positionFixed(start)); expect(stopped.y).toBeLessThan(start.y); expect(stopped.y).toBeGreaterThan(-5.2);
  await page.waitForTimeout(200); expect(await pose(page)).toEqual(stopped); expect(await progress(page)).toBe(p); await marker(page, 'course', -5.2);
  await setHeight(page, 4.6); await marker(page, 'preview', 4.6); await marker(page, 'course', -5.2); await expect(info(page)).toContainText('Destination -5.2 ly');
  expect(await pose(page)).toEqual(stopped); expect(await progress(page)).toBe(p);
  await follow(page).click(); await nav(page).getByRole('button', { name: 'Resume passage', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived', { timeout: 45000 }); const arrived = await pose(page), frames = await framesStop(page);
  expect(arrived).toEqual({ ...start, y: -5.2 }); await marker(page, 'camera', -5.2); await marker(page, 'course', -5.2); await expect(info(page)).toHaveText('Layer reached at -5.2 ly');
  const moving = frames.filter(f => f.course === 'moving'); expect(moving.length).toBeGreaterThan(2); expect(moving.some(f => f.progress > .05 && f.progress < .95)).toBe(true);
  frames.forEach(f => expect(positionFixed(f.pose)).toEqual(positionFixed(start))); moving.forEach((f, i) => { if (i) expect(f.pose.y).toBeLessThanOrEqual(moving[i - 1].pose.y); });
  await expect(page.locator('[data-nebula-chart-course-target]')).toHaveAttribute('visibility', 'hidden'); await expect(page.locator('[data-nebula-course-path]')).toHaveAttribute('visibility', 'hidden');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-destination', /.+/); await expect(page.getByRole('button', { name: 'Look toward destination', exact: true })).toHaveCount(0);
  await capture(page, 'layers-desktop-arrival');
  await setHeight(page, 8); const target = await choose(page, { x: 2.4, z: 1.3 }), chartStart = await pose(page); await page.locator('[data-nebula-chart-fly]').click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived', { timeout: 45000 }); const chartArrived = await pose(page);
  expect(chartArrived.y).toBe(chartStart.y); expect(chartArrived.x).toBeCloseTo(target.x, 8); expect(chartArrived.z).toBeCloseTo(target.z, 8); expect(chartArrived.travel).toBe(chartStart.travel);
  await expect(image(page)).toHaveAttribute('data-nebula-map-height', '8'); await expect(page.locator('[data-nebula-layer-course]')).toHaveAttribute('visibility', 'hidden');
  save('layers-desktop-flight', { start, stopped, pausedProgress: p, arrived, chartStart, chartTarget: target, chartArrived, frames, errors }); expect(errors).toEqual([]);
});

test('320px touch and keyboard previews support immediate reduced-motion travel and clean reset, exit and observation restore', async ({ page }) => {
  const errors = await mount(page, { phone: true, reduced: true }), start = await pose(page); expect((await scene(page)).type).toBe('webgl');
  await preview(page).tap(); await expect(slider(page)).toHaveValue('0.8'); await expect(travel(page)).toBeDisabled();
  await slider(page).press('End'); await expect(slider(page)).toHaveValue('12'); await marker(page, 'preview', 12);
  await slider(page).press('Home'); await expect(slider(page)).toHaveValue('-12'); await marker(page, 'preview', -12);
  await slider(page).press('ArrowRight'); await expect(slider(page)).toHaveValue('-11.9'); await marker(page, 'preview', -11.9);
  await slider(page).scrollIntoViewIfNeeded(); const box = (await slider(page).boundingBox())!; await page.touchscreen.tap(box.x + box.width * .6, box.y + box.height * .5);
  const touchedHeight = Number(await slider(page).inputValue()); expect(touchedHeight).toBeGreaterThan(-11.9); expect(touchedHeight).toBeLessThanOrEqual(12); expect(await pose(page)).toEqual(start);
  await setHeight(page, 3.5); await expect(travel(page)).toBeEnabled(); const fits = await page.locator('[data-nebula-layer-controls]').evaluate(n => { const r = n.getBoundingClientRect(); return { left: r.left, right: r.right, width: innerWidth, documentWidth: document.documentElement.scrollWidth }; });
  expect(fits.left).toBeGreaterThanOrEqual(0); expect(fits.right).toBeLessThanOrEqual(fits.width + 1); expect(fits.documentWidth).toBeLessThanOrEqual(fits.width + 1);
  await capture(page, 'layers-phone-preview'); await framesStart(page); await travel(page).tap(); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived'); const saved = await pose(page), frames = await framesStop(page);
  expect(saved).toEqual({ ...start, y: 3.5 }); expect(frames.every(f => f.course !== 'moving')).toBe(true); await capture(page, 'layers-phone-arrival');
  const book = page.getByRole('region', { name: 'Field notebook', exact: true }); await book.getByRole('textbox').fill('I rose to a new cloud layer while holding my view.'); await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  const recorded = await page.evaluate(() => (window as any).__toolData._scaleExplorer.observations.find((v: any) => v.itemId === 'orion-nebula').nebulaPose); expect(recorded).toEqual(saved);
  await setHeight(page, -4); await nav(page).getByRole('button', { name: 'Reset interior view', exact: true }).click(); await expect.poll(() => pose(page)).toEqual(start);
  await expect(preview(page)).toHaveAttribute('aria-pressed', 'false'); await expect(slider(page)).toHaveCount(0); await expect(profile(page)).toHaveCount(0); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  await setHeight(page, -4); await nav(page).getByRole('button', { name: 'Whole nebula', exact: true }).click(); await expect(preview(page)).toHaveCount(0); await page.getByRole('button', { name: 'Enter the nebula', exact: true }).click();
  if (await chart(page).getAttribute('role') !== 'application') await page.locator('[data-nebula-map-toggle]').click(); await expect(preview(page)).toHaveAttribute('aria-pressed', 'false'); await expect(slider(page)).toHaveCount(0);
  await setHeight(page, -4); await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('moon'); await book.locator('[data-observation="orion-nebula:"]').getByRole('button', { name: /^Return to/ }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active'); await expect.poll(() => pose(page)).toEqual(saved); await expect(slider(page)).toHaveCount(0); await expect(profile(page)).toHaveCount(0); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  await page.waitForTimeout(200); expect(await pose(page)).toEqual(saved); save('layers-phone-controls', { start, touchedHeight, fits, saved, recorded, frames, errors }); expect(errors).toEqual([]);
});

test('320px chart-driven ascent updates slices and completes with no hidden WebGL draws, then manual movement cancels it', async ({ page }) => {
  const errors = await mount(page, { phone: true, cockpit: false }), start = await pose(page); expect((await scene(page)).type).toBe('webgl'); await setHeight(page, 5.8);
  await travel(page).scrollIntoViewIfNeeded(); const viewport = await page.evaluate(() => { const c = document.querySelector('[data-atlas-ready]')!.getBoundingClientRect(); return { bottom: c.bottom, scroll: scrollY, fits: document.documentElement.scrollWidth <= innerWidth + 1 }; });
  expect(viewport.bottom).toBeLessThan(0); expect(viewport.fits).toBe(true); await page.waitForTimeout(150); const before = await scene(page), count = await encodes(page);
  await framesStart(page); await travel(page).tap(); await midCourse(page); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived', { timeout: 45000 });
  const after = await scene(page), arrived = await pose(page), frames = await framesStop(page); expect(arrived).toEqual({ ...start, y: 5.8 });
  expect(after.renders).toBe(before.renders); expect(after.draws).toBe(before.draws); expect(after.identity).toEqual(before.identity); expect(await encodes(page)).toBeGreaterThan(count);
  await expect(image(page)).toHaveAttribute('data-nebula-map-height', '5.8'); expect(await page.evaluate(() => scrollY)).toBeCloseTo(viewport.scroll, 1);
  frames.forEach(f => expect(positionFixed(f.pose)).toEqual(positionFixed(start))); expect(frames.some(f => f.course === 'moving' && f.progress > .05 && f.progress < .95)).toBe(true);
  await setHeight(page, -5.2); await travel(page).tap(); await midCourse(page); await nav(page).getByRole('button', { name: 'Strafe right', exact: true }).press('Enter');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/); const manual = await pose(page); expect(manual.travel).toBeCloseTo(start.travel + .25, 8);
  await expect(profile(page)).toHaveCount(0); await page.waitForTimeout(200); expect(await pose(page)).toEqual(manual);
  save('layers-phone-hidden-flight', { start, arrived, viewport, encodesBefore: count, encodesAfter: await encodes(page), hiddenGL: { rendersBefore: before.renders, rendersAfter: after.renders, drawsBefore: before.draws, drawsAfter: after.draws }, manual, frames, errors }); expect(errors).toEqual([]);
});
