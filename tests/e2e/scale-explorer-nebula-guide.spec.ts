import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const repo = path.resolve('.');
const out = path.resolve(process.env.SCALE_GUIDE_REPORT_DIR || 'reports/scale-explorer-nebula-guide');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100, layout: 'document',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `window.__guideEncodes=0;const png=HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL=function(){if(this.width===96&&this.height===96)window.__guideEncodes++;return png.apply(this,arguments);};
    const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__guideCamera=c;return render.apply(this,arguments);};return r;}});`
});
type Pose = { x: number; y: number; z: number; heading: number; pitch: number; travel: number };
type Point = { x: number; z: number };
const canvas = (page: Page) => page.locator('[data-atlas-ready]');
const chart = (page: Page) => page.locator('[data-nebula-chart-map]');
const nav = (page: Page) => page.getByRole('region', { name: 'Nebula navigation', exact: true });
const guide = (page: Page) => page.locator('[data-nebula-world-destination]');
const cue = (page: Page) => page.locator('[data-nebula-destination-cue]');
const toggle = (page: Page) => page.getByRole('button', { name: 'Destination guide', exact: true });
const look = (page: Page) => page.getByRole('button', { name: 'Look toward destination', exact: true });
const fly = (page: Page) => page.locator('[data-nebula-chart-fly]');
const pose = async (page: Page): Promise<Pose> => JSON.parse((await canvas(page).getAttribute('data-atlas-nebula-position'))!);
const progress = async (page: Page) => Number(await canvas(page).getAttribute('data-atlas-nebula-progress'));
const horizontal = (p: Pose) => ({ x: p.x, y: p.y, z: p.z, travel: p.travel });
const encodes = (page: Page) => page.evaluate(() => (window as any).__guideEncodes);
function save(name: string, value: unknown) { writeFileSync(path.join(out, name + '.json'), JSON.stringify(value, null, 2) + '\n'); }

async function mount(page: Page, phone = false) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (phone) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      return type === 'webgl2' ? null : original.apply(this, [type, ...args] as any);
    };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: phone ? 320 : 1400, height: phone ? 780 : 1100 });
  await harness.mount(page, { _scaleExplorer: { ambient: false } }, '!!document.querySelector("[data-atlas-ready]")');
  const tools = page.getByRole('button', { name: 'Show all tools', exact: true });
  if (await tools.count()) await tools.click();
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('orion-nebula');
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', 'orion-nebula');
  await page.getByRole('button', { name: 'Enter the nebula', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active');
  await page.locator('[data-nebula-map-toggle]').click();
  await expect(chart(page)).toHaveAttribute('role', 'application');
  await expect(toggle(page)).toHaveCount(0);
  await expect(guide(page).locator('..')).toHaveAttribute('aria-hidden', 'true');
  await expect(cue(page).locator('..')).toHaveAttribute('aria-hidden', 'true');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-destination', /.+/);
  return errors;
}
async function selected(page: Page): Promise<Point | null> {
  const mark = page.locator('[data-nebula-chart-selection]');
  if (!await mark.count()) return null;
  const t = (await mark.getAttribute('transform'))!.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/ig)!.map(Number);
  return { x: (t[0] - 100) / 200 * 33.6, z: (t[1] - 100) / 200 * 33.6 };
}
async function choose(page: Page, point: Point, touch = false) {
  await chart(page).scrollIntoViewIfNeeded();
  const target = await chart(page).evaluate((element, p) => {
    const svg = element as SVGSVGElement, v = svg.createSVGPoint();
    v.x = 100 + p.x / 33.6 * 200; v.y = 100 + p.z / 33.6 * 200;
    const s = v.matrixTransform(svg.getScreenCTM()!); return { x: s.x, y: s.y };
  }, point);
  if (touch) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
  await expect.poll(async () => { const p = await selected(page); return p ? Math.max(Math.abs(p.x - point.x), Math.abs(p.z - point.z)) : Infinity; }).toBeLessThan(touch ? .14 : 1e-5);
  return (await selected(page))!;
}
async function pauseWithChart(page: Page) {
  await chart(page).press('Space');
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'paused');
}
async function midCourse(page: Page) {
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-atlas-ready]') as HTMLElement, p = Number(c.dataset.atlasNebulaProgress);
    return c.dataset.atlasNebulaCourse === 'moving' && p > .04 && p < .8;
  }, null, { timeout: 30000, polling: 50 });
}
async function projection(page: Page, target: Point, targetY: number) {
  return page.evaluate(({ target, targetY }) => {
    const w = window as any, T = w.THREE, camera = w.__guideCamera;
    const record = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    let root: any; record.scene.traverse((n: any) => { if (n.userData.itemId === 'orion-nebula') root = n; });
    const world = root.userData.model.localToWorld(new T.Vector3(target.x / 24, targetY / 24, target.z / 24));
    const cameraPoint = world.clone().applyMatrix4(camera.matrixWorldInverse), ndc = world.clone().project(camera);
    const cv = document.querySelector('[data-atlas-ready]') as HTMLCanvasElement, box = cv.getBoundingClientRect();
    const node = document.querySelector('[data-nebula-world-destination]') as HTMLElement;
    const p = JSON.parse(cv.dataset.atlasNebulaPosition!);
    return { cameraZ: cameraPoint.z, ndc: ndc.toArray(), projected: { x: (ndc.x * .5 + .5) * box.width, y: (-ndc.y * .5 + .5) * box.height }, canvas: { width: box.width, height: box.height, top: box.top, bottom: box.bottom }, transform: node.style.transform, hidden: node.hidden, state: cv.dataset.atlasNebulaDestination, range: Math.hypot(target.x - p.x, targetY - p.y, target.z - p.z), text: node.textContent, type: record.type, renders: record.renders, draws: record.draws };
  }, { target, targetY });
}
async function assertProjected(page: Page, target: Point, targetY: number) {
  await canvas(page).scrollIntoViewIfNeeded();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-destination', 'in-view');
  await expect(guide(page)).toHaveJSProperty('hidden', false);
  const result = await projection(page, target, targetY);
  expect(result.cameraZ).toBeLessThan(0); expect(result.ndc[2]).toBeGreaterThan(-1); expect(result.ndc[2]).toBeLessThan(1);
  const offset = result.transform.match(/translate\(([-+\d.]+)px,\s*([-+\d.]+)px\)/)!;
  expect(offset).not.toBeNull(); expect(Math.abs(Number(offset[1]) - result.projected.x)).toBeLessThan(.11); expect(Math.abs(Number(offset[2]) - result.projected.y)).toBeLessThan(.11);
  expect(result.text).toContain(result.range.toFixed(2) + ' ly'); expect(result.text).toContain('Position reference');
  await expect(page.locator('[data-nebula-destination-bearing]')).toContainText(result.range.toFixed(2) + ' ly');
  return result;
}
async function framesStart(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__guideFrames = []; w.__guideCapture = true;
    function capture() { if (!w.__guideCapture) return; const c = document.querySelector('[data-atlas-ready]') as HTMLElement; if (c?.dataset.atlasNebulaPosition) w.__guideFrames.push({ pose: JSON.parse(c.dataset.atlasNebulaPosition), progress: Number(c.dataset.atlasNebulaProgress), course: c.dataset.atlasNebulaCourse, orienting: c.dataset.atlasNebulaOrienting, destination: c.dataset.atlasNebulaDestination }); w.__guideFrame = requestAnimationFrame(capture); } capture();
  });
}
async function framesStop(page: Page): Promise<{ pose: Pose; progress: number; course?: string; orienting?: string; destination?: string }[]> {
  return page.evaluate(() => { const w = window as any; w.__guideCapture = false; cancelAnimationFrame(w.__guideFrame); return w.__guideFrames; });
}
function exactArrival(arrived: Pose, departure: Pose, target: Point) {
  expect(arrived.x).toBeCloseTo(target.x, 8); expect(arrived.z).toBeCloseTo(target.z, 8); expect(arrived.y).toBe(departure.y); expect(arrived.travel).toBe(departure.travel); expect(arrived.pitch).toBe(0);
}
async function capture(page: Page, name: string) {
  await page.locator('.sx-viewport').screenshot({ path: path.join(out, name + '-viewport.png') });
  await page.locator('.sx-stage').screenshot({ path: path.join(out, name + '-stage.png') });
  const gl = await harness.glPixels(page); expect(gl).not.toBeNull(); expect(looksBlank(gl!)).toBe(false); writeFileSync(path.join(out, name + '-gl.png'), gl!.png);
}

test.beforeAll(async () => {
  mkdirSync(out, { recursive: true });
  expect(process.env.STEM_GL_SUBSTITUTE || '').toBe('');
  const sha = (file: string) => createHash('sha256').update(readFileSync(repo + '/' + file)).digest('hex');
  save('guide-browser-source', { checkedAt: new Date().toISOString(), sourceSha256: sha('stem_lab/stem_tool_scaleexplorer.js'), desktopSha256: sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'), substitution: null });
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  await page.evaluate(() => { const w = window as any; w.__guideCapture = false; if (w.__guideFrame) cancelAnimationFrame(w.__guideFrame); });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('destination guide follows the fixed course through the real camera matrices and rejects a target behind the camera', async ({ page }) => {
  const errors = await mount(page), initial = await pose(page), target = await choose(page, { x: 3.5, z: -2.25 });
  await fly(page).click(); await midCourse(page); await pauseWithChart(page);
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
  const paused = await pose(page), fixedProgress = await progress(page), activeTarget = await page.locator('[data-nebula-chart-course-target]').getAttribute('transform');
  const projected = await assertProjected(page, target, initial.y);
  const other = await choose(page, { x: -8.5, z: 7.5 });
  const afterSelection = await assertProjected(page, target, initial.y);
  expect(await page.locator('[data-nebula-chart-course-target]').getAttribute('transform')).toBe(activeTarget);
  expect(await pose(page)).toEqual(paused); expect(await progress(page)).toBe(fixedProgress);
  expect(afterSelection.transform).toBe(projected.transform); expect(afterSelection.range).toBe(projected.range);
  expect(Math.abs(afterSelection.range - Math.hypot(other.x - paused.x, other.z - paused.z))).toBeGreaterThan(.5);
  await expect(cue(page)).toHaveJSProperty('hidden', false); await capture(page, 'guide-projected-desktop');
  await nav(page).getByRole('button', { name: 'Strafe right', exact: true }).press('Enter');
  const behindFrom = await pose(page), behind = await choose(page, { x: behindFrom.x, z: Math.min(16, behindFrom.z + 4) });
  await fly(page).click(); await pauseWithChart(page); await canvas(page).scrollIntoViewIfNeeded();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-destination', 'behind');
  const rejected = await projection(page, behind, behindFrom.y); expect(rejected.cameraZ).toBeGreaterThan(0); await expect(guide(page)).toHaveJSProperty('hidden', true); await expect(cue(page)).toHaveJSProperty('hidden', false);
  save('guide-projection', { initial, target, paused, projected, other, afterSelection, behindFrom, behind, rejected }); expect(errors).toEqual([]);
});

test('looking toward a destination pauses and turns in place while retaining the route for a chart-preserving resume', async ({ page }) => {
  const errors = await mount(page), departure = await pose(page), target = await choose(page, { x: 8.5, z: 7.5 });
  await fly(page).click(); await midCourse(page);
  const activePath = await page.locator('[data-nebula-course-path]').getAttribute('d'), activeTarget = await page.locator('[data-nebula-chart-course-target]').getAttribute('transform');
  await framesStart(page); await look(page).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'paused');
  const paused = await pose(page), pausedProgress = await progress(page);
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-orienting', 'false', { timeout: 20000 });
  const turned = await pose(page), frames = await framesStop(page);
  expect(horizontal(turned)).toEqual(horizontal(paused)); expect(await progress(page)).toBe(pausedProgress);
  expect(frames.some(f => f.orienting === 'true')).toBe(true);
  for (const frame of frames.filter(f => f.course === 'paused')) { expect(horizontal(frame.pose)).toEqual(horizontal(paused)); expect(frame.progress).toBe(pausedProgress); }
  expect(turned.heading).toBeCloseTo((Math.atan2(target.x - paused.x, paused.z - target.z) * 180 / Math.PI + 360) % 360, 6); expect(turned.pitch).toBeCloseTo(0, 8);
  expect(await page.locator('[data-nebula-course-path]').getAttribute('d')).toBe(activePath); expect(await page.locator('[data-nebula-chart-course-target]').getAttribute('transform')).toBe(activeTarget);
  const projected = await assertProjected(page, target, departure.y); await capture(page, 'guide-look-desktop');
  const resume = nav(page).getByRole('button', { name: 'Resume passage', exact: true });
  await resume.scrollIntoViewIfNeeded(); const scroll = await page.evaluate(() => scrollY), count = await encodes(page);
  await framesStart(page); await resume.click(); expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 1); await expect(canvas(page)).not.toBeFocused();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived', { timeout: 45000 });
  const resumedFrames = await framesStop(page), firstResumed = resumedFrames.find(f => f.course === 'moving');
  expect(firstResumed).toBeDefined(); expect(firstResumed!.progress).toBeGreaterThanOrEqual(pausedProgress);
  const firstTurn = ((firstResumed!.pose.heading - turned.heading + 540) % 360) - 180;
  expect(Math.abs(firstTurn)).toBeLessThan(.25); expect(Math.abs(firstResumed!.pose.pitch - turned.pitch)).toBeLessThan(.005);
  const arrived = await pose(page); exactArrival(arrived, departure, target); expect(await encodes(page)).toBe(count);
  await canvas(page).scrollIntoViewIfNeeded();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-destination', 'arrived'); await expect(guide(page)).toHaveJSProperty('hidden', true); await expect(cue(page)).toHaveJSProperty('hidden', false); await expect(look(page)).toBeDisabled();
  save('guide-look', { departure, target, paused, pausedProgress, turned, projected, activePath, activeTarget, frames, firstResumed, firstTurn, resumedFrames, arrived, resumeScroll: scroll, pngEncodes: count }); expect(errors).toEqual([]);
});

test('320px WebGL 1 guide fits the viewport, toggles without moving, and preserves offscreen and reduced-motion route lifecycle', async ({ page }) => {
  const errors = await mount(page, true), departure = await pose(page), target = await choose(page, { x: 2.52, z: 6.72 }, true);
  await fly(page).click(); await midCourse(page); await look(page).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'paused');
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-orienting', 'false', { timeout: 20000 });
  const projected = await assertProjected(page, target, departure.y); expect(projected.type).toBe('webgl');
  const layout = await page.evaluate(() => {
    const viewport = document.querySelector('.sx-viewport')!.getBoundingClientRect(), destination = document.querySelector('[data-nebula-world-destination]>i')!.getBoundingClientRect(), label = document.querySelector('.sx-nebula-destination-label')!.getBoundingClientRect(), cue = document.querySelector('[data-nebula-destination-cue]')!.getBoundingClientRect();
    const rect = (r: DOMRect) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
    return { width: innerWidth, fits: document.documentElement.scrollWidth <= innerWidth + 1, viewport: rect(viewport), destination: rect(destination), label: rect(label), cue: rect(cue) };
  });
  expect(layout.fits).toBe(true);
  for (const box of [layout.destination, layout.label, layout.cue].filter(r => r.width && r.height)) { expect(box.left).toBeGreaterThanOrEqual(layout.viewport.left - 1); expect(box.right).toBeLessThanOrEqual(layout.viewport.right + 1); expect(box.top).toBeGreaterThanOrEqual(layout.viewport.top - 1); expect(box.bottom).toBeLessThanOrEqual(layout.viewport.bottom + 1); }
  await capture(page, 'guide-phone');
  const paused = await pose(page), pausedProgress = await progress(page);
  await toggle(page).click(); await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-destination', /.+/); await expect(guide(page)).toHaveJSProperty('hidden', true); await expect(cue(page)).toHaveJSProperty('hidden', true);
  expect(await pose(page)).toEqual(paused); expect(await progress(page)).toBe(pausedProgress);
  await toggle(page).click(); await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true'); expect(await pose(page)).toEqual(paused); expect(await progress(page)).toBe(pausedProgress);
  const resume = nav(page).getByRole('button', { name: 'Resume passage', exact: true }); await resume.scrollIntoViewIfNeeded();
  const viewport = await canvas(page).evaluate(n => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, scroll: scrollY }; });
  expect(viewport.bottom).toBeLessThan(0); await page.waitForTimeout(150);
  const hiddenBefore = await projection(page, target, departure.y), count = await encodes(page);
  await framesStart(page); await resume.click(); await midCourse(page); await expect(guide(page)).toHaveJSProperty('hidden', true);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(viewport.scroll, 1); await expect(canvas(page)).not.toBeFocused();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived', { timeout: 45000 });
  const arrived = await pose(page), hiddenAfter = await projection(page, target, departure.y), frames = await framesStop(page); exactArrival(arrived, departure, target);
  expect(hiddenAfter.renders).toBe(hiddenBefore.renders); expect(hiddenAfter.draws).toBe(hiddenBefore.draws); expect(await encodes(page)).toBe(count); frames.forEach(f => expect(f.pose.y).toBe(departure.y));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const instantTarget = await choose(page, { x: -1.5, z: 4.5 }, true), instantFrom = await pose(page); await fly(page).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived'); const instant = await pose(page); exactArrival(instant, instantFrom, instantTarget);
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-destination', 'arrived'); await expect(guide(page)).toHaveJSProperty('hidden', true); await expect(look(page)).toBeDisabled();
  await nav(page).getByRole('button', { name: 'Strafe right', exact: true }).press('Enter');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-destination', /.+/); await expect(guide(page)).toHaveJSProperty('hidden', true); await expect(cue(page)).toHaveJSProperty('hidden', true);
  await choose(page, { x: 2.25, z: 3.25 }, true); await fly(page).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived');
  await nav(page).getByRole('button', { name: 'Whole nebula', exact: true }).click();
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course', /.+/); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-destination', /.+/);
  await page.getByRole('button', { name: 'Enter the nebula', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active'); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-destination', /.+/); await expect(cue(page)).toHaveJSProperty('hidden', true);
  save('guide-phone', { departure, target, projected, layout, paused, pausedProgress, viewport, hiddenGL: { rendersBefore: hiddenBefore.renders, rendersAfter: hiddenAfter.renders, drawsBefore: hiddenBefore.draws, drawsAfter: hiddenAfter.draws }, frames, arrived, pngEncodes: count, instantFrom, instantTarget, instant }); expect(errors).toEqual([]);
});
