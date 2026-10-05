import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve(process.env.SCALE_CHART_ROUTE_REPORT_DIR || 'reports/scale-explorer-chart-routes');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer',
  width: 1400, height: 1100, layout: 'document',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `window.__routeChartEncodes=0;const png=HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL=function(){if(this.width===96&&this.height===96)window.__routeChartEncodes++;return png.apply(this,arguments);};
    const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__chartRouteCamera=c;return render.apply(this,arguments);};return r;}});`
});
type Pose = { x: number; y: number; z: number; heading: number; pitch: number; travel: number };
type Point = { x: number; z: number };
const canvas = (page: Page) => page.locator('[data-atlas-ready]');
const nav = (page: Page) => page.getByRole('region', { name: 'Nebula navigation', exact: true });
const chart = (page: Page) => page.locator('[data-nebula-chart-map]');
const selection = (page: Page) => page.locator('[data-nebula-chart-selection]');
const destination = (page: Page) => page.locator('[data-nebula-chart-course-target]');
const fly = (page: Page) => page.locator('[data-nebula-chart-fly]');
const pose = async (page: Page): Promise<Pose> => JSON.parse((await canvas(page).getAttribute('data-atlas-nebula-position'))!);
const image = (page: Page) => page.locator('[data-nebula-map-slice]');
const encodes = (page: Page) => page.evaluate(() => (window as any).__routeChartEncodes);

async function mount(page: Page, options: { phone?: boolean; reduced?: boolean } = {}) {
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
  await page.locator('[data-nebula-map-toggle]').click();
  await expect(chart(page)).toHaveAttribute('role', 'application');
  await expect(chart(page)).toHaveAccessibleName('Choose a destination in the cloud chart');
  return errors;
}
async function selected(page: Page): Promise<Point | null> {
  if (!await selection(page).count()) return null;
  const values = (await selection(page).getAttribute('transform'))!.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/ig)!.map(Number);
  return { x: (values[0] - 100) / 200 * 33.6, z: (values[1] - 100) / 200 * 33.6 };
}
async function assertSelection(page: Page, expected: Point) {
  await expect(selection(page)).toHaveCount(1);
  await expect.poll(async () => Math.max(Math.abs((await selected(page))!.x - expected.x), Math.abs((await selected(page))!.z - expected.z))).toBeLessThan(1e-8);
  const transform = (await selection(page).getAttribute('transform'))!;
  const values = transform.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/ig)!.map(Number);
  expect(values[0]).toBeCloseTo(100 + expected.x / 33.6 * 200, 8);
  expect(values[1]).toBeCloseTo(100 + expected.z / 33.6 * 200, 8);
}
async function screenPoint(page: Page, point: Point) {
  return chart(page).evaluate((n, value) => {
    const svg = n as SVGSVGElement, p = svg.createSVGPoint();
    p.x = 100 + value.x / 33.6 * 200; p.y = 100 + value.z / 33.6 * 200;
    const screen = p.matrixTransform(svg.getScreenCTM()!); return { x: screen.x, y: screen.y };
  }, point);
}
async function choose(page: Page, point: Point, touch = false) {
  await chart(page).scrollIntoViewIfNeeded();
  const click = await screenPoint(page, point);
  if (touch) await page.touchscreen.tap(click.x, click.y); else await page.mouse.click(click.x, click.y);
  await expect(selection(page)).toHaveCount(1);
  await expect.poll(async () => {
    const pointNow = await selected(page);
    return pointNow ? Math.max(Math.abs(pointNow.x - point.x), Math.abs(pointNow.z - point.z)) : Infinity;
  }).toBeLessThan(touch ? .14 : 1e-5);
  const actual = (await selected(page))!;
  // SVGPoint stores float coordinates; tolerate its subpixel conversion error.
  expect(Math.abs(actual.x - point.x)).toBeLessThan(touch ? .14 : 1e-5); expect(Math.abs(actual.z - point.z)).toBeLessThan(touch ? .14 : 1e-5);
  const center = await selection(page).evaluate(n => {
    const p = ((n as SVGGraphicsElement).ownerSVGElement as SVGSVGElement).createSVGPoint();
    const c = p.matrixTransform((n as SVGGraphicsElement).getScreenCTM()!); return { x: c.x, y: c.y };
  });
  expect(Math.abs(center.x - click.x)).toBeLessThan(touch ? 1.1 : 1e-4); expect(Math.abs(center.y - click.y)).toBeLessThan(touch ? 1.1 : 1e-4);
  return { point: actual, pointer: click, marker: center };
}
async function scene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, record = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    let root: any; record.scene.traverse((n: any) => { if (n.userData.itemId === 'orion-nebula') root = n; });
    const model = root.userData.model, nebula = model.userData.nebula;
    return { type: record.type, renders: record.renders, draws: record.draws,
      position: model.worldToLocal(w.__chartRouteCamera.position.clone()).multiplyScalar(24).toArray(),
      scale: root.scale.x, stars: Array.from(nebula.stars.geometry.attributes.position.array),
      texture: nebula.cloud.material.uniforms.uVolume.value.uuid,
      span: model.localToWorld(new T.Vector3(.5, 0, 0)).distanceTo(model.localToWorld(new T.Vector3(-.5, 0, 0))) };
  });
}
const identity = (s: Awaited<ReturnType<typeof scene>>) => ({ scale: s.scale, stars: s.stars, texture: s.texture, span: s.span });
async function projectedTarget(page: Page) {
  const values = (await destination(page).getAttribute('transform'))!.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/ig)!.map(Number);
  return { x: (values[0] - 100) / 200 * 33.6, z: (values[1] - 100) / 200 * 33.6 };
}
async function captureFrames(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__chartRouteFrames = []; w.__chartRouteCapture = true;
    function record() {
      if (!w.__chartRouteCapture) return;
      const cv = document.querySelector('[data-atlas-ready]') as HTMLElement;
      if (cv?.dataset.atlasNebulaPosition) w.__chartRouteFrames.push({ pose: JSON.parse(cv.dataset.atlasNebulaPosition), progress: Number(cv.dataset.atlasNebulaProgress), course: cv.dataset.atlasNebulaCourse });
      w.__chartRouteFrame = requestAnimationFrame(record);
    }
    record();
  });
}
async function finishFrames(page: Page): Promise<{ pose: Pose; progress: number; course?: string }[]> {
  return page.evaluate(() => { const w = window as any; w.__chartRouteCapture = false; cancelAnimationFrame(w.__chartRouteFrame); return w.__chartRouteFrames; });
}
async function midCourse(page: Page) {
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-atlas-ready]') as HTMLElement, p = Number(c.dataset.atlasNebulaProgress);
    return c.dataset.atlasNebulaCourse === 'moving' && p > .05 && p < .8;
  }, null, { timeout: 30000, polling: 50 });
}
function assertArrival(actual: Pose, from: Pose, point: Point) {
  expect(actual.x).toBeCloseTo(point.x, 8); expect(actual.z).toBeCloseTo(point.z, 8);
  expect(actual.y).toBe(from.y); expect(actual.travel).toBe(from.travel); expect(actual.pitch).toBe(0);
  expect(actual.heading).toBeCloseTo((Math.atan2(point.x - from.x, from.z - point.z) * 180 / Math.PI + 360) % 360, 8);
}
async function cleanCapture(page: Page, name: string) {
  await page.locator('.sx-nebula-map').screenshot({ path: path.join(out, name + '-map.png') });
  await page.locator('.sx-stage').screenshot({ path: path.join(out, name + '-stage.png') });
  const pixels = await harness.glPixels(page); expect(pixels).not.toBeNull(); expect(looksBlank(pixels!)).toBe(false);
  writeFileSync(path.join(out, name + '-gl.png'), pixels!.png);
}
function save(name: string, data: unknown) { writeFileSync(path.join(out, name + '.json'), JSON.stringify(data, null, 2) + '\n'); }

test.beforeAll(async () => {
  mkdirSync(out, { recursive: true });
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  save('chart-route-source', { sourceSha256: sha('stem_lab/stem_tool_scaleexplorer.js'), desktopSha256: sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'), substitution: process.env.STEM_GL_SUBSTITUTE || null });
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  await page.evaluate(() => { const w = window as any; w.__chartRouteCapture = false; if (w.__chartRouteFrame) cancelAnimationFrame(w.__chartRouteFrame); });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('chart selection follows pointer and keyboard coordinates without moving the camera', async ({ page }) => {
  const errors = await mount(page, { reduced: true }), initial = await pose(page), before = identity(await scene(page));
  await expect(fly(page)).toBeDisabled();
  const pointer = await choose(page, { x: 3.5, z: -2.25 });
  await expect(chart(page)).toBeFocused(); expect(await pose(page)).toEqual(initial);
  await expect(page.locator('[data-nebula-chart-preview]')).toHaveAttribute('visibility', 'visible');
  await chart(page).press('Home'); await assertSelection(page, initial);
  await chart(page).press('ArrowLeft'); await assertSelection(page, { x: initial.x - .25, z: initial.z });
  await chart(page).press('ArrowUp'); await assertSelection(page, { x: initial.x - .25, z: initial.z - .25 });
  await chart(page).press('Shift+ArrowRight'); await assertSelection(page, { x: initial.x + .75, z: initial.z - .25 });
  await chart(page).press('Shift+ArrowDown'); await assertSelection(page, { x: initial.x + .75, z: initial.z + .75 });
  await choose(page, { x: -15, z: -15 });
  await chart(page).press('Shift+ArrowLeft'); await chart(page).press('Shift+ArrowLeft');
  await chart(page).press('Shift+ArrowUp'); await chart(page).press('Shift+ArrowUp');
  await assertSelection(page, { x: -16.8, z: -16.8 });
  await choose(page, { x: 15, z: 15 });
  await chart(page).press('Shift+ArrowRight'); await chart(page).press('Shift+ArrowRight');
  await chart(page).press('Shift+ArrowDown'); await chart(page).press('Shift+ArrowDown');
  await assertSelection(page, { x: 16.8, z: 16.8 });
  await chart(page).press('Delete'); await expect(selection(page)).toHaveCount(0); await expect(fly(page)).toBeDisabled();
  await expect(page.locator('[data-nebula-chart-preview]')).toHaveAttribute('visibility', 'hidden'); await expect(chart(page)).toBeFocused();
  await chart(page).press('Home'); await assertSelection(page, initial);
  await choose(page, { x: 3.5, z: -2.25 });
  expect(await pose(page)).toEqual(initial); expect(identity(await scene(page))).toEqual(before);
  await cleanCapture(page, 'chart-selection-desktop'); save('chart-selection-desktop', { initial, pointer }); expect(errors).toEqual([]);
});

test('a chart flight keeps its departure height, pauses and resumes, and changing the selection leaves its destination fixed', async ({ page }) => {
  const errors = await mount(page), before = identity(await scene(page));
  const chosen = await choose(page, { x: -3.36, z: 1.68 });
  const initial = await pose(page);
  await nav(page).getByRole('button', { name: 'Rise through cloud', exact: true }).press('Enter');
  await expect.poll(async () => (await pose(page)).y).toBeCloseTo(initial.y + .25, 8);
  const start = await pose(page), count = await encodes(page);
  await expect(page.locator('[data-nebula-chart-info]')).toContainText((start.y >= 0 ? '+' : '') + start.y.toFixed(2));
  await captureFrames(page); await fly(page).click(); await midCourse(page);
  const beforeRepeat = Number(await canvas(page).getAttribute('data-atlas-nebula-progress'));
  await chart(page).evaluate(n => n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', repeat: true, bubbles: true, cancelable: true })));
  expect(Number(await canvas(page).getAttribute('data-atlas-nebula-progress'))).toBeGreaterThanOrEqual(beforeRepeat);
  const courseTarget = await projectedTarget(page); expect(courseTarget.x).toBeCloseTo(chosen.point.x, 8); expect(courseTarget.z).toBeCloseTo(chosen.point.z, 8);
  const activePath = await page.locator('[data-nebula-course-path]').getAttribute('d');
  const other = await choose(page, { x: 4.2, z: 4.2 });
  expect(await page.locator('[data-nebula-course-path]').getAttribute('d')).toBe(activePath);
  expect(await projectedTarget(page)).toEqual(courseTarget);
  await nav(page).getByRole('button', { name: 'Brake', exact: true }).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'paused');
  const paused = await pose(page), progress = Number(await canvas(page).getAttribute('data-atlas-nebula-progress'));
  await page.waitForTimeout(300); expect(await pose(page)).toEqual(paused);
  await page.locator('.sx-nebula-map').screenshot({ path: path.join(out, 'chart-flight-paused-desktop-map.png') });
  const resume = nav(page).getByRole('button', { name: 'Resume passage', exact: true });
  await resume.scrollIntoViewIfNeeded(); const scroll = await page.evaluate(() => scrollY);
  await resume.click();
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 1); await expect(canvas(page)).not.toBeFocused();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived', { timeout: 45000 });
  const arrived = await pose(page); assertArrival(arrived, start, chosen.point);
  const frames = await finishFrames(page); expect(frames.length).toBeGreaterThan(3);
  expect(frames.some(f => f.course === 'moving' && f.progress > .05 && f.progress < .95)).toBe(true);
  frames.forEach(f => { expect(f.pose.y).toBe(start.y); expect(f.pose.travel).toBe(start.travel); });
  const progressFrames = frames.filter(f => Number.isFinite(f.progress));
  progressFrames.forEach((f, i) => { if (i) expect(f.progress).toBeGreaterThanOrEqual(progressFrames[i - 1].progress); });
  expect(await encodes(page)).toBe(count); expect(await selected(page)).toEqual(other.point);
  await fly(page).click(); await midCourse(page);
  await nav(page).getByRole('button', { name: 'Strafe right', exact: true }).press('Enter');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/);
  const stopped = await pose(page); expect(stopped.travel).toBeCloseTo(start.travel + .25, 8);
  await page.waitForTimeout(300); expect(await pose(page)).toEqual(stopped);
  await expect(destination(page)).toHaveAttribute('visibility', 'hidden'); expect(identity(await scene(page))).toEqual(before);
  await cleanCapture(page, 'chart-flight-desktop'); save('chart-flight-desktop', { start, selected: chosen.point, other: other.point, courseTarget, activePath, paused, progress, arrived, stopped, frames }); expect(errors).toEqual([]);
});

test('320px WebGL 1 allows touch scrolling and flies from the chart with no hidden WebGL draws', async ({ page }) => {
  const errors = await mount(page, { phone: true }), before = identity(await scene(page)); expect((await scene(page)).type).toBe('webgl');
  const first = await choose(page, { x: 4.032, z: -3.36 }, true), initial = await pose(page);
  const scrollBefore = await page.evaluate(() => scrollY), box = (await chart(page).boundingBox())!, cdp = await page.context().newCDPSession(page);
  const x = box.x + box.width * .75, y = box.y + box.height * .8;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 28 }] }); await page.waitForTimeout(30); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore + 20);
  expect(await selected(page)).toEqual(first.point); expect(await pose(page)).toEqual(initial);
  const chosen = await choose(page, { x: 2.52, z: 6.72 }, true);
  await fly(page).scrollIntoViewIfNeeded();
  // A visible launch button does not guarantee that the cloud is fully offscreen.
  await canvas(page).evaluate(node => { const bottom = node.getBoundingClientRect().bottom; if (bottom >= 0) window.scrollBy({ top: bottom + 8, behavior: 'instant' as ScrollBehavior }); });
  const viewport = await page.evaluate(() => { const c=document.querySelector('[data-atlas-ready]')!.getBoundingClientRect(), b=document.querySelector('[data-nebula-chart-fly]')!.getBoundingClientRect(); return {height:innerHeight,canvas:{top:c.top,bottom:c.bottom},button:{top:b.top,bottom:b.bottom},scroll:scrollY,documentFits:document.documentElement.scrollWidth<=innerWidth+1}; });
  save('chart-route-phone-viewport', viewport); expect(viewport.canvas.bottom).toBeLessThan(0); expect(viewport.documentFits).toBe(true);
  await page.waitForTimeout(150); const hiddenBefore = await scene(page), start = await pose(page), count = await encodes(page);
  await captureFrames(page); await fly(page).click(); await midCourse(page);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(viewport.scroll, 1); await expect(canvas(page)).not.toBeFocused();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived', { timeout: 45000 });
  const arrived = await pose(page); assertArrival(arrived, start, chosen.point);
  const hiddenAfter = await scene(page), frames = await finishFrames(page);
  expect(hiddenAfter.renders).toBe(hiddenBefore.renders); expect(hiddenAfter.draws).toBe(hiddenBefore.draws); expect(await encodes(page)).toBe(count);
  expect(frames.some(f => f.course === 'moving' && f.progress > .05 && f.progress < .95)).toBe(true);
  frames.forEach(f => { expect(f.pose.y).toBe(start.y); expect(f.pose.travel).toBe(start.travel); });
  expect(identity(hiddenAfter)).toEqual(before);
  await cleanCapture(page, 'chart-route-phone'); save('chart-route-phone', { first, chosen, viewport, start, arrived, hiddenGL:{rendersBefore:hiddenBefore.renders,rendersAfter:hiddenAfter.renders,drawsBefore:hiddenBefore.draws,drawsAfter:hiddenAfter.draws},frames }); expect(errors).toEqual([]);
});

test('Enter travels immediately with reduced motion and the notebook restores the actual pose without a pending chart route', async ({ page }) => {
  const errors = await mount(page, { reduced: true }), before = identity(await scene(page));
  await chart(page).press('Home'); await chart(page).press('Shift+ArrowLeft'); await chart(page).press('Shift+ArrowUp');
  const chosen = (await selected(page))!, start = await pose(page);
  await captureFrames(page); await chart(page).press('Enter');
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived'); await expect(chart(page)).toBeFocused();
  const saved = await pose(page); assertArrival(saved, start, chosen);
  const frames = await finishFrames(page); expect(frames.every(f => f.course !== 'moving')).toBe(true);
  const book = page.getByRole('region', { name: 'Field notebook', exact: true });
  await book.getByRole('textbox').fill('I navigated to a selected cloud point at this height.'); await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  const recorded = await page.evaluate(() => (window as any).__toolData._scaleExplorer.observations.find((entry: any) => entry.itemId === 'orion-nebula').nebulaPose);
  expect(recorded).toEqual(saved);
  await choose(page, { x: -5.2, z: -1.4 });
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('moon');
  await book.locator('[data-observation="orion-nebula:"]').getByRole('button', { name: /^Return to/ }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active'); await expect.poll(() => pose(page)).toEqual(saved);
  await expect(selection(page)).toHaveCount(0); await expect(fly(page)).toBeDisabled();
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/); await expect(destination(page)).toHaveAttribute('visibility', 'hidden');
  await expect(nav(page).getByRole('button', { name: 'Resume passage', exact: true })).toHaveCount(0);
  await page.waitForTimeout(350); expect(await pose(page)).toEqual(saved); expect(identity(await scene(page))).toEqual(before);
  await cleanCapture(page, 'chart-route-restored'); save('chart-route-restored', { start, chosen, saved, recorded, frames }); expect(errors).toEqual([]);
});
