import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

// Dawn: a third woodland light with low ground mist that is built only when
// chosen, reads at eye level, thins away beneath an elevated camera, drifts
// on the scene clock and holds still under reduced motion.
test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240_000, retries: 0 });
const canvas = '[data-birdlab-3d-canvas]';
const probes = `window.AlloPostFXEnabled=false;(()=>{const O=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){const r=new O({...o,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.dawnScene=scene;return render(scene,camera);};return r;};})();`;
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document', probes });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function call(page: Page, method: string, ...args: any[]) { return page.locator(canvas).evaluate((n: any, a) => n._birdlab3d[a.method](...a.args), { method, args }); }
async function step(page: Page, n = 3) { return page.evaluate(c => { for (let i = 0; i < c; i++) (window as any).dawnStep(); }, n); }
async function mount(page: Page, reduced: boolean) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.addInitScript(() => { let time = 1000, id = 0; const pending = new Map<number, FrameRequestCallback>(); window.requestAnimationFrame = fn => { pending.set(++id, fn); return id; }; window.cancelAnimationFrame = id => pending.delete(id); (window as any).dawnStep = () => { time += 100; const frames = [...pending.values()]; pending.clear(); frames.forEach(fn => fn(time)); }; });
  await harness.mount(page, { birdLab: { view: 'observatory3d', blXp: 23, blLifeList: {} } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.dawnScene", null, { polling: 50 });
  return errors;
}
async function pixels(page: Page) {
  // A paused scene redraws only when marked dirty; re-pausing marks it.
  await call(page, 'setPaused', true); await step(page, 1);
  const image = await page.locator(canvas).evaluate((n: HTMLCanvasElement) => n.toDataURL('image/png'));
  return readPng(Buffer.from(image.split(',')[1], 'base64'));
}
const setMist = (page: Page, visible: boolean) => page.evaluate(v => { (window as any).dawnScene.getObjectByName('dawn-ground-mist').visible = v; }, visible);
// Mean per-channel change the mist makes to the frame, as a difference map.
async function mistLayer(page: Page) {
  await setMist(page, true); const on = await pixels(page);
  await setMist(page, false); const off = await pixels(page);
  await setMist(page, true);
  const layer = new Float32Array(on.width * on.height); let total = 0;
  for (let y = 0; y < on.height; y++) for (let x = 0; x < on.width; x++) {
    const a = on.at(x, y), b = off.at(x, y), d = (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
    layer[y * on.width + x] = d; total += d;
  }
  return { layer, mean: total / layer.length };
}
// Seeking moves the scene clock without running frames; compare the mist's
// own contribution 30 s apart from a low resident camera.
async function residentDrift(page: Page) {
  await call(page, 'setMode', 'guided'); await call(page, 'setCamera', 'grouse'); await call(page, 'seek', 6); await step(page, 2);
  const first = await mistLayer(page);
  await call(page, 'seek', 36); await step(page, 2);
  const later = await mistLayer(page);
  // The same seeks with the sheets held still separate drift from the
  // resident camera's own movement.
  const motion = await page.evaluate(() => (window as any).dawnScene.getObjectByName('dawn-ground-mist').userData.motion.value);
  await page.evaluate(() => { (window as any).dawnScene.getObjectByName('dawn-ground-mist').userData.motion.value = 0; });
  await call(page, 'seek', 6); await step(page, 2); const stillFirst = await mistLayer(page);
  await call(page, 'seek', 36); await step(page, 2); const stillLater = await mistLayer(page);
  await page.evaluate(v => { (window as any).dawnScene.getObjectByName('dawn-ground-mist').userData.motion.value = v; }, motion);
  return { motion, first: first.mean, change: layerChange(first.layer, later.layer), still: layerChange(stillFirst.layer, stillLater.layer),
    // Same moment, same camera: how far the drift has carried the sheets.
    shift: layerChange(later.layer, stillLater.layer) };
}
const layerChange = (a: Float32Array, b: Float32Array) => { let sum = 0; for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]); return sum / a.length; };

test('dawn light builds its mist on demand, shows it at eye level and fades it from above', async ({ page }) => {
  const errors = await mount(page, false);
  expect(await page.evaluate(() => !!(window as any).dawnScene.getObjectByName('dawn-ground-mist')), 'no mist before dawn is chosen').toBe(false);
  const dawn = page.getByRole('button', { name: 'Dawn', exact: true });
  await dawn.click(); await step(page, 2);
  await expect(dawn).toHaveAttribute('aria-pressed', 'true');
  expect((await call(page, 'getState')).lighting).toBe('dawn');
  await expect(page.locator('[data-birdlab-dawn-chorus]')).toBeVisible();
  const sheets = await page.evaluate(() => { const g = (window as any).dawnScene.getObjectByName('dawn-ground-mist'); return { visible: g.visible, count: g.children.length }; });
  expect(sheets.visible).toBe(true); expect(sheets.count).toBeGreaterThan(5);
  const axe = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-birdlab-3d-shell]'), { resultTypes: ['violations'] })).violations.map((v: any) => v.id));
  expect(axe).toEqual([]);

  // Guided orbit looks down on the clearing: the sheets all but vanish.
  await call(page, 'seek', 6); await step(page, 3);
  const above = await mistLayer(page);
  // Free roam at eye level: the mist is plainly there.
  await call(page, 'setMode', 'free'); await step(page, 20); await call(page, 'setPaused', true); await step(page, 2);
  const eye = await mistLayer(page);
  console.log('mist', JSON.stringify({ above: above.mean, eye: eye.mean }));
  expect(eye.mean).toBeGreaterThan(1.5);
  expect(above.mean).toBeLessThan(eye.mean / 4);

  // It drifts with the scene clock, seen low from beside a resident.
  const drift = await residentDrift(page);
  console.log('drift', JSON.stringify(drift));
  expect(drift.motion).toBe(1); expect(drift.first).toBeGreaterThan(1); expect(drift.shift).toBeGreaterThan(.5); expect(drift.change).not.toBeCloseTo(drift.still, 2);
  await call(page, 'setMode', 'free'); await step(page, 2);

  await page.getByRole('button', { name: 'Daylight', exact: true }).click(); await step(page, 2);
  expect(await page.evaluate(() => (window as any).dawnScene.getObjectByName('dawn-ground-mist').visible)).toBe(false);
  await expect(page.locator('[data-birdlab-dawn-chorus]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('reduced motion keeps the dawn mist still', async ({ page }) => {
  const errors = await mount(page, true);
  await page.getByRole('button', { name: 'Dawn', exact: true }).click();
  const drift = await residentDrift(page);
  console.log('reduced', JSON.stringify(drift));
  expect(drift.motion).toBe(0); expect(drift.first).toBeGreaterThan(1); expect(drift.shift).toBe(0); expect(drift.change).toBe(drift.still);
  expect(errors).toEqual([]);
});
